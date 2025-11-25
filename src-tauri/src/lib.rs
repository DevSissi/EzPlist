/// EzPlist 核心库
/// 
/// 高性能精灵图管理工具的 Rust 后端实现
/// 主要功能模块：
/// - commands: Tauri 命令处理
/// - core: 核心业务逻辑（打包算法、图像处理、Plist 生成）
/// - utils: 工具函数（裁剪、哈希等）

pub mod commands;
pub mod core;
pub mod utils;

use tauri::Manager;

/// Tauri 应用启动入口
pub fn run() {
    tauri::Builder::default()
        // 注册插件
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::import_images,
            commands::pack_sprites,
            commands::export_sprite_sheet,
            // 拆分图集命令
            commands::import_spritesheet,
            commands::calculate_split_frames,
            commands::export_split_plist,
            // 多区域导出命令
            commands::export_multi_plist,
            commands::calculate_region_preview,
            // 合成图集命令
            commands::compose_sprites,
            commands::preview_compose_bounds,
        ])
        // 设置初始化回调
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        // 运行应用
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
