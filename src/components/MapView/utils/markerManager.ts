import maplibregl from "maplibre-gl"
import type { Cafe } from "../../../lib/dataClient"
import { CafeMarkerElement } from "../CafeMarker"
import { getVisibleCafes } from "./visibleCafes"
import { handleCafeSelection } from "./mapPosition"
import { updateClusterMarkers } from "./clusterManager"

// 単一カフェのマーカーを追加する（クリックハンドラ含む）
export const addMarkerForCafe = (
  cafe: Cafe,
  map: maplibregl.Map,
  currentMarkers: Map<string, maplibregl.Marker>,
  setSelected: (cafe: Cafe) => void
) => {
  if (currentMarkers.has(cafe.id)) return

  const markerEl = CafeMarkerElement(cafe.media_url, cafe.store_name)
  const marker = new maplibregl.Marker({ element: markerEl })
    .setLngLat([cafe.lng, cafe.lat])
    .addTo(map)

  currentMarkers.set(cafe.id, marker)

  // マーカークリック時の処理
  markerEl.addEventListener('click', (e) => {
    e.stopPropagation() // 地図へのクリック伝播を防ぐ

    // ページパスをカフェIDに設定
    const cafePage: string = `/${cafe.id}`
    const pageTitle: string = cafe.store_name ? cafe.store_name.toString() : 'カフェ詳細'

    // まず詳細を表示（WebViewでも確実に動作するように先に実行）
    handleCafeSelection(cafe, map, setSelected, true) // maintainZoom: true

    // GA4イベント送信（Zaraz経由）
    if ((window as any).zaraz) {
      // ページビューイベント送信（カフェページとして追跡）
      ;(window as any).zaraz.track('page_view', {
        page_location: window.location.origin + cafePage,
        page_path: cafePage,
        page_title: pageTitle
      })

      // マーカークリックイベントも送信
      ;(window as any).zaraz.track('cafe_marker_clicked', {
        cafe_id: cafe.id,
        cafe_name: cafe.store_name || 'Unknown',
        cafe_address: cafe.address || 'Unknown',
        zoom_level: map.getZoom(),
        lng: cafe.lng,
        lat: cafe.lat
      })

      // ブラウザのURLとタイトルを更新（WebViewで失敗してもエラーにしない）
      try {
        window.history.pushState(
          { cafeId: cafe.id },
          pageTitle,
          cafePage
        )
      } catch (error) {
        console.log('History API not available in this context')
      }
    }
  })
}

// マーカーを更新する関数（ズーム値を指定）
export const updateMarkersWithZoom = (
  zoom: number,
  map: maplibregl.Map | null,
  cafeDataLoaded: boolean,
  allCafes: Cafe[],
  ZOOM_THRESHOLD: number,
  markersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>,
  setSelected: (cafe: Cafe) => void
) => {

  if (!map || !cafeDataLoaded) {
    return
  }

  // ズームレベルが閾値以下の場合はクラスターマーカーを表示
  if (zoom <= ZOOM_THRESHOLD) {
    // 既存の店舗マーカーをすべて削除
    const currentMarkers = markersRef.current
    currentMarkers.forEach((marker) => {
      marker.remove()
    })
    currentMarkers.clear()

    updateClusterMarkers(zoom, map, cafeDataLoaded, allCafes, ZOOM_THRESHOLD, setSelected)
    return
  }

  // 閾値以上の場合はクラスターマーカーを削除して通常のマーカー更新処理
  if (map?.getLayer('clusters')) {
    map.removeLayer('clusters')
  }
  if (map?.getLayer('cluster-labels')) {
    map.removeLayer('cluster-labels')
  }
  if (map?.getSource('clusters')) {
    map.removeSource('clusters')
  }

  const visibleCafes = getVisibleCafes(map, allCafes, cafeDataLoaded)
  const currentMarkers = markersRef.current

  // 現在表示されているマーカーのIDセット
  const visibleCafeIds = new Set(visibleCafes.map(cafe => cafe.id))

  // 表示範囲外のマーカーを削除
  currentMarkers.forEach((marker, id) => {
    if (!visibleCafeIds.has(id)) {
      marker.remove()
      currentMarkers.delete(id)
    }
  })

  // 新しく表示すべきマーカーを追加（逆順で処理して最新の情報を前面に）
  visibleCafes.slice().reverse().forEach(cafe => {
    addMarkerForCafe(cafe, map, currentMarkers, setSelected)
  })
}