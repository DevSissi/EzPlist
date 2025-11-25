/**
 * 合成图集视图组件
 * Compose View Component - 整合精灵列表、拖拽画布和导出面板
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  ImagePlus,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from './ui/Button'
import { ComposeCanvas } from './ComposeCanvas'
import { useComposeStore } from '../store/composeStore'
import {
  selectImageFiles,
  importImages,
  getAssetUrl,
  composeSprites,
  selectExportDirectory,
  type ComposeSpritePosition,
} from '../lib/tauri'

/**
 * 合成图集视图组件
 */
export function ComposeView() {
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [outputName, setOutputName] = useState('spritesheet')

  const {
    canvasSprites,
    selectedIds,
    addSprites,
    removeSprites,
    clearCanvas,
    selectSprite,
  } = useComposeStore()

  /**
   * 处理文件导入
   */
  const handleImport = useCallback(async () => {
    const paths = await selectImageFiles()
    if (!paths || paths.length === 0) return

    setIsImporting(true)
    try {
      const result = await importImages(paths)
      if (result.sprites.length > 0) {
        addSprites(result.sprites)
      }
    } catch (err) {
      console.error('导入失败:', err)
    } finally {
      setIsImporting(false)
    }
  }, [addSprites])

  /**
   * 处理导出
   */
  const handleExport = useCallback(async () => {
    if (canvasSprites.length === 0) return

    // 选择导出目录
    const outputDir = await selectExportDirectory()
    if (!outputDir) return

    setIsExporting(true)
    setExportResult(null)

    try {
      // 构建精灵位置信息
      const sprites: ComposeSpritePosition[] = canvasSprites.map((cs) => ({
        id: cs.sprite.id,
        name: cs.sprite.name,
        path: cs.sprite.path,
        width: cs.sprite.width,
        height: cs.sprite.height,
        x: Math.round(cs.x),
        y: Math.round(cs.y),
      }))

      const result = await composeSprites(sprites, {
        outputDir,
        outputName,
        padding: 0,
        trimToBounds: true,
      })

      setExportResult({
        success: true,
        message: `导出成功！\n纹理尺寸: ${result.textureWidth}×${result.textureHeight}\n精灵数量: ${result.spriteCount}`,
      })
    } catch (err) {
      setExportResult({
        success: false,
        message: `导出失败: ${err}`,
      })
    } finally {
      setIsExporting(false)
    }
  }, [canvasSprites, outputName])

  /**
   * 删除选中精灵
   */
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size > 0) {
      removeSprites(Array.from(selectedIds))
    }
  }, [selectedIds, removeSprites])

  return (
    <div className="h-full flex gap-3">
      {/* 左侧 - 精灵列表 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-56 flex-shrink-0 flex flex-col bg-violet-950/40 backdrop-blur-xl rounded-xl border border-violet-500/20 overflow-hidden shadow-lg shadow-violet-900/20"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/20 bg-violet-900/30">
          <span className="text-sm font-medium text-violet-200">精灵列表</span>
          <span className="text-xs text-violet-400">
            {canvasSprites.length} 个
          </span>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-1 px-2 py-2 border-b border-violet-500/10">
          <Button
            variant="ghost"
            size="sm"
            icon={<FolderOpen className="w-4 h-4" />}
            onClick={handleImport}
            loading={isImporting}
            title="导入图片"
          >
            导入
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="w-4 h-4 text-red-500" />}
            onClick={clearCanvas}
            disabled={canvasSprites.length === 0}
            title="清空全部"
          />
        </div>

        {/* 精灵列表 */}
        <div className="flex-1 overflow-auto p-2 space-y-1 scrollbar-thin">
          {canvasSprites.length === 0 ? (
            <motion.div 
              className="h-full flex flex-col items-center justify-center text-violet-400/60"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <ImagePlus className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs text-center">
                点击上方按钮<br />导入图片
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {canvasSprites.map((cs) => (
                <SpriteListItem
                  key={cs.sprite.id}
                  sprite={cs.sprite}
                  isSelected={selectedIds.has(cs.sprite.id)}
                  onClick={() => selectSprite(cs.sprite.id, false)}
                  onCtrlClick={() => selectSprite(cs.sprite.id, true)}
                  onRemove={() => removeSprites([cs.sprite.id])}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* 中间 - 画布 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-w-0"
      >
        <ComposeCanvas />
      </motion.div>

      {/* 右侧 - 导出面板 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="w-56 flex-shrink-0 flex flex-col bg-violet-950/40 backdrop-blur-xl rounded-xl border border-violet-500/20 overflow-hidden shadow-lg shadow-violet-900/20"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/20 bg-violet-900/30">
          <span className="text-sm font-medium text-violet-200">导出设置</span>
        </div>

        {/* 导出配置 */}
        <div className="flex-1 p-3 space-y-4">
          {/* 文件名 */}
          <div>
            <label className="block text-xs text-violet-400 mb-1">
              输出文件名 (Output Name)
            </label>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="spritesheet"
              className="w-full px-2 py-1.5 text-sm border border-violet-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 bg-violet-900/40 text-violet-100 placeholder:text-violet-500"
            />
          </div>

          {/* 画布信息 */}
          <div className="p-2 bg-violet-900/30 border border-violet-500/20 rounded-lg space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-violet-400">精灵数量:</span>
              <span className="font-medium text-violet-200">{canvasSprites.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-violet-400">选中数量:</span>
              <span className="font-medium text-violet-200">{selectedIds.size}</span>
            </div>
            {canvasSprites.length > 0 && (
              <CanvasBoundsInfo />
            )}
          </div>

          {/* 操作按钮 */}
          <div className="space-y-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExport}
              loading={isExporting}
              disabled={canvasSprites.length === 0 || !outputName.trim()}
              className="w-full"
            >
              导出 PNG + Plist
            </Button>

            {selectedIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-4 h-4 text-red-500" />}
                onClick={handleDeleteSelected}
                className="w-full"
              >
                删除选中 ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* 导出结果 */}
          <AnimatePresence>
            {exportResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-2 rounded-lg text-xs ${
                  exportResult.success
                    ? 'bg-green-900/50 border border-green-500/30 text-green-300'
                    : 'bg-red-900/50 border border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  {exportResult.success ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  )}
                  <span className="whitespace-pre-line">{exportResult.message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 使用说明 */}
        <div className="p-3 border-t border-violet-500/20 bg-violet-900/20">
          <h4 className="text-xs font-medium text-violet-300 mb-1">使用说明</h4>
          <ul className="text-xs text-violet-400/70 space-y-0.5">
            <li>• 拖拽图片调整位置</li>
            <li>• 自动吸附对齐边缘</li>
            <li>• 方向键微调位置</li>
            <li>• Ctrl+A 全选精灵</li>
            <li>• Delete 删除选中</li>
          </ul>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * 精灵列表项属性
 */
interface SpriteListItemProps {
  sprite: {
    id: string
    name: string
    path: string
    width: number
    height: number
  }
  isSelected: boolean
  onClick: () => void
  onCtrlClick: () => void
  onRemove: () => void
}

/**
 * 精灵列表项组件
 */
function SpriteListItem({
  sprite,
  isSelected,
  onClick,
  onCtrlClick,
  onRemove,
}: SpriteListItemProps) {
  const imageUrl = getAssetUrl(sprite.path)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`group flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-violet-600/30 border border-violet-500/50 shadow-md shadow-violet-500/10'
          : 'hover:bg-violet-800/30 border border-transparent'
      }`}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          onCtrlClick()
        } else {
          onClick()
        }
      }}
    >
      {/* 缩略图 */}
      <div className="w-10 h-10 flex-shrink-0 checkerboard rounded overflow-hidden">
        <img
          src={imageUrl}
          alt={sprite.name}
          className="w-full h-full object-contain"
        />
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-violet-200 truncate">
          {sprite.name}
        </p>
        <p className="text-xs text-violet-400/70">
          {sprite.width}×{sprite.height}
        </p>
      </div>

      {/* 删除按钮 */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/50 rounded transition-all"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </motion.div>
  )
}

/**
 * 画布边界信息组件
 */
function CanvasBoundsInfo() {
  const bounds = useComposeStore((state) => state.getCanvasBounds())

  return (
    <>
      <div className="flex justify-between">
        <span className="text-violet-400">预计尺寸:</span>
        <span className="font-medium text-violet-200">
          {bounds.width}×{bounds.height}
        </span>
      </div>
    </>
  )
}
