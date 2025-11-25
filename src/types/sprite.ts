/**
 * 精灵相关类型定义
 * Sprite Type Definitions
 */

/**
 * 精灵数据 - 从后端返回的图片信息
 * @interface SpriteData
 */
export interface SpriteData {
  /** 唯一标识符 */
  id: string
  /** 文件名 */
  name: string
  /** 文件路径 */
  path: string
  /** 原始宽度 */
  width: number
  /** 原始高度 */
  height: number
  /** 裁剪后宽度 */
  trimmedWidth: number
  /** 裁剪后高度 */
  trimmedHeight: number
}

/**
 * 导入结果
 * @interface ImportResult
 */
export interface ImportResult {
  /** 成功导入的精灵列表 */
  sprites: SpriteData[]
  /** 失败的文件列表（带错误信息） */
  failed: string[]
  /** 总数 */
  total: number
}

/**
 * 已打包的精灵（布局信息）
 * @interface PackedSprite
 */
export interface PackedSprite {
  /** 精灵 ID */
  id: string
  /** 精灵名称 */
  name: string
  /** 在纹理图中的 X 坐标 */
  x: number
  /** 在纹理图中的 Y 坐标 */
  y: number
  /** 在纹理图中的宽度 */
  width: number
  /** 在纹理图中的高度 */
  height: number
  /** 是否旋转 90 度 */
  rotated: boolean
  /** 原始宽度（未裁剪前） */
  originalWidth: number
  /** 原始高度（未裁剪前） */
  originalHeight: number
  /** 是否进行了透明裁剪 */
  trimmed: boolean
  /** 裁剪偏移量 X */
  offsetX: number
  /** 裁剪偏移量 Y */
  offsetY: number
}

/**
 * 打包结果
 * @interface PackResult
 */
export interface PackResult {
  /** 打包后的精灵列表 */
  packedSprites: PackedSprite[]
  /** 纹理图宽度 */
  textureWidth: number
  /** 纹理图高度 */
  textureHeight: number
  /** 填充率（百分比） */
  fillRate: number
}

/**
 * 导出配置
 * @interface ExportConfig
 */
export interface ExportConfig {
  /** 已打包的精灵 */
  packedSprites: PackedSprite[]
  /** 纹理宽度 */
  textureWidth: number
  /** 纹理高度 */
  textureHeight: number
  /** 输出目录 */
  outputDir: string
  /** 输出文件名（不含扩展名） */
  outputName: string
  /** 是否打包为 ZIP */
  zipOutput: boolean
}

/**
 * 动画组（序列帧）
 * @interface AnimationGroup
 */
export interface AnimationGroup {
  /** 组名称 */
  name: string
  /** 前缀名称 */
  prefix: string
  /** 帧精灵列表 */
  frames: SpriteData[]
}

// ========== 拆分图集相关类型 ==========

/**
 * 精灵图集信息
 * @interface SpritesheetInfo
 */
export interface SpritesheetInfo {
  /** 文件路径 */
  path: string
  /** 文件名 */
  name: string
  /** 图集宽度 */
  width: number
  /** 图集高度 */
  height: number
}

/**
 * 自动检测结果
 * @interface AutoDetectResult
 */
export interface AutoDetectResult {
  /** 推荐帧宽 */
  frameWidth: number
  /** 推荐帧高 */
  frameHeight: number
  /** 推荐行数 */
  rows: number
  /** 推荐列数 */
  cols: number
  /** 检测置信度 (0-100) */
  confidence: number
}

/**
 * 扩展的图集信息（包含自动检测结果）
 * @interface SpritesheetInfoEx
 */
export interface SpritesheetInfoEx extends SpritesheetInfo {
  /** 自动检测结果 */
  autoDetect: AutoDetectResult | null
}

/**
 * 切分帧信息
 * @interface FrameInfo
 */
export interface FrameInfo {
  /** 帧名称（如 "idle_01.png"） */
  name: string
  /** 在图集中的 X 坐标 */
  x: number
  /** 在图集中的 Y 坐标 */
  y: number
  /** 帧宽度 */
  width: number
  /** 帧高度 */
  height: number
  /** 行索引 */
  row: number
  /** 列索引 */
  col: number
}

/**
 * 切分配置
 * @interface SplitConfig
 */
export interface SplitConfig {
  /** 行数 */
  rows: number
  /** 列数 */
  cols: number
  /** 固定帧宽（可选） */
  frameWidth?: number
  /** 固定帧高（可选） */
  frameHeight?: number
  /** 帧名称前缀 */
  namePrefix: string
  /** 起始编号 */
  startIndex?: number
}

/**
 * 切分结果
 * @interface SplitResult
 */
export interface SplitResult {
  /** 切分后的帧列表 */
  frames: FrameInfo[]
  /** 每帧宽度 */
  frameWidth: number
  /** 每帧高度 */
  frameHeight: number
  /** 总帧数 */
  totalFrames: number
}

// ========== 多区域导出相关类型 ==========

/**
 * 动画区域定义
 * @interface AnimationRegion
 */
export interface AnimationRegion {
  /** 唯一标识符 */
  id: string
  /** 区域名称（如 "idle"） */
  name: string
  /** 起始行（0-indexed） */
  startRow: number
  /** 起始列（0-indexed） */
  startCol: number
  /** 帧数 */
  frameCount: number
  /** 帧宽度 */
  frameWidth: number
  /** 帧高度 */
  frameHeight: number
  /** 区域颜色（用于可视化） */
  color?: string
}

/**
 * 多区域导出结果
 * @interface MultiExportResult
 */
export interface MultiExportResult {
  /** 成功导出的 Plist 文件路径列表 */
  exportedFiles: string[]
  /** 成功导出的 PNG 文件路径列表 */
  exportedPngs: string[]
  /** 失败的区域名称及错误信息 */
  failed: [string, string][]
  /** 总区域数 */
  total: number
}
