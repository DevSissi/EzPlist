/**
 * 提示框组件
 * Tooltip Component - UIverse 风格
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * 提示框属性接口
 */
interface TooltipProps {
  /** 提示内容 */
  content: React.ReactNode
  /** 子元素 */
  children: React.ReactNode
  /** 位置 */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** 延迟显示（毫秒） */
  delay?: number
  /** 自定义类名 */
  className?: string
}

/**
 * 提示框组件
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  /**
   * 处理鼠标进入
   */
  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  /**
   * 处理鼠标离开
   */
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * 位置样式映射
   */
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  /**
   * 动画方向
   */
  const animationOrigin = {
    top: { y: 5, opacity: 0 },
    bottom: { y: -5, opacity: 0 },
    left: { x: 5, opacity: 0 },
    right: { x: -5, opacity: 0 },
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={animationOrigin[position]}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={animationOrigin[position]}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 px-2.5 py-1.5 text-xs text-white rounded-lg whitespace-nowrap',
              'bg-gray-900/95 backdrop-blur-sm shadow-xl',
              positionStyles[position],
              className
            )}
          >
            {content}
            {/* 箭头 */}
            <div
              className={cn(
                'absolute w-2 h-2 bg-gray-900/95 rotate-45',
                position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
                position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
                position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
                position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
