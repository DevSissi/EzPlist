/**
 * Tauri API 封装
 * Tauri API Wrapper
 */

import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { convertFileSrc } from '@tauri-apps/api/core'
import type { 
  ImportResult, 
  PackResult, 
  ExportConfig, 
  SpriteData,
  SpritesheetInfo,
  SpritesheetInfoEx,
  SplitConfig,
  SplitResult,
  FrameInfo,
  AnimationRegion,
  MultiExportResult,
} from '../types/sprite'

/**
 * 打开文件选择对话框选择图片
 * @returns 选中的文件路径数组，取消则返回 null
 */
export async function selectImageFiles(): Promise<string[] | null> {
  const result = await open({
    multiple: true,
    filters: [
      {
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
      },
    ],
    title: '选择图片文件 (Select Image Files)',
  })

  if (!result) return null
  if (Array.isArray(result)) {
    return result
  }
  return [result]
}

/**
 * 导入图片
 * @param paths 图片文件路径列表
 * @returns 导入结果
 */
export async function importImages(paths: string[]): Promise<ImportResult> {
  const result = await invoke<ImportResult>('import_images', { paths })
  // 后端使用 snake_case，前端使用 camelCase，需要转换
  return {
    sprites: result.sprites.map(sprite => ({
      id: sprite.id,
      name: sprite.name,
      path: sprite.path,
      width: sprite.width,
      height: sprite.height,
      trimmedWidth: (sprite as any).trimmed_width ?? sprite.width,
      trimmedHeight: (sprite as any).trimmed_height ?? sprite.height,
    })),
    failed: result.failed,
    total: result.total,
  }
}

/**
 * 打包配置
 */
export interface PackConfig {
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
  /** 是否启用透明裁剪 */
  trimTransparent?: boolean
  /** 是否允许旋转 */
  allowRotation?: boolean
  /** 精灵间距 */
  padding?: number
  /** 是否自动选择最优尺寸 */
  autoSize?: boolean
}

/**
 * 打包精灵图
 * @param sprites 精灵数据列表
 * @param config 打包配置
 * @returns 打包结果
 */
export async function packSprites(
  sprites: SpriteData[],
  config: PackConfig = {}
): Promise<PackResult> {
  // 转换为后端需要的 snake_case 格式
  const backendSprites = sprites.map(s => ({
    id: s.id,
    name: s.name,
    path: s.path,
    width: s.width,
    height: s.height,
    trimmed_width: s.trimmedWidth,
    trimmed_height: s.trimmedHeight,
  }))
  
  const result = await invoke<any>('pack_sprites', {
    sprites: backendSprites,
    config: {
      maxWidth: config.maxWidth ?? 2048,
      maxHeight: config.maxHeight ?? 2048,
      trimTransparent: config.trimTransparent ?? true,
      allowRotation: config.allowRotation ?? true,
      padding: config.padding ?? 1,
      autoSize: config.autoSize ?? true,
    },
  })
  
  // 转换为前端 camelCase 格式
  return {
    packedSprites: result.packed_sprites.map((s: any) => ({
      id: s.id,
      name: s.name,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      rotated: s.rotated,
      originalWidth: s.original_width,
      originalHeight: s.original_height,
      trimmed: s.trimmed,
      offsetX: s.offset_x,
      offsetY: s.offset_y,
    })),
    textureWidth: result.texture_width,
    textureHeight: result.texture_height,
    fillRate: result.fill_rate,
  }
}

/**
 * 导出精灵表
 * @param config 导出配置
 * @returns 导出路径
 */
export async function exportSpriteSheet(config: ExportConfig): Promise<string> {
  return await invoke<string>('export_sprite_sheet', { config })
}

/**
 * 将本地文件路径转换为可在 WebView 中使用的 URL
 * @param filePath 本地文件路径
 * @returns 可用于 img src 的 URL
 */
export function getAssetUrl(filePath: string): string {
  return convertFileSrc(filePath)
}

// ========== 拆分图集 API ==========

/**
 * 选择单个精灵图集文件
 * @returns 选中的文件路径，取消则返回 null
 */
export async function selectSpritesheetFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [
      {
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'webp'],
      },
    ],
    title: '选择精灵图集 (Select Spritesheet)',
  })

  if (!result) return null
  if (Array.isArray(result)) {
    return result[0] || null
  }
  return result
}

/**
 * 导入精灵图集（带自动检测）
 * @param path 图集文件路径
 * @returns 图集信息（含自动检测结果）
 */
export async function importSpritesheet(path: string): Promise<SpritesheetInfoEx> {
  const result = await invoke<any>('import_spritesheet', { path })
  
  // 后端使用 camelCase 序列化
  return {
    path: result.path,
    name: result.name,
    width: result.width,
    height: result.height,
    autoDetect: result.autoDetect ? {
      frameWidth: result.autoDetect.frameWidth,
      frameHeight: result.autoDetect.frameHeight,
      rows: result.autoDetect.rows,
      cols: result.autoDetect.cols,
      confidence: result.autoDetect.confidence,
    } : null,
  }
}

/**
 * 计算切分帧信息
 * @param spritesheet 图集信息
 * @param config 切分配置
 * @returns 切分结果
 */
export async function calculateSplitFrames(
  spritesheet: SpritesheetInfo,
  config: SplitConfig
): Promise<SplitResult> {
  const result = await invoke<any>('calculate_split_frames', {
    spritesheet,
    config: {
      rows: config.rows,
      cols: config.cols,
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight,
      namePrefix: config.namePrefix,
      startIndex: config.startIndex ?? 1,
    },
  })

  return {
    frames: result.frames.map((f: any) => ({
      name: f.name,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      row: f.row,
      col: f.col,
    })),
    frameWidth: result.frame_width,
    frameHeight: result.frame_height,
    totalFrames: result.total_frames,
  }
}

/**
 * 选择导出路径
 * @param defaultName 默认文件名
 * @returns 选中的保存路径，取消则返回 null
 */
export async function selectSavePath(defaultName: string): Promise<string | null> {
  const result = await save({
    defaultPath: defaultName,
    filters: [
      {
        name: 'Plist',
        extensions: ['plist'],
      },
    ],
    title: '导出 Plist (Export Plist)',
  })

  return result
}

/**
 * 导出配置
 */
export interface ExportSplitConfig {
  /** 是否重命名 PNG 文件 */
  renamePng: boolean
}

/**
 * 导出结果
 */
export interface ExportSplitResult {
  /** Plist 文件路径 */
  plistPath: string
  /** PNG 文件路径（如果重命名了） */
  pngPath: string | null
}

/**
 * 导出切分后的 Plist（自动保存到 PNG 同目录）
 * @param spritesheet 图集信息
 * @param frames 帧列表
 * @param outputName 输出文件名（不含扩展名）
 * @param config 导出配置
 * @returns 导出结果
 */
export async function exportSplitPlist(
  spritesheet: SpritesheetInfo,
  frames: FrameInfo[],
  outputName: string,
  config: ExportSplitConfig = { renamePng: false }
): Promise<ExportSplitResult> {
  const result = await invoke<any>('export_split_plist', {
    spritesheet,
    frames,
    outputName,
    config: {
      renamePng: config.renamePng,
    },
  })
  
  return {
    plistPath: result.plist_path,
    pngPath: result.png_path,
  }
}

// ========== 多区域导出 API ==========

/**
 * 计算区域帧预览
 * @param spritesheet 图集信息
 * @param region 动画区域定义
 * @returns 切分结果
 */
export async function calculateRegionPreview(
  spritesheet: SpritesheetInfo,
  region: Omit<AnimationRegion, 'id' | 'color'>
): Promise<SplitResult> {
  const result = await invoke<any>('calculate_region_preview', {
    spritesheet,
    region: {
      name: region.name,
      startRow: region.startRow,
      startCol: region.startCol,
      frameCount: region.frameCount,
      frameWidth: region.frameWidth,
      frameHeight: region.frameHeight,
    },
  })

  return {
    frames: result.frames.map((f: any) => ({
      name: f.name,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      row: f.row,
      col: f.col,
    })),
    frameWidth: result.frame_width,
    frameHeight: result.frame_height,
    totalFrames: result.total_frames,
  }
}

/**
 * 批量导出多个动画区域的 Plist
 * @param spritesheet 图集信息
 * @param regions 动画区域列表
 * @returns 批量导出结果
 */
export async function exportMultiPlist(
  spritesheet: SpritesheetInfo,
  regions: AnimationRegion[]
): Promise<MultiExportResult> {
  const result = await invoke<any>('export_multi_plist', {
    spritesheet,
    regions: regions.map(r => ({
      name: r.name,
      startRow: r.startRow,
      startCol: r.startCol,
      frameCount: r.frameCount,
      frameWidth: r.frameWidth,
      frameHeight: r.frameHeight,
    })),
  })

  return {
    exportedFiles: result.exported_files,
    exportedPngs: result.exported_pngs,
    failed: result.failed,
    total: result.total,
  }
}

// ========== 合成图集 API ==========

/**
 * 合成精灵位置信息
 */
export interface ComposeSpritePosition {
  /** 精灵 ID */
  id: string
  /** 精灵名称 */
  name: string
  /** 图片路径 */
  path: string
  /** 原始宽度 */
  width: number
  /** 原始高度 */
  height: number
  /** 在画布中的 X 坐标 */
  x: number
  /** 在画布中的 Y 坐标 */
  y: number
}

/**
 * 合成配置
 */
export interface ComposeConfig {
  /** 输出目录 */
  outputDir: string
  /** 输出文件名（不含扩展名） */
  outputName: string
  /** 画布边距 */
  padding?: number
  /** 是否裁剪到最小边界 */
  trimToBounds?: boolean
}

/**
 * 合成结果
 */
export interface ComposeResult {
  /** PNG 文件路径 */
  pngPath: string
  /** Plist 文件路径 */
  plistPath: string
  /** 最终纹理宽度 */
  textureWidth: number
  /** 最终纹理高度 */
  textureHeight: number
  /** 精灵数量 */
  spriteCount: number
}

/**
 * 合成精灵图
 * @param sprites 精灵位置信息列表
 * @param config 合成配置
 * @returns 合成结果
 */
export async function composeSprites(
  sprites: ComposeSpritePosition[],
  config: ComposeConfig
): Promise<ComposeResult> {
  const result = await invoke<any>('compose_sprites', {
    sprites,
    config: {
      outputDir: config.outputDir,
      outputName: config.outputName,
      padding: config.padding ?? 0,
      trimToBounds: config.trimToBounds ?? true,
    },
  })

  return {
    pngPath: result.png_path,
    plistPath: result.plist_path,
    textureWidth: result.texture_width,
    textureHeight: result.texture_height,
    spriteCount: result.sprite_count,
  }
}

/**
 * 合成边界信息
 */
export interface ComposeBoundsInfo {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  spriteCount: number
}

/**
 * 预览合成边界
 * @param sprites 精灵位置信息列表
 * @returns 边界信息
 */
export async function previewComposeBounds(
  sprites: ComposeSpritePosition[]
): Promise<ComposeBoundsInfo> {
  const result = await invoke<any>('preview_compose_bounds', { sprites })

  return {
    minX: result.min_x,
    minY: result.min_y,
    maxX: result.max_x,
    maxY: result.max_y,
    width: result.width,
    height: result.height,
    spriteCount: result.sprite_count,
  }
}

/**
 * 选择导出目录
 * @returns 选中的目录路径，取消则返回 null
 */
export async function selectExportDirectory(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: '选择导出目录 (Select Export Directory)',
  })

  if (!result) return null
  if (Array.isArray(result)) {
    return result[0] || null
  }
  return result
}
