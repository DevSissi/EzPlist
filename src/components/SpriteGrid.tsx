/**
 * 精灵网格组件
 * Sprite Grid Component - 显示导入的图片缩略图
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Grid, List, Trash2, CheckSquare, Square, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { useSpriteStore } from '../store/spriteStore'
import { getAssetUrl } from '../lib/tauri'
import { formatDimensions, cn } from '../lib/utils'
import type { SpriteData } from '../types/sprite'

/**
 * 精灵网格组件
 */
export function SpriteGrid() {
  const {
    sprites,
    selectedIds,
    viewMode,
    selectSprite,
    selectAll,
    deselectAll,
    removeSprites,
    clearSprites,
    toggleViewMode,
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

  if (sprites.length === 0) {
    return null
  }

  return (
    <Card variant="glass" padding="lg">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-700">
            精灵列表 ({sprites.length})
          </h3>
          {selectedIds.size > 0 && (
            <span className="text-sm text-blue-600">
              已选择 {selectedIds.size} 项
            </span>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 全选/取消全选 */}
          <Button
            variant="ghost"
            size="sm"
            icon={
              selectedIds.size === sprites.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )
            }
            onClick={selectedIds.size === sprites.length ? deselectAll : selectAll}
          >
            {selectedIds.size === sprites.length ? '取消' : '全选'}
          </Button>

          {/* 删除选中 */}
          {selectedIds.size > 0 && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleDeleteSelected}
            >
              删除
            </Button>
          )}

          {/* 清空全部 */}
          <Button
            variant="ghost"
            size="sm"
            icon={<X className="w-4 h-4" />}
            onClick={clearSprites}
          >
            清空
          </Button>

          {/* 视图切换 */}
          <Button
            variant="secondary"
            size="sm"
            icon={
              viewMode === 'grid' ? (
                <List className="w-4 h-4" />
              ) : (
                <Grid className="w-4 h-4" />
              )
            }
            onClick={toggleViewMode}
          />
        </div>
      </div>

      {/* 精灵列表 */}
      <div
        className={cn(
          'overflow-auto max-h-[500px] scrollbar-thin',
          viewMode === 'grid'
            ? 'grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
            : 'flex flex-col gap-2'
        )}
      >
        <AnimatePresence mode="popLayout">
          {sprites.map((sprite) => (
            <SpriteItem
              key={sprite.id}
              sprite={sprite}
              isSelected={selectedIds.has(sprite.id)}
              viewMode={viewMode}
              onClick={(e) => handleSpriteClick(sprite.id, e)}
            />
          ))}
        </AnimatePresence>
      </div>
    </Card>
  )
}

/**
 * 单个精灵项组件属性
 */
interface SpriteItemProps {
  sprite: SpriteData
  isSelected: boolean
  viewMode: 'grid' | 'list'
  onClick: (e: React.MouseEvent) => void
}

/**
 * 单个精灵项组件
 */
function SpriteItem({ sprite, isSelected, viewMode, onClick }: SpriteItemProps) {
  const imageUrl = getAssetUrl(sprite.path)

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all',
          'hover:bg-white/50',
          isSelected && 'bg-blue-100 ring-2 ring-blue-500'
        )}
      >
        {/* 缩略图 */}
        <div className="w-12 h-12 flex-shrink-0 checkerboard rounded overflow-hidden">
          <img
            src={imageUrl}
            alt={sprite.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">
            {sprite.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatDimensions(sprite.width, sprite.height)}
          </p>
        </div>

        {/* 选中指示器 */}
        {isSelected && (
          <CheckSquare className="w-5 h-5 text-blue-500 flex-shrink-0" />
        )}
      </motion.div>
    )
  }

  // 网格视图
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer rounded-lg overflow-hidden transition-all',
        'bg-white/50 hover:bg-white',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* 缩略图 */}
      <div className="aspect-square checkerboard p-1">
        <img
          src={imageUrl}
          alt={sprite.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* 信息覆盖层 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{sprite.name}</p>
        <p className="text-xs text-white/70">
          {formatDimensions(sprite.width, sprite.height)}
        </p>
      </div>

      {/* 选中指示器 */}
      {isSelected && (
        <div className="absolute top-1 right-1">
          <CheckSquare className="w-5 h-5 text-blue-500 drop-shadow-md" />
        </div>
      )}
    </motion.div>
  )
}
