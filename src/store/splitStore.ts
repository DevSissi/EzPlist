/**
 * 拆分图集状态管理
 * Split Spritesheet State Management
 */

import { create } from 'zustand'
import type { SpritesheetInfoEx, SplitConfig, SplitResult } from '../types/sprite'

/**
 * 拆分状态接口
 */
interface SplitState {
  /** 当前图集 */
  spritesheet: SpritesheetInfoEx | null
  /** 切分配置 */
  config: SplitConfig
  /** 切分结果 */
  splitResult: SplitResult | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null

  // Actions
  /** 设置图集 */
  setSpritesheet: (sheet: SpritesheetInfoEx | null) => void
  /** 更新配置 */
  updateConfig: (partial: Partial<SplitConfig>) => void
  /** 设置切分结果 */
  setSplitResult: (result: SplitResult | null) => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 设置错误 */
  setError: (error: string | null) => void
  /** 重置状态 */
  reset: () => void
}

/**
 * 默认配置
 */
const defaultConfig: SplitConfig = {
  rows: 1,
  cols: 1,
  namePrefix: 'frame',
  startIndex: 1,
}

/**
 * 拆分状态 Store
 */
export const useSplitStore = create<SplitState>((set) => ({
  spritesheet: null,
  config: { ...defaultConfig },
  splitResult: null,
  isLoading: false,
  error: null,

  setSpritesheet: (sheet) =>
    set((state) => {
      // 导入新图集时，根据图集名称更新前缀
      const namePrefix = sheet
        ? sheet.name.replace(/\.[^.]+$/, '') // 去掉扩展名
        : 'frame'
      
      return {
        spritesheet: sheet,
        config: { ...state.config, namePrefix },
        splitResult: null,
        error: null,
      }
    }),

  updateConfig: (partial) =>
    set((state) => ({
      config: { ...state.config, ...partial },
    })),

  setSplitResult: (result) =>
    set({ splitResult: result }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  reset: () =>
    set({
      spritesheet: null,
      config: { ...defaultConfig },
      splitResult: null,
      isLoading: false,
      error: null,
    }),
}))
