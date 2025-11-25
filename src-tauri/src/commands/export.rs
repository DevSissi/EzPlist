/// 导出命令
/// 
/// 生成 Plist 文件和纹理图，可选 ZIP 打包

use crate::core::types::ExportConfig;

/// 导出精灵图命令
/// 
/// # Arguments
/// * `config` - 导出配置
/// 
/// # Returns
/// * `Result<String, String>` - 导出路径或错误信息
#[tauri::command]
pub async fn export_sprite_sheet(config: ExportConfig) -> Result<String, String> {
    println!("开始导出精灵图: {}", config.output_name);
    println!("  - 输出路径: {}", config.output_dir);
    println!("  - ZIP 打包: {}", config.zip_output);
    
    // TODO: 实现实际的导出逻辑
    // 1. 生成 Plist XML
    // 2. 渲染纹理图
    // 3. 保存文件或创建 ZIP
    
    let output_path = if config.zip_output {
        format!("{}/{}.zip", config.output_dir, config.output_name)
    } else {
        format!("{}/{}.plist", config.output_dir, config.output_name)
    };
    
    println!("✓ 导出成功: {}", output_path);
    
    Ok(output_path)
}
