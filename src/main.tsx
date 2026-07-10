import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * 动态导入失败兜底
 * 新版本部署后，浏览器/CDN 缓存的旧 index.html 仍引用已不存在的旧 chunk，
 * 导致 lazy 路由加载报 "Failed to fetch dynamically imported module"。
 *
 * 策略：整个会话最多自动刷新一次（sessionStorage 标记，永不清除）。
 * 若一次刷新未能解决（CDN 仍返回旧 index.html），交给 ErrorBoundary 显示手动刷新 UI，
 * 避免反复刷新导致页面崩溃。
 */
const RELOAD_FLAG = '__chunk_reload_v2__'
const isChunkLoadError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  )
}

const handleChunkError = (err: unknown): void => {
  if (!isChunkLoadError(err)) return
  if (sessionStorage.getItem(RELOAD_FLAG)) return
  sessionStorage.setItem(RELOAD_FLAG, '1')
  window.location.reload()
}

window.addEventListener('unhandledrejection', (e) => {
  handleChunkError(e.reason)
})
window.addEventListener('error', (e) => {
  if (e.error) handleChunkError(e.error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
