/**
 * 画布背景设置组件
 * Canvas Background Settings Component
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid3X3 } from 'lucide-react'
import { useCanvasSettingsStore } from '../store/canvasSettingsStore'

/**
 * 预设颜色
 */
const presetColors = [
  { color: '#000000', label: '纯黑' },
  { color: '#1a1a2e', label: '深蓝' },
  { color: '#2d2d44', label: '暗紫' },
  { color: '#ffffff', label: '纯白' },
  { color: '#f0f0f0', label: '浅灰' },
  { color: '#333333', label: '深灰' },
]

/**
 * 背景设置下拉菜单
 */
export function BackgroundSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const { 
    backgroundColor, 
    showCheckerboard, 
    setBackgroundColor, 
    toggleCheckerboard 
  } = useCanvasSettingsStore()

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex items-center gap-1">
      {/* 棋盘格切换按钮 */}
      <motion.button
        onClick={toggleCheckerboard}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={showCheckerboard ? '隐藏棋盘格' : '显示棋盘格'}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: showCheckerboard ? 'var(--accent-primary)' : 'transparent',
          color: showCheckerboard ? '#fff' : 'var(--text-secondary)'
        }}
      >
        <Grid3X3 className="w-4 h-4" />
      </motion.button>

      {/* 背景颜色选择器 */}
      <div ref={menuRef} className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="背景颜色"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: isOpen ? 'var(--accent-primary)' : 'transparent',
            color: isOpen ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <div 
            className="w-4 h-4 rounded" 
            style={{ backgroundColor, border: '1px solid var(--border-default)' }}
          />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 p-2 rounded-xl shadow-xl z-50 min-w-[160px]"
              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
            >
              {/* 预设颜色 */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {presetColors.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => {
                      setBackgroundColor(preset.color)
                    }}
                    title={preset.label}
                    className="w-10 h-8 rounded-lg transition-all"
                    style={{
                      backgroundColor: preset.color,
                      border: `2px solid ${backgroundColor === preset.color ? 'var(--accent-primary)' : 'transparent'}`,
                      transform: backgroundColor === preset.color ? 'scale(1.05)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>

              {/* 自定义颜色 */}
              <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs rounded uppercase"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
