import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth, useClerk } from "@clerk/clerk-react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import "./MapView.css"
import { searchCafes, type Cafe } from "../../lib/dataClient"
import Information from "../Information/Information.tsx"
import Search from "../Search/Search.tsx"
import MixerPanel from "../MixerPanel/MixerPanel.tsx"
import CafeList from "../CafeList/CafeList.tsx"
import NearbyCafeList from "../NearbyCafeList/NearbyCafeList.tsx"

import { handleCafeSelection } from "./utils/mapPosition"
import { addMarkerForCafe } from "./utils/markerManager"
import { handleSearch } from "./utils/searchHandler"
import { isOpenNow } from "../../utils/openingHoursParser"
import { GENRES, matchesGenre } from "../../utils/genreFilter"
import { getCafesInArea } from "./utils/visibleCafes"

import { DEFAULT_ZOOM_LEVEL, ZOOM_THRESHOLD } from "./constants"
import { useFavorites } from "../../hooks/useFavorites"
import { useCafeData } from "./hooks/useCafeData"
import { useFilters } from "./hooks/useFilters"
import { useKeyboardAvoidance } from "./hooks/useKeyboardAvoidance"
import { useMapInstance } from "./hooks/useMapInstance"
import { useMarkerSync } from "./hooks/useMarkerSync"
import { usePopup } from "./hooks/usePopup"

interface MapViewProps {
  // スマホ版のみ指定。検索バー横のブックマークボタンでスワイプモードを開く
  onOpenSwipe?: () => void
}

export default function MapView({ onOpenSwipe }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const isKeyboardOpenRef = useRef(false)

  // UI 状態（パネル表示・選択中の店舗）
  const [selected, setSelected] = useState<Cafe | null>(null)
  const [showMixerPanel, setShowMixerPanel] = useState(false)
  const [showCafeList, setShowCafeList] = useState(false)
  const [showNearbyCafeList, setShowNearbyCafeList] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)

  // データ・フィルター
  const { allCafes, cafeDataLoaded } = useCafeData()

  // お気に入り（Clerk認証 + D1保存）
  const { openSignIn } = useClerk()
  const { isSignedIn } = useAuth()
  const { isFavorite, toggleFavorite, removeFavorite, favoriteIds } = useFavorites({
    onRequireSignIn: () => openSignIn(),
  })

  // 検索バー横のブックマークボタン。
  // スマホ版（onOpenSwipe あり）はスワイプモードを開く。
  // それ以外（PC）は従来どおりお気に入り一覧を開く（未ログインならログインへ誘導）。
  const handleFavoritesClick = () => {
    if (onOpenSwipe) {
      onOpenSwipe()
      return
    }
    if (isSignedIn) {
      setShowFavorites(true)
    } else {
      openSignIn()
    }
  }
  const favoriteCafes = useMemo(
    () => allCafes.filter((c) => favoriteIds.has(c.id)),
    [allCafes, favoriteIds]
  )
  const {
    filterOpenNow,
    selectedGenre,
    filteredCafes,
    toggleOpenNow,
    toggleGenre,
  } = useFilters(allCafes)

  // 入力フォーカス時の地図操作制御
  const { handleInputFocus, handleInputBlur } = useKeyboardAvoidance({
    mapRef,
    isKeyboardOpenRef,
  })

  // 地図インスタンス
  const { mapLoaded, currentZoom, mapCenter } = useMapInstance({
    containerRef: mapContainerRef,
    mapRef,
    isKeyboardOpenRef,
    onBackgroundClick: () => setSelected(null),
  })

  // マーカー同期
  const { markersRef } = useMarkerSync({
    mapRef,
    mapLoaded,
    cafeDataLoaded,
    filteredCafes,
    currentZoom,
    mapCenter,
    zoomThreshold: ZOOM_THRESHOLD,
    setSelected,
  })

  // ポップアップ
  const { expandTrigger } = usePopup({ selected, mapRef })

  // ---- ハンドラ群 ----

  const handleCafeSelect = (cafe: Cafe) => {
    if (mapRef.current) {
      addMarkerForCafe(cafe, mapRef.current, markersRef.current, setSelected)
    }
    handleCafeSelection(cafe, mapRef.current, setSelected)
  }

  const handleAreaSelect = (lng: number, lat: number) => {
    setSelected(null)
    if (!mapRef.current) return

    // 移動先の範囲のカフェを取得して事前にマーカーを描画
    const targetCafes = getCafesInArea(
      [lng, lat],
      DEFAULT_ZOOM_LEVEL,
      filteredCafes,
      mapRef.current.getContainer()
    )
    targetCafes
      .slice()
      .reverse()
      .forEach(cafe => {
        addMarkerForCafe(cafe, mapRef.current!, markersRef.current, setSelected)
      })

    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: DEFAULT_ZOOM_LEVEL,
      duration: 3000,
    })
  }

  const handleSearchAction = async (query: string) => {
    const searchFn = filterOpenNow
      ? async (q: string) => {
          const results = await searchCafes(q)
          return results.filter(cafe => isOpenNow(cafe.opening_hours) === true)
        }
      : searchCafes
    await handleSearch(
      query,
      searchFn,
      mapRef.current,
      mapLoaded,
      setSelected,
      filteredCafes,
      markersRef
    )
  }

  // ---- 副作用：選択中の店舗とフィルターの整合 ----

  // 「今開いてる！」がオンになった時、選択中が営業時間外なら閉じる
  useEffect(() => {
    if (filterOpenNow && selected && isOpenNow(selected.opening_hours) !== true) {
      setSelected(null)
    }
  }, [filterOpenNow, selected])

  // ジャンルフィルターに該当しない店舗が選択中なら閉じる
  useEffect(() => {
    if (selectedGenre.length > 0 && selected) {
      const matchesAnyGenre = selectedGenre.some(genreId =>
        matchesGenre(selected.categories, genreId)
      )
      if (!matchesAnyGenre) {
        setSelected(null)
      }
    }
  }, [selectedGenre, selected])

  // ズームアウトでクラスター表示になる時は詳細を閉じる
  useEffect(() => {
    if (currentZoom < ZOOM_THRESHOLD && selected) {
      setSelected(null)
    }
  }, [currentZoom, selected])

  return (
    <div className="map-layout">
      <Search
        onSearch={handleSearchAction}
        onSettingsClick={() => setShowMixerPanel(true)}
        cafes={filteredCafes}
        onSuggestionSelect={handleCafeSelect}
        onOpenNowToggle={toggleOpenNow}
        isOpenNowActive={filterOpenNow}
        genres={GENRES}
        selectedGenre={selectedGenre}
        onGenreSelect={toggleGenre}
        onInputFocus={handleInputFocus}
        onInputBlur={handleInputBlur}
        onFavoritesClick={onOpenSwipe ? handleFavoritesClick : undefined}
      />

      <div ref={mapContainerRef} className="map-container" />

      {!cafeDataLoaded && (
        <div className="map-loading-overlay">
          <div className="map-loading-spinner" />
        </div>
      )}

      {filterOpenNow && (
        <div className={`open-now-notice${selected ? " with-info" : ""}`}>
          営業時間の情報は取材時の情報に基づきます。
          <br />
          正確な情報は、店舗に直接お問い合わせください。
        </div>
      )}

      {selected && (
        <Information
          cafe={selected}
          onClose={() => setSelected(null)}
          expandTrigger={expandTrigger}
          isFavorite={isFavorite(selected.id)}
          onToggleFavorite={() => toggleFavorite(selected.id)}
        />
      )}

      {showMixerPanel && (
        <MixerPanel
          onClose={() => setShowMixerPanel(false)}
          onShowCafeList={() => {
            setShowMixerPanel(false)
            setShowCafeList(true)
          }}
          onShowFavoritesList={() => {
            setShowMixerPanel(false)
            // 未ログインでもそのままお気に入り一覧を表示する
            setShowFavorites(true)
          }}
          onAreaSelect={handleAreaSelect}
          onShowNearbyCafes={() => {
            setShowMixerPanel(false)
            setShowNearbyCafeList(true)
          }}
          genres={GENRES}
          selectedGenre={selectedGenre}
          onGenreSelect={toggleGenre}
          favoriteCafes={favoriteCafes}
          onFavoriteSelect={(cafe) => {
            setShowMixerPanel(false)
            handleCafeSelect(cafe)
          }}
        />
      )}

      {showCafeList && (
        <CafeList
          onCafeSelect={handleCafeSelect}
          onClose={() => setShowCafeList(false)}
          cafes={filterOpenNow ? filteredCafes : undefined}
        />
      )}

      {showNearbyCafeList && (
        <NearbyCafeList
          onCafeSelect={handleCafeSelect}
          onClose={() => setShowNearbyCafeList(false)}
          cafes={filterOpenNow ? filteredCafes : undefined}
        />
      )}

      {showFavorites && (
        <CafeList
          onCafeSelect={handleCafeSelect}
          onClose={() => setShowFavorites(false)}
          cafes={favoriteCafes}
          countNoun="お気に入りの飲食店"
          onRemoveFavorite={removeFavorite}
        />
      )}
    </div>
  )
}
