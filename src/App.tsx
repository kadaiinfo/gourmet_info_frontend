import { lazy, Suspense, useEffect, useState } from 'react'
import MapView from './components/MapView/MapView.tsx'
import { useCafeData } from './components/MapView/hooks/useCafeData.ts'
import { usePendingFavorites } from './hooks/usePendingFavorites.ts'
import { useIsMobile } from './hooks/useIsMobile.ts'
import AuthPage from './components/AuthPage/AuthPage.tsx'
import { useResumePendingAuth } from './hooks/useResumePendingAuth.ts'
import { isAuthPath } from './lib/authRoute.ts'
import { useLocationPath } from './lib/navigation.ts'

// スワイプデッキ（react-spring 含む）は初期表示に不要なので別チャンクで遅延読み込み
const SwipeDeck = lazy(() => import('./components/SwipeDeck/SwipeDeck.tsx'))

// 非表示デッキの先読みを始めるまでの猶予。地図・マーカーの初期描画を優先させる
const DECK_PRELOAD_TIMEOUT_MS = 3000

function App() {
  // スワイプデッキはスマホのみ。起動時は常にマップ表示で、
  // 検索バー横のブックマークボタンから開いたときだけ表示する。
  // （初回訪問時の自動起動は、店舗データ取得待ちで重く UX が悪いため廃止）
  const isMobile = useIsMobile()
  const [showDeck, setShowDeck] = useState(false)

  const { allCafes, cafeDataLoaded } = useCafeData()
  const { add: addPending } = usePendingFavorites()

  // ログイン/アカウント作成ページ（/sign-in, /sign-up）。地図は裏でマウントしたまま
  const pathname = useLocationPath()
  // メールアプリへの切り替え等でアプリが再起動しても、コード入力画面へ戻す
  const authReady = useResumePendingAuth()

  // 非表示デッキのマウント許可。ブラウザがアイドルになってから先読みを始める
  // （Instagram 埋め込みが地図の初期描画と帯域・CPUを奪い合わないように）
  const [deckPreloadReady, setDeckPreloadReady] = useState(false)
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

  return (
    <div>
      {/* 背景は常に現行サイト（マップ）。デッキはこの上に半透明グレーで重ねる。
          保留お気に入りは useFavorites が再マウントなしで同期するため、ここでは
          MapView を作り直さない（リロード感の排除）。
          スマホ版のみ、検索バー横のブックマークボタンからスワイプモードを表示できる。 */}
      <MapView onOpenSwipe={isMobile ? () => setShowDeck(true) : undefined} />

      {/* スマホではアイドル時に非表示のままマウントしておき、表示は active で切り替える。
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

      {isAuthPath(pathname) && <AuthPage pathname={pathname} ready={authReady} />}
    </div>
  )
}

export default App
