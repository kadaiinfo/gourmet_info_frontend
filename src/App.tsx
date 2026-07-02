import { useEffect, useState } from 'react'
import MapView from './components/MapView/MapView.tsx'
import SwipeDeck from './components/SwipeDeck/SwipeDeck.tsx'
import { useCafeData } from './components/MapView/hooks/useCafeData.ts'
import { usePendingFavorites } from './hooks/usePendingFavorites.ts'
import { useIsMobile } from './hooks/useIsMobile.ts'

// スワイプの自動起動は「初回のみ」。localStorage にフラグを残して2回目以降は出さない。
const SWIPE_SEEN_KEY = 'swipeOnboardingSeen'

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
  const isMobile = useIsMobile()
  const [showDeck, setShowDeck] = useState(() => isMobile && !hasSeenSwipe())

  const { allCafes, cafeDataLoaded } = useCafeData()
  const { add: addPending } = usePendingFavorites()

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
      {isMobile && cafeDataLoaded && (
        <SwipeDeck
          active={showDeck}
          cafes={allCafes}
          onLike={(cafeId) => addPending(cafeId)}
          onFinish={() => setShowDeck(false)}
        />
      )}
    </div>
  )
}

export default App
