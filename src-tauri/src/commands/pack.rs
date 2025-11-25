/// 精灵图打包命令 (Sprite Packing Commands)
/// 
/// 使用 MaxRects 算法打包精灵图，支持透明裁剪和旋转优化

use crate::core::packer::{MaxRectsPacker, SpriteInput, find_optimal_size};
use crate::core::types::{SpriteData, PackResult};
use crate::utils::trim::{trim_transparent, TrimResult};
use image::ImageReader;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::LazyLock;

/// 打包配置
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackConfig {
    /// 最大宽度
    pub max_width: Option<u32>,
    /// 最大高度
    pub max_height: Option<u32>,
    /// 是否启用透明裁剪
    pub trim_transparent: Option<bool>,
    /// 是否允许旋转
    pub allow_rotation: Option<bool>,
    /// 精灵间距
    pub padding: Option<u32>,
    /// 是否自动选择最优尺寸
    pub auto_size: Option<bool>,
}

impl Default for PackConfig {
    fn default() -> Self {
        Self {
            max_width: Some(2048),
            max_height: Some(2048),
            trim_transparent: Some(true),
            allow_rotation: Some(true),
            padding: Some(1),
            auto_size: Some(true),
        }
    }
}

/// 裁剪缓存（用于后续导出）- 使用线程安全的 Mutex
static TRIM_CACHE: LazyLock<Mutex<HashMap<String, TrimResult>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

/// 获取裁剪缓存（克隆）
pub fn get_trim_cache() -> HashMap<String, TrimResult> {
    TRIM_CACHE.lock().unwrap().clone()
}

/// 清空裁剪缓存
fn clear_trim_cache() {
    TRIM_CACHE.lock().unwrap().clear();
}

/// 存入裁剪缓存
fn cache_trim_result(id: String, result: TrimResult) {
    TRIM_CACHE.lock().unwrap().insert(id, result);
}

/// 打包精灵图命令
/// 
/// # Arguments
/// * `sprites` - 待打包的精灵数据列表
/// * `config` - 打包配置
/// 
/// # Returns
/// * `Result<PackResult, String>` - 打包结果或错误信息
#[tauri::command]
pub async fn pack_sprites(
    sprites: Vec<SpriteData>,
    config: Option<PackConfig>,
) -> Result<PackResult, String> {
    let config = config.unwrap_or_default();
    let max_width = config.max_width.unwrap_or(2048);
    let max_height = config.max_height.unwrap_or(2048);
    let do_trim = config.trim_transparent.unwrap_or(true);
    let allow_rotation = config.allow_rotation.unwrap_or(true);
    let padding = config.padding.unwrap_or(1);
    let auto_size = config.auto_size.unwrap_or(true);
    
    println!("开始打包 {} 个精灵", sprites.len());
    println!("配置: 最大尺寸 {}x{}, 裁剪={}, 旋转={}, 间距={}", 
             max_width, max_height, do_trim, allow_rotation, padding);
    
    if sprites.is_empty() {
        return Err("没有精灵可打包".to_string());
    }
    
    // 清空之前的裁剪缓存
    clear_trim_cache();
    
    // 处理精灵：加载图像并进行透明裁剪
    let mut sprite_inputs: Vec<SpriteInput> = Vec::with_capacity(sprites.len());
    
    for sprite in &sprites {
        let input = if do_trim {
            // 加载图像进行透明裁剪
            match load_and_trim_sprite(sprite) {
                Ok((input, trim_result)) => {
                    // 缓存裁剪结果用于后续导出
                    cache_trim_result(sprite.id.clone(), trim_result);
                    input
                }
                Err(e) => {
                    println!("警告: 处理精灵 {} 失败: {}", sprite.name, e);
                    // 使用原始尺寸
                    SpriteInput {
                        id: sprite.id.clone(),
                        name: sprite.name.clone(),
                        width: sprite.width,
                        height: sprite.height,
                        original_width: sprite.width,
                        original_height: sprite.height,
                        offset_x: 0,
                        offset_y: 0,
                        trimmed: false,
                    }
                }
            }
        } else {
            // 不裁剪，使用原始尺寸
            SpriteInput {
                id: sprite.id.clone(),
                name: sprite.name.clone(),
                width: sprite.width,
                height: sprite.height,
                original_width: sprite.width,
                original_height: sprite.height,
                offset_x: 0,
                offset_y: 0,
                trimmed: false,
            }
        };
        
        sprite_inputs.push(input);
    }
    
    // 确定纹理尺寸
    let (tex_width, tex_height) = if auto_size {
        // 自动选择最优尺寸
        match find_optimal_size(&sprite_inputs, max_width.max(max_height), allow_rotation, padding) {
            Some(size) => size,
            None => {
                println!("自动尺寸失败，使用最大尺寸 {}x{}", max_width, max_height);
                (max_width, max_height)
            }
        }
    } else {
        (max_width, max_height)
    };
    
    println!("使用纹理尺寸: {}x{}", tex_width, tex_height);
    
    // 执行打包
    let mut packer = MaxRectsPacker::new(tex_width, tex_height, allow_rotation, padding);
    let packed_sprites = packer.pack(&sprite_inputs);
    
    // 检查是否所有精灵都已打包
    if packed_sprites.len() != sprite_inputs.len() {
        return Err(format!(
            "纹理尺寸不足：只打包了 {}/{} 个精灵。请增大最大尺寸或减少精灵数量。",
            packed_sprites.len(),
            sprite_inputs.len()
        ));
    }
    
    // 计算实际边界和填充率
    let (actual_width, actual_height) = packer.actual_bounds();
    let fill_rate = calculate_fill_rate(&packed_sprites, actual_width, actual_height);
    
    println!("打包完成: 实际尺寸 {}x{}, 填充率 {:.1}%", actual_width, actual_height, fill_rate);
    
    Ok(PackResult {
        packed_sprites,
        texture_width: tex_width,
        texture_height: tex_height,
        fill_rate,
    })
}

/// 加载并裁剪精灵
fn load_and_trim_sprite(sprite: &SpriteData) -> Result<(SpriteInput, TrimResult), String> {
    // 加载图像
    let img = ImageReader::open(&sprite.path)
        .map_err(|e| format!("无法打开图像 {}: {}", sprite.path, e))?
        .decode()
        .map_err(|e| format!("无法解码图像 {}: {}", sprite.path, e))?
        .to_rgba8();
    
    // 透明裁剪
    let trim_result = trim_transparent(&img);
    
    let input = SpriteInput {
        id: sprite.id.clone(),
        name: sprite.name.clone(),
        width: trim_result.trimmed_width,
        height: trim_result.trimmed_height,
        original_width: trim_result.original_width,
        original_height: trim_result.original_height,
        offset_x: trim_result.offset_x,
        offset_y: trim_result.offset_y,
        trimmed: trim_result.trimmed_width != trim_result.original_width 
                 || trim_result.trimmed_height != trim_result.original_height,
    };
    
    Ok((input, trim_result))
}

/// 计算填充率
fn calculate_fill_rate(sprites: &[crate::core::types::PackedSprite], width: u32, height: u32) -> f32 {
    let total_area = width as u64 * height as u64;
    if total_area == 0 {
        return 0.0;
    }
    
    let used_area: u64 = sprites.iter().map(|s| s.width as u64 * s.height as u64).sum();
    (used_area as f32 / total_area as f32) * 100.0
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_pack_config_default() {
        let config = PackConfig::default();
        assert_eq!(config.max_width, Some(2048));
        assert_eq!(config.trim_transparent, Some(true));
        assert_eq!(config.allow_rotation, Some(true));
    }
}
