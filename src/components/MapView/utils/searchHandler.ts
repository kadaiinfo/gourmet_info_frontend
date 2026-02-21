import maplibregl from "maplibre-gl"
import type { Cafe } from "../../../lib/dataClient"
import { calculateMapPosition } from "./mapPosition"
import { getCafesInArea } from "./visibleCafes"
import { addMarkerForCafe } from "./markerManager"

// 検索処理を行う関数
export const handleSearch = async (
  query: string,
  searchCafes: (query: string) => Promise<Cafe[]>,
  map: maplibregl.Map | null,
  mapLoaded: boolean,
  setSelected: (cafe: Cafe | null) => void,
  updateMarkers: () => void,
  allCafes: Cafe[],
  markersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>
) => {
  const filteredCafes = await searchCafes(query)

  // 検索結果がある場合、最初のカフェに移動して選択
  if (filteredCafes.length > 0 && map && mapLoaded && query.trim()) {
    const firstCafe = filteredCafes[0]
    setSelected(firstCafe)

    const mapContainer = map.getContainer()
    const mapWidth = mapContainer.offsetWidth
    const isMobile = mapWidth <= 768

    const position = calculateMapPosition(firstCafe, map, isMobile)

    // 移動先の範囲のカフェを取得して事前にマーカーを描画
    const targetCafes = getCafesInArea(
      position.center,
      position.zoom,
      allCafes,
      mapContainer
    )

    // 移動先のマーカーを事前に描画
    targetCafes.slice().reverse().forEach(cafe => {
      addMarkerForCafe(cafe, map, markersRef.current, setSelected)
    })

    // スマホでキーボードが開いている場合は閉じてからビューポートが安定した後に flyTo する
    const activeEl = document.activeElement as HTMLElement | null
    if (activeEl && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
      activeEl.blur()
      // visualViewport が縮んでいる（キーボード表示中）場合は resize イベントを待つ
      const vv = window.visualViewport
      if (vv && vv.height < window.innerHeight - 50) {
        const onResize = () => {
          vv.removeEventListener('resize', onResize)
          // WebViewでビューポートが完全に安定するまで待つ
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              map.resize()
              map.flyTo(position)
            })
          })
        }
        vv.addEventListener('resize', onResize)
      } else {
        map.flyTo(position)
      }
    } else {
      map.flyTo(position)
    }
  } else if (filteredCafes.length === 0) {
    // 検索結果がない場合は選択をクリア
    setSelected(null)
  }
}