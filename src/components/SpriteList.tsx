/**
 * 精灵列表组件（左侧边栏）
 * Sprite List Component - 显示导入的图片列表
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, CheckSquare, Square, ImagePlus } from 'lucide-react'
import { useSpriteStore } from '../store/spriteStore'
import { getAssetUrl } from '../lib/tauri'
import { formatDimensions, cn } from '../lib/utils'
import type { SpriteData } from '../types/sprite'

/**
 * 精灵列表组件
 */
export function SpriteList() {
  const {
    sprites,
    selectedIds,
    selectSprite,
    selectAll,
    deselectAll,
    removeSprites,
  } = useSpriteStore()

  /**
   * 处理精灵点击
   */
  const handleSpriteClick = (id: string, e: React.MouseEvent) => {
    selectSprite(id, e.ctrlKey || e.metaKey)
  }

  /**
   * 删除选中的精灵
   */
  const handleDeleteSelected = () => {
    removeSprites(Array.from(selectedIds))
  }

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-xl border border-white/50 overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50 bg-white/30">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <ImagePlus className="w-4 h-4" />
          精灵列表 ({sprites.length})
        </h3>
      </div>

      {/* 工具栏 */}
      {sprites.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200/30 bg-white/20">
          <button
            onClick={selectedIds.size === sprites.length ? deselectAll : selectAll}
            className="p-1.5 rounded hover:bg-white/50 text-gray-600 transition-colors"
            title={selectedIds.size === sprites.length ? '取消全选' : '全选'}
          >
            {selectedIds.size === sprites.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors"
              title="删除选中"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {selectedIds.size > 0 && (
            <span className="text-xs text-gray-500 ml-auto">
              已选 {selectedIds.size}
            </span>
          )}
        </div>
      )}

      {/* 列表内容 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {sprites.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <ImagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            暂无精灵
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sprites.map((sprite) => (
              <SpriteListItem
                key={sprite.id}
                sprite={sprite}
                isSelected={selectedIds.has(sprite.id)}
                onClick={(e) => handleSpriteClick(sprite.id, e)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

/**
 * 单个精灵项组件属性
 */
interface SpriteListItemProps {
  sprite: SpriteData
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}

/**
 * 单个精灵项组件 - 上下结构（图片在上，名称在下）
 */
function SpriteListItem({ sprite, isSelected, onClick }: SpriteListItemProps) {
  const imageUrl = getAssetUrl(sprite.path)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all',
        'hover:bg-white/60',
        isSelected && 'bg-blue-100/80 ring-2 ring-blue-400'
      )}
    >
      {/* 缩略图 */}
      <div className="w-full aspect-square checkerboard rounded-lg overflow-hidden border border-gray-200/50 mb-2 relative">
        <img
          src={imageUrl}
          alt={sprite.name}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        {/* 选中指示器 */}
        {isSelected && (
          <div className="absolute top-1 right-1">
            <CheckSquare className="w-4 h-4 text-blue-500 drop-shadow" />
          </div>
        )}
      </div>

      {/* 名称和尺寸 */}
      <p className="text-xs font-medium text-gray-700 truncate w-full text-center" title={sprite.name}>
        {sprite.name}
      </p>
      <p className="text-xs text-gray-400">
        {formatDimensions(sprite.width, sprite.height)}
      </p>
    </motion.div>
  )
}
