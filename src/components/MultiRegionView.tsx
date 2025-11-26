/**
 * 多区域视图 (Multi-Region View)
 * 功能：在同一张图上定义多个动画区域，批量导出多个 Plist
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Settings,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Edit3,
} from 'lucide-react'
import { Button } from './ui/Button'
import { AnimationPreview, type FrameData } from './AnimationPreview'
import { BackgroundSettings } from './BackgroundSettings'
import { useMultiRegionStore } from '../store/multiRegionStore'
import { useCanvasSettingsStore, getBackgroundStyle } from '../store/canvasSettingsStore'
import {
  selectSpritesheetFile,
  importSpritesheet,
  calculateRegionPreview,
  exportMultiPlist,
  getAssetUrl,
} from '../lib/tauri'
import type { AnimationRegion, SplitResult } from '../types/sprite'

/**
 * 多区域视图组件
 */
export function MultiRegionView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [exportSuccess, setExportSuccess] = useState(false)
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  
  // 画布背景设置
  const canvasSettings = useCanvasSettingsStore()

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
    if (e.button === 0 || e.button === 1) {
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
    regions,
    selectedRegionId,
    regionPreviews,
    defaultFrameSize,
    isLoading,
    error,
    setSpritesheet,
    addRegion,
    updateRegion,
    removeRegion,
    selectRegion,
    setRegionPreview,
    setDefaultFrameSize,
    setLoading,
    setError,
    reset,
    clearRegions,
  } = useMultiRegionStore()

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
      if (info.autoDetect) {
        setDefaultFrameSize(info.autoDetect.frameWidth, info.autoDetect.frameHeight)
        console.log(
          `自动检测: ${info.autoDetect.frameWidth}x${info.autoDetect.frameHeight}, ` +
          `${info.autoDetect.rows}行${info.autoDetect.cols}列, 置信度${info.autoDetect.confidence}%`
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [setSpritesheet, setDefaultFrameSize, setLoading, setError])

  /**
   * 添加新区域
   */
  const handleAddRegion = useCallback(() => {
    if (!spritesheet) return
    addRegion({
      frameWidth: defaultFrameSize.width,
      frameHeight: defaultFrameSize.height,
    })
  }, [spritesheet, defaultFrameSize, addRegion])

  /**
   * 快速添加：按检测结果添加首行区域
   */
  const handleQuickAddFirstRow = useCallback(() => {
    if (!spritesheet?.autoDetect) return
    const detect = spritesheet.autoDetect
    
    // 添加首行区域
    addRegion({
      name: spritesheet.name.replace(/\.[^.]+$/, ''),
      startRow: 0,
      startCol: 0,
      frameCount: detect.cols,
      frameWidth: detect.frameWidth,
      frameHeight: detect.frameHeight,
    })
  }, [spritesheet, addRegion])

  /**
   * 快速添加：按检测结果为每行添加一个区域
   */
  const handleQuickAddAllRows = useCallback(() => {
    if (!spritesheet?.autoDetect) return
    const detect = spritesheet.autoDetect
    const baseName = spritesheet.name.replace(/\.[^.]+$/, '')
    
    // 为每行添加区域
    for (let row = 0; row < detect.rows; row++) {
      addRegion({
        name: detect.rows === 1 ? baseName : `${baseName}_row${row + 1}`,
        startRow: row,
        startCol: 0,
        frameCount: detect.cols,
        frameWidth: detect.frameWidth,
        frameHeight: detect.frameHeight,
      })
    }
  }, [spritesheet, addRegion])

  /**
   * 更新区域预览
   */
  const updateRegionPreview = useCallback(async (region: AnimationRegion) => {
    if (!spritesheet) return
    
    try {
      const preview = await calculateRegionPreview(spritesheet, region)
      setRegionPreview(region.id, preview)
    } catch (err) {
      console.error('预览更新失败:', err)
    }
  }, [spritesheet, setRegionPreview])

  /**
   * 区域变化时更新预览
   */
  useEffect(() => {
    if (!spritesheet) return
    
    regions.forEach((region) => {
      const timer = setTimeout(() => updateRegionPreview(region), 200)
      return () => clearTimeout(timer)
    })
  }, [regions, spritesheet, updateRegionPreview])

  /**
   * 批量导出
   */
  const handleExport = useCallback(async () => {
    if (!spritesheet || regions.length === 0) return

    setLoading(true)
    try {
      const result = await exportMultiPlist(spritesheet, regions)
      
      if (result.failed.length > 0) {
        console.warn('部分导出失败:', result.failed)
      }
      
      console.log('导出成功:', result.exportedFiles)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [spritesheet, regions, setLoading, setError])

  /**
   * 绘制预览
   */
  useEffect(() => {
    if (!canvasRef.current || !spritesheet) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = spritesheet.width
      canvas.height = spritesheet.height

      // 清除画布（使用透明背景，由外层容器提供背景）
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制图片
      ctx.drawImage(img, 0, 0)

      // 绘制各区域
      regions.forEach((region) => {
        const preview = regionPreviews.get(region.id)
        if (!preview) return

        const isSelected = region.id === selectedRegionId
        const color = region.color || '#3b82f6'

        // 绘制区域边框
        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.setLineDash(isSelected ? [] : [5, 5])

        // 计算区域边界
        if (preview.frames.length > 0) {
          const minX = Math.min(...preview.frames.map(f => f.x))
          const minY = Math.min(...preview.frames.map(f => f.y))
          const maxX = Math.max(...preview.frames.map(f => f.x + f.width))
          const maxY = Math.max(...preview.frames.map(f => f.y + f.height))
          
          // 绘制区域背景
          ctx.fillStyle = `${color}20`
          ctx.fillRect(minX, minY, maxX - minX, maxY - minY)
          
          // 绘制区域边框
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)

          // 绘制帧网格
          ctx.strokeStyle = `${color}80`
          ctx.lineWidth = 1
          ctx.setLineDash([])
          
          preview.frames.forEach((frame, index) => {
            ctx.strokeRect(frame.x, frame.y, frame.width, frame.height)
            
            // 绘制帧编号
            if (isSelected) {
              ctx.fillStyle = color
              ctx.font = 'bold 12px sans-serif'
              ctx.fillText(`${index + 1}`, frame.x + 3, frame.y + 13)
            }
          })

          // 绘制区域名称标签
          ctx.fillStyle = color
          ctx.font = 'bold 14px sans-serif'
          const label = `${region.name} (${preview.totalFrames}帧)`
          const textWidth = ctx.measureText(label).width
          
          ctx.fillStyle = color
          ctx.fillRect(minX, minY - 20, textWidth + 8, 18)
          ctx.fillStyle = 'white'
          ctx.fillText(label, minX + 4, minY - 6)
        }

        ctx.setLineDash([])
      })
    }
    img.src = getAssetUrl(spritesheet.path)
  }, [spritesheet, regions, regionPreviews, selectedRegionId])

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
    <div className="h-full flex gap-2 overflow-hidden">
      {/* 左侧：区域设置面板 */}
      <div className="w-56 min-w-[224px] flex-shrink-0 flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <Settings className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>区域设置</h3>
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-2 space-y-2 overflow-y-auto">
          {/* 帧尺寸设置 */}
          {spritesheet && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>帧尺寸</span>
              <input
                type="number"
                min={1}
                value={defaultFrameSize.width}
                onChange={(e) => {
                  const newWidth = Math.max(1, parseInt(e.target.value) || 1)
                  setDefaultFrameSize(newWidth, defaultFrameSize.height)
                  regions.forEach(r => updateRegion(r.id, { frameWidth: newWidth }))
                }}
                className="w-16 px-2 py-1.5 text-sm rounded-lg focus:outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>×</span>
              <input
                type="number"
                min={1}
                value={defaultFrameSize.height}
                onChange={(e) => {
                  const newHeight = Math.max(1, parseInt(e.target.value) || 1)
                  setDefaultFrameSize(defaultFrameSize.width, newHeight)
                  regions.forEach(r => updateRegion(r.id, { frameHeight: newHeight }))
                }}
                className="w-16 px-2 py-1.5 text-sm rounded-lg focus:outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {/* 区域列表标题 */}
          {spritesheet && (
            <div className="flex-shrink-0 flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>区域列表</label>
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus className="w-3 h-3" />}
                onClick={handleAddRegion}
                className="text-xs h-5 px-1.5"
              >
                添加
              </Button>
            </div>
          )}

          {/* 区域列表 */}
          {spritesheet && (
            <div className="flex-1 min-h-[120px] overflow-y-auto space-y-1 scrollbar-thin">
              {regions.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-2">
                  {spritesheet.autoDetect ? (
                    <div className="space-y-1">
                      <p>点击添加创建区域</p>
                      <Button variant="ghost" size="sm" onClick={handleQuickAddFirstRow} className="w-full text-xs h-6">
                        🎯 首行 ({spritesheet.autoDetect.cols}帧)
                      </Button>
                      {spritesheet.autoDetect.rows > 1 && (
                        <Button variant="ghost" size="sm" onClick={handleQuickAddAllRows} className="w-full text-xs h-6">
                          📋 全部 {spritesheet.autoDetect.rows}行
                        </Button>
                      )}
                    </div>
                  ) : '点击添加创建区域'}
                </div>
              ) : (
                regions.map((region) => (
                  <RegionItem
                    key={region.id}
                    region={region}
                    isSelected={region.id === selectedRegionId}
                    isEditing={region.id === editingRegionId}
                    preview={regionPreviews.get(region.id)}
                    onSelect={() => selectRegion(region.id)}
                    onEdit={() => setEditingRegionId(region.id)}
                    onStopEdit={() => setEditingRegionId(null)}
                    onUpdate={(partial) => updateRegion(region.id, partial)}
                    onDelete={() => removeRegion(region.id)}
                  />
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* 中间：画布区域 */}
      <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<ZoomOut className="w-4 h-4" />} onClick={() => setScale(s => Math.max(0.1, s - 0.1))} />
            <span className="text-sm w-12 text-center" style={{ color: 'var(--text-secondary)' }}>{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" icon={<ZoomIn className="w-4 h-4" />} onClick={() => setScale(s => Math.min(4, s + 0.1))} />
            <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />
            <BackgroundSettings />
          </div>
          <Button variant="primary" size="sm" icon={<FolderOpen className="w-4 h-4" />} onClick={handleImport} loading={isLoading}>
            导入
          </Button>
        </div>

        {/* 画布预览 */}
        <div 
          ref={containerRef} 
          className={`flex-1 overflow-hidden flex items-center justify-center p-4 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} 
          style={getBackgroundStyle(canvasSettings)}
          onWheel={handleWheel} 
          onContextMenu={(e) => e.preventDefault()} 
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp} 
          onMouseLeave={handleMouseUp}
        >
          {!spritesheet ? (
            <motion.div 
              className="text-center"
              animate={{ y: -6 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            >
              <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>导入精灵图集</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>点击上方按钮选择图集</p>
            </motion.div>
          ) : (
            <motion.canvas ref={canvasRef} style={{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`, transformOrigin: 'center', imageRendering: scale > 1 ? 'pixelated' : 'auto' }} className="shadow-lg" />
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
              <CheckCircle className="w-5 h-5 text-green-400" /><span className="text-sm">成功导出 {regions.length} 个 Plist!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 右侧面板：动画预览 + 导出设置 */}
      <div className="w-56 min-w-[224px] flex-shrink-0 flex flex-col gap-2">
        {/* 动画预览 */}
        {selectedRegionId && regionPreviews.get(selectedRegionId) && spritesheet && (
          <AnimationPreview
            imageSrc={getAssetUrl(spritesheet.path)}
            frames={regionPreviews.get(selectedRegionId)!.frames.map((f): FrameData => ({
              name: f.name, x: f.x, y: f.y, width: f.width, height: f.height,
            }))}
            initialFps={12}
            expanded={previewExpanded}
            onToggleExpand={() => setPreviewExpanded(!previewExpanded)}
          />
        )}

        {/* 导出设置 */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <Download className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>导出设置</h3>
          </div>
          
          <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
            {spritesheet && (
              <div className="p-2 rounded-lg text-xs space-y-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{spritesheet.name}</p>
                <p style={{ color: 'var(--text-secondary)' }}>{spritesheet.width} × {spritesheet.height}</p>
                {spritesheet.autoDetect && (
                  <p style={{ color: 'var(--accent-primary)' }}>🎯 {spritesheet.autoDetect.frameWidth}×{spritesheet.autoDetect.frameHeight} ({spritesheet.autoDetect.rows}×{spritesheet.autoDetect.cols})</p>
                )}
              </div>
            )}
            
            {regions.length > 0 && (
              <div className="p-2 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <p>已定义 <span style={{ color: 'var(--text-primary)' }}>{regions.length}</span> 个区域</p>
                <p>总计 <span style={{ color: 'var(--text-primary)' }}>{regions.reduce((sum, r) => sum + (regionPreviews.get(r.id)?.totalFrames || r.frameCount), 0)}</span> 帧</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 p-2 space-y-1.5" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport} disabled={regions.length === 0} loading={isLoading} className="w-full">
              批量导出 ({regions.length})
            </Button>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={clearRegions} disabled={regions.length === 0} className="flex-1 text-xs h-6">清空</Button>
              <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={reset} className="flex-1 text-xs h-6">重置</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 区域列表项组件
 */
interface RegionItemProps {
  region: AnimationRegion
  isSelected: boolean
  isEditing: boolean
  preview?: SplitResult
  onSelect: () => void
  onEdit: () => void
  onStopEdit: () => void
  onUpdate: (partial: Partial<AnimationRegion>) => void
  onDelete: () => void
}

function RegionItem({
  region,
  isSelected,
  isEditing,
  preview,
  onSelect,
  onEdit,
  onStopEdit,
  onUpdate,
  onDelete,
}: RegionItemProps) {
  const [editName, setEditName] = useState(region.name)

  const handleSaveName = () => {
    if (editName.trim()) {
      onUpdate({ name: editName.trim() })
    }
    onStopEdit()
  }

  return (
    <div
      className="p-2 rounded-lg cursor-pointer"
      style={{
        background: isSelected ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-default)'}`
      }}
      onClick={onSelect}
    >
      {/* 标题行 */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: region.color }} />
        {isEditing ? (
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={handleSaveName}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') onStopEdit() }}
            className="flex-1 px-2 py-1 text-sm rounded-lg focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent-primary)', color: 'var(--text-primary)' }}
            autoFocus onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{region.name}</span>
        )}
        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{preview?.totalFrames || region.frameCount}帧</span>
        <button onClick={(e) => { e.stopPropagation(); isEditing ? handleSaveName() : (setEditName(region.name), onEdit()) }}
          className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}><Edit3 className="w-3.5 h-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded hover:text-red-400" style={{ color: 'var(--text-tertiary)' }}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      
      {/* 属性编辑 - 始终显示 */}
      <div className="grid grid-cols-3 gap-1.5" onClick={(e) => e.stopPropagation()}>
        <div>
          <span className="text-xs block mb-0.5" style={{ color: 'var(--text-secondary)' }}>起始行</span>
          <input type="number" min={1} value={region.startRow + 1}
            onChange={(e) => onUpdate({ startRow: Math.max(0, (parseInt(e.target.value) || 1) - 1) })}
            className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <span className="text-xs block mb-0.5" style={{ color: 'var(--text-secondary)' }}>起始列</span>
          <input type="number" min={0} value={region.startCol}
            onChange={(e) => onUpdate({ startCol: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <span className="text-xs block mb-0.5" style={{ color: 'var(--text-secondary)' }}>帧数</span>
          <input type="number" min={1} value={region.frameCount}
            onChange={(e) => onUpdate({ frameCount: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        </div>
      </div>
    </div>
  )
}
