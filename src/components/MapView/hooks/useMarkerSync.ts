import { useCallback, useEffect, useRef, type RefObject } from "react"
import type maplibregl from "maplibre-gl"
import type { Cafe } from "../../../lib/dataClient"
import { updateMarkersWithZoom } from "../utils/markerManager"

type Args = {
  mapRef: RefObject<maplibregl.Map | null>
  mapLoaded: boolean
  cafeDataLoaded: boolean
  filteredCafes: Cafe[]
  currentZoom: number
  mapCenter: [number, number] | null
  zoomThreshold: number
  setSelected: (cafe: Cafe) => void
}

export const useMarkerSync = ({
  mapRef,
  mapLoaded,
  cafeDataLoaded,
  filteredCafes,
  currentZoom,
  mapCenter,
  zoomThreshold,
  setSelected,
}: Args) => {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())

  const updateMarkers = useCallback(() => {
    updateMarkersWithZoom(
      currentZoom,
      mapRef.current,
      cafeDataLoaded,
      filteredCafes,
      zoomThreshold,
      markersRef,
      setSelected
    )
  }, [currentZoom, cafeDataLoaded, filteredCafes, zoomThreshold, mapRef, setSelected])

  // 初回 + ズーム/移動時にマーカー更新
  useEffect(() => {
    if (mapLoaded && cafeDataLoaded) {
      updateMarkers()
    }
  }, [mapLoaded, cafeDataLoaded, updateMarkers, currentZoom, mapCenter])

  return { markersRef }
}
