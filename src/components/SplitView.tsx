/**
 * 拆分图集视图 (Split Spritesheet View)
 * 核心功能：导入图集 → 设置网格 → 预览 → 导出 Plist
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Download, 
  Settings, 
  FolderOpen,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from './ui/Button'
import { AnimationPreview, type FrameData } from './AnimationPreview'
import { useSplitStore } from '../store/splitStore'
import {
  selectSpritesheetFile,
  importSpritesheet,
  calculateSplitFrames,
  exportSplitPlist,
  getAssetUrl,
} from '../lib/tauri'

/**
 * 拆分图集视图组件
 */
export function SplitView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [exportSuccess, setExportSuccess] = useState(false)
  const [renamePng, setRenamePng] = useState(true) // 默认开启重命名
  const [previewExpanded, setPreviewExpanded] = useState(false)

  /**
   * 滚轮缩放
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(s => Math.max(0.1, Math.min(4, s + delta)))
  }, [])

  /**
   * 鼠标按下开始拖拽
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) { // 左键或中键
      setIsPanning(true)
      setPanStart({ x: e.clientX - offsetX, y: e.clientY - offsetY })
    }
  }, [offsetX, offsetY])

  /**
   * 鼠标移动拖拽画布
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setOffsetX(e.clientX - panStart.x)
    setOffsetY(e.clientY - panStart.y)
  }, [isPanning, panStart])

  /**
   * 鼠标释放结束拖拽
   */
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const {
    spritesheet,
    config,
    splitResult,
    isLoading,
    error,
    setSpritesheet,
    updateConfig,
    setSplitResult,
    setLoading,
    setError,
    reset,
  } = useSplitStore()

  /**
   * 选择并导入图集
   */
  const handleImport = useCallback(async () => {
    const path = await selectSpritesheetFile()
    if (!path) return

    setLoading(true)
    setError(null)

    try {
      const info = await importSpritesheet(path)
      setSpritesheet(info)
      
      // 应用自动检测结果
      const detectedConfig = {
        ...config,
        namePrefix: info.name.replace(/\.[^.]+$/, ''),
      }
      
      if (info.autoDetect) {
        detectedConfig.rows = info.autoDetect.rows
        detectedConfig.cols = info.autoDetect.cols
        // 更新 store 中的配置
        updateConfig({
          rows: info.autoDetect.rows,
          cols: info.autoDetect.cols,
        })
        console.log(
          `自动检测: ${info.autoDetect.frameWidth}x${info.autoDetect.frameHeight}, ` +
          `${info.autoDetect.rows}行${info.autoDetect.cols}列, 置信度${info.autoDetect.confidence}%`
        )
      }
      
      // 计算初始切分
      const initialResult = await calculateSplitFrames(info, detectedConfig)
      setSplitResult(initialResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [config, setSpritesheet, setSplitResult, updateConfig, setLoading, setError])

  /**
   * 更新切分预览
   */
  const handleUpdateSplit = useCallback(async () => {
    if (!spritesheet) return

    setLoading(true)
    try {
      const result = await calculateSplitFrames(spritesheet, config)
      setSplitResult(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [spritesheet, config, setSplitResult, setLoading, setError])

  /**
   * 配置变化时自动更新预览
   */
  useEffect(() => {
    if (spritesheet && config.rows > 0 && config.cols > 0) {
      const timer = setTimeout(handleUpdateSplit, 300)
      return () => clearTimeout(timer)
    }
  }, [config.rows, config.cols, config.frameWidth, config.frameHeight, config.namePrefix, spritesheet])

  /**
   * 导出 Plist（保存到 PNG 同目录）
   */
  const handleExport = useCallback(async () => {
    if (!spritesheet || !splitResult) return

    setLoading(true)
    try {
      const result = await exportSplitPlist(
        spritesheet, 
        splitResult.frames, 
        config.namePrefix,  // 使用帧前缀作为文件名
        { renamePng }
      )
      
      console.log('导出成功:', result)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [spritesheet, splitResult, config.namePrefix, renamePng, setLoading, setError])

  /**
   * 绘制预览
   */
  useEffect(() => {
    if (!canvasRef.current || !spritesheet) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 加载图片
    const img = new Image()
    img.onload = () => {
      canvas.width = spritesheet.width
      canvas.height = spritesheet.height

      // 绘制棋盘格背景 - 暗色版
      const size = 16
      for (let y = 0; y < canvas.height; y += size) {
        for (let x = 0; x < canvas.width; x += size) {
          const isEven = ((x / size) + (y / size)) % 2 === 0
          ctx.fillStyle = isEven ? '#27272a' : '#18181b'
          ctx.fillRect(x, y, size, size)
        }
      }

      // 绘制图片
      ctx.drawImage(img, 0, 0)

      // 绘制网格线
      if (splitResult && splitResult.frames.length > 0) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
        ctx.lineWidth = 2

        splitResult.frames.forEach((frame, index) => {
          ctx.strokeRect(frame.x, frame.y, frame.width, frame.height)
          
          // 绘制帧编号
          ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'
          ctx.font = 'bold 14px sans-serif'
          ctx.fillText(
            `${index + 1}`,
            frame.x + 4,
            frame.y + 16
          )
        })
      }
    }
    img.src = getAssetUrl(spritesheet.path)
  }, [spritesheet, splitResult])

  /**
   * 自动适应缩放
   */
  useEffect(() => {
    if (!containerRef.current || !spritesheet) return

    const container = containerRef.current
    const { width: cw, height: ch } = container.getBoundingClientRect()
    const scaleX = (cw - 40) / spritesheet.width
    const scaleY = (ch - 40) / spritesheet.height
    setScale(Math.min(scaleX, scaleY, 1))
  }, [spritesheet])

  return (
    <div className="h-full flex gap-2">
      {/* 左侧：切分设置面板 */}
      <div className="w-52 flex-shrink-0 flex flex-col bg-slate-800/60 backdrop-blur-xl rounded-xl border border-indigo-500/20 overflow-hidden shadow-lg shadow-slate-900/30">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-indigo-500/20 bg-slate-700/50">
          <Settings className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-semibold text-slate-200">切分设置</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
          {/* 行列设置 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-indigo-400">网格设置</label>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-xs text-slate-500">行数</span>
                <input type="number" min={1} max={100} value={config.rows}
                  onChange={(e) => updateConfig({ rows: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/80 text-slate-200" />
              </div>
              <div>
                <span className="text-xs text-slate-500">列数</span>
                <input type="number" min={1} max={100} value={config.cols}
                  onChange={(e) => updateConfig({ cols: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/80 text-slate-200" />
              </div>
            </div>
            {spritesheet?.autoDetect && (
              <button onClick={() => updateConfig({ rows: spritesheet.autoDetect!.rows, cols: spritesheet.autoDetect!.cols })}
                className="w-full px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-lg hover:from-blue-400 hover:to-blue-500 transition-all shadow-md shadow-blue-500/30">
                🎯 应用检测 ({spritesheet.autoDetect.rows}×{spritesheet.autoDetect.cols})
              </button>
            )}
          </div>

          {/* 帧尺寸 */}
          {splitResult && (
            <div className="p-2 bg-slate-700/60 rounded-lg text-xs text-slate-400 border border-slate-600/50">
              <p>帧尺寸: <span className="text-slate-200">{splitResult.frameWidth} × {splitResult.frameHeight}</span></p>
              <p>总帧数: <span className="text-slate-200">{splitResult.totalFrames}</span></p>
            </div>
          )}

          {/* 命名设置 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-indigo-400">帧命名</label>
            <div>
              <span className="text-xs text-slate-500">前缀</span>
              <input type="text" value={config.namePrefix}
                onChange={(e) => updateConfig({ namePrefix: e.target.value || 'frame' })}
                className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/80 text-slate-200" placeholder="frame" />
            </div>
            <div>
              <span className="text-xs text-slate-500">起始编号</span>
              <input type="number" min={0} value={config.startIndex ?? 1}
                onChange={(e) => updateConfig({ startIndex: parseInt(e.target.value) || 1 })}
                className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/80 text-slate-200" />
            </div>
          </div>
        </div>
      </div>

      {/* 中间：画布区域 */}
      <div className="flex-1 flex flex-col bg-slate-800/50 backdrop-blur-xl rounded-xl border border-indigo-500/20 overflow-hidden">
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-indigo-500/20 bg-slate-700/50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<ZoomOut className="w-4 h-4" />} onClick={() => setScale(s => Math.max(0.1, s - 0.1))} />
            <span className="text-xs text-slate-400 w-10 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" icon={<ZoomIn className="w-4 h-4" />} onClick={() => setScale(s => Math.min(4, s + 0.1))} />
          </div>
          <Button variant="primary" size="sm" icon={<FolderOpen className="w-4 h-4" />} onClick={handleImport} loading={isLoading}>
            导入
          </Button>
        </div>

        {/* 画布预览 */}
        <div ref={containerRef} className={`flex-1 overflow-hidden flex items-center justify-center checkerboard p-4 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          {!spritesheet ? (
            <motion.div 
              className="text-center text-indigo-400"
              animate={{ y: -6 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            >
              <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2 text-slate-300">导入精灵图集</p>
              <p className="text-sm">点击上方按钮选择图集</p>
            </motion.div>
          ) : (
            <motion.canvas ref={canvasRef} style={{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`, transformOrigin: 'center', imageRendering: scale > 1 ? 'pixelated' : 'auto' }} className="shadow-2xl rounded-lg" />
          )}
        </div>

        {/* 提示 */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 p-3 bg-red-900/80 border border-red-700/50 rounded-xl flex items-center gap-2 text-red-300 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-red-400" /><span className="text-sm">{error}</span>
            </motion.div>
          )}
          {exportSuccess && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 p-3 bg-green-900/80 border border-green-700/50 rounded-xl flex items-center gap-2 text-green-300 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-green-400" /><span className="text-sm">Plist 导出成功！</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 右侧面板：动画预览 + 导出设置 */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-2">
        {/* 动画预览 */}
        {splitResult && spritesheet && splitResult.frames.length > 0 && (
          <AnimationPreview
            imageSrc={getAssetUrl(spritesheet.path)}
            frames={splitResult.frames.map((f): FrameData => ({
              name: f.name, x: f.x, y: f.y, width: f.width, height: f.height,
            }))}
            initialFps={12}
            expanded={previewExpanded}
            onToggleExpand={() => setPreviewExpanded(!previewExpanded)}
          />
        )}

        {/* 导出设置 */}
        <div className="flex-1 flex flex-col bg-slate-800/60 backdrop-blur-xl rounded-xl border border-indigo-500/20 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-indigo-500/20 bg-slate-700/50">
            <Download className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-200">导出设置</h3>
          </div>
          
          <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
            {spritesheet && (
              <div className="p-2 bg-blue-900/30 border border-blue-700/30 rounded-lg text-xs space-y-1">
                <p className="font-medium text-blue-300 truncate">{spritesheet.name}</p>
                <p className="text-blue-400">{spritesheet.width} × {spritesheet.height}</p>
              </div>
            )}

            {/* 导出选项 */}
            <label className="flex items-center justify-between cursor-pointer p-2 bg-slate-700/60 rounded-lg border border-slate-600/50">
              <span className="text-xs text-slate-400">同步重命名 PNG</span>
              <button onClick={() => setRenamePng(!renamePng)}
                className={`w-8 h-4 rounded-full transition-colors relative ${renamePng ? 'bg-blue-500' : 'bg-zinc-600'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${renamePng ? 'left-4' : 'left-0.5'}`} />
              </button>
            </label>

            {/* 帧预览列表 */}
            {splitResult && splitResult.frames.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-indigo-400">帧列表</label>
                <div className="max-h-24 overflow-y-auto scrollbar-thin text-xs bg-slate-700/60 rounded-lg p-1.5 space-y-0.5 border border-slate-600/50">
                  {splitResult.frames.slice(0, 8).map((frame, i) => (
                    <div key={i} className="text-slate-400 truncate">{frame.name}</div>
                  ))}
                  {splitResult.frames.length > 8 && (
                    <div className="text-slate-500">... +{splitResult.frames.length - 8}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 p-2 border-t border-indigo-500/20 bg-slate-700/30 space-y-1.5">
            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}
              disabled={!splitResult || splitResult.frames.length === 0} loading={isLoading} className="w-full">
              导出 Plist
            </Button>
            <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={reset} className="w-full text-xs h-6">
              重置
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
