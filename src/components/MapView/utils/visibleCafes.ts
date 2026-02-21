import maplibregl from "maplibre-gl"
import type { Cafe } from "../../../lib/dataClient"

// 表示範囲内のカフェをフィルタリングする関数
export const getVisibleCafes = (
  map: maplibregl.Map | null,
  allCafes: Cafe[],
  cafeDataLoaded: boolean
): Cafe[] => {
  if (!map || !cafeDataLoaded || allCafes.length === 0) return []

  const bounds = map.getBounds()
  return allCafes.filter(cafe =>
    cafe.lng >= bounds.getWest() &&
    cafe.lng <= bounds.getEast() &&
    cafe.lat >= bounds.getSouth() &&
    cafe.lat <= bounds.getNorth()
  )
}

// 指定した中心座標とズームレベルから、その範囲内のカフェを取得する関数
export const getCafesInArea = (
  center: [number, number],
  zoom: number,
  allCafes: Cafe[],
  mapContainer: HTMLElement | null
): Cafe[] => {
  if (!mapContainer || allCafes.length === 0) return []

  const mapWidth = mapContainer.offsetWidth
  const mapHeight = mapContainer.offsetHeight

  // ズームレベルから緯度経度の範囲を計算（MapLibreのタイルサイズは512px）
  const lngRange = mapWidth * (360 / (512 * Math.pow(2, zoom)))
  const latRange = mapHeight * (180 / (512 * Math.pow(2, zoom)))

  const [centerLng, centerLat] = center
  const minLng = centerLng - lngRange / 2
  const maxLng = centerLng + lngRange / 2
  const minLat = centerLat - latRange / 2
  const maxLat = centerLat + latRange / 2

  return allCafes.filter(cafe =>
    cafe.lng >= minLng &&
    cafe.lng <= maxLng &&
    cafe.lat >= minLat &&
    cafe.lat <= maxLat
  )
}