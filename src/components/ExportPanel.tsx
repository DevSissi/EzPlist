/**
 * 导出选项面板（右上）
 * Export Panel Component
 */

import { useState, useCallback } from 'react'
import { Download, Settings, Archive, Package, Loader2 } from 'lucide-react'
import { Button } from './ui/Button'
import { useSpriteStore } from '../store/spriteStore'
import { packSprites } from '../lib/tauri'

/**
 * 导出配置类型
 */
interface ExportOptions {
  maxWidth: number
  maxHeight: number
  padding: number
  trimTransparent: boolean
  allowRotation: boolean
  zipOutput: boolean
}

/**
 * 导出选项面板组件
 */
export function ExportPanel() {
  const { sprites, setPackResult, setLoading, setError, isLoading, packResult } = useSpriteStore()
  
  const [options, setOptions] = useState<ExportOptions>({
    maxWidth: 2048,
    maxHeight: 2048,
    padding: 2,
    trimTransparent: true,
    allowRotation: true,
    zipOutput: false,
  })

  const canExport = sprites.length > 0
  const isPacked = packResult !== null

  /**
   * 执行打包操作
   */
  const handlePack = useCallback(async () => {
    if (!canExport) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await packSprites(sprites, {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        trimTransparent: options.trimTransparent,
        allowRotation: options.allowRotation,
        padding: options.padding,
        autoSize: true,
      })
      
      setPackResult(result)
      console.log('打包成功:', result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      console.error('打包失败:', err)
    } finally {
      setLoading(false)
    }
  }, [sprites, options, canExport, setPackResult, setLoading, setError])

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-xl border border-white/50 overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200/50 bg-white/30">
        <Settings className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-700">导出选项</h3>
      </div>

      {/* 配置表单 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {/* 纹理尺寸 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">纹理尺寸</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-gray-400">宽度</span>
              <select
                value={options.maxWidth}
                onChange={(e) => setOptions({ ...options, maxWidth: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white/80 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              >
                <option value={512}>512</option>
                <option value={1024}>1024</option>
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
              </select>
            </div>
            <div>
              <span className="text-xs text-gray-400">高度</span>
              <select
                value={options.maxHeight}
                onChange={(e) => setOptions({ ...options, maxHeight: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white/80 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              >
                <option value={512}>512</option>
                <option value={1024}>1024</option>
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
              </select>
            </div>
          </div>
        </div>

        {/* 间距 */}
        <div>
          <label className="text-xs font-medium text-gray-600">间距 (px)</label>
          <input
            type="number"
            value={options.padding}
            onChange={(e) => setOptions({ ...options, padding: Number(e.target.value) })}
            min={0}
            max={16}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white/80 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>

        {/* 选项开关 */}
        <div className="space-y-2">
          <ToggleOption
            label="裁剪透明区域"
            checked={options.trimTransparent}
            onChange={(v) => setOptions({ ...options, trimTransparent: v })}
          />
          <ToggleOption
            label="允许旋转"
            checked={options.allowRotation}
            onChange={(v) => setOptions({ ...options, allowRotation: v })}
          />
          <ToggleOption
            label="ZIP 打包"
            checked={options.zipOutput}
            onChange={(v) => setOptions({ ...options, zipOutput: v })}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="p-3 border-t border-gray-200/50 bg-white/20 space-y-2">
        {/* 打包按钮 */}
        <Button
          variant="secondary"
          size="md"
          icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          disabled={!canExport || isLoading}
          onClick={handlePack}
          className="w-full"
        >
          {isLoading ? '打包中...' : isPacked ? '重新打包' : '打包预览'}
        </Button>
        
        {/* 导出按钮 */}
        <Button
          variant="primary"
          size="md"
          icon={options.zipOutput ? <Archive className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          disabled={!isPacked}
          className="w-full"
        >
          {isPacked ? '导出文件' : '请先打包'}
        </Button>
        
        {/* 打包状态提示 */}
        {isPacked && (
          <p className="text-xs text-center text-gray-500">
            {packResult.textureWidth}×{packResult.textureHeight} | 填充率 {packResult.fillRate.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 开关选项组件
 */
function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-xs text-gray-600 group-hover:text-gray-800">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'left-4' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}
