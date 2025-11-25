/**
 * 动画预览器组件
 * Animation Preview Component - 支持精灵表动画预览和播放控制
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Pipette,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { cn } from '../lib/utils'

/**
 * 帧数据接口
 */
export interface FrameData {
  /** 帧名称 */
  name: string
  /** X 坐标 */
  x: number
  /** Y 坐标 */
  y: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
}

/**
 * 背景类型
 */
export type BackgroundType = 'checker' | 'black' | 'white' | 'transparent'

/**
 * 组件属性
 */
interface AnimationPreviewProps {
  /** 精灵表图片源 URL */
  imageSrc: string
  /** 帧数据列表 */
  frames: FrameData[]
  /** 初始 FPS */
  initialFps?: number
  /** 自定义类名 */
  className?: string
  /** 是否展开模式 */
  expanded?: boolean
  /** 切换展开回调 */
  onToggleExpand?: () => void
}

/**
 * 动画预览器组件
 */
export function AnimationPreview({
  imageSrc,
  frames,
  initialFps = 12,
  className,
  expanded = false,
  onToggleExpand,
}: AnimationPreviewProps) {
  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [fps, setFps] = useState(initialFps)
  const [loopMode, setLoopMode] = useState<'loop' | 'once' | 'pingpong'>('loop')
  const [playDirection, setPlayDirection] = useState<1 | -1>(1)
  
  // 背景和颜色移除
  const [background, setBackground] = useState<BackgroundType>('checker')
  const [removeColor, setRemoveColor] = useState(false)
  const [colorToRemove, setColorToRemove] = useState('#00ff00')
  const [colorTolerance, setColorTolerance] = useState(30)
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  // Canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  /**
   * 加载图片
   */
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      drawFrame()
    }
    img.src = imageSrc
  }, [imageSrc])

  /**
   * 绘制当前帧
   */
  const drawFrame = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || frames.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: removeColor })
    if (!ctx) return

    const frame = frames[currentFrame]
    if (!frame) return

    // 设置 canvas 尺寸
    canvas.width = frame.width
    canvas.height = frame.height

    // 绘制背景
    drawBackground(ctx, frame.width, frame.height)

    // 绘制帧
    ctx.drawImage(
      imageRef.current,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      frame.width,
      frame.height
    )

    // 移除背景色
    if (removeColor) {
      removeBackgroundColor(ctx, frame.width, frame.height)
    }
  }, [currentFrame, frames, background, removeColor, colorToRemove, colorTolerance])

  /**
   * 绘制背景
   */
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    switch (background) {
      case 'checker':
        const size = 10
        for (let y = 0; y < height; y += size) {
          for (let x = 0; x < width; x += size) {
            const isEven = ((x / size) + (y / size)) % 2 === 0
            ctx.fillStyle = isEven ? '#e5e5e5' : '#f5f5f5'
            ctx.fillRect(x, y, size, size)
          }
        }
        break
      case 'black':
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, width, height)
        break
      case 'white':
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        break
      case 'transparent':
        ctx.clearRect(0, 0, width, height)
        break
    }
  }

  /**
   * 移除背景色（Color Key）
   */
  const removeBackgroundColor = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // 解析目标颜色
    const targetR = parseInt(colorToRemove.slice(1, 3), 16)
    const targetG = parseInt(colorToRemove.slice(3, 5), 16)
    const targetB = parseInt(colorToRemove.slice(5, 7), 16)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // 计算颜色差异
      const diff = Math.sqrt(
        Math.pow(r - targetR, 2) +
        Math.pow(g - targetG, 2) +
        Math.pow(b - targetB, 2)
      )

      // 在容差范围内则设为透明
      if (diff <= colorTolerance) {
        data[i + 3] = 0 // Alpha = 0
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  /**
   * 动画循环
   */
  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const frameInterval = 1000 / fps

    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= frameInterval) {
        setCurrentFrame((prev) => {
          let next = prev + playDirection

          if (loopMode === 'loop') {
            // 循环模式
            if (next >= frames.length) next = 0
            if (next < 0) next = frames.length - 1
          } else if (loopMode === 'once') {
            // 单次播放
            if (next >= frames.length || next < 0) {
              setIsPlaying(false)
              return prev
            }
          } else if (loopMode === 'pingpong') {
            // 来回播放
            if (next >= frames.length) {
              setPlayDirection(-1)
              next = frames.length - 2
            } else if (next < 0) {
              setPlayDirection(1)
              next = 1
            }
          }

          return next
        })
        lastTimeRef.current = timestamp
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, fps, frames.length, loopMode, playDirection])

  /**
   * 帧变化时重绘
   */
  useEffect(() => {
    drawFrame()
  }, [drawFrame])

  /**
   * 重置时重绘
   */
  useEffect(() => {
    if (frames.length > 0 && currentFrame >= frames.length) {
      setCurrentFrame(0)
    }
  }, [frames.length])

  /**
   * 处理进度条点击
   */
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const frameIndex = Math.floor(percentage * frames.length)
    setCurrentFrame(Math.max(0, Math.min(frames.length - 1, frameIndex)))
  }

  /**
   * 拾取颜色
   */
  const handlePickColor = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showColorPicker || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)

    const pixel = ctx.getImageData(x, y, 1, 1).data
    const hex = '#' + [pixel[0], pixel[1], pixel[2]]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
    
    setColorToRemove(hex)
    setShowColorPicker(false)
  }, [showColorPicker])

  const currentFrameData = frames[currentFrame]
  const hasFrames = frames.length > 0

  return (
    <motion.div
      layout
      className={cn(
        'flex flex-col bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 overflow-hidden',
        expanded ? 'fixed inset-4 z-50' : '',
        className
      )}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700/50 bg-zinc-800/50">
        <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
          动画预览
          {hasFrames && (
            <span className="text-xs text-zinc-500 font-normal">
              {currentFrame + 1}/{frames.length}
            </span>
          )}
        </h3>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-zinc-700/50 text-zinc-400 transition-colors"
            title={expanded ? '缩小' : '放大'}
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* 预览区域 */}
      <div 
        className={cn(
          'flex items-center justify-center p-2 relative',
          expanded ? 'flex-1 min-h-0' : 'h-32',
          background === 'black' ? 'bg-gray-900' : 
          background === 'white' ? 'bg-white' : 
          background === 'checker' ? 'checkerboard' : 'bg-transparent'
        )}
      >
        {hasFrames ? (
          <canvas
            ref={canvasRef}
            onClick={handlePickColor}
            className={cn(
              'max-w-full max-h-full object-contain shadow-lg rounded',
              showColorPicker && 'cursor-crosshair'
            )}
            style={{ 
              imageRendering: 'pixelated',
              width: expanded ? 'auto' : undefined,
              height: expanded ? '100%' : undefined,
            }}
          />
        ) : (
          <div className="text-center text-zinc-500 text-sm">
            <p>无可预览帧</p>
            <p className="text-xs mt-1">请先切分图集</p>
          </div>
        )}

        {/* 颜色拾取提示 */}
        <AnimatePresence>
          {showColorPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 text-white text-xs rounded-full"
            >
              点击画面选取要移除的颜色
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 进度条 */}
      {hasFrames && (
        <div 
          className="h-2 bg-zinc-800 cursor-pointer relative mx-3 rounded-full overflow-hidden"
          onClick={handleProgressClick}
        >
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500"
            initial={false}
            animate={{ width: `${((currentFrame + 1) / frames.length) * 100}%` }}
            transition={{ duration: 0.1 }}
          />
          {/* 帧刻度 */}
          <div className="absolute inset-0 flex">
            {frames.map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-zinc-600/50 last:border-r-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* 控制区域 */}
      <div className="p-2 space-y-2 border-t border-zinc-700/50 bg-zinc-800/30">
        {/* 播放控制 */}
        <div className="flex items-center justify-center gap-1">
          <ControlButton
            icon={<SkipBack className="w-3.5 h-3.5" />}
            onClick={() => setCurrentFrame(0)}
            title="回到第一帧"
          />
          <ControlButton
            icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!hasFrames}
            primary
            title={isPlaying ? '暂停' : '播放'}
          />
          <ControlButton
            icon={<SkipForward className="w-3.5 h-3.5" />}
            onClick={() => setCurrentFrame(frames.length - 1)}
            title="跳到最后一帧"
          />
          <div className="w-px h-4 bg-zinc-600 mx-0.5" />
          <ControlButton
            icon={loopMode === 'loop' ? <Repeat className="w-3.5 h-3.5" /> : 
                  loopMode === 'once' ? <Repeat1 className="w-3.5 h-3.5" /> :
                  <Repeat className="w-3.5 h-3.5 scale-x-[-1]" />}
            onClick={() => setLoopMode(m => m === 'loop' ? 'once' : m === 'once' ? 'pingpong' : 'loop')}
            active={loopMode !== 'once'}
            title={`循环模式: ${loopMode === 'loop' ? '循环' : loopMode === 'once' ? '单次' : '来回'}`}
          />
        </div>

        {/* FPS 控制 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 w-14">FPS</span>
          <input
            type="range"
            min={1}
            max={60}
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <input
            type="number"
            min={1}
            max={60}
            value={fps}
            onChange={(e) => setFps(Math.max(1, Math.min(60, Number(e.target.value))))}
            className="w-10 px-1 py-0.5 text-xs text-center rounded border border-zinc-700 bg-zinc-800/80 text-zinc-200"
          />
        </div>

        {/* 背景选择 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 w-14">背景</span>
          <div className="flex gap-1">
            <BackgroundButton type="checker" current={background} onClick={setBackground} />
            <BackgroundButton type="black" current={background} onClick={setBackground} />
            <BackgroundButton type="white" current={background} onClick={setBackground} />
            <BackgroundButton type="transparent" current={background} onClick={setBackground} />
          </div>
        </div>

        {/* 颜色移除 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 w-14">抠色</span>
            <button
              onClick={() => setRemoveColor(!removeColor)}
              className={cn(
                'w-9 h-5 rounded-full transition-colors relative',
                removeColor ? 'bg-blue-500' : 'bg-zinc-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  removeColor ? 'left-4' : 'left-0.5'
                )}
              />
            </button>
          </div>

          <AnimatePresence>
            {removeColor && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg transition-colors',
                      showColorPicker 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    )}
                  >
                    <Pipette className="w-3 h-3" />
                    拾取
                  </button>
                  <div className="flex items-center gap-1.5 flex-1">
                    <div
                      className="w-6 h-6 rounded border border-zinc-600 shadow-inner"
                      style={{ backgroundColor: colorToRemove }}
                    />
                    <input
                      type="text"
                      value={colorToRemove}
                      onChange={(e) => setColorToRemove(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs rounded border border-zinc-700 bg-zinc-800/80 text-zinc-200 font-mono"
                      placeholder="#00ff00"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-10">容差</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={colorTolerance}
                    onChange={(e) => setColorTolerance(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs text-zinc-400 w-8 text-right">{colorTolerance}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 帧信息 */}
        {currentFrameData && (
          <div className="text-xs text-zinc-500 text-center">
            {currentFrameData.name} ({currentFrameData.width}×{currentFrameData.height})
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * 控制按钮属性
 */
interface ControlButtonProps {
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  primary?: boolean
  title?: string
}

/**
 * 控制按钮组件
 */
function ControlButton({ icon, onClick, disabled, active, primary, title }: ControlButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded-full transition-colors',
        primary
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
          : active
          ? 'bg-blue-900/50 text-blue-400'
          : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {icon}
    </motion.button>
  )
}

/**
 * 背景按钮属性
 */
interface BackgroundButtonProps {
  type: BackgroundType
  current: BackgroundType
  onClick: (type: BackgroundType) => void
}

/**
 * 背景按钮组件
 */
function BackgroundButton({ type, current, onClick }: BackgroundButtonProps) {
  const labels: Record<BackgroundType, string> = {
    checker: '棋盘格',
    black: '黑色',
    white: '白色',
    transparent: '透明',
  }

  return (
    <button
      onClick={() => onClick(type)}
      title={labels[type]}
      className={cn(
        'w-6 h-6 rounded-md border-2 transition-all',
        current === type
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-zinc-600 hover:border-zinc-500',
        type === 'checker' && 'checkerboard-sm',
        type === 'black' && 'bg-zinc-900',
        type === 'white' && 'bg-white',
        type === 'transparent' && 'bg-gradient-to-br from-pink-500/30 to-blue-500/30'
      )}
    />
  )
}
