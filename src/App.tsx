import { lazy, Suspense, useEffect, useState } from 'react'
import MapView from './components/MapView/MapView.tsx'
import { useCafeData } from './components/MapView/hooks/useCafeData.ts'
import { usePendingFavorites } from './hooks/usePendingFavorites.ts'
import { useIsMobile } from './hooks/useIsMobile.ts'
import { getStoreIdFromPath } from './lib/storeRoute.ts'

// スワイプの自動起動は「初回のみ」。localStorage にフラグを残して2回目以降は出さない。
const SWIPE_SEEN_KEY = 'swipeOnboardingSeen'

// スワイプデッキ（react-spring 含む）は初期表示に不要なので別チャンクで遅延読み込み
const SwipeDeck = lazy(() => import('./components/SwipeDeck/SwipeDeck.tsx'))

// 非表示デッキの先読みを始めるまでの猶予。地図・マーカーの初期描画を優先させる
const DECK_PRELOAD_TIMEOUT_MS = 3000

function hasSeenSwipe(): boolean {
  try {
    return localStorage.getItem(SWIPE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSwipeSeen() {
  try {
    localStorage.setItem(SWIPE_SEEN_KEY, '1')
  } catch {
    // localStorage が使えない環境では何もしない
  }
}

function App() {
  // スワイプデッキはスマホのみ。PC は最初からマップ表示。
  // さらに初回訪問時のみ自動起動（2回目以降はマップ表示で、ブックマークボタンから手動起動）。
  // 共有リンク（/store/:id）から来た場合はスワイプを出さず、まず店舗詳細を見せる。
  const isMobile = useIsMobile()
  const [showDeck, setShowDeck] = useState(
    () => isMobile && !hasSeenSwipe() && getStoreIdFromPath(window.location.pathname) === null
  )

  const { allCafes, cafeDataLoaded } = useCafeData()
  const { add: addPending } = usePendingFavorites()

  // 非表示デッキのマウント許可。初回自動起動ならすぐ、そうでなければブラウザが
  // アイドルになってから（Instagram 埋め込みが地図の初期描画と帯域・CPUを奪い合わないように）
  const [deckPreloadReady, setDeckPreloadReady] = useState(showDeck)
  useEffect(() => {
    if (deckPreloadReady || !isMobile || !cafeDataLoaded) return
    const ready = () => setDeckPreloadReady(true)
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(ready, { timeout: DECK_PRELOAD_TIMEOUT_MS })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(ready, DECK_PRELOAD_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [deckPreloadReady, isMobile, cafeDataLoaded])
  const deckMounted = deckPreloadReady || showDeck

  // 初回自動起動したら以降は自動起動しないようフラグを立てる（マウント時に1度だけ）
  useEffect(() => {
    if (showDeck) markSwipeSeen()
    // 初回マウント時の自動起動判定だけを対象にしたいので依存は空配列
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {/* 背景は常に現行サイト（マップ）。デッキはこの上に半透明グレーで重ねる。
          保留お気に入りは useFavorites が再マウントなしで同期するため、ここでは
          MapView を作り直さない（リロード感の排除）。
          スマホ版のみ、検索バー横のブックマークボタンからスワイプモードを再表示できる。 */}
      <MapView onOpenSwipe={isMobile ? () => setShowDeck(true) : undefined} />

      {/* スマホではデータ読み込み後つねにマウントしておき、表示は active で切り替える。
          非表示（visibility:hidden）でも一枚目の Instagram 埋め込みは先読みされるため、
          ボタンで開いたときに一枚目のローディングが出ない。 */}
      {isMobile && cafeDataLoaded && deckMounted && (
        <Suspense fallback={null}>
          <SwipeDeck
            active={showDeck}
            cafes={allCafes}
            onLike={(cafeId) => addPending(cafeId)}
            onFinish={() => setShowDeck(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
