/// 透明像素裁剪工具 (Transparent Pixel Trimming)
/// 
/// 从四个方向扫描透明边框，裁剪不必要的透明区域

use image::{RgbaImage, imageops};

/// Alpha 阈值（小于此值视为透明）
const ALPHA_THRESHOLD: u8 = 1;

/// 裁剪结果
#[derive(Debug, Clone)]
pub struct TrimResult {
    /// 裁剪后的图像
    pub trimmed_image: RgbaImage,
    /// 裁剪偏移量 (相对于原始中心的偏移)
    pub offset_x: i32,
    pub offset_y: i32,
    /// 原始尺寸
    pub original_width: u32,
    pub original_height: u32,
    /// 裁剪后尺寸
    pub trimmed_width: u32,
    pub trimmed_height: u32,
    /// 裁剪边界 (left, top, right, bottom)
    pub trim_bounds: (u32, u32, u32, u32),
}

/// 裁剪图像的透明边框
/// 
/// # Arguments
/// * `img` - 输入的 RGBA 图像
/// 
/// # Returns
/// * `TrimResult` - 包含裁剪后图像和偏移信息
pub fn trim_transparent(img: &RgbaImage) -> TrimResult {
    let (width, height) = img.dimensions();
    
    // 如果图片为空，返回原图
    if width == 0 || height == 0 {
        return TrimResult {
            trimmed_image: img.clone(),
            offset_x: 0,
            offset_y: 0,
            original_width: width,
            original_height: height,
            trimmed_width: width,
            trimmed_height: height,
            trim_bounds: (0, 0, width, height),
        };
    }
    
    // 从四个方向扫描
    let top = find_first_opaque_row(img, 0, height);
    let bottom = find_last_opaque_row(img, 0, height);
    let left = find_first_opaque_col(img, 0, width);
    let right = find_last_opaque_col(img, 0, width);
    
    // 如果整张图片都是透明的
    if top >= bottom || left >= right {
        return TrimResult {
            trimmed_image: RgbaImage::new(1, 1), // 最小 1x1
            offset_x: 0,
            offset_y: 0,
            original_width: width,
            original_height: height,
            trimmed_width: 1,
            trimmed_height: 1,
            trim_bounds: (0, 0, 1, 1),
        };
    }
    
    let trimmed_width = right - left;
    let trimmed_height = bottom - top;
    
    // 计算偏移量（相对于原始图像中心的偏移）
    // Cocos2d-x 使用的 spriteOffset 计算方式
    let original_center_x = width as f32 / 2.0;
    let original_center_y = height as f32 / 2.0;
    let trimmed_center_x = left as f32 + trimmed_width as f32 / 2.0;
    let trimmed_center_y = top as f32 + trimmed_height as f32 / 2.0;
    
    let offset_x = (trimmed_center_x - original_center_x).round() as i32;
    // Cocos2d-x Y 轴向上，所以取反
    let offset_y = -((trimmed_center_y - original_center_y).round() as i32);
    
    // 裁剪图像
    let trimmed_image = imageops::crop_imm(img, left, top, trimmed_width, trimmed_height).to_image();
    
    TrimResult {
        trimmed_image,
        offset_x,
        offset_y,
        original_width: width,
        original_height: height,
        trimmed_width,
        trimmed_height,
        trim_bounds: (left, top, right, bottom),
    }
}

/// 从上方扫描第一个不透明行
pub fn find_first_opaque_row(img: &RgbaImage, start: u32, end: u32) -> u32 {
    for y in start..end {
        if !is_row_transparent(img, y) {
            return y;
        }
    }
    end
}

/// 从下方扫描最后一个不透明行
pub fn find_last_opaque_row(img: &RgbaImage, start: u32, end: u32) -> u32 {
    for y in (start..end).rev() {
        if !is_row_transparent(img, y) {
            return y + 1;
        }
    }
    start
}

/// 检查一行是否完全透明
fn is_row_transparent(img: &RgbaImage, y: u32) -> bool {
    let width = img.width();
    for x in 0..width {
        if let Some(pixel) = img.get_pixel_checked(x, y) {
            if pixel[3] > ALPHA_THRESHOLD {
                return false;
            }
        }
    }
    true
}

/// 从左侧扫描第一个不透明列
pub fn find_first_opaque_col(img: &RgbaImage, start: u32, end: u32) -> u32 {
    for x in start..end {
        if !is_col_transparent(img, x) {
            return x;
        }
    }
    end
}

/// 从右侧扫描最后一个不透明列
pub fn find_last_opaque_col(img: &RgbaImage, start: u32, end: u32) -> u32 {
    for x in (start..end).rev() {
        if !is_col_transparent(img, x) {
            return x + 1;
        }
    }
    start
}

/// 检查一列是否完全透明
fn is_col_transparent(img: &RgbaImage, x: u32) -> bool {
    let height = img.height();
    for y in 0..height {
        if let Some(pixel) = img.get_pixel_checked(x, y) {
            if pixel[3] > ALPHA_THRESHOLD {
                return false;
            }
        }
    }
    true
}
