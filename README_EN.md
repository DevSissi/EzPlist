<div align="center">

# 🎨 EzPlist

**High-Performance Sprite Sheet Manager for Cocos**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.1-24c8db.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)

[中文](README.md) | **English**

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
