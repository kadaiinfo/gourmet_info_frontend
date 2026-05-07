import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import type maplibregl from "maplibre-gl"
import type { Cafe } from "../../../lib/dataClient"
import { showPopup, hidePopup } from "../utils/popupManager"

type Args = {
  selected: Cafe | null
  mapRef: RefObject<maplibregl.Map | null>
}

export const usePopup = ({ selected, mapRef }: Args) => {
  const currentPopupRef = useRef<maplibregl.Popup | null>(null)
  const [expandTrigger, setExpandTrigger] = useState(0)

  const handlePopupClick = useCallback(() => {
    setExpandTrigger(prev => prev + 1)
  }, [])

  useEffect(() => {
    if (selected) {
      showPopup(selected, mapRef.current, currentPopupRef, handlePopupClick)
    } else {
      hidePopup(currentPopupRef)
    }
  }, [selected, handlePopupClick, mapRef])

  return { expandTrigger, handlePopupClick }
}
