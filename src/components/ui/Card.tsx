/**
 * 卡片组件
 * Card Component
 */

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * 卡片变体类型
 */
export type CardVariant = 'default' | 'glass' | 'elevated'

/**
 * 卡片属性接口
 */
interface CardProps extends HTMLMotionProps<'div'> {
  /** 变体样式 */
  variant?: CardVariant
  /** 是否可悬浮 */
  hoverable?: boolean
  /** 内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * 变体样式映射 - 暗色主题
 */
const variantStyles: Record<CardVariant, string> = {
  default: 'bg-zinc-900/70 border border-zinc-700/50 shadow-card-dark',
  glass: 'backdrop-blur-xl bg-zinc-900/60 border border-zinc-700/50 shadow-2xl',
  elevated: 'bg-zinc-800/90 shadow-2xl border border-zinc-700/30',
}

/**
 * 内边距样式映射
 */
const paddingStyles: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

/**
 * 卡片组件
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      hoverable = false,
      padding = 'md',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        whileHover={
          hoverable
            ? { scale: 1.02, y: -4, boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.1)' }
            : undefined
        }
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          'rounded-2xl overflow-hidden transition-all duration-300',
          variantStyles[variant],
          paddingStyles[padding],
          hoverable && 'cursor-pointer hover:border-zinc-600/50',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

/**
 * 卡片头部组件
 */
export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
))

CardHeader.displayName = 'CardHeader'

/**
 * 卡片标题组件
 */
export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold text-lg text-zinc-100', className)}
    {...props}
  />
))

CardTitle.displayName = 'CardTitle'

/**
 * 卡片内容组件
 */
export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))

CardContent.displayName = 'CardContent'

/**
 * 卡片底部组件
 */
export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))

CardFooter.displayName = 'CardFooter'
