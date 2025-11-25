/// 精灵图集切分命令 (Spritesheet Split Commands)
/// 
/// 将单张精灵图集按网格切分，生成帧信息和 Plist

use crate::core::types::{SpritesheetInfo, FrameInfo, SplitConfig, SplitResult};
use image::{ImageReader, GenericImageView, Pixel};
use std::path::Path;

/// 常见的像素帧尺寸（按优先级排序）
const COMMON_FRAME_SIZES: [u32; 10] = [128, 64, 96, 48, 32, 256, 16, 192, 512, 24];

/// 自动检测结果
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoDetectResult {
    /// 推荐帧宽
    pub frame_width: u32,
    /// 推荐帧高
    pub frame_height: u32,
    /// 推荐行数
    pub rows: u32,
    /// 推荐列数
    pub cols: u32,
    /// 检测置信度 (0-100)
    pub confidence: u32,
}

/// 扩展的图集信息（包含自动检测结果）
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpritesheetInfoEx {
    /// 基础信息
    #[serde(flatten)]
    pub info: SpritesheetInfo,
    /// 自动检测结果
    pub auto_detect: Option<AutoDetectResult>,
}

/// 基于透明度检测帧边界
/// 
/// 扫描图像的每一列/行，检测全透明的列/行作为帧边界
/// 返回 (帧宽, 帧高, 行数, 列数)
fn detect_frames_by_transparency(img: &image::DynamicImage) -> Option<(u32, u32, u32, u32)> {
    let (width, height) = img.dimensions();
    
    // 检测透明度阈值（alpha < 10 视为透明）
    const ALPHA_THRESHOLD: u8 = 10;
    
    // 扫描每一列，检测是否全透明
    let mut col_transparent = vec![true; width as usize];
    for x in 0..width {
        for y in 0..height {
            let pixel = img.get_pixel(x, y);
            let alpha = pixel.channels()[3];
            if alpha > ALPHA_THRESHOLD {
                col_transparent[x as usize] = false;
                break;
            }
        }
    }
    
    // 扫描每一行，检测是否全透明
    let mut row_transparent = vec![true; height as usize];
    for y in 0..height {
        for x in 0..width {
            let pixel = img.get_pixel(x, y);
            let alpha = pixel.channels()[3];
            if alpha > ALPHA_THRESHOLD {
                row_transparent[y as usize] = false;
                break;
            }
        }
    }
    
    // 统计连续的非透明区域数量（帧数）
    let cols = count_content_regions(&col_transparent);
    let rows = count_content_regions(&row_transparent);
    
    // 需要至少 2 个帧或有明显的透明分隔才有意义
    if cols >= 2 || rows >= 2 {
        // 计算帧尺寸：图像尺寸 / 帧数（取平均）
        let frame_width = width / cols;
        let frame_height = height / rows;
        
        // 合理性检查
        if frame_width >= 16 && frame_height >= 16 {
            return Some((frame_width, frame_height, rows, cols));
        }
    }
    
    // 如果只有 1 行，检查是否有明显的列分隔
    if rows == 1 && cols >= 2 {
        let frame_width = width / cols;
        if frame_width >= 16 {
            return Some((frame_width, height, 1, cols));
        }
    }
    
    // 如果只有 1 列，检查是否有明显的行分隔
    if cols == 1 && rows >= 2 {
        let frame_height = height / rows;
        if frame_height >= 16 {
            return Some((width, frame_height, rows, 1));
        }
    }
    
    None
}

/// 统计连续的非透明（内容）区域数量
fn count_content_regions(transparent: &[bool]) -> u32 {
    let mut count = 0;
    let mut in_content = false;
    
    for &is_transparent in transparent {
        if !is_transparent {
            // 当前位置有内容
            if !in_content {
                // 进入新的内容区域
                count += 1;
                in_content = true;
            }
        } else {
            // 当前位置透明
            in_content = false;
        }
    }
    
    count
}

/// 自动检测帧尺寸
/// 
/// 策略顺序：
/// 1. 基于透明度的帧边界检测（最准确）
/// 2. 单行精灵图假设（帧高 = 图片高度，正方形帧）
/// 3. 常见尺寸整除检测
/// 4. GCD 推断
fn auto_detect_frame_size(width: u32, height: u32) -> Option<AutoDetectResult> {
    // 注意：基于透明度的检测在 auto_detect_frame_size_with_image 中实现
    // 这里只做数学推断作为后备
    
    // 策略1：对于单行精灵图，假设帧为正方形（帧高 = 图片高度）
    // 典型场景：720x64 → 90x64? 不一定是正方形
    // 但如果 width % height == 0，很可能是正方形帧
    if height <= 256 && width % height == 0 {
        let cols = width / height;
        if cols >= 1 && cols <= 50 {
            return Some(AutoDetectResult {
                frame_width: height,  // 假设正方形
                frame_height: height,
                rows: 1,
                cols,
                confidence: 75,
            });
        }
    }
    
    // 策略2：尝试常见尺寸，找到能同时整除宽高的尺寸
    for &size in COMMON_FRAME_SIZES.iter() {
        if height % size == 0 && width % size == 0 {
            let rows = height / size;
            let cols = width / size;
            if rows >= 1 && cols >= 1 && rows <= 50 && cols <= 50 {
                return Some(AutoDetectResult {
                    frame_width: size,
                    frame_height: size,
                    rows,
                    cols,
                    confidence: 70,
                });
            }
        }
    }
    
    // 策略3：尝试找到合理的帧尺寸（优先大尺寸）
    // 对于 720x64，尝试 height 作为帧高，找能整除 width 的帧宽
    if height <= 256 {
        // 找能整除 width 的因数，接近 height 的优先
        let factors = find_factors(width);
        for factor in factors.iter().rev() {
            let factor = *factor;
            if factor >= 32 && factor <= 256 {
                let cols = width / factor;
                if cols >= 1 && cols <= 50 {
                    return Some(AutoDetectResult {
                        frame_width: factor,
                        frame_height: height,
                        rows: 1,
                        cols,
                        confidence: 65,
                    });
                }
            }
        }
    }
    
    // 策略4：GCD 推断
    let gcd = gcd(width, height);
    if gcd >= 16 && gcd <= 512 {
        let rows = height / gcd;
        let cols = width / gcd;
        if rows >= 1 && cols >= 1 && rows <= 50 && cols <= 50 {
            return Some(AutoDetectResult {
                frame_width: gcd,
                frame_height: gcd,
                rows,
                cols,
                confidence: 50,
            });
        }
    }
    
    None
}

/// 找到一个数的所有因数
fn find_factors(n: u32) -> Vec<u32> {
    let mut factors = Vec::new();
    let sqrt_n = (n as f64).sqrt() as u32;
    
    for i in 1..=sqrt_n {
        if n % i == 0 {
            factors.push(i);
            if i != n / i {
                factors.push(n / i);
            }
        }
    }
    
    factors.sort();
    factors
}

/// 带图像的自动检测（使用透明度检测）
fn auto_detect_with_image(img: &image::DynamicImage, width: u32, height: u32) -> Option<AutoDetectResult> {
    // 首先尝试透明度检测
    if let Some((fw, fh, rows, cols)) = detect_frames_by_transparency(img) {
        println!("透明度检测成功: {}x{}, {}行{}列", fw, fh, rows, cols);
        return Some(AutoDetectResult {
            frame_width: fw,
            frame_height: fh,
            rows,
            cols,
            confidence: 95, // 最高置信度：基于实际图像内容
        });
    }
    
    // 透明度检测失败，使用数学推断
    auto_detect_frame_size(width, height)
}

/// 计算最大公约数
fn gcd(a: u32, b: u32) -> u32 {
    if b == 0 { a } else { gcd(b, a % b) }
}

/// 导入精灵图集（带自动检测）
/// 
/// # Arguments
/// * `path` - 图集文件路径
/// 
/// # Returns
/// * `Result<SpritesheetInfoEx, String>` - 图集信息（含自动检测结果）或错误
#[tauri::command]
pub async fn import_spritesheet(path: String) -> Result<SpritesheetInfoEx, String> {
    println!("导入精灵图集: {}", path);
    
    // 检查文件是否存在
    if !Path::new(&path).exists() {
        return Err(format!("文件不存在: {}", path));
    }
    
    // 加载图像获取尺寸
    let img = ImageReader::open(&path)
        .map_err(|e| format!("无法打开图像: {}", e))?
        .decode()
        .map_err(|e| format!("无法解码图像: {}", e))?;
    
    let (width, height) = img.dimensions();
    
    // 提取文件名
    let name = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    // 自动检测帧尺寸（优先使用透明度检测）
    let auto_detect = auto_detect_with_image(&img, width, height);
    
    if let Some(ref detect) = auto_detect {
        println!(
            "图集加载成功: {}x{}, 自动检测: {}x{} ({}行{}列, 置信度{}%)",
            width, height,
            detect.frame_width, detect.frame_height,
            detect.rows, detect.cols,
            detect.confidence
        );
    } else {
        println!("图集加载成功: {}x{}, 无法自动检测帧尺寸", width, height);
    }
    
    Ok(SpritesheetInfoEx {
        info: SpritesheetInfo {
            path,
            name,
            width,
            height,
        },
        auto_detect,
    })
}

/// 计算切分帧信息（预览用）
/// 
/// # Arguments
/// * `spritesheet` - 图集信息
/// * `config` - 切分配置
/// 
/// # Returns
/// * `Result<SplitResult, String>` - 切分结果
#[tauri::command]
pub async fn calculate_split_frames(
    spritesheet: SpritesheetInfo,
    config: SplitConfig,
) -> Result<SplitResult, String> {
    if config.rows == 0 || config.cols == 0 {
        return Err("行数和列数必须大于0".to_string());
    }
    
    // 计算每帧尺寸
    let frame_width = config.frame_width.unwrap_or(spritesheet.width / config.cols);
    let frame_height = config.frame_height.unwrap_or(spritesheet.height / config.rows);
    
    if frame_width == 0 || frame_height == 0 {
        return Err("帧尺寸计算结果为0，请检查配置".to_string());
    }
    
    let start_index = config.start_index.unwrap_or(1);
    let mut frames = Vec::new();
    let mut index = start_index;
    
    for row in 0..config.rows {
        for col in 0..config.cols {
            let x = col * frame_width;
            let y = row * frame_height;
            
            // 检查是否超出图集边界
            if x + frame_width > spritesheet.width || y + frame_height > spritesheet.height {
                continue;
            }
            
            let name = format!("{}_{:02}.png", config.name_prefix, index);
            
            frames.push(FrameInfo {
                name,
                x,
                y,
                width: frame_width,
                height: frame_height,
                row,
                col,
            });
            
            index += 1;
        }
    }
    
    let total_frames = frames.len() as u32;
    
    println!("切分计算完成: {}帧 ({}x{})", total_frames, frame_width, frame_height);
    
    Ok(SplitResult {
        frames,
        frame_width,
        frame_height,
        total_frames,
    })
}

/// 导出配置
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSplitConfig {
    /// 是否重命名 PNG 文件（使其与 Plist 同名）
    pub rename_png: bool,
}

/// 导出结果
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSplitResult {
    /// Plist 文件路径
    pub plist_path: String,
    /// PNG 文件路径（如果重命名了）
    pub png_path: Option<String>,
}

/// 导出切分后的 Plist 文件（自动保存到 PNG 同目录）
/// 
/// # Arguments
/// * `spritesheet` - 图集信息
/// * `frames` - 帧信息列表
/// * `output_name` - 输出文件名（不含扩展名，如 "player_idle"）
/// * `config` - 导出配置
/// 
/// # Returns
/// * `Result<ExportSplitResult, String>` - 导出结果或错误
#[tauri::command]
pub async fn export_split_plist(
    spritesheet: SpritesheetInfo,
    frames: Vec<FrameInfo>,
    output_name: String,
    config: Option<ExportSplitConfig>,
) -> Result<ExportSplitResult, String> {
    let config = config.unwrap_or(ExportSplitConfig { rename_png: false });
    use std::collections::HashMap;
    use std::fs;
    
    if frames.is_empty() {
        return Err("没有帧可导出".to_string());
    }
    
    // 构建 Plist 数据
    let mut frames_dict: HashMap<String, plist::Value> = HashMap::new();
    
    for frame in &frames {
        let mut frame_data: HashMap<String, plist::Value> = HashMap::new();
        
        // Cocos2d-x Format 3 格式
        // spriteOffset: 裁剪偏移（这里没有裁剪，所以是 {0,0}）
        frame_data.insert(
            "spriteOffset".to_string(),
            plist::Value::String("{0,0}".to_string()),
        );
        
        // spriteSize: 帧尺寸
        frame_data.insert(
            "spriteSize".to_string(),
            plist::Value::String(format!("{{{},{}}}", frame.width, frame.height)),
        );
        
        // spriteSourceSize: 原始尺寸（同 spriteSize）
        frame_data.insert(
            "spriteSourceSize".to_string(),
            plist::Value::String(format!("{{{},{}}}", frame.width, frame.height)),
        );
        
        // textureRect: {{x,y},{width,height}}
        frame_data.insert(
            "textureRect".to_string(),
            plist::Value::String(format!(
                "{{{{{},{}}},{{{},{}}}}}",
                frame.x, frame.y, frame.width, frame.height
            )),
        );
        
        // textureRotated: 是否旋转
        frame_data.insert(
            "textureRotated".to_string(),
            plist::Value::Boolean(false),
        );
        
        frames_dict.insert(frame.name.clone(), plist::Value::Dictionary(frame_data.into_iter().collect()));
    }
    
    // 获取 PNG 文件所在目录
    let png_path = Path::new(&spritesheet.path);
    let png_dir = png_path.parent().unwrap_or(Path::new("."));
    let png_ext = png_path.extension().and_then(|e| e.to_str()).unwrap_or("png");
    
    // 决定最终的纹理文件名
    let final_texture_name = if config.rename_png {
        format!("{}.{}", output_name, png_ext)
    } else {
        spritesheet.name.clone()
    };
    
    // 构建 metadata
    let mut metadata: HashMap<String, plist::Value> = HashMap::new();
    metadata.insert("format".to_string(), plist::Value::Integer(3.into()));
    metadata.insert(
        "realTextureFileName".to_string(),
        plist::Value::String(final_texture_name.clone()),
    );
    metadata.insert(
        "size".to_string(),
        plist::Value::String(format!("{{{},{}}}", spritesheet.width, spritesheet.height)),
    );
    metadata.insert(
        "textureFileName".to_string(),
        plist::Value::String(final_texture_name.clone()),
    );
    
    // 计算简单的 smartupdate hash
    use md5::{Md5, Digest};
    let mut hasher = Md5::new();
    hasher.update(format!("{}_{}", final_texture_name, frames.len()).as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    metadata.insert("smartupdate".to_string(), plist::Value::String(hash));
    
    // 构建根字典
    let mut root: HashMap<String, plist::Value> = HashMap::new();
    root.insert("frames".to_string(), plist::Value::Dictionary(frames_dict.into_iter().collect()));
    root.insert("metadata".to_string(), plist::Value::Dictionary(metadata.into_iter().collect()));
    
    let plist_value = plist::Value::Dictionary(root.into_iter().collect());
    
    // 保存 Plist 到 PNG 同目录
    let plist_path = png_dir.join(format!("{}.plist", output_name));
    let mut file = fs::File::create(&plist_path)
        .map_err(|e| format!("无法创建文件: {}", e))?;
    
    plist::to_writer_xml(&mut file, &plist_value)
        .map_err(|e| format!("写入 Plist 失败: {}", e))?;
    
    println!("Plist 导出成功: {}", plist_path.display());
    
    // 如果需要重命名 PNG 文件
    let renamed_png_path = if config.rename_png {
        let new_png_path = png_dir.join(&final_texture_name);
        
        // 只有当新旧路径不同时才重命名
        if new_png_path != png_path {
            fs::copy(&spritesheet.path, &new_png_path)
                .map_err(|e| format!("复制 PNG 文件失败: {}", e))?;
            println!("PNG 复制成功: {}", new_png_path.display());
            Some(new_png_path.to_string_lossy().to_string())
        } else {
            None
        }
    } else {
        None
    };
    
    Ok(ExportSplitResult {
        plist_path: plist_path.to_string_lossy().to_string(),
        png_path: renamed_png_path,
    })
}

/// 多区域批量导出结果
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiExportResult {
    /// 成功导出的 Plist 文件路径列表
    pub exported_files: Vec<String>,
    /// 导出的 PNG 文件路径列表
    pub exported_pngs: Vec<String>,
    /// 失败的区域名称及错误信息
    pub failed: Vec<(String, String)>,
    /// 总区域数
    pub total: usize,
}

/// 批量导出多个动画区域的 Plist 和裁剪后的 PNG
/// 
/// # Arguments
/// * `spritesheet` - 图集信息
/// * `regions` - 动画区域列表
/// 
/// # Returns
/// * `Result<MultiExportResult, String>` - 批量导出结果
#[tauri::command]
pub async fn export_multi_plist(
    spritesheet: SpritesheetInfo,
    regions: Vec<crate::core::types::AnimationRegion>,
) -> Result<MultiExportResult, String> {
    use std::collections::HashMap;
    use std::fs;
    use image::GenericImageView;
    
    if regions.is_empty() {
        return Err("没有区域可导出".to_string());
    }
    
    // 加载原图
    let source_img = ImageReader::open(&spritesheet.path)
        .map_err(|e| format!("无法打开图像: {}", e))?
        .decode()
        .map_err(|e| format!("无法解码图像: {}", e))?;
    
    // 获取 PNG 文件所在目录
    let png_path = Path::new(&spritesheet.path);
    let png_dir = png_path.parent().unwrap_or(Path::new("."));
    
    let mut exported_files = Vec::new();
    let mut exported_pngs = Vec::new();
    let mut failed: Vec<(String, String)> = Vec::new();
    let total = regions.len();
    
    for region in &regions {
        // 计算该区域的帧信息
        let frames = calculate_region_frames(&spritesheet, region);
        
        if frames.is_empty() {
            failed.push((region.name.clone(), "区域没有有效帧".to_string()));
            continue;
        }
        
        // 计算区域边界（所有帧的最小外接矩形）
        let min_x = frames.iter().map(|f| f.x).min().unwrap_or(0);
        let min_y = frames.iter().map(|f| f.y).min().unwrap_or(0);
        let max_x = frames.iter().map(|f| f.x + f.width).max().unwrap_or(0);
        let max_y = frames.iter().map(|f| f.y + f.height).max().unwrap_or(0);
        
        let crop_width = max_x - min_x;
        let crop_height = max_y - min_y;
        
        // 裁剪区域图像
        let cropped_img = source_img.crop_imm(min_x, min_y, crop_width, crop_height);
        
        // 保存裁剪后的 PNG
        let cropped_png_name = format!("{}.png", region.name);
        let cropped_png_path = png_dir.join(&cropped_png_name);
        
        if let Err(e) = cropped_img.save(&cropped_png_path) {
            failed.push((region.name.clone(), format!("保存 PNG 失败: {}", e)));
            continue;
        }
        
        println!("PNG 导出成功: {}", cropped_png_path.display());
        exported_pngs.push(cropped_png_path.to_string_lossy().to_string());
        
        // 构建 Plist 数据（坐标相对于裁剪后的图像）
        let mut frames_dict: HashMap<String, plist::Value> = HashMap::new();
        
        for frame in &frames {
            let mut frame_data: HashMap<String, plist::Value> = HashMap::new();
            
            // 相对于裁剪后图像的坐标
            let rel_x = frame.x - min_x;
            let rel_y = frame.y - min_y;
            
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
                    rel_x, rel_y, frame.width, frame.height
                )),
            );
            
            frame_data.insert(
                "textureRotated".to_string(),
                plist::Value::Boolean(false),
            );
            
            frames_dict.insert(frame.name.clone(), plist::Value::Dictionary(frame_data.into_iter().collect()));
        }
        
        // 构建 metadata（指向裁剪后的 PNG）
        let mut metadata: HashMap<String, plist::Value> = HashMap::new();
        metadata.insert("format".to_string(), plist::Value::Integer(3.into()));
        metadata.insert(
            "realTextureFileName".to_string(),
            plist::Value::String(cropped_png_name.clone()),
        );
        metadata.insert(
            "size".to_string(),
            plist::Value::String(format!("{{{},{}}}", crop_width, crop_height)),
        );
        metadata.insert(
            "textureFileName".to_string(),
            plist::Value::String(cropped_png_name),
        );
        
        // 计算 smartupdate hash
        use md5::{Md5, Digest};
        let mut hasher = Md5::new();
        hasher.update(format!("{}_{}", region.name, frames.len()).as_bytes());
        let hash = format!("{:x}", hasher.finalize());
        metadata.insert("smartupdate".to_string(), plist::Value::String(hash));
        
        // 构建根字典
        let mut root: HashMap<String, plist::Value> = HashMap::new();
        root.insert("frames".to_string(), plist::Value::Dictionary(frames_dict.into_iter().collect()));
        root.insert("metadata".to_string(), plist::Value::Dictionary(metadata.into_iter().collect()));
        
        let plist_value = plist::Value::Dictionary(root.into_iter().collect());
        
        // 保存 Plist
        let plist_path = png_dir.join(format!("{}.plist", region.name));
        
        match fs::File::create(&plist_path) {
            Ok(mut file) => {
                match plist::to_writer_xml(&mut file, &plist_value) {
                    Ok(_) => {
                        println!("Plist 导出成功: {}", plist_path.display());
                        exported_files.push(plist_path.to_string_lossy().to_string());
                    }
                    Err(e) => {
                        failed.push((region.name.clone(), format!("写入 Plist 失败: {}", e)));
                    }
                }
            }
            Err(e) => {
                failed.push((region.name.clone(), format!("创建 Plist 文件失败: {}", e)));
            }
        }
    }
    
    Ok(MultiExportResult {
        exported_files,
        exported_pngs,
        failed,
        total,
    })
}

/// 计算单个区域的帧信息
/// 
/// # Arguments
/// * `spritesheet` - 图集信息
/// * `region` - 动画区域定义
/// 
/// # Returns
/// * `Vec<FrameInfo>` - 该区域的帧列表
fn calculate_region_frames(
    spritesheet: &SpritesheetInfo,
    region: &crate::core::types::AnimationRegion,
) -> Vec<FrameInfo> {
    let mut frames = Vec::new();
    
    // 计算图集的列数（用于换行计算）
    let cols_in_sheet = spritesheet.width / region.frame_width;
    
    for i in 0..region.frame_count {
        // 计算当前帧在区域中的行列位置
        let col_offset = i % cols_in_sheet;
        let row_offset = i / cols_in_sheet;
        
        // 计算全局行列
        let global_col = region.start_col + col_offset;
        let global_row = region.start_row + row_offset;
        
        // 计算像素坐标
        let x = global_col * region.frame_width;
        let y = global_row * region.frame_height;
        
        // 检查是否超出边界
        if x + region.frame_width > spritesheet.width || y + region.frame_height > spritesheet.height {
            continue;
        }
        
        let name = format!("{}_{:02}.png", region.name, i + 1);
        
        frames.push(FrameInfo {
            name,
            x,
            y,
            width: region.frame_width,
            height: region.frame_height,
            row: global_row,
            col: global_col,
        });
    }
    
    frames
}

/// 计算区域帧信息（预览用，前端调用）
/// 
/// # Arguments
/// * `spritesheet` - 图集信息
/// * `region` - 动画区域定义
/// 
/// # Returns
/// * `Result<SplitResult, String>` - 切分结果
#[tauri::command]
pub async fn calculate_region_preview(
    spritesheet: SpritesheetInfo,
    region: crate::core::types::AnimationRegion,
) -> Result<SplitResult, String> {
    let frames = calculate_region_frames(&spritesheet, &region);
    
    if frames.is_empty() {
        return Err("区域配置无效，没有生成帧".to_string());
    }
    
    Ok(SplitResult {
        frames: frames.clone(),
        frame_width: region.frame_width,
        frame_height: region.frame_height,
        total_frames: frames.len() as u32,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_split_calculation() {
        let spritesheet = SpritesheetInfo {
            path: "test.png".to_string(),
            name: "test.png".to_string(),
            width: 512,
            height: 256,
        };
        
        let config = SplitConfig {
            rows: 2,
            cols: 4,
            frame_width: None,
            frame_height: None,
            name_prefix: "frame".to_string(),
            start_index: Some(1),
        };
        
        // 模拟异步调用
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(calculate_split_frames(spritesheet, config));
        
        assert!(result.is_ok());
        let split = result.unwrap();
        assert_eq!(split.total_frames, 8);
        assert_eq!(split.frame_width, 128);
        assert_eq!(split.frame_height, 128);
    }
}
