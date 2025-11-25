/**
 * 通用工具函数
 * Utility Functions
 */

import { clsx, type ClassValue } from 'clsx'

/**
 * 合并 CSS 类名
 * @param inputs CSS 类名数组
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 格式化图片尺寸
 * @param width 宽度
 * @param height 高度
 * @returns 格式化后的尺寸字符串
 */
export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height}`
}

/**
 * 检测序列帧名称的共同前缀
 * @param names 文件名列表
 * @returns 共同前缀
 */
export function detectCommonPrefix(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0].replace(/\d+\.[^.]+$/, '')

  const sorted = [...names].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  let i = 0
  while (i < first.length && first[i] === last[i]) {
    i++
  }

  return first.slice(0, i)
}

/**
 * 根据文件名自动分组序列帧
 * @param names 文件名列表
 * @returns 分组后的文件名映射
 */
export function groupSequenceFrames(names: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  
  // 正则匹配：前缀_数字.扩展名 或 前缀数字.扩展名
  const pattern = /^(.+?)[\-_]?(\d+)\.([^.]+)$/

  for (const name of names) {
    const match = name.match(pattern)
    if (match) {
      const prefix = match[1]
      if (!groups.has(prefix)) {
        groups.set(prefix, [])
      }
      groups.get(prefix)!.push(name)
    } else {
      // 无法匹配的文件单独成组
      groups.set(name, [name])
    }
  }

  // 对每个组内的文件名排序
  for (const [key, value] of groups) {
    groups.set(
      key,
      value.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.match(/\d+/)?.[0] || '0')
        return numA - numB
      })
    )
  }

  return groups
}

/**
 * 延迟执行
 * @param ms 毫秒数
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
