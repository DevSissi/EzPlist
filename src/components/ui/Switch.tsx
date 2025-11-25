/**
 * 开关组件
 * Switch Component - UIverse 风格
 */

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * 开关属性接口
 */
interface SwitchProps {
  /** 是否选中 */
  checked: boolean
  /** 变更回调 */
  onChange: (checked: boolean) => void
  /** 标签 */
  label?: string
  /** 描述 */
  description?: string
  /** 禁用状态 */
  disabled?: boolean
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 自定义类名 */
  className?: string
}

/**
 * 尺寸配置
 */
const sizeConfig = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    thumbOn: 'left-4',
    thumbOff: 'left-0.5',
  },
  md: {
    track: 'w-10 h-5',
    thumb: 'w-4 h-4',
    thumbOn: 'left-5',
    thumbOff: 'left-0.5',
  },
  lg: {
    track: 'w-12 h-6',
    thumb: 'w-5 h-5',
    thumbOn: 'left-6',
    thumbOff: 'left-0.5',
  },
}

/**
 * 开关组件
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, label, description, disabled, size = 'md', className }, ref) => {
    const config = sizeConfig[size]

    return (
      <label
        className={cn(
          'flex items-center justify-between cursor-pointer group',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {(label || description) && (
          <div className="flex-1 mr-3">
            {label && (
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {label}
              </span>
            )}
            {description && (
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        )}
        <motion.button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'relative rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2',
            config.track,
            checked
              ? 'bg-gradient-to-r from-blue-500 to-purple-500'
              : 'bg-gray-300'
          )}
        >
          <motion.span
            layout
            className={cn(
              'absolute top-0.5 bg-white rounded-full shadow-md transition-all',
              config.thumb
            )}
            animate={{
              x: checked ? parseInt(config.thumbOn.replace('left-', '')) * 4 : 2,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </motion.button>
      </label>
    )
  }
)

Switch.displayName = 'Switch'
