import { useSyncExternalStore } from "react"

const STORAGE_KEY = "pendingFavorites"

// localStorage から保留IDを読み込む（失敗時は空配列）
function readPending(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []
  } catch {
    return []
  }
}

function writePending(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // 保存失敗は致命的でないため握りつぶす
  }
}

// ----- モジュールレベルの外部ストア -----
// 同一ページ内の複数フックインスタンス（App のデッキ / MapView の useFavorites）が
// 同じ状態を共有し、再マウントなしで変更を伝播できるようにする。
let cache: string[] = typeof window !== "undefined" ? readPending() : []
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function setPending(ids: string[]) {
  cache = ids
  writePending(ids)
  emit()
}

// 他タブの変更も反映
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      cache = readPending()
      emit()
    }
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return cache
}

function getServerSnapshot(): string[] {
  return []
}

// ----- 公開 API -----
export function addPending(cafeId: string) {
  if (cache.includes(cafeId)) return
  setPending([...cache, cafeId])
}

export function removePending(cafeId: string) {
  if (!cache.includes(cafeId)) return
  setPending(cache.filter((id) => id !== cafeId))
}

export function clearPending() {
  if (cache.length === 0) return
  setPending([])
}

export function getPendingSnapshot(): string[] {
  return cache
}

/**
 * スワイプデッキで「右スワイプ（お気に入り）」した cafeId を
 * ログイン前に localStorage へ保留しておくためのフック。
 * 外部ストアを購読するため、どのインスタンスからの変更も即座に共有される。
 */
export function usePendingFavorites() {
  const pendingIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    pendingIds,
    count: pendingIds.length,
    add: addPending,
    remove: removePending,
    clear: clearPending,
    getAll: getPendingSnapshot,
  }
}
