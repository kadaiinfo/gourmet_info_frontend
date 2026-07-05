import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { Cafe } from "../../lib/dataClient"
import SwipeCard from "./SwipeCard"
import type { TinderCardHandle } from "./LineTinderCard"
import "./SwipeDeck.css"

const DECK_SIZE = 10
// 同時にマウントしておく枚数（先頭=表示中 + 奥に先読み）。
// 奥のカードを数手前からマウントしてカフェ画像を事前ロードしておくことで、
// スワイプのたびに画像のローディングが走るのを防ぐ。
const MOUNTED_COUNT = 4
// 前面カードが何 ms 表示され続けたら「閲覧」として計測するか。
// 高速にスワイプしただけのカードを水増しカウントしないためのしきい値。
const VIEW_THRESHOLD_MS = 1500

// スワイプ専用のGA4イベントを Zaraz 経由で送る（page_view とは別計測）。
// Zaraz 未ロード時は何もしない。
function trackSwipe(
  event: "swipe_card_viewed" | "swipe_card_saved" | "swipe_card_skipped",
  cafe: Cafe
) {
  const zaraz = (window as unknown as { zaraz?: { track: (e: string, p: object) => void } }).zaraz
  if (!zaraz) return
  zaraz.track(event, {
    cafe_id: cafe.id,
    cafe_name: cafe.store_name || "Unknown",
    cafe_address: cafe.address || "Unknown",
  })
}

interface SwipeDeckProps {
  cafes: Cafe[]
  // 表示中かどうか。false の間はマウントしたまま非表示にして一枚目を先読みする。
  active: boolean
  // 右スワイプされた cafeId（お気に入り候補）
  onLike: (cafeId: string) => void
  // 「終わる」ボタン、または全カフェを見終えたとき
  onFinish: () => void
}

// media_url ありを優先し、exclude（既出）を除いてランダムに DECK_SIZE 件選ぶ
function pickDeck(cafes: Cafe[], exclude: Set<string> = new Set()): Cafe[] {
  if (cafes.length === 0) return []
  const remaining = cafes.filter((c) => !exclude.has(c.id))
  const withImage = remaining.filter((c) => c.media_url)
  const pool = withImage.length >= DECK_SIZE ? withImage : remaining
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, DECK_SIZE)
}

export default function SwipeDeck({ cafes, active, onLike, onFinish }: SwipeDeckProps) {
  // 初回マウント時のみデッキを固定（cafes が変わっても作り直さない）
  const [deck, setDeck] = useState<Cafe[]>(() => pickDeck(cafes))
  const [index, setIndex] = useState(0)
  // 最前面カードへの参照（ボタンから命令的にスワイプさせる）
  const topCardRef = useRef<TinderCardHandle>(null)
  // アニメーション中の二重操作を防ぐ
  const actingRef = useRef(false)
  // ボタン押下時のカード演出（カラーウォッシュ＋アイコン）。飛ばす方向を保持
  const [stamp, setStamp] = useState<"left" | "right" | null>(null)

  // 左右スワイプ確定: 右ならお気に入り候補に追加。操作を専用イベントで計測。
  const handleSwipe = (cafe: Cafe, direction: "left" | "right") => {
    if (direction === "right") {
      onLike(cafe.id)
      trackSwipe("swipe_card_saved", cafe)
    } else {
      trackSwipe("swipe_card_skipped", cafe)
    }
  }

  // 前面カードが一定時間表示され続けたら「閲覧」として計測する。
  // しきい値前にスワイプ（= frontCafe が変化）したらタイマーを破棄するので、
  // 流し見だけのカードはカウントされない。
  const frontCafe = index < deck.length ? deck[index] : null
  useEffect(() => {
    // 非表示（先読み）中は閲覧として計測しない
    if (!active || !frontCafe) return
    const timer = setTimeout(() => {
      trackSwipe("swipe_card_viewed", frontCafe)
    }, VIEW_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [active, frontCafe])

  // カードが画面外へ消えたら次へ
  const handleLeftScreen = () => {
    actingRef.current = false
    setStamp(null)
    setIndex((i) => i + 1)
  }

  // 下部ボタンから最前面カードをスワイプさせる。
  // ウォッシュ演出とフライアウトを同時に開始する（飛びながらウォッシュが出る）
  const triggerSwipe = (direction: "left" | "right") => {
    if (actingRef.current) return // アニメーション中は無視
    actingRef.current = true
    setStamp(direction)
    void topCardRef.current?.swipe(direction)
  }

  // デッキは差し替えず継ぎ足していく（1本の連続デッキ）。
  // 先読み枠（MOUNTED_COUNT）が尽きる前に次のバッチを追加することで、
  // 10件の境界でも先頭カードが先読み済みになり、Instagram 埋め込みの
  // ローディングが挟まらない。未表示のカフェが尽きたらマップへ戻る。
  useLayoutEffect(() => {
    if (deck.length - index > MOUNTED_COUNT) return // まだ先読みに余裕あり
    const exclude = new Set(deck.map((c) => c.id))
    const more = pickDeck(cafes, exclude)
    if (more.length > 0) {
      setDeck((d) => [...d, ...more])
    } else if (index >= deck.length) {
      // 追加分が無く、全カードを見終えていればマップへ
      onFinish()
    }
  }, [index, deck, cafes, onFinish])

  return (
    <div className={`swipe-deck-overlay${active ? "" : " swipe-deck-overlay--hidden"}`}>
      <div className="swipe-deck-stack">
        {deck
          .map((cafe, i) => ({ cafe, i }))
          .filter(({ i }) => i >= index && i < index + MOUNTED_COUNT)
          .reverse()
          .map(({ cafe, i }) => (
            <SwipeCard
              // 最前面（i === index）のカードだけ ref を付け、ボタン操作の対象にする
              ref={i === index ? topCardRef : undefined}
              key={cafe.id}
              cafe={cafe}
              stamp={i === index ? stamp : null}
              onSwipe={(dir) => handleSwipe(cafe, dir)}
              onLeftScreen={handleLeftScreen}
              onQuit={onFinish}
            />
          ))}
      </div>

      {/* スワイプは指ではなく、この下部ボタンで行う。
          アイコンはウォッシュ演出・お気に入りボタンと共通（×／ブックマーク） */}
      <div className="swipe-deck-actions">
        <button
          type="button"
          className="swipe-deck-btn swipe-deck-btn--skip"
          onClick={() => triggerSwipe("left")}
          aria-label="スルー"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button
          type="button"
          className="swipe-deck-btn swipe-deck-btn--save"
          onClick={() => triggerSwipe("right")}
          aria-label="保存"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  )
}
