import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/clerk-react"

interface UseFavoritesOptions {
  // 未ログインで toggle した時に呼ばれる（サインインモーダル誘導用）
  onRequireSignIn?: () => void
}

/**
 * お気に入り（D1保存）を管理するフック。
 * - ログイン時に /api/favorites から一覧をロード
 * - toggleFavorite は楽観的更新（即UI反映 → API → 失敗時ロールバック）
 * - ログアウトで状態をクリア（キャッシュ漏洩防止）
 */
export function useFavorites({ onRequireSignIn }: UseFavoritesOptions = {}) {
  const { isSignedIn, getToken } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const pendingRef = useRef<Set<string>>(new Set())

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

  const isFavorite = useCallback((cafeId: string) => favoriteIds.has(cafeId), [favoriteIds])

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

  return { favoriteIds, isFavorite, toggleFavorite, loaded, count: favoriteIds.size }
}
