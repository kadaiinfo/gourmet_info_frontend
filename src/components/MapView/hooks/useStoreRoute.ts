import { useEffect, useRef } from "react"
import type { Cafe } from "../../../lib/dataClient"
import { getStoreIdFromPath, storePath } from "../../../lib/storeRoute"

type Args = {
  allCafes: Cafe[]
  cafeDataLoaded: boolean
  mapLoaded: boolean
  selected: Cafe | null
  onOpenCafe: (cafe: Cafe) => void
  onCloseCafe: () => void
}

// 選択中の店舗と URL(/store/:id) を同期する。
// - 店舗を選択したら pushState、パネルを閉じたらトップの URL へ戻す
// - 共有リンク（ディープリンク）で開いたら該当店舗を選択して地図を移動
// - ブラウザの戻る/進むにも追従する
export const useStoreRoute = ({
  allCafes,
  cafeDataLoaded,
  mapLoaded,
  selected,
  onOpenCafe,
  onCloseCafe,
}: Args) => {
  // 初期URLの処理が終わるまで URL 同期を止めるフラグ。
  // これがないと、データ読み込み前（selected=null）の同期処理が
  // ディープリンクの /store/:id をトップURLに書き換えてしまう。
  const initialHandledRef = useRef(false)

  // 初期URLの処理（データと地図が揃ってから一度だけ）
  useEffect(() => {
    if (initialHandledRef.current || !cafeDataLoaded || !mapLoaded) return
    initialHandledRef.current = true

    const id = getStoreIdFromPath(window.location.pathname)
    if (!id) return

    const cafe = allCafes.find((c) => c.id === id)
    if (cafe) {
      onOpenCafe(cafe)
    } else {
      // 存在しない店舗ID（非公開化・削除済みなど）はトップのURLに直す
      window.history.replaceState(null, "", "/")
    }
  }, [cafeDataLoaded, mapLoaded, allCafes, onOpenCafe])

  // 選択状態 → URL の同期
  useEffect(() => {
    if (!initialHandledRef.current) return

    const currentId = getStoreIdFromPath(window.location.pathname)
    if (selected) {
      if (currentId !== selected.id) {
        window.history.pushState(null, "", storePath(selected.id))
      }
    } else if (currentId !== null) {
      // パネルを閉じたときは履歴を増やさず URL だけトップに戻す
      window.history.replaceState(null, "", "/")
    }
  }, [selected])

  // ブラウザの戻る/進み → 選択状態の同期
  useEffect(() => {
    const handlePopState = () => {
      if (!initialHandledRef.current) return

      const id = getStoreIdFromPath(window.location.pathname)
      if (!id) {
        onCloseCafe()
        return
      }
      const cafe = allCafes.find((c) => c.id === id)
      if (cafe) {
        onOpenCafe(cafe)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [allCafes, onOpenCafe, onCloseCafe])
}
