import { useState, useEffect, useRef } from "react"
import "./Search.css"
// import iconImage from "./icon.jpg"
import mixerIcon from "./mixer.svg"
import { type Cafe } from "../../lib/dataClient"
import { normalizeText } from "../../utils/textNormalization"
import { hiraganaToRomaji } from "../../utils/romajiUtils"
import { type GenreId } from "../../utils/genreFilter"

interface SearchProps {
  onSearch: (query: string) => void
  onSettingsClick?: () => void
  onLocationClick?: () => void
  isLocating?: boolean
  cafes?: Cafe[]
  onSuggestionSelect?: (cafe: Cafe) => void
  onOpenNowToggle?: () => void
  isOpenNowActive?: boolean
  genres?: readonly { id: GenreId; label: string }[]
  selectedGenre?: GenreId[]
  onGenreSelect?: (genreId: GenreId) => void
}

export default function Search({
  onSearch,
  onSettingsClick,
  onLocationClick,
  isLocating,
  cafes = [],
  onSuggestionSelect,
  onOpenNowToggle,
  isOpenNowActive = false,
  genres,
  selectedGenre,
  onGenreSelect
}: SearchProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Cafe[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const isSelectionRef = useRef(false)

  // クリック外側の検知
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // 選択インデックスが変わったらスクロール位置を調整
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex])

  // 検索クエリが変わったらサジェストを更新
  useEffect(() => {
    if (isSelectionRef.current) {
      isSelectionRef.current = false
      return
    }

    if (!query.trim() || !cafes.length) {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }

    const normalizedQuery = normalizeText(query)
    const romajiQuery = hiraganaToRomaji(normalizedQuery)

    const filtered = cafes.filter(cafe => {
      const normalizedStoreName = normalizeText(cafe.store_name || "")
      const normalizedAddress = normalizeText(cafe.address || "")

      return normalizedStoreName.includes(normalizedQuery) ||
        normalizedAddress.includes(normalizedQuery) ||
        normalizedStoreName.toLowerCase().includes(romajiQuery) // ローマ字検索対応
    })
    setSuggestions(filtered)
    setShowSuggestions(true)
    setSelectedIndex(-1)
  }, [query, cafes])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSuggestionClick(suggestions[selectedIndex])
      return
    }
    setShowSuggestions(false)
    onSearch(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1))
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (cafe: Cafe) => {
    isSelectionRef.current = true
    setQuery(cafe.store_name || "")
    setShowSuggestions(false)
    setSelectedIndex(-1)
    if (onSuggestionSelect) {
      onSuggestionSelect(cafe)
    }
  }

  return (
    <div className="search-container" ref={searchRef}>
      <div className="search-logo-container">
        <img src="/logo.svg" alt="Logo" className="search-logo" />
        <img src="/logo_brown.svg" alt="Logo Brown" className="search-logo-brown" />
      </div>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          {/* <img src={iconImage} alt="検索アイコン" className="search-icon" /> */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim() && suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            placeholder="店名や住所で検索..."
            className="search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setShowSuggestions(false)
                setSuggestions([])
              }}
              className="search-clear-button"
              aria-label="クリア"
            >
              ×
            </button>
          )}
        </div>
        <div className="search-buttons">
          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              className="settings-button"
              aria-label="設定"
            >
              <img src={mixerIcon} alt="設定" className="settings-icon" />
            </button>
          )}
          {onLocationClick && (
            <button
              type="button"
              onClick={onLocationClick}
              disabled={isLocating}
              className="location-button-search"
              aria-label="現在地を表示"
              title="現在地を表示"
            >
              <img src="/location.png" alt="現在地" className="location-icon" />
            </button>
          )}
        </div>
      </form>

      {/* フィルター行（今開いてる！ + ジャンルタグ） */}
      {(onOpenNowToggle || (genres && genres.length > 0)) && (
        <div className="filter-tags">
          {onOpenNowToggle && (
            <button
              type="button"
              onClick={onOpenNowToggle}
              className={`genre-tag${isOpenNowActive ? ' active' : ''}`}
              aria-label="今開いているお店を絞り込む"
            >
              今開いてる！
            </button>
          )}
          {genres && genres.map(genre => (
            <button
              key={genre.id}
              type="button"
              className={`genre-tag${selectedGenre?.includes(genre.id) ? ' active' : ''}`}
              onClick={() => onGenreSelect && onGenreSelect(genre.id)}
            >
              {genre.label}
            </button>
          ))}
          {(!selectedGenre || selectedGenre.length === 0) && !isOpenNowActive && (
            <img src="/filter.png" className="filter-icon" alt="Filter" />
          )}
        </div>
      )}

      {/* サジェストリスト */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="search-suggestions" ref={listRef}>
          {suggestions.map((cafe, index) => (
            <li
              key={cafe.id}
              className={`search-suggestion-item ${index === selectedIndex ? "selected" : ""}`}
              onClick={() => handleSuggestionClick(cafe)}
            >
              <div className="search-suggestion-name">{cafe.store_name || "—"}</div>
              <div className="search-suggestion-address">{cafe.address || "—"}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}