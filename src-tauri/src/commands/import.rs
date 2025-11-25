/// 图像导入命令
/// 
/// 处理用户导入图片的请求

use crate::core::types::{SpriteData, ImportResult};
use std::path::Path;

/// 导入图片命令
/// 
/// # Arguments
/// * `paths` - 图片文件路径列表
/// 
/// # Returns
/// * `Result<ImportResult, String>` - 导入结果或错误信息
#[tauri::command]
pub async fn import_images(paths: Vec<String>) -> Result<ImportResult, String> {
    println!("开始导入 {} 张图片", paths.len());
    
    let mut sprites = Vec::new();
    let mut failed = Vec::new();
    
    for path_str in paths {
        let path = Path::new(&path_str);
        
        // 检查文件是否存在
        if !path.exists() {
            failed.push(format!("文件不存在: {}", path_str));
            continue;
        }
        
        // 尝试加载图片
        match image::open(path) {
            Ok(img) => {
                let rgba = img.to_rgba8();
                let (width, height) = rgba.dimensions();
                
                let sprite = SpriteData {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown.png")
                        .to_string(),
                    path: path_str,
                    width,
                    height,
                    // 后续添加裁剪后的尺寸
                    trimmed_width: width,
                    trimmed_height: height,
                };
                
                println!("✓ 成功导入: {}", sprite.name);
                sprites.push(sprite);
            }
            Err(e) => {
                let err_msg = format!("无法加载图片 {}: {}", path_str, e);
                failed.push(err_msg);
                println!("✗ 导入失败: {}", path_str);
            }
        }
    }
    
    let success_count = sprites.len();
    let failed_count = failed.len();
    println!("导入完成: 成功 {}, 失败 {}", success_count, failed_count);
    
    Ok(ImportResult {
        sprites,
        failed,
        total: success_count + failed_count,
    })
}
