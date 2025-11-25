<div align="center">

# 🎨 EzPlist

**高性能 Cocos 精灵图集工具**  
*High-Performance Sprite Sheet Manager for Cocos*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.1-24c8db.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)

[**English**](#english) | **中文**

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

### 构建指南

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

##  许可证

[MIT License](LICENSE) © 2025

---

<a name="english"></a>

<div align="center">

# 🎨 EzPlist

**High-Performance Sprite Sheet Manager for Cocos**

[中文](#) | **English**

</div>

---

## ✨ Features

| Feature | Description |
|:-------:|-------------|
| 🖼️ **Split Atlas** | Grid-based splitting · Multi-region batch export · Auto frame detection |
| 🎬 **Animation Preview** | 1-60 FPS playback · Background switch · Color keying |
| 🧩 **Compose Atlas** | Drag & drop layout · Smart snapping · Export PNG + Plist |

---

## 🚀 Quick Start

### Build Guide

```bash
# Clone repository
git clone https://github.com/DevSissi/EzPlist.git
cd EzPlist

# Install dependencies
npm install

# Development mode
npm run tauri:dev

# Build release (output: src-tauri/target/release/)
npm run tauri:build
```

**Requirements**: Node.js 18+ · Rust 1.75+ · WebView2 (Windows)

---

## 📖 Usage

**Split Mode**: Import PNG → Set rows/cols or auto-detect → Preview animation → Export Plist

**Compose Mode**: Import multiple PNGs → Drag to layout → Align & adjust → Export PNG + Plist

| Shortcut | Action |
|:--------:|--------|
| `Ctrl+A` | Select all |
| `Delete` | Delete selected |
| `Arrow Keys` | Nudge position |
| `Scroll` | Zoom canvas |

---

## 🛠️ Tech Stack

```
Tauri 2.1 + Rust        Backend & image processing
React 18 + TypeScript   Frontend UI
Tailwind CSS            Styling
Framer Motion           Animations
Zustand                 State management
```

---

## 📄 License

[MIT License](LICENSE) © 2025

---

<div align="center">

**Made with ❤️ using Tauri + React**

[Issues](https://github.com/DevSissi/EzPlist/issues)

</div>
