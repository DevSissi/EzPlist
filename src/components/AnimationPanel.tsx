/**
 * 动画预览面板（右下）
 * Animation Panel Component - 序列帧预览和设置
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, Wand2 } from 'lucide-react'
import { Button } from './ui/Button'
import { useSpriteStore } from '../store/spriteStore'
import { getAssetUrl } from '../lib/tauri'

/**
 * 动画预览面板组件
 */
export function AnimationPanel() {
  const { sprites, selectedIds, updateAnimationGroups } = useSpriteStore()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [fps, setFps] = useState(12)
  const [rows, setRows] = useState(1)
  const [cols, setCols] = useState(1)
  
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  // 获取当前要播放的帧列表
  const selectedSprites = sprites.filter(s => selectedIds.has(s.id))
  const framesToPlay = selectedSprites.length > 0 ? selectedSprites : sprites

  // 自动检测行列数
  const handleAutoDetect = useCallback(() => {
    updateAnimationGroups()
    
    // 基于选中数量推算合理的行列
    const count = framesToPlay.length
    if (count <= 0) return
    
    const sqrt = Math.sqrt(count)
    const newCols = Math.ceil(sqrt)
    const newRows = Math.ceil(count / newCols)
    
    setCols(newCols)
    setRows(newRows)
  }, [framesToPlay.length, updateAnimationGroups])

  // 动画循环
  useEffect(() => {
    if (!isPlaying || framesToPlay.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const frameInterval = 1000 / fps

    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= frameInterval) {
        setCurrentFrame((prev) => (prev + 1) % framesToPlay.length)
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
  }, [isPlaying, fps, framesToPlay.length])

  // 重置帧索引当精灵改变时
  useEffect(() => {
    setCurrentFrame(0)
  }, [framesToPlay.length])

  const currentSprite = framesToPlay[currentFrame]

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-xl border border-white/50 overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50 bg-white/30">
        <h3 className="text-sm font-semibold text-gray-700">动画预览</h3>
        <Button
          variant="ghost"
          size="sm"
          icon={<Wand2 className="w-3.5 h-3.5" />}
          onClick={handleAutoDetect}
        >
          自动检测
        </Button>
      </div>

      {/* 预览区域 */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0">
        {currentSprite ? (
          <div className="w-full h-full max-w-[120px] max-h-[120px] checkerboard rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={getAssetUrl(currentSprite.path)}
              alt={currentSprite.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="text-center text-gray-400 text-xs">
            <p>选择精灵以预览</p>
          </div>
        )}
      </div>

      {/* 控制区域 */}
      <div className="p-3 space-y-3 border-t border-gray-200/50 bg-white/20">
        {/* 播放控制 */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentFrame(0)}
            className="p-1.5 rounded-lg hover:bg-white/50 text-gray-600 transition-colors"
            title="重置"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={framesToPlay.length === 0}
            className={`p-2 rounded-full transition-colors ${
              isPlaying
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* FPS 控制 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">FPS</span>
            <span className="text-xs font-medium text-gray-700">{fps}</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* 行列数输入 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">行数</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Number(e.target.value)))}
              className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white/80 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-center"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">列数</label>
            <input
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Number(e.target.value)))}
              className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white/80 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-center"
            />
          </div>
        </div>

        {/* 帧信息 */}
        <div className="text-center text-xs text-gray-400">
          {framesToPlay.length > 0 ? (
            <span>帧 {currentFrame + 1} / {framesToPlay.length}</span>
          ) : (
            <span>无可用帧</span>
          )}
        </div>
      </div>
    </div>
  )
}
