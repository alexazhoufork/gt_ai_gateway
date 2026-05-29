use std::fs;
use std::path::Path;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use tauri_plugin_shell::ShellExt;

const DEFAULT_PORT: u16 = 8787;
const DEFAULT_HOST: &str = "127.0.0.1";

/// 存储后端实际使用的 URL，供前端通过 Tauri 命令查询
struct BackendUrl(String);

/// Tauri 命令：返回后端服务的实际 URL
#[tauri::command]
fn get_backend_url(state: tauri::State<BackendUrl>) -> String {
    state.0.clone()
}

struct AppConfig {
    port: u16,
    host: String,
    /// 可选的 Root Token，用于保护管理接口。
    /// 在 config.json 中设置 "root_token" 字段；
    /// 若未配置则回退到环境变量 ROOT_TOKEN（仅终端启动时有效）。
    root_token: String,
}

/// 从 app_data_dir/config.json 读取配置。
/// 若文件不存在，自动创建一份含默认值的配置文件。
fn read_config(app_data_dir: &Path) -> AppConfig {
    let config_path = app_data_dir.join("config.json");

    // 文件不存在时，写入默认配置
    if !config_path.exists() {
        let default_config = serde_json::json!({
            "port": DEFAULT_PORT,
            "host": DEFAULT_HOST
        });
        let _ = fs::write(
            &config_path,
            serde_json::to_string_pretty(&default_config).unwrap(),
        );
        return AppConfig {
            port: DEFAULT_PORT,
            host: DEFAULT_HOST.to_string(),
            root_token: std::env::var("ROOT_TOKEN").unwrap_or_default(),
        };
    }

    // 读取并解析
    let mut port = DEFAULT_PORT;
    let mut host = DEFAULT_HOST.to_string();
    // config.json 中的 root_token 优先；未设置时回退到环境变量
    let mut root_token = std::env::var("ROOT_TOKEN").unwrap_or_default();

    if let Ok(content) = fs::read_to_string(&config_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(p) = json["port"].as_u64() {
                if p > 0 && p <= 65535 {
                    port = p as u16;
                }
            }
            if let Some(h) = json["host"].as_str() {
                if !h.is_empty() {
                    host = h.to_string();
                }
            }
            if let Some(t) = json["root_token"].as_str() {
                if !t.is_empty() {
                    root_token = t.to_string();
                }
            }
        }
    }

    AppConfig { port, host, root_token }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_backend_url])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            fs::create_dir_all(&app_data_dir)?;

            let db_path = app_data_dir.join("gateway.db");
            let config = read_config(&app_data_dir);

            let log_dir = app_data_dir.join("logs");
            let (_, sidecar) = app
                .shell()
                .sidecar("backend")?
                .env("DB_PATH", db_path.to_str().unwrap())
                .env("PORT", config.port.to_string())
                .env("HOST", &config.host)
                .env("LOG_DIR", log_dir.to_str().unwrap())
                .env("ROOT_TOKEN", &config.root_token)
                .spawn()?;

            app.manage(sidecar);

            // 存储后端 URL，供前端查询
            let backend_url = format!("http://{}:{}", config.host, config.port);
            app.manage(BackendUrl(backend_url));

            // 把 app_data_dir 存入 managed state，供菜单事件回调使用
            app.manage(app_data_dir.clone());

            // 托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let open_config_item = MenuItem::with_id(app, "open_config", "打开配置目录", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &open_config_item, &quit_item])?;

            // 加载专用状态栏模板图标（单色，支持深/浅模式自动反色）
            let tray_icon = Image::from_path(
                std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("icons/tray-icon@2x.png"),
            )
            .unwrap_or_else(|_| app.default_window_icon().unwrap().clone());

            // 托盘图标（左键切换窗口显示/隐藏，右键弹菜单）
            TrayIconBuilder::new()
                .icon(tray_icon)
                .tooltip("AI Gateway")
                .menu(&menu)
                .menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "open_config" => {
                        let dir = app.state::<std::path::PathBuf>().inner().clone();
                        let _ = open::that(dir);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        // 关闭窗口时隐藏而不是退出，保持后台运行
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
