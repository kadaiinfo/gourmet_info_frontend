import { useState, useEffect } from "react"
import "./NearbyCafeList.css"
import { getCafeData, type Cafe } from "../../lib/dataClient"
import { getCurrentLocation } from "../MapView/utils/geolocation"

interface UserLocation {
  lng: number
  lat: number
  accuracy?: number
}

interface NearbyCafeListProps {
  onCafeSelect: (cafe: Cafe) => void
  onClose: () => void
  cafes?: Cafe[]
}

// 距離計算（メートル単位）
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000 // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function NearbyCafeList({ onCafeSelect, onClose, cafes: cafesProp }: NearbyCafeListProps) {
  const [nearbyCafes, setNearbyCafes] = useState<Cafe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  useEffect(() => {
    const loadNearbyCafes = async () => {
      try {
        setLoading(true)
        setError(null)

        // 現在地を取得
        const location = await getCurrentLocation()
        setUserLocation(location)

        // カフェデータを取得（props があればそちらを優先）
        const allCafes = cafesProp ?? await getCafeData()

        // 500m以内のカフェをフィルタリング
        const nearby = allCafes.filter(cafe => {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            cafe.lat,
            cafe.lng
          )
          return distance <= 500 // 500m以内
        })

        // 距離でソート
        nearby.sort((a, b) => {
          const distanceA = calculateDistance(location.lat, location.lng, a.lat, a.lng)
          const distanceB = calculateDistance(location.lat, location.lng, b.lat, b.lng)
          return distanceA - distanceB
        })

        setNearbyCafes(nearby)
      } catch (error) {
        console.error('Failed to load nearby cafes:', error)
        setError(error instanceof Error ? error.message : '近くのカフェの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadNearbyCafes()
  }, [cafesProp])

  const handleCafeClick = (cafe: Cafe) => {
    onCafeSelect(cafe)
    onClose() // リスト選択後は閉じる
  }

  const getDistanceText = (cafe: Cafe): string => {
    if (!userLocation) return ""
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      cafe.lat,
      cafe.lng
    )
    return `現在地から${Math.round(distance)}m`
  }

  return (
    <div className="nearby-cafe-list">
      <div className="nearby-cafe-list__header">
        <h2 className="nearby-cafe-list__title">近くの飲食店</h2>
        <button
          className="nearby-cafe-list__close"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <div className="nearby-cafe-list__body">
        {loading && (
          <div className="nearby-cafe-list__loading">
            現在地を取得中...
          </div>
        )}

        {error && (
          <div className="nearby-cafe-list__error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="nearby-cafe-list__count">
              500m内に {nearbyCafes.length}件の飲食店
            </div>

            {nearbyCafes.length === 0 ? (
              <div className="nearby-cafe-list__empty">
                近くに飲食店が見つかりませんでした
              </div>
            ) : (
              <div className="nearby-cafe-list__items">
                {nearbyCafes.map((cafe: Cafe) => (
                  <div
                    key={cafe.id}
                    className="nearby-cafe-list__item"
                    onClick={() => handleCafeClick(cafe)}
                  >
                    {cafe.media_url && (
                      <img
                        src={cafe.media_url}
                        alt={cafe.store_name || "cafe"}
                        className="nearby-cafe-list__item-image"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none"
                        }}
                      />
                    )}
                    <div className="nearby-cafe-list__item-content">
                      <h3 className="nearby-cafe-list__item-title">
                        {cafe.store_name || "—"}
                      </h3>
                      <p className="nearby-cafe-list__item-address">
                        {cafe.address || "—"}
                      </p>
                      <p className="nearby-cafe-list__item-distance">
                        {getDistanceText(cafe)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}