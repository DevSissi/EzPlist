/**
 * 合成画布状态管理
 * Compose Canvas State Management using Zustand
 * 
 * 管理手动拖拽布局的精灵位置、选中状态、画布设置等
 */

import { create } from 'zustand'
import type { SpriteData } from '../types/sprite'

/**
 * 画布上的精灵（带位置信息）
 * @interface CanvasSprite
 */
export interface CanvasSprite {
  /** 原始精灵数据 */
  sprite: SpriteData
  /** 在画布中的 X 坐标 */
  x: number
  /** 在画布中的 Y 坐标 */
  y: number
  /** 层级（越大越上层） */
  zIndex: number
}

/**
 * 吸附参考线
 * @interface SnapGuide
 */
export interface SnapGuide {
  /** 方向: 水平或垂直 */
  direction: 'horizontal' | 'vertical'
  /** 位置 */
  position: number
  /** 吸附类型 */
  type: 'edge' | 'center'
}

/**
 * 画布状态接口
 */
interface ComposeState {
  /** 画布上的精灵列表 */
  canvasSprites: CanvasSprite[]
  /** 选中的精灵 ID 集合 */
  selectedIds: Set<string>
  /** 当前最高层级 */
  maxZIndex: number
  /** 画布缩放比例 */
  scale: number
  /** 画布偏移量 X */
  offsetX: number
  /** 画布偏移量 Y */
  offsetY: number
  /** 是否显示吸附参考线 */
  showSnapGuides: boolean
  /** 当前活跃的吸附参考线 */
  activeGuides: SnapGuide[]
  /** 吸附阈值（像素） */
  snapThreshold: number
  /** 是否启用吸附 */
  snapEnabled: boolean
  /** 画布背景类型 */
  backgroundType: 'transparent' | 'white' | 'black' | 'checker'
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 是否正在框选 */
  isSelecting: boolean
  /** 框选起点 */
  selectionStart: { x: number; y: number } | null
  /** 框选终点 */
  selectionEnd: { x: number; y: number } | null

  // Actions
  /** 添加精灵到画布 */
  addSprites: (sprites: SpriteData[]) => void
  /** 移除精灵 */
  removeSprites: (ids: string[]) => void
  /** 清空画布 */
  clearCanvas: () => void
  /** 更新精灵位置 */
  updateSpritePosition: (id: string, x: number, y: number) => void
  /** 批量更新精灵位置 */
  updateSpritesPosition: (updates: { id: string; x: number; y: number }[]) => void
  /** 选中精灵 */
  selectSprite: (id: string, multi?: boolean) => void
  /** 框选精灵 */
  selectSpritesInRect: (rect: { x: number; y: number; width: number; height: number }) => void
  /** 全选 */
  selectAll: () => void
  /** 取消全选 */
  deselectAll: () => void
  /** 将精灵置顶 */
  bringToFront: (id: string) => void
  /** 将精灵置底 */
  sendToBack: (id: string) => void
  /** 设置缩放 */
  setScale: (scale: number) => void
  /** 设置偏移 */
  setOffset: (x: number, y: number) => void
  /** 重置视图 */
  resetView: () => void
  /** 切换吸附 */
  toggleSnap: () => void
  /** 设置吸附参考线 */
  setActiveGuides: (guides: SnapGuide[]) => void
  /** 设置背景类型 */
  setBackgroundType: (type: 'transparent' | 'white' | 'black' | 'checker') => void
  /** 设置拖拽状态 */
  setDragging: (dragging: boolean) => void
  /** 设置框选状态 */
  setSelecting: (selecting: boolean, start?: { x: number; y: number } | null) => void
  /** 更新框选范围 */
  updateSelectionRect: (end: { x: number; y: number }) => void
  /** 对齐选中精灵 */
  alignSelected: (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void
  /** 分布选中精灵 */
  distributeSelected: (direction: 'horizontal' | 'vertical') => void
  /** 获取画布边界（所有精灵的最大范围） */
  getCanvasBounds: () => { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
  /** 自动排列精灵（紧凑布局） */
  autoArrange: () => void
}

/**
 * 合成画布状态 Store
 */
export const useComposeStore = create<ComposeState>((set, get) => ({
  canvasSprites: [],
  selectedIds: new Set(),
  maxZIndex: 0,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  showSnapGuides: true,
  activeGuides: [],
  snapThreshold: 8,
  snapEnabled: true,
  backgroundType: 'checker',
  isDragging: false,
  isSelecting: false,
  selectionStart: null,
  selectionEnd: null,

  addSprites: (sprites) =>
    set((state) => {
      const existingIds = new Set(state.canvasSprites.map((cs) => cs.sprite.id))
      const newSprites = sprites.filter((s) => !existingIds.has(s.id))

      if (newSprites.length === 0) return state

      // 计算新精灵的初始位置（避免重叠）
      let nextX = 20
      let nextY = 20
      const padding = 10

      // 找到现有精灵的最右边界
      if (state.canvasSprites.length > 0) {
        const maxRight = Math.max(...state.canvasSprites.map((cs) => cs.x + cs.sprite.width))
        nextX = maxRight + padding
      }

      let newZIndex = state.maxZIndex
      const canvasSpritesToAdd: CanvasSprite[] = newSprites.map((sprite) => {
        newZIndex++
        const cs: CanvasSprite = {
          sprite,
          x: nextX,
          y: nextY,
          zIndex: newZIndex,
        }
        // 下一个精灵的位置
        nextX += sprite.width + padding
        // 如果超出一定宽度，换行
        if (nextX > 2000) {
          nextX = 20
          nextY += 200
        }
        return cs
      })

      return {
        canvasSprites: [...state.canvasSprites, ...canvasSpritesToAdd],
        maxZIndex: newZIndex,
      }
    }),

  removeSprites: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      const newSelectedIds = new Set(state.selectedIds)
      ids.forEach((id) => newSelectedIds.delete(id))

      return {
        canvasSprites: state.canvasSprites.filter((cs) => !idSet.has(cs.sprite.id)),
        selectedIds: newSelectedIds,
      }
    }),

  clearCanvas: () =>
    set({
      canvasSprites: [],
      selectedIds: new Set(),
      maxZIndex: 0,
      activeGuides: [],
    }),

  updateSpritePosition: (id, x, y) =>
    set((state) => ({
      canvasSprites: state.canvasSprites.map((cs) =>
        cs.sprite.id === id ? { ...cs, x, y } : cs
      ),
    })),

  updateSpritesPosition: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]))
      return {
        canvasSprites: state.canvasSprites.map((cs) => {
          const update = updateMap.get(cs.sprite.id)
          return update ? { ...cs, x: update.x, y: update.y } : cs
        }),
      }
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

  selectSpritesInRect: (rect) =>
    set((state) => {
      const newSelected = new Set<string>()
      const { x, y, width, height } = rect

      state.canvasSprites.forEach((cs) => {
        // 检查精灵是否与选择框相交
        const spriteRight = cs.x + cs.sprite.width
        const spriteBottom = cs.y + cs.sprite.height
        const rectRight = x + width
        const rectBottom = y + height

        if (cs.x < rectRight && spriteRight > x && cs.y < rectBottom && spriteBottom > y) {
          newSelected.add(cs.sprite.id)
        }
      })

      return { selectedIds: newSelected }
    }),

  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.canvasSprites.map((cs) => cs.sprite.id)),
    })),

  deselectAll: () =>
    set({ selectedIds: new Set() }),

  bringToFront: (id) =>
    set((state) => {
      const newZIndex = state.maxZIndex + 1
      return {
        canvasSprites: state.canvasSprites.map((cs) =>
          cs.sprite.id === id ? { ...cs, zIndex: newZIndex } : cs
        ),
        maxZIndex: newZIndex,
      }
    }),

  sendToBack: (id) =>
    set((state) => ({
      canvasSprites: state.canvasSprites.map((cs) =>
        cs.sprite.id === id ? { ...cs, zIndex: 0 } : cs
      ),
    })),

  setScale: (scale) =>
    set({ scale: Math.max(0.1, Math.min(5, scale)) }),

  setOffset: (x, y) =>
    set({ offsetX: x, offsetY: y }),

  resetView: () =>
    set({ scale: 1, offsetX: 0, offsetY: 0 }),

  toggleSnap: () =>
    set((state) => ({ snapEnabled: !state.snapEnabled })),

  setActiveGuides: (guides) =>
    set({ activeGuides: guides }),

  setBackgroundType: (type) =>
    set({ backgroundType: type }),

  setDragging: (dragging) =>
    set({ isDragging: dragging }),

  setSelecting: (selecting, start = null) =>
    set({
      isSelecting: selecting,
      selectionStart: start,
      selectionEnd: selecting ? start : null,
    }),

  updateSelectionRect: (end) =>
    set({ selectionEnd: end }),

  alignSelected: (alignment) =>
    set((state) => {
      if (state.selectedIds.size < 2) return state

      const selectedSprites = state.canvasSprites.filter((cs) =>
        state.selectedIds.has(cs.sprite.id)
      )

      if (selectedSprites.length < 2) return state

      let updates: { id: string; x: number; y: number }[] = []

      switch (alignment) {
        case 'left': {
          const minX = Math.min(...selectedSprites.map((cs) => cs.x))
          updates = selectedSprites.map((cs) => ({ id: cs.sprite.id, x: minX, y: cs.y }))
          break
        }
        case 'right': {
          const maxRight = Math.max(...selectedSprites.map((cs) => cs.x + cs.sprite.width))
          updates = selectedSprites.map((cs) => ({
            id: cs.sprite.id,
            x: maxRight - cs.sprite.width,
            y: cs.y,
          }))
          break
        }
        case 'top': {
          const minY = Math.min(...selectedSprites.map((cs) => cs.y))
          updates = selectedSprites.map((cs) => ({ id: cs.sprite.id, x: cs.x, y: minY }))
          break
        }
        case 'bottom': {
          const maxBottom = Math.max(...selectedSprites.map((cs) => cs.y + cs.sprite.height))
          updates = selectedSprites.map((cs) => ({
            id: cs.sprite.id,
            x: cs.x,
            y: maxBottom - cs.sprite.height,
          }))
          break
        }
        case 'center-h': {
          const centerY =
            (Math.min(...selectedSprites.map((cs) => cs.y)) +
              Math.max(...selectedSprites.map((cs) => cs.y + cs.sprite.height))) /
            2
          updates = selectedSprites.map((cs) => ({
            id: cs.sprite.id,
            x: cs.x,
            y: centerY - cs.sprite.height / 2,
          }))
          break
        }
        case 'center-v': {
          const centerX =
            (Math.min(...selectedSprites.map((cs) => cs.x)) +
              Math.max(...selectedSprites.map((cs) => cs.x + cs.sprite.width))) /
            2
          updates = selectedSprites.map((cs) => ({
            id: cs.sprite.id,
            x: centerX - cs.sprite.width / 2,
            y: cs.y,
          }))
          break
        }
      }

      const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]))
      return {
        canvasSprites: state.canvasSprites.map((cs) => {
          const update = updateMap.get(cs.sprite.id)
          return update ? { ...cs, x: update.x, y: update.y } : cs
        }),
      }
    }),

  distributeSelected: (direction) =>
    set((state) => {
      if (state.selectedIds.size < 3) return state

      const selectedSprites = state.canvasSprites
        .filter((cs) => state.selectedIds.has(cs.sprite.id))
        .sort((a, b) => (direction === 'horizontal' ? a.x - b.x : a.y - b.y))

      if (selectedSprites.length < 3) return state

      let updates: { id: string; x: number; y: number }[] = []

      if (direction === 'horizontal') {
        const first = selectedSprites[0]
        const last = selectedSprites[selectedSprites.length - 1]
        const totalWidth = selectedSprites.reduce((sum, cs) => sum + cs.sprite.width, 0)
        const availableSpace = last.x + last.sprite.width - first.x - totalWidth
        const gap = availableSpace / (selectedSprites.length - 1)

        let currentX = first.x
        updates = selectedSprites.map((cs) => {
          const result = { id: cs.sprite.id, x: currentX, y: cs.y }
          currentX += cs.sprite.width + gap
          return result
        })
      } else {
        const first = selectedSprites[0]
        const last = selectedSprites[selectedSprites.length - 1]
        const totalHeight = selectedSprites.reduce((sum, cs) => sum + cs.sprite.height, 0)
        const availableSpace = last.y + last.sprite.height - first.y - totalHeight
        const gap = availableSpace / (selectedSprites.length - 1)

        let currentY = first.y
        updates = selectedSprites.map((cs) => {
          const result = { id: cs.sprite.id, x: cs.x, y: currentY }
          currentY += cs.sprite.height + gap
          return result
        })
      }

      const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]))
      return {
        canvasSprites: state.canvasSprites.map((cs) => {
          const update = updateMap.get(cs.sprite.id)
          return update ? { ...cs, x: update.x, y: update.y } : cs
        }),
      }
    }),

  getCanvasBounds: () => {
    const state = get()
    if (state.canvasSprites.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
    }

    const minX = Math.min(...state.canvasSprites.map((cs) => cs.x))
    const minY = Math.min(...state.canvasSprites.map((cs) => cs.y))
    const maxX = Math.max(...state.canvasSprites.map((cs) => cs.x + cs.sprite.width))
    const maxY = Math.max(...state.canvasSprites.map((cs) => cs.y + cs.sprite.height))

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    }
  },

  autoArrange: () =>
    set((state) => {
      if (state.canvasSprites.length === 0) return state

      // 按面积降序排列
      const sorted = [...state.canvasSprites].sort(
        (a, b) =>
          b.sprite.width * b.sprite.height - a.sprite.width * a.sprite.height
      )

      const padding = 10
      let currentX = 0
      let currentY = 0
      let rowHeight = 0
      const maxRowWidth = 1500

      const updates: { id: string; x: number; y: number }[] = []

      sorted.forEach((cs) => {
        if (currentX + cs.sprite.width > maxRowWidth && currentX > 0) {
          // 换行
          currentX = 0
          currentY += rowHeight + padding
          rowHeight = 0
        }

        updates.push({ id: cs.sprite.id, x: currentX, y: currentY })
        currentX += cs.sprite.width + padding
        rowHeight = Math.max(rowHeight, cs.sprite.height)
      })

      const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]))
      return {
        canvasSprites: state.canvasSprites.map((cs) => {
          const update = updateMap.get(cs.sprite.id)
          return update ? { ...cs, x: update.x, y: update.y } : cs
        }),
      }
    }),
}))

/**
 * 计算吸附位置
 * @param position - 当前位置
 * @param spriteSize - 精灵尺寸
 * @param otherSprites - 其他精灵列表
 * @param threshold - 吸附阈值
 * @returns 吸附后的位置和参考线
 */
export function calculateSnap(
  position: { x: number; y: number },
  spriteSize: { width: number; height: number },
  otherSprites: CanvasSprite[],
  threshold: number
): { x: number; y: number; guides: SnapGuide[] } {
  let { x, y } = position
  const guides: SnapGuide[] = []

  const spriteRight = x + spriteSize.width
  const spriteBottom = y + spriteSize.height
  const spriteCenterX = x + spriteSize.width / 2
  const spriteCenterY = y + spriteSize.height / 2

  // 检查与其他精灵的吸附
  for (const other of otherSprites) {
    const otherRight = other.x + other.sprite.width
    const otherBottom = other.y + other.sprite.height
    const otherCenterX = other.x + other.sprite.width / 2
    const otherCenterY = other.y + other.sprite.height / 2

    // 左边缘对齐
    if (Math.abs(x - other.x) < threshold) {
      x = other.x
      guides.push({ direction: 'vertical', position: other.x, type: 'edge' })
    }
    // 右边缘对齐
    if (Math.abs(spriteRight - otherRight) < threshold) {
      x = otherRight - spriteSize.width
      guides.push({ direction: 'vertical', position: otherRight, type: 'edge' })
    }
    // 左对齐右
    if (Math.abs(x - otherRight) < threshold) {
      x = otherRight
      guides.push({ direction: 'vertical', position: otherRight, type: 'edge' })
    }
    // 右对齐左
    if (Math.abs(spriteRight - other.x) < threshold) {
      x = other.x - spriteSize.width
      guides.push({ direction: 'vertical', position: other.x, type: 'edge' })
    }
    // 中心垂直对齐
    if (Math.abs(spriteCenterX - otherCenterX) < threshold) {
      x = otherCenterX - spriteSize.width / 2
      guides.push({ direction: 'vertical', position: otherCenterX, type: 'center' })
    }

    // 上边缘对齐
    if (Math.abs(y - other.y) < threshold) {
      y = other.y
      guides.push({ direction: 'horizontal', position: other.y, type: 'edge' })
    }
    // 下边缘对齐
    if (Math.abs(spriteBottom - otherBottom) < threshold) {
      y = otherBottom - spriteSize.height
      guides.push({ direction: 'horizontal', position: otherBottom, type: 'edge' })
    }
    // 上对齐下
    if (Math.abs(y - otherBottom) < threshold) {
      y = otherBottom
      guides.push({ direction: 'horizontal', position: otherBottom, type: 'edge' })
    }
    // 下对齐上
    if (Math.abs(spriteBottom - other.y) < threshold) {
      y = other.y - spriteSize.height
      guides.push({ direction: 'horizontal', position: other.y, type: 'edge' })
    }
    // 中心水平对齐
    if (Math.abs(spriteCenterY - otherCenterY) < threshold) {
      y = otherCenterY - spriteSize.height / 2
      guides.push({ direction: 'horizontal', position: otherCenterY, type: 'center' })
    }
  }

  return { x, y, guides }
}
