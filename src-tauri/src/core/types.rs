/// 共享类型定义
/// 
/// 定义前后端交互的数据结构

use serde::{Deserialize, Serialize};

/// 精灵数据（原始图片信息）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpriteData {
    /// 唯一标识符
    pub id: String,
    /// 文件名
    pub name: String,
    /// 文件路径
    pub path: String,
    /// 原始宽度
    pub width: u32,
    /// 原始高度
    pub height: u32,
    /// 裁剪后宽度
    pub trimmed_width: u32,
    /// 裁剪后高度
    pub trimmed_height: u32,
}

/// 已打包的精灵（布局信息）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackedSprite {
    /// 精灵 ID
    pub id: String,
    /// 精灵名称
    pub name: String,
    /// 在纹理图中的 X 坐标
    pub x: u32,
    /// 在纹理图中的 Y 坐标
    pub y: u32,
    /// 在纹理图中的宽度
    pub width: u32,
    /// 在纹理图中的高度
    pub height: u32,
    /// 是否旋转 90 度
    pub rotated: bool,
    /// 原始宽度（未裁剪前）
    pub original_width: u32,
    /// 原始高度（未裁剪前）
    pub original_height: u32,
    /// 是否进行了透明裁剪
    pub trimmed: bool,
    /// 裁剪偏移量 X
    pub offset_x: i32,
    /// 裁剪偏移量 Y
    pub offset_y: i32,
}

/// 导入结果
#[derive(Debug, Serialize)]
pub struct ImportResult {
    /// 成功导入的精灵列表
    pub sprites: Vec<SpriteData>,
    /// 失败的文件列表（带错误信息）
    pub failed: Vec<String>,
    /// 总数
    pub total: usize,
}

/// 打包结果
#[derive(Debug, Serialize)]
pub struct PackResult {
    /// 打包后的精灵列表
    pub packed_sprites: Vec<PackedSprite>,
    /// 纹理图宽度
    pub texture_width: u32,
    /// 纹理图高度
    pub texture_height: u32,
    /// 填充率（百分比）
    pub fill_rate: f32,
}

/// 导出配置
#[derive(Debug, Deserialize)]
pub struct ExportConfig {
    /// 已打包的精灵
    pub packed_sprites: Vec<PackedSprite>,
    /// 纹理尺寸
    pub texture_width: u32,
    pub texture_height: u32,
    /// 输出目录
    pub output_dir: String,
    /// 输出文件名（不含扩展名）
    pub output_name: String,
    /// 是否打包为 ZIP
    pub zip_output: bool,
}

/// Plist 元数据
#[derive(Debug, Serialize)]
pub struct PlistMetadata {
    pub format: i32,
    pub real_texture_file_name: String,
    pub size: String,
    pub texture_file_name: String,
    pub smartupdate: String,
}

/// Plist 帧数据
#[derive(Debug, Serialize)]
pub struct PlistFrameData {
    #[serde(rename = "spriteOffset")]
    pub sprite_offset: String,
    
    #[serde(rename = "spriteSize")]
    pub sprite_size: String,
    
    #[serde(rename = "spriteSourceSize")]
    pub sprite_source_size: String,
    
    #[serde(rename = "textureRect")]
    pub texture_rect: String,
    
    #[serde(rename = "textureRotated")]
    pub texture_rotated: bool,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aliases: Option<Vec<String>>,
}

// ========== 拆分图集相关类型 ==========

/// 精灵图集信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpritesheetInfo {
    /// 文件路径
    pub path: String,
    /// 文件名
    pub name: String,
    /// 图集宽度
    pub width: u32,
    /// 图集高度
    pub height: u32,
}

/// 切分帧信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameInfo {
    /// 帧名称（如 "idle_01.png"）
    pub name: String,
    /// 在图集中的 X 坐标
    pub x: u32,
    /// 在图集中的 Y 坐标
    pub y: u32,
    /// 帧宽度
    pub width: u32,
    /// 帧高度
    pub height: u32,
    /// 行索引
    pub row: u32,
    /// 列索引
    pub col: u32,
}

/// 切分配置
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SplitConfig {
    /// 行数
    pub rows: u32,
    /// 列数
    pub cols: u32,
    /// 固定帧宽（可选，不设置则自动计算）
    pub frame_width: Option<u32>,
    /// 固定帧高（可选，不设置则自动计算）
    pub frame_height: Option<u32>,
    /// 帧名称前缀
    pub name_prefix: String,
    /// 起始编号
    pub start_index: Option<u32>,
}

/// 切分结果
#[derive(Debug, Serialize)]
pub struct SplitResult {
    /// 切分后的帧列表
    pub frames: Vec<FrameInfo>,
    /// 每帧宽度
    pub frame_width: u32,
    /// 每帧高度
    pub frame_height: u32,
    /// 总帧数
    pub total_frames: u32,
}

/// 动画区域定义（用于多区域导出）
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationRegion {
    /// 区域名称（如 "idle"）
    pub name: String,
    /// 起始行（0-indexed）
    pub start_row: u32,
    /// 起始列（0-indexed）
    pub start_col: u32,
    /// 帧数
    pub frame_count: u32,
    /// 帧宽度
    pub frame_width: u32,
    /// 帧高度
    pub frame_height: u32,
}
