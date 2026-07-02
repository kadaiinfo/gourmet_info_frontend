import { forwardRef } from "react"
import TinderCard, { type TinderCardHandle } from "./LineTinderCard"
import type { Cafe } from "../../lib/dataClient"
import Information from "../Information/Information"

type Direction = "left" | "right" | "up" | "down"

interface SwipeCardProps {
  cafe: Cafe
  // 左右スワイプ確定時（しきい値超え）
  onSwipe: (direction: "left" | "right") => void
  // カードが画面外へ消えたとき（次のカードへ進める）
  onLeftScreen: () => void
}

// 指ドラッグは無効。スワイプは ref 経由（下部のボタン）からのみ実行する。
const SwipeCard = forwardRef<TinderCardHandle, SwipeCardProps>(function SwipeCard(
  { cafe, onSwipe, onLeftScreen },
  ref
) {
  return (
    <TinderCard
      ref={ref}
      className="swipe-card-tinder"
      preventSwipe={["up", "down"]}
      draggable={false}
      onSwipe={(dir: Direction) => {
        if (dir === "left" || dir === "right") onSwipe(dir)
      }}
      onCardLeftScreen={() => onLeftScreen()}
    >
      {/* 既存の店舗詳細カードをカード枠内に表示（縦スクロール） */}
      <div className="swipe-card">
        <div className="swipe-card-detail">
          <Information cafe={cafe} />
        </div>
      </div>
    </TinderCard>
  )
})

export default SwipeCard
