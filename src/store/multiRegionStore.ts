/**
 * 多区域状态管理
 * Multi-Region State Management
 */

import { create } from 'zustand'
import type { SpritesheetInfoEx, AnimationRegion, SplitResult } from '../types/sprite'

/**
 * 预定义颜色列表（用于区分不同区域）
 */
const REGION_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 多区域状态接口
 */
interface MultiRegionState {
  /** 当前图集 */
  spritesheet: SpritesheetInfoEx | null
  /** 动画区域列表 */
  regions: AnimationRegion[]
  /** 当前选中的区域 ID */
  selectedRegionId: string | null
  /** 每个区域的预览结果 */
  regionPreviews: Map<string, SplitResult>
  /** 默认帧尺寸 */
  defaultFrameSize: { width: number; height: number }
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null

  // Actions
  /** 设置图集 */
  setSpritesheet: (sheet: SpritesheetInfoEx | null) => void
  /** 添加区域 */
  addRegion: (region?: Partial<AnimationRegion>) => AnimationRegion
  /** 更新区域 */
  updateRegion: (id: string, partial: Partial<AnimationRegion>) => void
  /** 删除区域 */
  removeRegion: (id: string) => void
  /** 选中区域 */
  selectRegion: (id: string | null) => void
  /** 设置区域预览 */
  setRegionPreview: (id: string, preview: SplitResult) => void
  /** 设置默认帧尺寸 */
  setDefaultFrameSize: (width: number, height: number) => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 设置错误 */
  setError: (error: string | null) => void
  /** 重置状态 */
  reset: () => void
  /** 清空所有区域 */
  clearRegions: () => void
  /** 获取下一个可用颜色 */
  getNextColor: () => string
}

/**
 * 多区域状态 Store
 */
export const useMultiRegionStore = create<MultiRegionState>((set, get) => ({
  spritesheet: null,
  regions: [],
  selectedRegionId: null,
  regionPreviews: new Map(),
  defaultFrameSize: { width: 64, height: 64 },
  isLoading: false,
  error: null,

  setSpritesheet: (sheet) =>
    set(() => ({
      // 导入新图集时重置区域
      spritesheet: sheet,
      regions: [],
      selectedRegionId: null,
      regionPreviews: new Map(),
      error: null,
      // 根据图集尺寸设置默认帧尺寸
      defaultFrameSize: sheet
        ? { width: Math.min(64, sheet.width), height: Math.min(64, sheet.height) }
        : { width: 64, height: 64 },
    })),

  addRegion: (partial) => {
    const state = get()
    const color = state.getNextColor()
    const regionCount = state.regions.length + 1
    
    // 自动计算下一个起始行（基于已有区域的最后一行）
    let nextStartRow = 0
    if (partial?.startRow === undefined && state.regions.length > 0) {
      // 找到已有区域中最大的行号 + 1
      nextStartRow = Math.max(...state.regions.map(r => r.startRow)) + 1
    }
    
    const newRegion: AnimationRegion = {
      id: generateId(),
      name: partial?.name || `anim_${regionCount}`,
      startRow: partial?.startRow ?? nextStartRow,
      startCol: partial?.startCol ?? 0,
      frameCount: partial?.frameCount ?? 1,
      frameWidth: partial?.frameWidth ?? state.defaultFrameSize.width,
      frameHeight: partial?.frameHeight ?? state.defaultFrameSize.height,
      color,
    }
    
    set((state) => ({
      regions: [...state.regions, newRegion],
      selectedRegionId: newRegion.id,
    }))
    
    return newRegion
  },

  updateRegion: (id, partial) =>
    set((state) => ({
      regions: state.regions.map((r) =>
        r.id === id ? { ...r, ...partial } : r
      ),
    })),

  removeRegion: (id) =>
    set((state) => {
      const newPreviews = new Map(state.regionPreviews)
      newPreviews.delete(id)
      
      return {
        regions: state.regions.filter((r) => r.id !== id),
        selectedRegionId: state.selectedRegionId === id ? null : state.selectedRegionId,
        regionPreviews: newPreviews,
      }
    }),

  selectRegion: (id) =>
    set({ selectedRegionId: id }),

  setRegionPreview: (id, preview) =>
    set((state) => {
      const newPreviews = new Map(state.regionPreviews)
      newPreviews.set(id, preview)
      return { regionPreviews: newPreviews }
    }),

  setDefaultFrameSize: (width, height) =>
    set({ defaultFrameSize: { width, height } }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  reset: () =>
    set({
      spritesheet: null,
      regions: [],
      selectedRegionId: null,
      regionPreviews: new Map(),
      defaultFrameSize: { width: 64, height: 64 },
      isLoading: false,
      error: null,
    }),

  clearRegions: () =>
    set({
      regions: [],
      selectedRegionId: null,
      regionPreviews: new Map(),
    }),

  getNextColor: () => {
    const state = get()
    const usedColors = new Set(state.regions.map((r) => r.color))
    const availableColor = REGION_COLORS.find((c) => !usedColors.has(c))
    return availableColor || REGION_COLORS[state.regions.length % REGION_COLORS.length]
  },
}))
