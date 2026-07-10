import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * 动态导入失败自动恢复
 * 新版本部署后，浏览器/CDN 缓存的旧 index.html 仍引用已不存在的旧 chunk，
 * 导致 lazy 路由加载报 "Failed to fetch dynamically imported module"。
 * 检测到该错误时自动刷新一次以拉取最新 index.html；用 sessionStorage 防止无限重载。
 */
const RELOAD_FLAG = '__chunk_reload_done__'
const isChunkLoadError = (msg: string): boolean =>
  msg.includes('Failed to fetch dynamically imported module') ||
  msg.includes('Importing a module script failed') ||
  msg.includes('error loading dynamically imported module')

const handleChunkError = (err: unknown): void => {
  const msg = err instanceof Error ? err.message : String(err)
  if (!isChunkLoadError(msg)) return
  if (sessionStorage.getItem(RELOAD_FLAG)) return
  sessionStorage.setItem(RELOAD_FLAG, '1')
  window.location.reload()
}

window.addEventListener('unhandledrejection', (e) => {
  handleChunkError(e.reason)
  // 恢复正常后清除标记，下次部署再出问题仍可自动刷新
  if (!sessionStorage.getItem(RELOAD_FLAG)) {
    setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000)
  }
})
window.addEventListener('error', (e) => {
  if (e.error) handleChunkError(e.error)
})

// 首次正常加载成功后清除标记，确保下次部署后仍能触发自动刷新
window.addEventListener('load', () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 10000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
