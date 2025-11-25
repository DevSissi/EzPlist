/**
 * 精灵状态管理
 * Sprite State Management using Zustand
 */

import { create } from 'zustand'
import type { SpriteData, PackResult, AnimationGroup } from '../types/sprite'
import { groupSequenceFrames } from '../lib/utils'

/**
 * 视图模式
 */
export type ViewMode = 'grid' | 'list'

/**
 * 应用状态接口
 */
interface SpriteState {
  /** 精灵列表 */
  sprites: SpriteData[]
  /** 选中的精灵 ID 集合 */
  selectedIds: Set<string>
  /** 打包结果 */
  packResult: PackResult | null
  /** 动画分组 */
  animationGroups: AnimationGroup[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 视图模式 */
  viewMode: ViewMode
  
  // Actions
  /** 添加精灵 */
  addSprites: (sprites: SpriteData[]) => void
  /** 移除精灵 */
  removeSprites: (ids: string[]) => void
  /** 清空所有精灵 */
  clearSprites: () => void
  /** 选中精灵 */
  selectSprite: (id: string, multi?: boolean) => void
  /** 全选精灵 */
  selectAll: () => void
  /** 取消全选 */
  deselectAll: () => void
  /** 设置打包结果 */
  setPackResult: (result: PackResult | null) => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 设置错误 */
  setError: (error: string | null) => void
  /** 切换视图模式 */
  toggleViewMode: () => void
  /** 检测并更新动画分组 */
  updateAnimationGroups: () => void
}

/**
 * 精灵状态 Store
 */
export const useSpriteStore = create<SpriteState>((set, get) => ({
  sprites: [],
  selectedIds: new Set(),
  packResult: null,
  animationGroups: [],
  isLoading: false,
  error: null,
  viewMode: 'grid',

  addSprites: (newSprites) =>
    set((state) => {
      // 去重：根据文件名判断
      const existingNames = new Set(state.sprites.map((s) => s.name))
      const uniqueSprites = newSprites.filter((s) => !existingNames.has(s.name))
      const updatedSprites = [...state.sprites, ...uniqueSprites]
      
      // 自动更新动画分组
      setTimeout(() => get().updateAnimationGroups(), 0)
      
      return { sprites: updatedSprites }
    }),

  removeSprites: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      const newSelectedIds = new Set(state.selectedIds)
      ids.forEach((id) => newSelectedIds.delete(id))
      
      return {
        sprites: state.sprites.filter((s) => !idSet.has(s.id)),
        selectedIds: newSelectedIds,
      }
    }),

  clearSprites: () =>
    set({
      sprites: [],
      selectedIds: new Set(),
      packResult: null,
      animationGroups: [],
    }),

  selectSprite: (id, multi = false) =>
    set((state) => {
      const newSelected = multi ? new Set(state.selectedIds) : new Set<string>()
      
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      
      return { selectedIds: newSelected }
    }),

  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.sprites.map((s) => s.id)),
    })),

  deselectAll: () =>
    set({ selectedIds: new Set() }),

  setPackResult: (result) =>
    set({ packResult: result }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === 'grid' ? 'list' : 'grid',
    })),

  updateAnimationGroups: () =>
    set((state) => {
      const spriteMap = new Map(state.sprites.map((s) => [s.name, s]))
      const groups = groupSequenceFrames(state.sprites.map((s) => s.name))
      
      const animationGroups: AnimationGroup[] = []
      
      groups.forEach((frameNames, prefix) => {
        if (frameNames.length > 1) {
          animationGroups.push({
            name: prefix,
            prefix,
            frames: frameNames
              .map((name) => spriteMap.get(name))
              .filter((s): s is SpriteData => s !== undefined),
          })
        }
      })
      
      return { animationGroups }
    }),
}))
