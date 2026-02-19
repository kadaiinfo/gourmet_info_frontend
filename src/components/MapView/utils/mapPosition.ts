import maplibregl from "maplibre-gl"
import type { Cafe } from "../../../lib/dataClient"

// デフォルトのズームレベル
const DEFAULT_ZOOM_LEVEL = 17

// 地図の位置を計算する関数
export const calculateMapPosition = (
  cafe: Cafe,
  map: maplibregl.Map,
  isMobile: boolean,
  maintainZoom: boolean = false
) => {
  const currentZoom = maintainZoom ? map.getZoom() : DEFAULT_ZOOM_LEVEL

  if (isMobile) {
    return {
      center: [cafe.lng, cafe.lat] as [number, number],
      zoom: currentZoom
    }
  } else {
    const mapContainer = map.getContainer()
    const mapWidth = mapContainer.offsetWidth
    const targetX = mapWidth * 0.25
    const centerX = mapWidth * 0.5
    const offsetX = centerX - targetX

    // flyTo後のズームレベルでの longitude range をメルカトル式で計算
    // （現在の bounds を使うと flyTo でズームが変わった際にオフセットがずれるため）
    // MapLibre のデフォルトタイルサイズは 512px
    const lngRange = mapWidth * (360 / (512 * Math.pow(2, currentZoom)))
    const lngOffset = (offsetX / mapWidth) * lngRange

    return {
      center: [cafe.lng + lngOffset, cafe.lat] as [number, number],
      zoom: currentZoom
    }
  }
}

// カフェ選択時の地図移動処理
export const handleCafeSelection = (
  cafe: Cafe,
  map: maplibregl.Map | null,
  setSelected: (cafe: Cafe) => void,
  maintainZoom: boolean = false
) => {
  setSelected(cafe)
  
  if (map) {
    const mapContainer = map.getContainer()
    const mapWidth = mapContainer.offsetWidth
    const isMobile = mapWidth <= 768
    
    const position = calculateMapPosition(cafe, map, isMobile, maintainZoom)
    map.flyTo(position)
  }
}