/**
 * 预览区域组件（中间主区域）
 * Preview Area Component - 显示导入区域和打包预览
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImagePlus, FolderOpen, AlertCircle, Grid3X3, Package } from 'lucide-react'
import { Button } from './ui/Button'
import { useSpriteStore } from '../store/spriteStore'
import { selectImageFiles, importImages, getAssetUrl } from '../lib/tauri'
import { formatDimensions } from '../lib/utils'
import { PackPreview } from './PackPreview'

/**
 * 预览区域组件
 */
export function PreviewArea() {
  const [isDragging, setIsDragging] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showPackPreview, setShowPackPreview] = useState(false)
  
  const { sprites, selectedIds, addSprites, isLoading, setLoading, setError, packResult } = useSpriteStore()

  /**
   * 处理文件导入
   */
  const handleImport = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return

      setLoading(true)
      setImportError(null)

      try {
        const result = await importImages(paths)
        
        if (result.sprites.length > 0) {
          addSprites(result.sprites)
        }

        if (result.failed.length > 0) {
          setImportError(`${result.failed.length} 个文件导入失败`)
          console.warn('导入失败的文件:', result.failed)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '导入失败'
        setImportError(message)
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [addSprites, setLoading, setError]
  )

  /**
   * 通过文件对话框选择图片
   */
  const handleBrowse = useCallback(async () => {
    const paths = await selectImageFiles()
    if (paths && paths.length > 0) {
      await handleImport(paths)
    }
  }, [handleImport])

  /**
   * 处理拖拽事件
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const imagePaths = files
        .filter((file) => file.type.startsWith('image/'))
        .map((file) => (file as any).path as string)
        .filter(Boolean)

      if (imagePaths.length > 0) {
        await handleImport(imagePaths)
      }
    },
    [handleImport]
  )

  // 获取选中的精灵（用于预览）
  const selectedSprites = sprites.filter(s => selectedIds.has(s.id))
  const displaySprites = selectedSprites.length > 0 ? selectedSprites : sprites

  return (
    <div 
      className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-xl border border-white/50 overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200/50 bg-white/30">
        <div className="flex items-center gap-2">
          {/* 视图切换按钮 */}
          {packResult && (
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setShowPackPreview(false)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  !showPackPreview ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5 inline mr-1" />
                精灵
              </button>
              <button
                onClick={() => setShowPackPreview(true)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  showPackPreview ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Package className="w-3.5 h-3.5 inline mr-1" />
                打包
              </button>
            </div>
          )}
          
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            {!packResult && <Grid3X3 className="w-4 h-4" />}
            {showPackPreview ? '打包预览' : '预览区域'}
            {sprites.length > 0 && !showPackPreview && (
              <span className="text-xs text-gray-400 font-normal">
                ({selectedIds.size > 0 ? `${selectedIds.size} 选中` : `${sprites.length} 精灵`})
              </span>
            )}
          </h3>
        </div>
        
        <Button
          variant="primary"
          size="sm"
          icon={<FolderOpen className="w-4 h-4" />}
          onClick={handleBrowse}
          loading={isLoading}
        >
          选择文件
        </Button>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 打包预览模式 */}
        {showPackPreview && packResult ? (
          <PackPreview onBack={() => setShowPackPreview(false)} />
        ) : (
          <>
            {/* 拖拽提示覆盖层 */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-center"
                  >
                    <Upload className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                    <p className="text-lg font-medium text-blue-700">
                      释放以导入图片
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 空状态 */}
            {sprites.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ImagePlus className="w-20 h-20 mb-4 opacity-50" />
                </motion.div>
                <h3 className="text-lg font-medium text-gray-500 mb-2">
                  导入图片 (Import Images)
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  拖拽图片到此处，或点击上方按钮选择文件
                </p>
                <p className="text-xs text-gray-300">
                  支持 PNG, JPG, GIF, WebP, BMP 格式
                </p>
              </div>
            ) : selectedSprites.length === 1 ? (
              /* 单张图片大图预览（填满） */
              <div className="h-full flex items-center justify-center p-4">
                <div className="w-full h-full checkerboard rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={getAssetUrl(selectedSprites[0].path)}
                    alt={selectedSprites[0].name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              /* 多张或未选中时显示网格预览 */
              <div className="h-full overflow-auto p-4 scrollbar-thin">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                  <AnimatePresence mode="popLayout">
                    {displaySprites.map((sprite) => (
                      <PreviewItem key={sprite.id} sprite={sprite} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            <AnimatePresence>
              {importError && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-4 left-4 right-4 p-3 bg-red-100 rounded-lg flex items-center gap-2 text-red-700 shadow-lg"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm flex-1">{importError}</span>
                  <button
                    onClick={() => setImportError(null)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 预览项组件
 */
function PreviewItem({ sprite }: { sprite: { id: string; name: string; path: string; width: number; height: number } }) {
  const imageUrl = getAssetUrl(sprite.path)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="group relative bg-white/60 rounded-lg overflow-hidden border border-gray-200/50 hover:border-blue-300 transition-colors"
    >
      {/* 图片 */}
      <div className="aspect-square checkerboard p-1">
        <img
          src={imageUrl}
          alt={sprite.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
      
      {/* 悬浮信息 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{sprite.name}</p>
        <p className="text-xs text-white/70">{formatDimensions(sprite.width, sprite.height)}</p>
      </div>
    </motion.div>
  )
}
