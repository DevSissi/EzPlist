/// Tauri 命令模块
/// 
/// 定义前端可调用的所有 Tauri 命令

pub mod import;
pub mod pack;
pub mod export;
pub mod split;
pub mod compose;

pub use import::*;
pub use pack::*;
pub use export::*;
pub use split::*;
pub use compose::*;

/// 测试命令：问候
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("你好, {}! 欢迎使用 EzPlist 🎨", name)
}
