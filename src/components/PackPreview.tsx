/**
 * 打包预览组件 (Pack Preview Component)
 * 使用 Canvas 绘制打包结果，显示精灵布局
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCcw, Grid, Move } from 'lucide-react'
import { Button } from './ui/Button'
import { useSpriteStore } from '../store/spriteStore'
import { getAssetUrl } from '../lib/tauri'
import type { PackedSprite } from '../types/sprite'

/**
 * 打包预览组件属性
 */
interface PackPreviewProps {
  /** 返回到导入视图的回调 */
  onBack?: () => void
}

/**
 * 打包预览组件
 */
export function PackPreview({ onBack }: PackPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [hoveredSprite, setHoveredSprite] = useState<PackedSprite | null>(null)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  
  const { packResult, sprites } = useSpriteStore()
  
  // 创建精灵ID到路径的映射
  const spritePathMap = new Map(sprites.map(s => [s.id, s.path]))
  
  // 加载并绘制
  useEffect(() => {
    if (!packResult || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 设置 Canvas 尺寸
    canvas.width = packResult.textureWidth
    canvas.height = packResult.textureHeight
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 绘制背景网格
    if (showGrid) {
      drawCheckerboard(ctx, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    
    // 加载并绘制所有精灵
    const loadAndDraw = async () => {
      const loadPromises = packResult.packedSprites.map(async (sprite) => {
        const path = spritePathMap.get(sprite.id)
        if (!path) return null
        
        return new Promise<{ sprite: PackedSprite; img: HTMLImageElement } | null>((resolve) => {
          const img = new Image()
          img.onload = () => resolve({ sprite, img })
          img.onerror = () => resolve(null)
          img.src = getAssetUrl(path)
        })
      })
      
      const results = await Promise.all(loadPromises)
      
      // 绘制精灵
      results.forEach((result) => {
        if (!result) return
        const { sprite, img } = result
        
        ctx.save()
        
        if (sprite.rotated) {
          // 旋转 90 度绘制
          ctx.translate(sprite.x + sprite.width, sprite.y)
          ctx.rotate(Math.PI / 2)
          ctx.drawImage(img, 0, 0, sprite.height, sprite.width)
        } else {
          ctx.drawImage(img, sprite.x, sprite.y, sprite.width, sprite.height)
        }
        
        ctx.restore()
      })
      
      // 绘制边框（调试用）
      packResult.packedSprites.forEach((sprite) => {
        ctx.strokeStyle = sprite.rotated ? 'rgba(255, 165, 0, 0.5)' : 'rgba(0, 200, 255, 0.3)'
        ctx.lineWidth = 1
        ctx.strokeRect(sprite.x, sprite.y, sprite.width, sprite.height)
      })
      
      setImagesLoaded(true)
    }
    
    loadAndDraw()
  }, [packResult, showGrid, spritePathMap])
  
  // 自动适应视图
  useEffect(() => {
    if (!packResult || !containerRef.current) return
    
    const container = containerRef.current
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect()
    
    const scaleX = (containerWidth - 40) / packResult.textureWidth
    const scaleY = (containerHeight - 40) / packResult.textureHeight
    const fitScale = Math.min(scaleX, scaleY, 1)
    
    setScale(fitScale)
    setOffset({
      x: (containerWidth - packResult.textureWidth * fitScale) / 2,
      y: (containerHeight - packResult.textureHeight * fitScale) / 2,
    })
  }, [packResult])
  
  /**
   * 绘制棋盘格背景
   */
  const drawCheckerboard = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const size = 16
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const isEven = ((x / size) + (y / size)) % 2 === 0
        ctx.fillStyle = isEven ? '#2a2a3e' : '#1e1e2e'
        ctx.fillRect(x, y, size, size)
      }
    }
  }
  
  /**
   * 缩放控制
   */
  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => Math.max(0.1, Math.min(4, prev + delta)))
  }, [])
  
  /**
   * 重置视图
   */
  const handleReset = useCallback(() => {
    if (!packResult || !containerRef.current) return
    
    const container = containerRef.current
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect()
    
    const scaleX = (containerWidth - 40) / packResult.textureWidth
    const scaleY = (containerHeight - 40) / packResult.textureHeight
    const fitScale = Math.min(scaleX, scaleY, 1)
    
    setScale(fitScale)
    setOffset({
      x: (containerWidth - packResult.textureWidth * fitScale) / 2,
      y: (containerHeight - packResult.textureHeight * fitScale) / 2,
    })
  }, [packResult])
  
  /**
   * 鼠标滚轮缩放
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    handleZoom(delta)
  }, [handleZoom])
  
  /**
   * 拖拽开始
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }, [offset])
  
  /**
   * 拖拽移动
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
    
    // 检测悬浮的精灵
    if (!packResult || !canvasRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left - offset.x) / scale
    const canvasY = (e.clientY - rect.top - offset.y) / scale
    
    const hovered = packResult.packedSprites.find(
      (s) =>
        canvasX >= s.x &&
        canvasX <= s.x + s.width &&
        canvasY >= s.y &&
        canvasY <= s.y + s.height
    )
    
    setHoveredSprite(hovered || null)
  }, [isDragging, dragStart, offset, scale, packResult])
  
  /**
   * 拖拽结束
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  if (!packResult) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>请先执行打包操作</p>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200/50 bg-white/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            打包预览 (Pack Preview)
          </span>
          <span className="text-xs text-gray-400">
            {packResult.textureWidth}×{packResult.textureHeight} | 
            {packResult.packedSprites.length} 精灵 | 
            填充率 {packResult.fillRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<ZoomOut className="w-4 h-4" />}
            onClick={() => handleZoom(-0.2)}
            title="缩小"
          />
          <span className="text-xs text-gray-500 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<ZoomIn className="w-4 h-4" />}
            onClick={() => handleZoom(0.2)}
            title="放大"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={handleReset}
            title="重置视图"
          />
          <Button
            variant={showGrid ? 'secondary' : 'ghost'}
            size="sm"
            icon={<Grid className="w-4 h-4" />}
            onClick={() => setShowGrid(!showGrid)}
            title="显示网格"
          />
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              返回
            </Button>
          )}
        </div>
      </div>
      
      {/* Canvas 区域 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-gray-900 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <motion.div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <canvas
            ref={canvasRef}
            className="shadow-2xl"
            style={{
              imageRendering: scale > 1 ? 'pixelated' : 'auto',
            }}
          />
        </motion.div>
        
        {/* 悬浮信息 */}
        {hoveredSprite && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 px-3 py-2 bg-black/80 rounded-lg text-white text-xs"
          >
            <p className="font-medium">{hoveredSprite.name}</p>
            <p className="text-gray-300">
              位置: ({hoveredSprite.x}, {hoveredSprite.y}) | 
              尺寸: {hoveredSprite.width}×{hoveredSprite.height}
              {hoveredSprite.rotated && ' | 已旋转'}
              {hoveredSprite.trimmed && ' | 已裁剪'}
            </p>
          </motion.div>
        )}
        
        {/* 加载状态 */}
        {!imagesLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="flex items-center gap-2 text-white">
              <Move className="w-5 h-5 animate-pulse" />
              <span>加载中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
