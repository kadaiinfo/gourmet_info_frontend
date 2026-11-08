import { useSyncExternalStore } from "react"

// ルーターを持たない SPA 用の最小ナビゲーション。
// pushState/replaceState は popstate を発火しないため、遷移後に popstate を
// 自前で発火して「URL を見ている全員」（useLocationPath、店舗URL同期、
// Clerk のパスルーティング）に変化を知らせる。
export const navigate = (to: string, options: { replace?: boolean } = {}) => {
  const current = window.location.pathname + window.location.search + window.location.hash
  if (to === current) return
  if (options.replace) {
    window.history.replaceState(null, "", to)
  } else {
    window.history.pushState(null, "", to)
  }
  window.dispatchEvent(new PopStateEvent("popstate"))
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange)
  return () => window.removeEventListener("popstate", onChange)
}

const getPathname = () => window.location.pathname

// 現在の pathname を購読する（navigate / 戻る・進む に追従）
export const useLocationPath = (): string => useSyncExternalStore(subscribe, getPathname)
