import { useCallback, type RefObject } from "react"
import type maplibregl from "maplibre-gl"

type Args = {
  mapRef: RefObject<maplibregl.Map | null>
  isKeyboardOpenRef: RefObject<boolean>
}

// 検索入力フォーカス時に地図のジェスチャー操作を止める／離れたら復活させる
export const useKeyboardAvoidance = ({ mapRef, isKeyboardOpenRef }: Args) => {
  const handleInputFocus = useCallback(() => {
    isKeyboardOpenRef.current = true
    const map = mapRef.current
    if (!map) return
    map.dragPan.disable()
    map.scrollZoom.disable()
    map.touchZoomRotate.disable()
    map.doubleClickZoom.disable()
  }, [mapRef, isKeyboardOpenRef])

  const handleInputBlur = useCallback(() => {
    isKeyboardOpenRef.current = false
    const map = mapRef.current
    if (!map) return
    // サジェストのクリックを優先するため少し遅延
    setTimeout(() => {
      const m = mapRef.current
      if (!m) return
      m.dragPan.enable()
      m.scrollZoom.enable()
      m.touchZoomRotate.enable()
      m.doubleClickZoom.enable()
    }, 100)
  }, [mapRef, isKeyboardOpenRef])

  return { handleInputFocus, handleInputBlur }
}
