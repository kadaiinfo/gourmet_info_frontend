import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@clerk/clerk-react"
import { usePendingFavorites } from "./usePendingFavorites"

interface UseFavoritesOptions {
  // 未ログインで toggle した時に呼ばれる（サインインモーダル誘導用）
  onRequireSignIn?: () => void
}

/**
 * お気に入り（D1保存）を管理するフック。
 * - ログイン時に /api/favorites から一覧をロード
 * - toggleFavorite は楽観的更新（即UI反映 → API → 失敗時ロールバック）
 * - スワイプデッキで貯めた保留お気に入り(pendingIds)を、再マウントなしで
 *   表示に即反映 ＆ ログイン中なら D1 へ同期
 * - ログアウトで状態をクリア（キャッシュ漏洩防止）
 */
export function useFavorites({ onRequireSignIn }: UseFavoritesOptions = {}) {
  const { isSignedIn, getToken } = useAuth()
  const { pendingIds, clear: clearPending, remove: removePending } = usePendingFavorites()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const pendingRef = useRef<Set<string>>(new Set())
  const syncingRef = useRef(false)

  // 毎回トークンを取り直して認証ヘッダを付与する fetch
  const authedFetch = useCallback(
    async (input: string, init?: RequestInit) => {
      const token = await getToken()
      const headers: Record<string, string> = {
        ...(init?.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      }
      if (init?.body) headers["content-type"] = "application/json"
      return fetch(input, { ...init, headers })
    },
    [getToken]
  )

  // ログイン状態に連動して一覧をロード／クリア
  useEffect(() => {
    if (!isSignedIn) {
      setFavoriteIds(new Set())
      setLoaded(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await authedFetch("/api/favorites")
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as { cafeIds: string[] }
        if (!cancelled) setFavoriteIds(new Set(data.cafeIds))
      } catch (e) {
        console.error("Failed to load favorites:", e)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, authedFetch])

  // 保留お気に入りを D1 へ同期（ログイン中のみ）。再マウント不要。
  useEffect(() => {
    if (!isSignedIn || !loaded) return
    const toSync = pendingIds.filter((id) => !favoriteIds.has(id))
    if (toSync.length === 0 || syncingRef.current) return

    syncingRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const results = await Promise.allSettled(
          toSync.map((cafeId) =>
            authedFetch("/api/favorites", {
              method: "POST",
              body: JSON.stringify({ cafeId }),
            }).then((r) => {
              if (!r.ok) throw new Error(`status ${r.status}`)
              return cafeId
            })
          )
        )
        const synced = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
          .map((r) => r.value)
        if (!cancelled && synced.length > 0) {
          setFavoriteIds((prev) => {
            const next = new Set(prev)
            for (const id of synced) next.add(id)
            return next
          })
        }
        // 同期できたものは保留から除去（全件成功なら全消し）
        clearPending()
      } catch (e) {
        console.error("Failed to sync pending favorites:", e)
      } finally {
        syncingRef.current = false
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, loaded, pendingIds, favoriteIds, authedFetch, clearPending])

  // サーバー保存分 ＋ 未同期の保留分 を合わせた「実効お気に入り集合」
  const effectiveIds = useMemo(() => {
    if (pendingIds.length === 0) return favoriteIds
    const next = new Set(favoriteIds)
    for (const id of pendingIds) next.add(id)
    return next
  }, [favoriteIds, pendingIds])

  const isFavorite = useCallback((cafeId: string) => effectiveIds.has(cafeId), [effectiveIds])

  const toggleFavorite = useCallback(
    async (cafeId: string) => {
      if (!isSignedIn) {
        onRequireSignIn?.()
        return
      }
      if (pendingRef.current.has(cafeId)) return // 二重送信ガード
      pendingRef.current.add(cafeId)

      const wasFavorite = favoriteIds.has(cafeId)

      // 楽観的更新
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (wasFavorite) next.delete(cafeId)
        else next.add(cafeId)
        return next
      })

      try {
        const res = wasFavorite
          ? await authedFetch(`/api/favorites/${encodeURIComponent(cafeId)}`, { method: "DELETE" })
          : await authedFetch("/api/favorites", {
              method: "POST",
              body: JSON.stringify({ cafeId }),
            })
        if (!res.ok) throw new Error(`status ${res.status}`)
      } catch (e) {
        console.error("Failed to toggle favorite:", e)
        // ロールバック
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (wasFavorite) next.add(cafeId)
          else next.delete(cafeId)
          return next
        })
      } finally {
        pendingRef.current.delete(cafeId)
      }
    },
    [isSignedIn, favoriteIds, authedFetch, onRequireSignIn]
  )

  // お気に入りから外す（一覧の解除ボタン用）。
  // 保留分(localStorage)・サーバー保存分(D1) のどちらでも確実に外す。
  const removeFavorite = useCallback(
    (cafeId: string) => {
      // 未ログイン/未同期の保留分は localStorage から除去
      if (pendingIds.includes(cafeId)) {
        removePending(cafeId)
      }
      // サーバー保存分はログイン時に DELETE（toggleFavorite が DELETE を担う）
      if (isSignedIn && favoriteIds.has(cafeId)) {
        void toggleFavorite(cafeId)
      }
    },
    [pendingIds, removePending, isSignedIn, favoriteIds, toggleFavorite]
  )

  return {
    favoriteIds: effectiveIds,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    loaded,
    count: effectiveIds.size,
  }
}
