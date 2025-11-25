/**
 * 按钮组件
 * Button Component
 */

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * 按钮变体类型
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

/**
 * 按钮尺寸类型
 */
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * 按钮属性接口
 */
interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'> {
  /** 子元素 */
  children?: React.ReactNode
  /** 变体样式 */
  variant?: ButtonVariant
  /** 尺寸 */
  size?: ButtonSize
  /** 图标（左侧） */
  icon?: React.ReactNode
  /** 是否加载中 */
  loading?: boolean
}

/**
 * 变体样式映射 - 暗色主题
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-400 hover:to-purple-500 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50',
  secondary:
    'bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700/80 border border-zinc-700/50 shadow-md hover:border-zinc-600',
  ghost:
    'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
  danger:
    'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-400 hover:to-pink-500 shadow-lg shadow-red-500/30 hover:shadow-red-500/50',
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

/**
 * 按钮组件
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -2 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          icon
        )}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
