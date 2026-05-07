import { useEffect, useRef, useState, type RefObject } from "react"
import maplibregl from "maplibre-gl"
import { saveMapState, loadMapState } from "../utils/mapState"
import { DEFAULT_CENTER, DEFAULT_ZOOM_LEVEL } from "../constants"

type Args = {
  containerRef: RefObject<HTMLDivElement | null>
  mapRef: RefObject<maplibregl.Map | null>
  isKeyboardOpenRef: RefObject<boolean>
  onBackgroundClick: () => void
}

// MapLibre インスタンスの初期化と座標/ズームの状態管理を担当
export const useMapInstance = ({
  containerRef,
  mapRef,
  isKeyboardOpenRef,
  onBackgroundClick,
}: Args) => {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM_LEVEL)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  // onBackgroundClick の最新参照を保持（地図初期化は1回だけしたいので）
  const onBackgroundClickRef = useRef(onBackgroundClick)
  useEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick
  }, [onBackgroundClick])

  useEffect(() => {
    if (!containerRef.current) return

    const savedState = loadMapState()
    const initialCenter: [number, number] = savedState?.center || DEFAULT_CENTER
    const initialZoom = savedState?.zoom || DEFAULT_ZOOM_LEVEL

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json",
      center: initialCenter,
      zoom: initialZoom,
    })

    mapRef.current = map

    map.on("load", () => setMapLoaded(true))

    const handleMoveEnd = () => {
      const z = map.getZoom()
      const c = map.getCenter()
      setCurrentZoom(z)
      setMapCenter([c.lng, c.lat])
      saveMapState([c.lng, c.lat], z)
    }

    const handleZoomEnd = () => {
      const z = map.getZoom()
      const c = map.getCenter()
      setCurrentZoom(z)
      saveMapState([c.lng, c.lat], z)
    }

    const handleClick = () => {
      onBackgroundClickRef.current()
    }

    map.on("moveend", handleMoveEnd)
    map.on("zoomend", handleZoomEnd)
    map.on("click", handleClick)

    // ウィンドウリサイズ時に MapLibre の内部サイズを更新
    // ただし input にフォーカス中（キーボード表示中）はスキップ
    const resizeObserver = new ResizeObserver(() => {
      const activeEl = document.activeElement
      if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) return
      if (isKeyboardOpenRef.current) return
      map.resize()
    })
    resizeObserver.observe(containerRef.current)

    const vv = window.visualViewport
    const handleVisualViewportResize = () => {
      if (isKeyboardOpenRef.current) return
      const activeEl = document.activeElement
      if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) return
      map.resize()
    }
    if (vv) {
      vv.addEventListener("resize", handleVisualViewportResize)
    }

    return () => {
      resizeObserver.disconnect()
      if (vv) {
        vv.removeEventListener("resize", handleVisualViewportResize)
      }
      map.off("moveend", handleMoveEnd)
      map.off("zoomend", handleZoomEnd)
      map.off("click", handleClick)
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { mapLoaded, currentZoom, mapCenter }
}
