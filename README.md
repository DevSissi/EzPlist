<div align="center">

# 🎨 EzPlist

**高性能 Cocos 精灵图集工具**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.1-24c8db.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)

[**English**](README_EN.md) | 中文

</div>

---

## ✨ 核心功能

| 功能 | 描述 |
|:----:|------|
| 🖼️ **拆分图集** | 按行列网格拆分 · 多区域批量导出 · 自动帧尺寸检测 |
| 🎬 **动画预览** | 1-60 FPS 播放 · 背景切换 · 颜色抠图 |
| 🧩 **合成图集** | 拖拽布局 · 智能吸附对齐 · 导出 PNG + Plist |

---

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/DevSissi/EzPlist.git
cd EzPlist

# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建发布版 (输出: src-tauri/target/release/)
npm run tauri:build
```

**环境要求**: Node.js 18+ · Rust 1.75+ · WebView2 (Windows)

---

## 📖 使用说明

**拆分模式**: 导入 PNG → 设置行列 / 自动检测 → 预览动画 → 导出 Plist

**合成模式**: 导入多张 PNG → 拖拽布局 → 对齐调整 → 导出 PNG + Plist

| 快捷键 | 功能 |
|:------:|------|
| `Ctrl+A` | 全选 |
| `Delete` | 删除选中 |
| `方向键` | 微调位置 |
| `滚轮` | 缩放画布 |

---

## 🛠️ 技术栈

```
Tauri 2.1 + Rust        后端框架 & 图像处理
React 18 + TypeScript   前端界面
Tailwind CSS            样式系统
Framer Motion           动画引擎
Zustand                 状态管理
```

---

## 📄 许可证

[MIT License](LICENSE) © 2025
