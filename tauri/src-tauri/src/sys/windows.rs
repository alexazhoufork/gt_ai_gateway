use std::path::Path;
use std::process::Command;
use std::os::windows::process::CommandExt;

pub struct WindowsPlatformState;
pub type PlatformState = WindowsPlatformState;

pub fn get_command(exe_dir: &Path) -> (Command, String) {
    #[cfg(debug_assertions)]
    {
        let project_root = exe_dir.join("../../../..");
        let mut c = Command::new("node");
        c.arg("--import").arg("tsx").arg("src/local.ts");
        c.current_dir(&project_root);
        (c, project_root.join("resource/migrate").to_string_lossy().into_owned())
    }
    
    #[cfg(not(debug_assertions))]
    {
        let sidecar_path = exe_dir.join("ai-gateway-backend.exe");
        let resource_dir = exe_dir.join("resource");
        let c = Command::new(&sidecar_path);
        (c, resource_dir.join("migrate").to_string_lossy().into_owned())
    }
}

pub fn setup_command(cmd: &mut Command) -> PlatformState {
    // Windows: 使用 pipes 代替 PTY，隐藏控制台窗口
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    cmd.stdin(std::process::Stdio::null());
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    
    WindowsPlatformState
}

pub fn post_spawn(_state: &mut PlatformState) {
    // Windows 平台在进程启动后无需特殊处理
}
