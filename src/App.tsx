import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Scissors, PlusSquare, Grid3X3, Layers } from 'lucide-react'
import { SplitView } from './components/SplitView'
import { MultiRegionView } from './components/MultiRegionView'
import { ComposeView } from './components/ComposeView'
import { useComposeStore } from './store/composeStore'

/**
 * 应用模式
 */
type AppMode = 'split' | 'merge'

/**
 * 拆分子模式
 */
type SplitSubMode = 'simple' | 'multi-region'

/**
 * 应用主组件
 * 两种模式：拆分图集 / 合成图集
 */
function App() {
  const [mode, setMode] = useState<AppMode>('split')
  const [splitSubMode, setSplitSubMode] = useState<SplitSubMode>('simple')
  const { canvasSprites } = useComposeStore()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-dark-gradient">
      {/* 背景装饰 - 紫色流动光晕 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[100px]"
          animate={{ 
            x: [0, 50, 0, -50, 0],
            y: [0, 30, -30, 30, 0],
            scale: [1, 1.1, 1, 0.9, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px]"
          animate={{ 
            x: [0, -40, 40, 0],
            y: [0, -40, 20, 0],
            scale: [1, 0.9, 1.1, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[80px]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-violet-500/20 bg-violet-950/50 backdrop-blur-xl"
      >
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <motion.div 
            className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30"
            animate={{ 
              boxShadow: [
                '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
                '0 10px 25px -3px rgba(192, 132, 252, 0.4)',
                '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Package className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              EzPlist
            </h1>
            <p className="text-xs text-violet-400/80">
              精灵图管理工具 (Sprite Sheet Manager)
            </p>
          </div>
        </motion.div>

        {/* 模式切换 + 状态统计 */}
        <div className="flex items-center gap-4">
          {/* 模式切换按钮 */}
          <div className="flex bg-violet-900/40 rounded-xl p-1 shadow-lg border border-violet-500/20">
            <motion.button
              onClick={() => setMode('split')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === 'split'
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                  : 'text-violet-400 hover:text-violet-200 hover:bg-violet-800/50'
              }`}
            >
              <Scissors className="w-4 h-4" />
              拆分图集
            </motion.button>
            <motion.button
              onClick={() => setMode('merge')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === 'merge'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30'
                  : 'text-violet-400 hover:text-violet-200 hover:bg-violet-800/50'
              }`}
            >
              <PlusSquare className="w-4 h-4" />
              合成图集
            </motion.button>
          </div>

          {mode === 'merge' && canvasSprites.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              <StatBadge
                icon={<Layers className="w-4 h-4" />}
                label="精灵"
                value={canvasSprites.length}
              />
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* 主要内容区 */}
      <div className="relative z-10 flex-1 p-3 min-h-0 flex flex-col">
        {/* 拆分模式子模式切换 */}
        {mode === 'split' && (
          <motion.div 
            className="flex-shrink-0 mb-3 flex items-center justify-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex bg-violet-900/40 rounded-xl p-1 shadow-lg border border-violet-500/20">
              <motion.button
                onClick={() => setSplitSubMode('simple')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                  splitSubMode === 'simple'
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30'
                    : 'text-violet-400 hover:text-violet-200 hover:bg-violet-800/50'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                简单拆分
              </motion.button>
              <motion.button
                onClick={() => setSplitSubMode('multi-region')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                  splitSubMode === 'multi-region'
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30'
                    : 'text-violet-400 hover:text-violet-200 hover:bg-violet-800/50'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                多区域定义
              </motion.button>
            </div>
          </motion.div>
        )}

        <div className="flex-1 min-h-0">
          {mode === 'split' ? (
            /* 拆分模式 */
            <motion.div
              key={`split-${splitSubMode}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full"
            >
              {splitSubMode === 'simple' ? <SplitView /> : <MultiRegionView />}
            </motion.div>
          ) : (
            /* 合成模式 - 手动拖拽布局 */
            <motion.div
              key="compose"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full"
            >
              <ComposeView />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 状态徽章组件属性
 */
interface StatBadgeProps {
  icon: React.ReactNode
  label: string
  value: number
}

/**
 * 状态徽章组件
 */
function StatBadge({ icon, label, value }: StatBadgeProps) {
  return (
    <motion.div 
      className="flex items-center gap-2 px-3 py-1.5 bg-violet-900/50 backdrop-blur-sm rounded-full border border-violet-500/30 shadow-lg"
      whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <span className="text-violet-400">{icon}</span>
      <span className="text-xs text-violet-400/80">{label}</span>
      <span className="text-sm font-semibold text-violet-100">{value}</span>
    </motion.div>
  )
}

export default App
