import { useCallback, useRef, useState, type RefObject } from "react"
import type maplibregl from "maplibre-gl"
import {
  getCurrentLocation,
  updateUserLocationMarker,
  moveToUserLocation,
} from "../utils/geolocation"

type Args = {
  mapRef: RefObject<maplibregl.Map | null>
  defaultZoom: number
}

export const useGeolocation = ({ mapRef, defaultZoom }: Args) => {
  const [isLocating, setIsLocating] = useState(false)
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null)

  const handleLocationClick = useCallback(async () => {
    if (isLocating) return

    setIsLocating(true)
    try {
      const location = await getCurrentLocation()
      updateUserLocationMarker(mapRef.current, location, userLocationMarkerRef)
      moveToUserLocation(mapRef.current, location, defaultZoom)
    } catch (error) {
      console.error("位置情報の取得に失敗:", error)
      alert(error instanceof Error ? error.message : "位置情報の取得に失敗しました")
    } finally {
      setIsLocating(false)
    }
  }, [isLocating, mapRef, defaultZoom])

  return { isLocating, handleLocationClick }
}
