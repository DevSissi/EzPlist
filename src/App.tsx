import { useState } from 'react'
import { motion } from 'framer-motion'
import { Scissors, PlusSquare, Grid3X3 } from 'lucide-react'
import { SplitView } from './components/SplitView'
import { MultiRegionView } from './components/MultiRegionView'
import { ComposeView } from './components/ComposeView'
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

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* 左侧模式切换侧边栏 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 flex-shrink-0 w-12 flex flex-col items-center py-3 gap-2"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
      >
        {/* 主模式切换 */}
        <motion.button
          onClick={() => setMode('split')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="拆分图集"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
            mode === 'split'
              ? 'text-white'
              : 'hover:bg-[var(--bg-hover)]'
          }`}
          style={{
            background: mode === 'split' ? 'var(--accent-primary)' : 'transparent',
            color: mode === 'split' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <Scissors className="w-4 h-4" />
        </motion.button>
        <motion.button
          onClick={() => setMode('merge')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="合成图集"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
            mode === 'merge'
              ? 'text-white'
              : 'hover:bg-[var(--bg-hover)]'
          }`}
          style={{
            background: mode === 'merge' ? 'var(--accent-primary)' : 'transparent',
            color: mode === 'merge' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <PlusSquare className="w-4 h-4" />
        </motion.button>

        {/* 拆分子模式切换 */}
        {mode === 'split' && (
          <>
            <div className="w-6 my-1" style={{ borderTop: '1px solid var(--border-subtle)' }} />
            <motion.button
              onClick={() => setSplitSubMode('simple')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              title="简单拆分"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
              style={{
                background: splitSubMode === 'simple' ? 'var(--accent-primary)' : 'transparent',
                color: splitSubMode === 'simple' ? '#fff' : 'var(--text-tertiary)'
              }}
            >
              <Scissors className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              onClick={() => setSplitSubMode('multi-region')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              title="多区域定义"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
              style={{
                background: splitSubMode === 'multi-region' ? 'var(--accent-primary)' : 'transparent',
                color: splitSubMode === 'multi-region' ? '#fff' : 'var(--text-tertiary)'
              }}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </motion.button>
          </>
        )}
      </motion.div>

      {/* 主要内容区 */}
      <div className="relative z-10 flex-1 p-3 min-h-0 overflow-hidden">
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
  )
}


export default App
