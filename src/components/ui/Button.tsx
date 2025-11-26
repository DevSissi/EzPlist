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
 * 变体样式映射 - Material Design Dark Theme
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'text-white',
  secondary:
    '',
  ghost:
    '',
  danger:
    'text-white',
}

/**
 * 变体内联样式
 */
const variantInlineStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent-primary)',
    color: '#ffffff',
  },
  secondary: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  danger: {
    background: 'var(--accent-error)',
    color: '#ffffff',
  },
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
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        style={{
          ...variantInlineStyles[variant],
          ...(props.style || {}),
        }}
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
