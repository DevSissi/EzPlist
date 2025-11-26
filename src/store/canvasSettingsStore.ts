/**
 * 画布设置状态管理
 * Canvas Settings State Management
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 画布设置状态接口
 */
interface CanvasSettingsState {
  /** 背景颜色 */
  backgroundColor: string
  /** 是否显示棋盘格叠加 */
  showCheckerboard: boolean
  /** 棋盘格尺寸 */
  checkerboardSize: number

  // Actions
  /** 设置背景颜色 */
  setBackgroundColor: (color: string) => void
  /** 切换棋盘格显示 */
  toggleCheckerboard: () => void
  /** 设置棋盘格尺寸 */
  setCheckerboardSize: (size: number) => void
}

/**
 * 画布设置 Store（持久化到 localStorage）
 */
export const useCanvasSettingsStore = create<CanvasSettingsState>()(
  persist(
    (set) => ({
      backgroundColor: '#1a1a2e',
      showCheckerboard: true,
      checkerboardSize: 16,

      setBackgroundColor: (color) => set({ backgroundColor: color }),
      toggleCheckerboard: () => set((state) => ({ showCheckerboard: !state.showCheckerboard })),
      setCheckerboardSize: (size) => set({ checkerboardSize: size }),
    }),
    {
      name: 'ezplist-canvas-settings',
    }
  )
)

/**
 * 计算颜色亮度 (0-255)
 * @param hex - 十六进制颜色
 */
function getLuminance(hex: string): number {
  const color = hex.replace('#', '')
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  // 使用感知亮度公式
  return (r * 299 + g * 587 + b * 114) / 1000
}

/**
 * 获取背景 CSS 样式
 * @param settings - 画布设置
 * @returns CSS 样式对象
 */
export function getBackgroundStyle(settings: Pick<CanvasSettingsState, 'backgroundColor' | 'showCheckerboard' | 'checkerboardSize'>): React.CSSProperties {
  const { backgroundColor, showCheckerboard, checkerboardSize } = settings

  if (showCheckerboard) {
    const size = checkerboardSize
    // 根据背景亮度选择棋盘格颜色
    const luminance = getLuminance(backgroundColor)
    const isLight = luminance > 128
    // 浅色背景用深色棋盘格，深色背景用浅色棋盘格
    const checkerColor = isLight 
      ? 'rgba(0,0,0,0.08)' 
      : 'rgba(255,255,255,0.08)'
    
    return {
      backgroundColor,
      backgroundImage: `
        linear-gradient(45deg, ${checkerColor} 25%, transparent 25%),
        linear-gradient(-45deg, ${checkerColor} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, ${checkerColor} 75%),
        linear-gradient(-45deg, transparent 75%, ${checkerColor} 75%)
      `,
      backgroundSize: `${size * 2}px ${size * 2}px`,
      backgroundPosition: `0 0, 0 ${size}px, ${size}px -${size}px, -${size}px 0px`,
    }
  }

  return { backgroundColor }
}
