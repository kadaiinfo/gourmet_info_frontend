import { useState, useEffect } from "react"
import "./CafeList.css"
import { getCafeData, type Cafe } from "../../lib/dataClient"
import { normalizeText } from "../../utils/textNormalization"
import { hiraganaToRomaji } from "../../utils/romajiUtils"

interface CafeListProps {
  onCafeSelect: (cafe: Cafe) => void
  onClose: () => void
  cafes?: Cafe[]
  // 件数表示の名詞（例: "飲食店" / "お気に入りの飲食店"）
  countNoun?: string
  // 指定時、各アイテムに「お気に入り解除」ボタンを表示する（お気に入り一覧用）
  onRemoveFavorite?: (cafeId: string) => void
}

export default function CafeList({ onCafeSelect, onClose, cafes: cafesProp, countNoun = "飲食店", onRemoveFavorite }: CafeListProps) {
  const [allCafes, setAllCafes] = useState<Cafe[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (cafesProp) {
      setAllCafes(cafesProp)
      return
    }
    const loadCafes = async () => {
      try {
        const cafes = await getCafeData()
        setAllCafes(cafes)
      } catch (error) {
        console.error('Failed to load cafes:', error)
      }
    }
    loadCafes()
  }, [cafesProp])

  // 検索フィルタリング
  const filteredCafes = allCafes.filter((cafe: Cafe) => {
    const normalizedQuery = normalizeText(searchQuery)
    const romajiQuery = hiraganaToRomaji(normalizedQuery)
    const normalizedStoreName = normalizeText(cafe.store_name || "")
    const normalizedAddress = normalizeText(cafe.address || "")

    return normalizedStoreName.includes(normalizedQuery) ||
      normalizedAddress.includes(normalizedQuery) ||
      normalizedStoreName.toLowerCase().includes(romajiQuery)
  })

  const handleCafeClick = (cafe: Cafe) => {
    onCafeSelect(cafe)
    onClose() // リスト選択後は閉じる
  }

  return (
    <div className="cafe-list">
      <div className="cafe-list__header">
        <button
          className="cafe-list__close"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <div className="cafe-list__search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="店名や住所で絞り込み..."
          className="cafe-list__search-input"
        />
      </div>

      <div className="cafe-list__body">
        <div className="cafe-list__count">
          {filteredCafes.length}件の{countNoun}
        </div>

        <div className="cafe-list__items">
          {filteredCafes.map((cafe: Cafe) => (
            <div
              key={cafe.id}
              className="cafe-list__item"
              onClick={() => handleCafeClick(cafe)}
            >
              <img
                src={cafe.media_url || "/icon.jpg"}
                alt={cafe.store_name || "cafe"}
                className="cafe-list__item-image"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/icon.jpg"
                }}
              />
              {onRemoveFavorite && (
                <button
                  type="button"
                  className="cafe-list__remove"
                  aria-label="お気に入りから外す"
                  title="お気に入りから外す"
                  onClick={(e) => {
                    e.stopPropagation() // 店舗選択（カード遷移）を発火させない
                    onRemoveFavorite(cafe.id)
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}