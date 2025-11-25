/**
 * 图标按钮组件
 * IconButton Component - UIverse 风格
 */

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * 图标按钮变体类型
 */
export type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'

/**
 * 图标按钮尺寸类型
 */
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * 图标按钮属性接口
 */
interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'> {
  /** 图标元素 */
  icon: React.ReactNode
  /** 变体样式 */
  variant?: IconButtonVariant
  /** 尺寸 */
  size?: IconButtonSize
  /** 是否激活 */
  active?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 提示文字 */
  tooltip?: string
}

/**
 * 变体样式映射
 */
const variantStyles: Record<IconButtonVariant, { normal: string; active: string }> = {
  default: {
    normal: 'bg-white/80 text-gray-600 hover:bg-gray-100 border border-gray-200/50 shadow-sm',
    active: 'bg-blue-100 text-blue-600 border-blue-200',
  },
  primary: {
    normal: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/25',
    active: 'from-blue-600 to-purple-600',
  },
  ghost: {
    normal: 'bg-transparent text-gray-500 hover:bg-gray-100/50 hover:text-gray-700',
    active: 'bg-blue-50 text-blue-600',
  },
  danger: {
    normal: 'bg-white/80 text-red-500 hover:bg-red-50 border border-red-200/50',
    active: 'bg-red-100 text-red-600',
  },
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<IconButtonSize, { button: string; icon: string }> = {
  xs: { button: 'w-6 h-6', icon: 'w-3 h-3' },
  sm: { button: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { button: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { button: 'w-12 h-12', icon: 'w-6 h-6' },
}

/**
 * 图标按钮组件
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      icon,
      variant = 'default',
      size = 'md',
      active = false,
      loading = false,
      disabled,
      tooltip,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant]
    const sizeStyle = sizeStyles[size]

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        title={tooltip}
        className={cn(
          'inline-flex items-center justify-center rounded-xl transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          sizeStyle.button,
          active ? variantStyle.active : variantStyle.normal,
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className={cn('animate-spin', sizeStyle.icon)}
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
          <span className={sizeStyle.icon}>{icon}</span>
        )}
      </motion.button>
    )
  }
)

IconButton.displayName = 'IconButton'
