/**
 * 合成画布组件
 * Compose Canvas Component - 支持自由拖拽布局和吸附对齐
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Magnet,
  Grid3X3,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  AlignCenterHorizontal,
  LayoutGrid,
  Trash2,
  MoveHorizontal,
  MoveVertical,
} from 'lucide-react'
import { useComposeStore, calculateSnap, type CanvasSprite } from '../store/composeStore'
import { getAssetUrl } from '../lib/tauri'
import { Button } from './ui/Button'

/**
 * 合成画布组件
 */
export function ComposeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const {
    canvasSprites,
    selectedIds,
    scale,
    offsetX,
    offsetY,
    snapEnabled,
    activeGuides,
    backgroundType,
    isSelecting,
    selectionStart,
    selectionEnd,
    setScale,
    setOffset,
    resetView,
    toggleSnap,
    selectSprite,
    selectSpritesInRect,
    deselectAll,
    updateSpritesPosition,
    setActiveGuides,
    setDragging,
    setSelecting,
    updateSelectionRect,
    bringToFront,
    removeSprites,
    alignSelected,
    distributeSelected,
    setBackgroundType,
    autoArrange,
    getCanvasBounds,
  } = useComposeStore()

  // 拖拽状态
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    startX: number
    startY: number
    spriteStartPositions: Map<string, { x: number; y: number }>
  } | null>(null)

  // 平移状态
  const [panState, setPanState] = useState<{
    isPanning: boolean
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
  } | null>(null)

  /**
   * 处理滚轮缩放
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale(scale + delta)
      }
    },
    [scale, setScale]
  )

  /**
   * 处理鼠标按下
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // 中键或 Alt+左键：平移
        e.preventDefault()
        setPanState({
          isPanning: true,
          startX: e.clientX,
          startY: e.clientY,
          startOffsetX: offsetX,
          startOffsetY: offsetY,
        })
      } else if (e.button === 0 && e.target === canvasRef.current) {
        // 左键点击空白区域：开始框选
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const x = (e.clientX - rect.left - offsetX) / scale
          const y = (e.clientY - rect.top - offsetY) / scale
          setSelecting(true, { x, y })
        }
        if (!e.shiftKey) {
          deselectAll()
        }
      }
    },
    [offsetX, offsetY, scale, setSelecting, deselectAll]
  )

  /**
   * 处理鼠标移动
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 平移
      if (panState?.isPanning) {
        const dx = e.clientX - panState.startX
        const dy = e.clientY - panState.startY
        setOffset(panState.startOffsetX + dx, panState.startOffsetY + dy)
        return
      }

      // 框选
      if (isSelecting && selectionStart) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const x = (e.clientX - rect.left - offsetX) / scale
          const y = (e.clientY - rect.top - offsetY) / scale
          updateSelectionRect({ x, y })
        }
        return
      }

      // 拖拽精灵
      if (dragState?.isDragging) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const dx = (e.clientX - dragState.startX) / scale
        const dy = (e.clientY - dragState.startY) / scale

        // 获取所有选中精灵的更新
        const updates: { id: string; x: number; y: number }[] = []
        const otherSprites = canvasSprites.filter(
          (cs) => !selectedIds.has(cs.sprite.id)
        )

        dragState.spriteStartPositions.forEach((startPos, id) => {
          let newX = startPos.x + dx
          let newY = startPos.y + dy

          // 吸附计算（只对第一个选中精灵计算，其他跟随）
          if (snapEnabled && updates.length === 0) {
            const sprite = canvasSprites.find((cs) => cs.sprite.id === id)
            if (sprite) {
              const snapResult = calculateSnap(
                { x: newX, y: newY },
                { width: sprite.sprite.width, height: sprite.sprite.height },
                otherSprites,
                8
              )
              const snapDx = snapResult.x - newX
              const snapDy = snapResult.y - newY
              newX = snapResult.x
              newY = snapResult.y
              setActiveGuides(snapResult.guides)

              // 应用吸附偏移到其他选中精灵
              dragState.spriteStartPositions.forEach((pos, otherId) => {
                if (otherId !== id) {
                  updates.push({
                    id: otherId,
                    x: pos.x + dx + snapDx,
                    y: pos.y + dy + snapDy,
                  })
                }
              })
            }
          }

          updates.push({ id, x: newX, y: newY })
        })

        updateSpritesPosition(updates)
      }
    },
    [
      panState,
      isSelecting,
      selectionStart,
      dragState,
      scale,
      offsetX,
      offsetY,
      canvasSprites,
      selectedIds,
      snapEnabled,
      setOffset,
      updateSelectionRect,
      updateSpritesPosition,
      setActiveGuides,
    ]
  )

  /**
   * 处理鼠标释放
   */
  const handleMouseUp = useCallback(() => {
    if (panState?.isPanning) {
      setPanState(null)
    }

    if (isSelecting && selectionStart && selectionEnd) {
      // 完成框选
      const x = Math.min(selectionStart.x, selectionEnd.x)
      const y = Math.min(selectionStart.y, selectionEnd.y)
      const width = Math.abs(selectionEnd.x - selectionStart.x)
      const height = Math.abs(selectionEnd.y - selectionStart.y)

      if (width > 5 && height > 5) {
        selectSpritesInRect({ x, y, width, height })
      }
      setSelecting(false)
    }

    if (dragState?.isDragging) {
      setDragState(null)
      setDragging(false)
      setActiveGuides([])
    }
  }, [
    panState,
    isSelecting,
    selectionStart,
    selectionEnd,
    dragState,
    selectSpritesInRect,
    setSelecting,
    setDragging,
    setActiveGuides,
  ])

  /**
   * 处理精灵点击
   */
  const handleSpriteMouseDown = useCallback(
    (e: React.MouseEvent, sprite: CanvasSprite) => {
      e.stopPropagation()

      const isSelected = selectedIds.has(sprite.sprite.id)
      const isMultiSelect = e.shiftKey || e.ctrlKey

      if (!isSelected && !isMultiSelect) {
        deselectAll()
      }

      selectSprite(sprite.sprite.id, isMultiSelect || isSelected)
      bringToFront(sprite.sprite.id)

      // 开始拖拽
      const spriteStartPositions = new Map<string, { x: number; y: number }>()

      // 如果当前精灵已经选中，拖拽所有选中的精灵
      if (isSelected || isMultiSelect) {
        const idsToMove = new Set(selectedIds)
        idsToMove.add(sprite.sprite.id)

        canvasSprites.forEach((cs) => {
          if (idsToMove.has(cs.sprite.id)) {
            spriteStartPositions.set(cs.sprite.id, { x: cs.x, y: cs.y })
          }
        })
      } else {
        spriteStartPositions.set(sprite.sprite.id, { x: sprite.x, y: sprite.y })
      }

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        spriteStartPositions,
      })
      setDragging(true)
    },
    [
      selectedIds,
      canvasSprites,
      selectSprite,
      bringToFront,
      deselectAll,
      setDragging,
    ]
  )

  /**
   * 处理键盘事件
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete 键删除选中精灵
      if (e.key === 'Delete' && selectedIds.size > 0) {
        removeSprites(Array.from(selectedIds))
      }

      // Ctrl+A 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        useComposeStore.getState().selectAll()
      }

      // Escape 取消选中
      if (e.key === 'Escape') {
        deselectAll()
      }

      // 方向键微调位置
      if (selectedIds.size > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const updates: { id: string; x: number; y: number }[] = []

        canvasSprites.forEach((cs) => {
          if (selectedIds.has(cs.sprite.id)) {
            let newX = cs.x
            let newY = cs.y

            switch (e.key) {
              case 'ArrowUp':
                newY -= step
                break
              case 'ArrowDown':
                newY += step
                break
              case 'ArrowLeft':
                newX -= step
                break
              case 'ArrowRight':
                newX += step
                break
            }

            updates.push({ id: cs.sprite.id, x: newX, y: newY })
          }
        })

        updateSpritesPosition(updates)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, canvasSprites, removeSprites, deselectAll, updateSpritesPosition])

  /**
   * 获取背景样式
   */
  const backgroundStyle = useMemo(() => {
    switch (backgroundType) {
      case 'white':
        return 'bg-white'
      case 'black':
        return 'bg-gray-900'
      case 'checker':
        return 'checkerboard'
      default:
        return 'bg-transparent'
    }
  }, [backgroundType])

  /**
   * 计算框选矩形
   */
  const selectionRect = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null

    const x = Math.min(selectionStart.x, selectionEnd.x)
    const y = Math.min(selectionStart.y, selectionEnd.y)
    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)

    return { x, y, width, height }
  }, [selectionStart, selectionEnd])

  /**
   * 获取画布边界信息
   */
  const bounds = getCanvasBounds()

  return (
    <div className="h-full flex flex-col bg-violet-950/40 backdrop-blur-xl rounded-xl border border-violet-500/20 overflow-hidden shadow-lg shadow-violet-900/20">
      {/* 工具栏 */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-violet-500/20 bg-violet-900/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-violet-200">合成画布</span>
          {canvasSprites.length > 0 && (
            <span className="text-xs text-violet-400">
              ({canvasSprites.length} 个精灵, {selectedIds.size} 选中)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* 缩放控制 */}
          <div className="flex items-center gap-1 mr-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<ZoomOut className="w-4 h-4" />}
              onClick={() => setScale(scale - 0.2)}
              title="缩小"
            />
            <span className="text-xs text-violet-400 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<ZoomIn className="w-4 h-4" />}
              onClick={() => setScale(scale + 0.2)}
              title="放大"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={resetView}
              title="重置视图"
            />
          </div>

          {/* 吸附开关 */}
          <Button
            variant={snapEnabled ? 'primary' : 'ghost'}
            size="sm"
            icon={<Magnet className="w-4 h-4" />}
            onClick={toggleSnap}
            title={snapEnabled ? '禁用吸附' : '启用吸附'}
          />

          {/* 背景切换 */}
          <Button
            variant="ghost"
            size="sm"
            icon={<Grid3X3 className="w-4 h-4" />}
            onClick={() => {
              const types: Array<'checker' | 'white' | 'black' | 'transparent'> = [
                'checker',
                'white',
                'black',
                'transparent',
              ]
              const currentIndex = types.indexOf(backgroundType)
              setBackgroundType(types[(currentIndex + 1) % types.length])
            }}
            title="切换背景"
          />

          {/* 自动排列 */}
          <Button
            variant="ghost"
            size="sm"
            icon={<LayoutGrid className="w-4 h-4" />}
            onClick={autoArrange}
            title="自动排列"
          />

          {/* 对齐工具 */}
          {selectedIds.size >= 2 && (
            <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-violet-500/30">
              <Button
                variant="ghost"
                size="sm"
                icon={<AlignLeft className="w-4 h-4" />}
                onClick={() => alignSelected('left')}
                title="左对齐"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<AlignCenterVertical className="w-4 h-4" />}
                onClick={() => alignSelected('center-v')}
                title="水平居中"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<AlignRight className="w-4 h-4" />}
                onClick={() => alignSelected('right')}
                title="右对齐"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<AlignStartVertical className="w-4 h-4" />}
                onClick={() => alignSelected('top')}
                title="顶部对齐"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<AlignCenterHorizontal className="w-4 h-4" />}
                onClick={() => alignSelected('center-h')}
                title="垂直居中"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<AlignEndVertical className="w-4 h-4" />}
                onClick={() => alignSelected('bottom')}
                title="底部对齐"
              />
              {selectedIds.size >= 3 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<MoveHorizontal className="w-4 h-4" />}
                    onClick={() => distributeSelected('horizontal')}
                    title="水平均匀分布"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<MoveVertical className="w-4 h-4" />}
                    onClick={() => distributeSelected('vertical')}
                    title="垂直均匀分布"
                  />
                </>
              )}
            </div>
          )}

          {/* 删除选中 */}
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-4 h-4 text-red-500" />}
              onClick={() => removeSprites(Array.from(selectedIds))}
              title="删除选中"
            />
          )}
        </div>
      </div>

      {/* 画布区域 */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* 可变换的画布 */}
        <div
          ref={canvasRef}
          className={`absolute origin-top-left ${backgroundStyle}`}
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            minWidth: Math.max(2000, bounds.maxX + 500),
            minHeight: Math.max(2000, bounds.maxY + 500),
          }}
        >
          {/* 吸附参考线 */}
          <AnimatePresence>
            {activeGuides.map((guide, index) => (
              <motion.div
                key={`${guide.direction}-${guide.position}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute ${
                  guide.type === 'center' ? 'bg-purple-500' : 'bg-blue-500'
                }`}
                style={
                  guide.direction === 'vertical'
                    ? {
                        left: guide.position,
                        top: 0,
                        bottom: 0,
                        width: 1,
                        height: '100%',
                      }
                    : {
                        top: guide.position,
                        left: 0,
                        right: 0,
                        height: 1,
                        width: '100%',
                      }
                }
              />
            ))}
          </AnimatePresence>

          {/* 精灵 */}
          {canvasSprites
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((cs) => (
              <SpriteItem
                key={cs.sprite.id}
                canvasSprite={cs}
                isSelected={selectedIds.has(cs.sprite.id)}
                onMouseDown={(e) => handleSpriteMouseDown(e, cs)}
              />
            ))}

          {/* 框选矩形 */}
          {isSelecting && selectionRect && (
            <div
              className="absolute border-2 border-violet-500 bg-violet-500/10 pointer-events-none"
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}
        </div>

        {/* 空状态提示 */}
        {canvasSprites.length === 0 && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="text-center text-violet-400/60">
              <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-sm">从左侧添加精灵到画布</p>
              <p className="text-xs mt-1 text-violet-500/50">拖拽摆放位置，自动吸附对齐</p>
            </div>
          </motion.div>
        )}

        {/* 画布信息 */}
        {canvasSprites.length > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-violet-900/70 border border-violet-500/30 backdrop-blur-sm rounded text-xs text-violet-200">
            画布尺寸: {bounds.width} × {bounds.height}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 精灵项组件属性
 */
interface SpriteItemProps {
  canvasSprite: CanvasSprite
  isSelected: boolean
  onMouseDown: (e: React.MouseEvent) => void
}

/**
 * 精灵项组件
 */
function SpriteItem({ canvasSprite, isSelected, onMouseDown }: SpriteItemProps) {
  const { sprite, x, y } = canvasSprite
  const imageUrl = getAssetUrl(sprite.path)

  return (
    <motion.div
      className={`absolute cursor-move select-none ${
        isSelected
          ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-transparent'
          : 'hover:ring-2 hover:ring-violet-400/50'
      }`}
      style={{
        left: x,
        top: y,
        width: sprite.width,
        height: sprite.height,
      }}
      onMouseDown={onMouseDown}
      whileHover={{ scale: isSelected ? 1 : 1.02 }}
      transition={{ duration: 0.1 }}
    >
      <img
        src={imageUrl}
        alt={sprite.name}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* 选中时显示尺寸信息 */}
      {isSelected && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-violet-600 rounded text-xs text-white whitespace-nowrap shadow-lg">
          {sprite.width} × {sprite.height}
        </div>
      )}
    </motion.div>
  )
}
