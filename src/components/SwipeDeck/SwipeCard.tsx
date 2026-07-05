import { forwardRef } from "react"
import TinderCard, { type TinderCardHandle } from "./LineTinderCard"
import type { Cafe } from "../../lib/dataClient"
import Information from "../Information/Information"

type Direction = "left" | "right" | "up" | "down"

interface SwipeCardProps {
  cafe: Cafe
  // ボタン押下時の演出（カラーウォッシュ＋アイコン）。飛ばす方向。null なら非表示
  stamp?: "left" | "right" | null
  // 左右スワイプ確定時（しきい値超え）
  onSwipe: (direction: "left" | "right") => void
  // カードが画面外へ消えたとき（次のカードへ進める）
  onLeftScreen: () => void
  // カード右上の「終わる」ボタン（スワイプモードを終了）
  onQuit: () => void
}

// 指ドラッグは無効。スワイプは ref 経由（下部のボタン）からのみ実行する。
const SwipeCard = forwardRef<TinderCardHandle, SwipeCardProps>(function SwipeCard(
  { cafe, stamp = null, onSwipe, onLeftScreen, onQuit },
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
        {/* カード右上（共有ボタンの反対側）の終了ボタン。カード内に置くのでスワイプに追従する */}
        <button
          type="button"
          className="swipe-deck-quit"
          onClick={onQuit}
          aria-label="スワイプを終わる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          終わる
        </button>
        {/* 保存/スルー時のカラーウォッシュ演出。カードと一緒に飛んでいく */}
        {stamp && (
          <div className={`swipe-card-wash swipe-card-wash--${stamp === "right" ? "save" : "skip"}`}>
            {stamp === "right" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            )}
          </div>
        )}
      </div>
    </TinderCard>
  )
})

export default SwipeCard
