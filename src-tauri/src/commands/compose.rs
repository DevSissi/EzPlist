/// 精灵图合成命令 (Sprite Compose Commands)
/// 
/// 将多张独立图片按手动布局合成为一张 PNG + Plist

use image::{ImageReader, RgbaImage, GenericImage};
use std::collections::HashMap;
use std::path::Path;
use md5::{Md5, Digest};

/// 合成精灵位置信息
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposeSpritePosition {
    /// 精灵 ID
    pub id: String,
    /// 精灵名称
    pub name: String,
    /// 图片路径
    pub path: String,
    /// 原始宽度
    pub width: u32,
    /// 原始高度
    pub height: u32,
    /// 在画布中的 X 坐标
    pub x: i32,
    /// 在画布中的 Y 坐标
    pub y: i32,
}

/// 合成配置
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposeConfig {
    /// 输出目录
    pub output_dir: String,
    /// 输出文件名（不含扩展名）
    pub output_name: String,
    /// 画布边距（可选，默认 0）
    pub padding: Option<u32>,
    /// 是否裁剪到最小边界（可选，默认 true）
    pub trim_to_bounds: Option<bool>,
}

/// 合成结果
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposeResult {
    /// PNG 文件路径
    pub png_path: String,
    /// Plist 文件路径
    pub plist_path: String,
    /// 最终纹理宽度
    pub texture_width: u32,
    /// 最终纹理高度
    pub texture_height: u32,
    /// 精灵数量
    pub sprite_count: usize,
}

/// 合成精灵图命令
/// 
/// 将多张独立图片按指定位置合成为一张 PNG，并生成对应的 Plist
/// 
/// # Arguments
/// * `sprites` - 精灵位置信息列表
/// * `config` - 合成配置
/// 
/// # Returns
/// * `Result<ComposeResult, String>` - 合成结果或错误信息
#[tauri::command]
pub async fn compose_sprites(
    sprites: Vec<ComposeSpritePosition>,
    config: ComposeConfig,
) -> Result<ComposeResult, String> {
    println!("开始合成 {} 个精灵", sprites.len());
    
    if sprites.is_empty() {
        return Err("没有精灵可合成".to_string());
    }
    
    let padding = config.padding.unwrap_or(0);
    let trim_to_bounds = config.trim_to_bounds.unwrap_or(true);
    
    // 计算画布边界
    let (min_x, min_y, max_x, max_y) = calculate_bounds(&sprites);
    
    // 计算最终纹理尺寸
    let (texture_width, texture_height, offset_x, offset_y) = if trim_to_bounds {
        // 裁剪到最小边界
        let width = (max_x - min_x) as u32 + padding * 2;
        let height = (max_y - min_y) as u32 + padding * 2;
        (width, height, -min_x + padding as i32, -min_y + padding as i32)
    } else {
        // 保留原始位置（从 0,0 开始）
        let width = max_x as u32 + padding;
        let height = max_y as u32 + padding;
        (width, height, padding as i32, padding as i32)
    };
    
    println!("纹理尺寸: {}x{}", texture_width, texture_height);
    
    // 创建目标图像
    let mut output_image = RgbaImage::new(texture_width, texture_height);
    
    // 加载并绘制每个精灵
    let mut frame_infos: Vec<FrameComposeInfo> = Vec::new();
    
    for sprite in &sprites {
        // 加载图像
        let img = ImageReader::open(&sprite.path)
            .map_err(|e| format!("无法打开图像 {}: {}", sprite.path, e))?
            .decode()
            .map_err(|e| format!("无法解码图像 {}: {}", sprite.path, e))?
            .to_rgba8();
        
        // 计算在输出图像中的位置
        let dest_x = (sprite.x + offset_x) as u32;
        let dest_y = (sprite.y + offset_y) as u32;
        
        // 绘制到输出图像
        if let Err(e) = output_image.copy_from(&img, dest_x, dest_y) {
            println!("警告: 绘制精灵 {} 时出错: {}", sprite.name, e);
            // 继续处理其他精灵
        }
        
        // 记录帧信息
        frame_infos.push(FrameComposeInfo {
            name: sprite.name.clone(),
            x: dest_x,
            y: dest_y,
            width: sprite.width,
            height: sprite.height,
        });
        
        println!("  - 绘制 {} 到 ({}, {})", sprite.name, dest_x, dest_y);
    }
    
    // 确保输出目录存在
    let output_dir = Path::new(&config.output_dir);
    std::fs::create_dir_all(output_dir)
        .map_err(|e| format!("无法创建输出目录: {}", e))?;
    
    // 保存 PNG
    let png_path = output_dir.join(format!("{}.png", config.output_name));
    output_image.save(&png_path)
        .map_err(|e| format!("保存 PNG 失败: {}", e))?;
    
    println!("PNG 保存成功: {}", png_path.display());
    
    // 生成并保存 Plist
    let texture_name = format!("{}.png", config.output_name);
    let plist_content = generate_compose_plist(
        &frame_infos,
        texture_width,
        texture_height,
        &texture_name,
    )?;
    
    let plist_path = output_dir.join(format!("{}.plist", config.output_name));
    std::fs::write(&plist_path, plist_content)
        .map_err(|e| format!("保存 Plist 失败: {}", e))?;
    
    println!("Plist 保存成功: {}", plist_path.display());
    
    Ok(ComposeResult {
        png_path: png_path.to_string_lossy().to_string(),
        plist_path: plist_path.to_string_lossy().to_string(),
        texture_width,
        texture_height,
        sprite_count: sprites.len(),
    })
}

/// 帧合成信息（内部使用）
struct FrameComposeInfo {
    name: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

/// 计算所有精灵的边界
fn calculate_bounds(sprites: &[ComposeSpritePosition]) -> (i32, i32, i32, i32) {
    let mut min_x = i32::MAX;
    let mut min_y = i32::MAX;
    let mut max_x = i32::MIN;
    let mut max_y = i32::MIN;
    
    for sprite in sprites {
        min_x = min_x.min(sprite.x);
        min_y = min_y.min(sprite.y);
        max_x = max_x.max(sprite.x + sprite.width as i32);
        max_y = max_y.max(sprite.y + sprite.height as i32);
    }
    
    (min_x, min_y, max_x, max_y)
}

/// 生成合成图的 Plist 内容
fn generate_compose_plist(
    frames: &[FrameComposeInfo],
    texture_width: u32,
    texture_height: u32,
    texture_name: &str,
) -> Result<String, String> {
    // 构建 frames 字典
    let mut frames_dict: HashMap<String, plist::Value> = HashMap::new();
    
    for frame in frames {
        let mut frame_data: HashMap<String, plist::Value> = HashMap::new();
        
        // Cocos2d-x Format 3 格式
        frame_data.insert(
            "spriteOffset".to_string(),
            plist::Value::String("{0,0}".to_string()),
        );
        
        frame_data.insert(
            "spriteSize".to_string(),
            plist::Value::String(format!("{{{},{}}}", frame.width, frame.height)),
        );
        
        frame_data.insert(
            "spriteSourceSize".to_string(),
            plist::Value::String(format!("{{{},{}}}", frame.width, frame.height)),
        );
        
        frame_data.insert(
            "textureRect".to_string(),
            plist::Value::String(format!(
                "{{{{{},{}}},{{{},{}}}}}",
                frame.x, frame.y, frame.width, frame.height
            )),
        );
        
        frame_data.insert(
            "textureRotated".to_string(),
            plist::Value::Boolean(false),
        );
        
        frames_dict.insert(
            frame.name.clone(),
            plist::Value::Dictionary(frame_data.into_iter().collect()),
        );
    }
    
    // 构建 metadata
    let mut metadata: HashMap<String, plist::Value> = HashMap::new();
    metadata.insert("format".to_string(), plist::Value::Integer(3.into()));
    metadata.insert(
        "realTextureFileName".to_string(),
        plist::Value::String(texture_name.to_string()),
    );
    metadata.insert(
        "size".to_string(),
        plist::Value::String(format!("{{{},{}}}", texture_width, texture_height)),
    );
    metadata.insert(
        "textureFileName".to_string(),
        plist::Value::String(texture_name.to_string()),
    );
    
    // 计算 smartupdate hash
    let mut hasher = Md5::new();
    hasher.update(format!("{}_{}", texture_name, frames.len()).as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    metadata.insert("smartupdate".to_string(), plist::Value::String(hash));
    
    // 构建根字典
    let mut root: HashMap<String, plist::Value> = HashMap::new();
    root.insert(
        "frames".to_string(),
        plist::Value::Dictionary(frames_dict.into_iter().collect()),
    );
    root.insert(
        "metadata".to_string(),
        plist::Value::Dictionary(metadata.into_iter().collect()),
    );
    
    let plist_value = plist::Value::Dictionary(root.into_iter().collect());
    
    // 序列化为 XML
    let mut buf = Vec::new();
    plist::to_writer_xml(&mut buf, &plist_value)
        .map_err(|e| format!("序列化 Plist 失败: {}", e))?;
    
    String::from_utf8(buf)
        .map_err(|e| format!("转换 Plist 编码失败: {}", e))
}

/// 预览合成边界（不实际合成，只计算尺寸）
/// 
/// # Arguments
/// * `sprites` - 精灵位置信息列表
/// 
/// # Returns
/// * `Result<ComposeBoundsInfo, String>` - 边界信息
#[tauri::command]
pub async fn preview_compose_bounds(
    sprites: Vec<ComposeSpritePosition>,
) -> Result<ComposeBoundsInfo, String> {
    if sprites.is_empty() {
        return Ok(ComposeBoundsInfo {
            min_x: 0,
            min_y: 0,
            max_x: 0,
            max_y: 0,
            width: 0,
            height: 0,
            sprite_count: 0,
        });
    }
    
    let (min_x, min_y, max_x, max_y) = calculate_bounds(&sprites);
    
    Ok(ComposeBoundsInfo {
        min_x,
        min_y,
        max_x,
        max_y,
        width: (max_x - min_x) as u32,
        height: (max_y - min_y) as u32,
        sprite_count: sprites.len(),
    })
}

/// 合成边界信息
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposeBoundsInfo {
    /// 最小 X 坐标
    pub min_x: i32,
    /// 最小 Y 坐标
    pub min_y: i32,
    /// 最大 X 坐标
    pub max_x: i32,
    /// 最大 Y 坐标
    pub max_y: i32,
    /// 宽度
    pub width: u32,
    /// 高度
    pub height: u32,
    /// 精灵数量
    pub sprite_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_calculate_bounds() {
        let sprites = vec![
            ComposeSpritePosition {
                id: "1".to_string(),
                name: "a.png".to_string(),
                path: "a.png".to_string(),
                width: 100,
                height: 100,
                x: 0,
                y: 0,
            },
            ComposeSpritePosition {
                id: "2".to_string(),
                name: "b.png".to_string(),
                path: "b.png".to_string(),
                width: 50,
                height: 50,
                x: 100,
                y: 100,
            },
        ];
        
        let (min_x, min_y, max_x, max_y) = calculate_bounds(&sprites);
        
        assert_eq!(min_x, 0);
        assert_eq!(min_y, 0);
        assert_eq!(max_x, 150);
        assert_eq!(max_y, 150);
    }
}
