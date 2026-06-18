use std::os::unix::io::{OwnedFd, RawFd};
use std::os::unix::process::CommandExt;
use std::sync::Mutex;

/// 持有 PTY master fd（OwnedFd）。
/// Tauri 进程退出时（包括 kill -9），OwnedFd 被 drop，OS 关闭 master fd，
/// 内核向 backend 进程组发送 SIGHUP，backend 自动退出，不留孤儿进程。
#[allow(dead_code)]
pub struct PtyMaster(pub Mutex<Option<OwnedFd>>);

#[allow(dead_code)]
pub struct UnixPlatformState {
    pub pty_master: PtyMaster,
    pub slave_raw: RawFd,
}

pub unsafe fn open_pty() -> Result<(RawFd, String), String> {
    let master = libc::posix_openpt(libc::O_RDWR | libc::O_NOCTTY | libc::O_CLOEXEC);
    if master < 0 {
        return Err(format!("posix_openpt failed: {}", std::io::Error::last_os_error()));
    }
    if libc::grantpt(master) < 0 || libc::unlockpt(master) < 0 {
        libc::close(master);
        return Err("grantpt/unlockpt failed".into());
    }

    // macOS 的 ptsname() 是线程安全的
    let slave_ptr = libc::ptsname(master);
    if slave_ptr.is_null() {
        libc::close(master);
        return Err("ptsname failed".into());
    }
    let slave_path = std::ffi::CStr::from_ptr(slave_ptr)
        .to_string_lossy()
        .into_owned();

    Ok((master, slave_path))
}

pub fn setup_pty_command(cmd: &mut std::process::Command) -> UnixPlatformState {
    let (master_raw, slave_path) = unsafe { open_pty() }
        .expect("failed to open PTY");

    let slave_path_c = std::ffi::CString::new(slave_path).unwrap();
    let slave_raw: RawFd = unsafe {
        libc::open(slave_path_c.as_ptr(), libc::O_RDWR)
    };
    if slave_raw < 0 {
        panic!("failed to open PTY slave: {}", std::io::Error::last_os_error());
    }

    unsafe {
        cmd.pre_exec(move || {
            libc::setsid();
            libc::ioctl(slave_raw, libc::TIOCSCTTY as u64, 0);
            libc::dup2(slave_raw, 0);
            
            let devnull = libc::open(b"/dev/null\0".as_ptr() as *const _, libc::O_RDWR);
            if devnull >= 0 {
                libc::dup2(devnull, 2);
                libc::close(devnull);
            }

            let mut rl = libc::rlimit { rlim_cur: 0, rlim_max: 0 };
            libc::getrlimit(libc::RLIMIT_NOFILE, &mut rl);
            let max_fd = std::cmp::min(rl.rlim_cur as i32, 4096);
            for fd in 3..max_fd {
                libc::close(fd);
            }

            Ok(())
        });
    }

    cmd.stdout(std::process::Stdio::piped());

    use std::os::unix::io::FromRawFd;
    let master_owned = unsafe { OwnedFd::from_raw_fd(master_raw) };
    UnixPlatformState {
        pty_master: PtyMaster(Mutex::new(Some(master_owned))),
        slave_raw,
    }
}

pub fn post_spawn(state: &mut UnixPlatformState) {
    if state.slave_raw >= 0 {
        unsafe { libc::close(state.slave_raw); }
        state.slave_raw = -1;
    }
}
