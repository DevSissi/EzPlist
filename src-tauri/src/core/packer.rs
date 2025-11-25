/// MaxRects 打包算法实现 (MaxRects Bin Packing Algorithm)
/// 
/// 参考论文: "A Thousand Ways to Pack the Bin" by Jukka Jylänki
/// 使用 Best Short Side Fit (BSSF) 启发式策略

use crate::core::types::PackedSprite;

/// 待打包的精灵输入数据
#[derive(Debug, Clone)]
pub struct SpriteInput {
    /// 精灵 ID
    pub id: String,
    /// 精灵名称
    pub name: String,
    /// 裁剪后宽度
    pub width: u32,
    /// 裁剪后高度
    pub height: u32,
    /// 原始宽度
    pub original_width: u32,
    /// 原始高度
    pub original_height: u32,
    /// 裁剪偏移量 X
    pub offset_x: i32,
    /// 裁剪偏移量 Y
    pub offset_y: i32,
    /// 是否已裁剪
    pub trimmed: bool,
}

/// 矩形结构
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl Rect {
    /// 创建新矩形
    pub fn new(x: u32, y: u32, width: u32, height: u32) -> Self {
        Self { x, y, width, height }
    }
    
    /// 检查两个矩形是否相交
    pub fn intersects(&self, other: &Rect) -> bool {
        self.x < other.x + other.width
            && self.x + self.width > other.x
            && self.y < other.y + other.height
            && self.y + self.height > other.y
    }
    
    /// 检查 self 是否完全包含在 other 内
    pub fn is_contained_in(&self, other: &Rect) -> bool {
        self.x >= other.x
            && self.y >= other.y
            && self.x + self.width <= other.x + other.width
            && self.y + self.height <= other.y + other.height
    }
}

/// 放置结果
#[derive(Debug, Clone)]
struct Placement {
    /// 放置位置
    rect: Rect,
    /// 是否旋转 90 度
    rotated: bool,
    /// 评分（越小越好）
    score1: i32,
    score2: i32,
}

/// MaxRects 打包器
pub struct MaxRectsPacker {
    /// 容器宽度
    width: u32,
    /// 容器高度
    height: u32,
    /// 空闲矩形列表
    free_rects: Vec<Rect>,
    /// 已放置的矩形列表
    used_rects: Vec<Rect>,
    /// 是否允许旋转
    allow_rotation: bool,
    /// 边距
    padding: u32,
}

impl MaxRectsPacker {
    /// 创建新的打包器
    /// 
    /// # Arguments
    /// * `width` - 容器宽度
    /// * `height` - 容器高度
    /// * `allow_rotation` - 是否允许旋转优化
    /// * `padding` - 精灵间距
    pub fn new(width: u32, height: u32, allow_rotation: bool, padding: u32) -> Self {
        Self {
            width,
            height,
            free_rects: vec![Rect::new(0, 0, width, height)],
            used_rects: Vec::new(),
            allow_rotation,
            padding,
        }
    }
    
    /// 打包精灵列表
    /// 
    /// # Arguments
    /// * `sprites` - 待打包的精灵列表
    /// 
    /// # Returns
    /// * `Vec<PackedSprite>` - 打包结果
    pub fn pack(&mut self, sprites: &[SpriteInput]) -> Vec<PackedSprite> {
        // 复制并按面积降序排序（大图优先）
        let mut sorted_sprites: Vec<(usize, &SpriteInput)> = sprites.iter().enumerate().collect();
        sorted_sprites.sort_by(|a, b| {
            let area_a = (a.1.width + self.padding) * (a.1.height + self.padding);
            let area_b = (b.1.width + self.padding) * (b.1.height + self.padding);
            area_b.cmp(&area_a)
        });
        
        let mut result = Vec::with_capacity(sprites.len());
        
        for (original_idx, sprite) in sorted_sprites {
            let w = sprite.width + self.padding;
            let h = sprite.height + self.padding;
            
            if let Some(placement) = self.find_best_position(w, h) {
                // 放置矩形
                self.place_rect(placement.rect);
                
                // 记录结果（去掉 padding）
                result.push((original_idx, PackedSprite {
                    id: sprite.id.clone(),
                    name: sprite.name.clone(),
                    x: placement.rect.x,
                    y: placement.rect.y,
                    width: if placement.rotated { sprite.height } else { sprite.width },
                    height: if placement.rotated { sprite.width } else { sprite.height },
                    rotated: placement.rotated,
                    original_width: sprite.original_width,
                    original_height: sprite.original_height,
                    trimmed: sprite.trimmed,
                    offset_x: sprite.offset_x,
                    offset_y: sprite.offset_y,
                }));
            } else {
                // 无法放置，跳过（调用者需要处理）
                println!("警告: 无法放置精灵 {} ({}x{})", sprite.name, sprite.width, sprite.height);
            }
        }
        
        // 按原始顺序排序
        result.sort_by_key(|(idx, _)| *idx);
        result.into_iter().map(|(_, s)| s).collect()
    }
    
    /// 查找最佳放置位置（BSSF - Best Short Side Fit）
    fn find_best_position(&self, width: u32, height: u32) -> Option<Placement> {
        let mut best: Option<Placement> = None;
        
        for rect in &self.free_rects {
            // 尝试不旋转
            if width <= rect.width && height <= rect.height {
                let leftover_h = (rect.width - width).abs_diff(0) as i32;
                let leftover_v = (rect.height - height).abs_diff(0) as i32;
                let short_side = leftover_h.min(leftover_v);
                let long_side = leftover_h.max(leftover_v);
                
                let placement = Placement {
                    rect: Rect::new(rect.x, rect.y, width, height),
                    rotated: false,
                    score1: short_side,
                    score2: long_side,
                };
                
                if Self::is_better_placement(&placement, &best) {
                    best = Some(placement);
                }
            }
            
            // 尝试旋转 90 度
            if self.allow_rotation && height <= rect.width && width <= rect.height {
                let leftover_h = (rect.width - height).abs_diff(0) as i32;
                let leftover_v = (rect.height - width).abs_diff(0) as i32;
                let short_side = leftover_h.min(leftover_v);
                let long_side = leftover_h.max(leftover_v);
                
                let placement = Placement {
                    rect: Rect::new(rect.x, rect.y, height, width),
                    rotated: true,
                    score1: short_side,
                    score2: long_side,
                };
                
                if Self::is_better_placement(&placement, &best) {
                    best = Some(placement);
                }
            }
        }
        
        best
    }
    
    /// 比较两个放置方案（BSSF 启发式）
    fn is_better_placement(new_placement: &Placement, current_best: &Option<Placement>) -> bool {
        match current_best {
            None => true,
            Some(current) => {
                if new_placement.score1 < current.score1 {
                    true
                } else if new_placement.score1 == current.score1 {
                    new_placement.score2 < current.score2
                } else {
                    false
                }
            }
        }
    }
    
    /// 放置矩形并更新空闲区域
    fn place_rect(&mut self, placed: Rect) {
        // 分割所有与放置矩形相交的空闲矩形
        let mut new_free_rects = Vec::new();
        
        self.free_rects.retain(|free_rect| {
            if !placed.intersects(free_rect) {
                return true; // 不相交，保留
            }
            
            // 分割空闲矩形（四个可能的新矩形）
            
            // 上方矩形
            if placed.y > free_rect.y {
                new_free_rects.push(Rect::new(
                    free_rect.x,
                    free_rect.y,
                    free_rect.width,
                    placed.y - free_rect.y,
                ));
            }
            
            // 下方矩形
            if placed.y + placed.height < free_rect.y + free_rect.height {
                new_free_rects.push(Rect::new(
                    free_rect.x,
                    placed.y + placed.height,
                    free_rect.width,
                    free_rect.y + free_rect.height - placed.y - placed.height,
                ));
            }
            
            // 左侧矩形
            if placed.x > free_rect.x {
                new_free_rects.push(Rect::new(
                    free_rect.x,
                    free_rect.y,
                    placed.x - free_rect.x,
                    free_rect.height,
                ));
            }
            
            // 右侧矩形
            if placed.x + placed.width < free_rect.x + free_rect.width {
                new_free_rects.push(Rect::new(
                    placed.x + placed.width,
                    free_rect.y,
                    free_rect.x + free_rect.width - placed.x - placed.width,
                    free_rect.height,
                ));
            }
            
            false // 移除原始矩形
        });
        
        // 添加新的空闲矩形
        self.free_rects.append(&mut new_free_rects);
        
        // 移除被包含的矩形（优化）
        self.prune_free_rects();
        
        // 记录已使用
        self.used_rects.push(placed);
    }
    
    /// 移除被其他矩形完全包含的空闲矩形
    fn prune_free_rects(&mut self) {
        let len = self.free_rects.len();
        let mut to_remove = vec![false; len];
        
        for i in 0..len {
            if to_remove[i] {
                continue;
            }
            for j in (i + 1)..len {
                if to_remove[j] {
                    continue;
                }
                
                if self.free_rects[i].is_contained_in(&self.free_rects[j]) {
                    to_remove[i] = true;
                    break;
                }
                if self.free_rects[j].is_contained_in(&self.free_rects[i]) {
                    to_remove[j] = true;
                }
            }
        }
        
        let mut idx = 0;
        self.free_rects.retain(|_| {
            let keep = !to_remove[idx];
            idx += 1;
            keep
        });
    }
    
    /// 获取填充率
    pub fn fill_rate(&self) -> f32 {
        let total_area = self.width * self.height;
        if total_area == 0 {
            return 0.0;
        }
        
        let used_area: u32 = self.used_rects.iter().map(|r| r.width * r.height).sum();
        (used_area as f32 / total_area as f32) * 100.0
    }
    
    /// 获取实际使用的边界
    pub fn actual_bounds(&self) -> (u32, u32) {
        if self.used_rects.is_empty() {
            return (0, 0);
        }
        
        let max_x = self.used_rects.iter().map(|r| r.x + r.width).max().unwrap_or(0);
        let max_y = self.used_rects.iter().map(|r| r.y + r.height).max().unwrap_or(0);
        
        (max_x, max_y)
    }
}

/// 自动选择最优纹理尺寸
/// 
/// # Arguments
/// * `sprites` - 待打包的精灵列表
/// * `max_size` - 最大尺寸限制
/// * `allow_rotation` - 是否允许旋转
/// * `padding` - 边距
/// 
/// # Returns
/// * `Option<(u32, u32)>` - 最优尺寸，None 表示无法容纳
pub fn find_optimal_size(
    sprites: &[SpriteInput],
    max_size: u32,
    allow_rotation: bool,
    padding: u32,
) -> Option<(u32, u32)> {
    // 计算总面积，估算初始尺寸
    let total_area: u32 = sprites.iter()
        .map(|s| (s.width + padding) * (s.height + padding))
        .sum();
    
    // POT (Power of Two) 尺寸列表
    let sizes = [128, 256, 512, 1024, 2048, 4096];
    
    for &size in &sizes {
        if size > max_size {
            break;
        }
        
        // 尝试正方形
        if (size * size) as u32 >= total_area {
            let mut packer = MaxRectsPacker::new(size, size, allow_rotation, padding);
            let result = packer.pack(sprites);
            if result.len() == sprites.len() {
                return Some((size, size));
            }
        }
    }
    
    // 尝试非正方形
    for &width in &sizes {
        for &height in &sizes {
            if width > max_size || height > max_size {
                continue;
            }
            if (width * height) as u32 >= total_area {
                let mut packer = MaxRectsPacker::new(width, height, allow_rotation, padding);
                let result = packer.pack(sprites);
                if result.len() == sprites.len() {
                    return Some((width, height));
                }
            }
        }
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_sprite(id: &str, width: u32, height: u32) -> SpriteInput {
        SpriteInput {
            id: id.to_string(),
            name: format!("{}.png", id),
            width,
            height,
            original_width: width,
            original_height: height,
            offset_x: 0,
            offset_y: 0,
            trimmed: false,
        }
    }
    
    #[test]
    fn test_packer_creation() {
        let packer = MaxRectsPacker::new(512, 512, true, 0);
        assert_eq!(packer.width, 512);
        assert_eq!(packer.height, 512);
        assert_eq!(packer.free_rects.len(), 1);
    }
    
    #[test]
    fn test_basic_packing() {
        let sprites = vec![
            create_test_sprite("a", 100, 100),
            create_test_sprite("b", 50, 50),
            create_test_sprite("c", 80, 60),
        ];
        
        let mut packer = MaxRectsPacker::new(512, 512, true, 0);
        let result = packer.pack(&sprites);
        
        assert_eq!(result.len(), 3);
        
        // 验证没有重叠
        for i in 0..result.len() {
            for j in (i + 1)..result.len() {
                let r1 = Rect::new(result[i].x, result[i].y, result[i].width, result[i].height);
                let r2 = Rect::new(result[j].x, result[j].y, result[j].width, result[j].height);
                assert!(!r1.intersects(&r2), "精灵 {} 和 {} 重叠", i, j);
            }
        }
    }
    
    #[test]
    fn test_fill_rate() {
        let sprites = vec![
            create_test_sprite("a", 256, 256),
            create_test_sprite("b", 256, 256),
            create_test_sprite("c", 256, 256),
            create_test_sprite("d", 256, 256),
        ];
        
        let mut packer = MaxRectsPacker::new(512, 512, false, 0);
        let result = packer.pack(&sprites);
        
        assert_eq!(result.len(), 4);
        assert!((packer.fill_rate() - 100.0).abs() < 0.01);
    }
    
    #[test]
    fn test_rotation() {
        // 一个窄长的精灵，需要旋转才能放入
        let sprites = vec![
            create_test_sprite("a", 200, 50), // 200x50
        ];
        
        // 150x200 的容器，不旋转无法放入 200 宽的图
        let mut packer = MaxRectsPacker::new(150, 200, true, 0);
        let result = packer.pack(&sprites);
        
        assert_eq!(result.len(), 1);
        assert!(result[0].rotated); // 应该被旋转
    }
    
    #[test]
    fn test_optimal_size() {
        let sprites = vec![
            create_test_sprite("a", 100, 100),
            create_test_sprite("b", 100, 100),
            create_test_sprite("c", 100, 100),
        ];
        
        let size = find_optimal_size(&sprites, 2048, true, 0);
        assert!(size.is_some());
        
        let (w, h) = size.unwrap();
        assert!(w <= 256 && h <= 256); // 应该选择较小的尺寸
    }
}
