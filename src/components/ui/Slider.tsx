/**
 * 滑块组件
 * Slider Component - UIverse 风格
 */

import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

/**
 * 滑块属性接口
 */
interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 标签 */
  label?: string
  /** 显示值 */
  showValue?: boolean
  /** 值后缀 */
  valueSuffix?: string
}

/**
 * 滑块组件
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, showValue = true, valueSuffix = '', value, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {(label || showValue) && (
          <div className="flex items-center justify-between text-xs">
            {label && <span className="text-gray-500">{label}</span>}
            {showValue && (
              <span className="text-gray-700 font-medium tabular-nums">
                {value}{valueSuffix}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          value={value}
          className={cn(
            'w-full h-2 rounded-full appearance-none cursor-pointer',
            'bg-gradient-to-r from-gray-200 to-gray-200',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-gradient-to-br',
            '[&::-webkit-slider-thumb]:from-blue-500',
            '[&::-webkit-slider-thumb]:to-purple-500',
            '[&::-webkit-slider-thumb]:shadow-lg',
            '[&::-webkit-slider-thumb]:shadow-blue-500/25',
            '[&::-webkit-slider-thumb]:border-2',
            '[&::-webkit-slider-thumb]:border-white',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-webkit-slider-thumb]:active:scale-95',
            '[&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:h-4',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:bg-gradient-to-br',
            '[&::-moz-range-thumb]:from-blue-500',
            '[&::-moz-range-thumb]:to-purple-500',
            '[&::-moz-range-thumb]:border-2',
            '[&::-moz-range-thumb]:border-white',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

Slider.displayName = 'Slider'
