/**
 * 图片导入区域组件
 * Import Zone Component - 支持拖拽和文件对话框
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImagePlus, FolderOpen, AlertCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { useSpriteStore } from '../store/spriteStore'
import { selectImageFiles, importImages } from '../lib/tauri'
import { cn } from '../lib/utils'

/**
 * 导入区域组件
 */
export function ImportZone() {
  const [isDragging, setIsDragging] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  
  const { addSprites, isLoading, setLoading, setError } = useSpriteStore()

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
   * 处理拖拽进入
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 检查是否真的离开了区域
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }, [])

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  /**
   * 处理文件放下
   */
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

  return (
    <Card
      variant="glass"
      padding="lg"
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isDragging && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* 拖拽区域 */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative"
      >
        {/* 拖拽提示覆盖层 */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-blue-500/20 backdrop-blur-md rounded-xl flex items-center justify-center border-2 border-blue-500/50"
            >
              <motion.div
                initial={{ scale: 0.8, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="text-center"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Upload className="w-16 h-16 mx-auto text-blue-400 mb-4 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </motion.div>
                <p className="text-lg font-medium text-blue-300">
                  释放以导入图片
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主要内容 */}
        <div className="text-center py-8">
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              filter: ['drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))', 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))', 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))']
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block"
          >
            <ImagePlus className="w-16 h-16 mx-auto text-zinc-500 mb-4" />
          </motion.div>

          <h3 className="text-xl font-semibold text-zinc-200 mb-2">
            导入图片 (Import Images)
          </h3>
          <p className="text-zinc-400 mb-6">
            拖拽图片到此处，或点击下方按钮选择文件
          </p>

          {/* 按钮组 */}
          <div className="flex justify-center gap-3">
            <Button
              variant="primary"
              icon={<FolderOpen className="w-4 h-4" />}
              onClick={handleBrowse}
              loading={isLoading}
            >
              选择文件
            </Button>
          </div>

          {/* 支持的格式提示 */}
          <p className="text-xs text-zinc-500 mt-4">
            支持 PNG, JPG, GIF, WebP, BMP 格式
          </p>
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {importError && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mt-4 p-3 bg-red-900/50 border border-red-700/50 rounded-xl flex items-center gap-2 text-red-300"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span className="text-sm">{importError}</span>
              <button
                onClick={() => setImportError(null)}
                className="ml-auto text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
}
