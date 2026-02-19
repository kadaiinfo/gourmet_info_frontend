import "./MixerPanel.css"
import { type GenreId } from "../../utils/genreFilter"

interface MixerPanelProps {
  onClose: () => void
  onShowCafeList: () => void
  onAreaSelect: (lng: number, lat: number) => void
  onShowNearbyCafes: () => void
  genres?: readonly { id: GenreId; label: string }[]
  selectedGenre?: GenreId | null
  onGenreSelect?: (genreId: GenreId) => void
}

export default function MixerPanel({ onClose, onShowCafeList, onAreaSelect, onShowNearbyCafes, genres, selectedGenre, onGenreSelect }: MixerPanelProps) {

  const areas = [
    { id: "uptown", name: "騎射場", lng: 130.5520733, lat: 31.5692252 },
    { id: "all", name: "中央駅", lng: 130.5439322, lat: 31.5826642 },
    { id: "central", name: "天文館", lng: 130.5548586, lat: 31.5901844 },
    { id: "riverside", name: "名山", lng: 130.5582345, lat: 31.5953913 },
    { id: "downtown", name: "谷山", lng: 130.5229738, lat: 31.5298778 },
  ]

  const handleAreaClick = (area: typeof areas[0]) => {
    onAreaSelect(area.lng, area.lat)
    onClose() // エリア選択後にパネルを閉じる
  }

  return (

    <div className="mixer-panel">
      <div className="mixer-panel__header">
        <button
          className="mixer-panel__close"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {/* 表示オプションセクション */}
      <div className="mixer-panel__section">
        <h3 className="mixer-panel__section-title">表示オプション</h3>
        <div className="mixer-panel__options">
          <button
            className="mixer-panel__option-button"
            onClick={onShowCafeList}
          >
            <div className="mixer-panel__option-content">
              <div className="mixer-panel__option-title">一覧表示</div>
              <div className="mixer-panel__option-desc">ご飯屋さんを一覧で表示</div>
            </div>
          </button>

          <button
            className="mixer-panel__option-button"
            onClick={onShowNearbyCafes}
          >
            <div className="mixer-panel__option-content">
              <div className="mixer-panel__option-title">近くのお店を表示</div>
              <div className="mixer-panel__option-desc">500m内のお店を表示</div>
            </div>
          </button>
        </div>
      </div>

      <div className="mixer-panel__body">
        {/* ジャンルフィルターセクション */}
        {genres && genres.length > 0 && (
          <div className="mixer-panel__section">
            <h3 className="mixer-panel__section-title">ジャンルで絞り込む</h3>
            <div className="mixer-panel__genre-list">
              {genres.map(genre => (
                <button
                  key={genre.id}
                  className={`mixer-panel__genre-button${selectedGenre === genre.id ? ' active' : ''}`}
                  onClick={() => onGenreSelect && onGenreSelect(genre.id)}
                >
                  {genre.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* エリア選択セクション */}
        <div className="mixer-panel__section">
          <h3 className="mixer-panel__section-title">エリアに移動</h3>

          {/* エリアボタングリッド */}
          <div className="mixer-panel__genre-list">
            {areas.map((area) => (
              <button
                key={area.id}
                className="mixer-panel__genre-button"
                onClick={() => handleAreaClick(area)}
              >
                {area.name}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* フッター */}
      <div className="mixer-panel__footer">
        <nav className="mixer-panel__footer-nav">
          <a href="https://kadaiinfo.com/" className="mixer-panel__footer-link" target="_blank" rel="noopener noreferrer">HOME</a>
          <a href="https://kadaiinfo.com/posts" className="mixer-panel__footer-link" target="_blank" rel="noopener noreferrer">記事一覧</a>
          <a href="https://kadaiinfo.com/contact" className="mixer-panel__footer-link" target="_blank" rel="noopener noreferrer">お問い合わせ</a>
          <a href="https://kadaiinfo.com/terms" className="mixer-panel__footer-link" target="_blank" rel="noopener noreferrer">利用規約</a>
          <a href="https://kadaiinfo.com/privacy-policy" className="mixer-panel__footer-link" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
        </nav>
        <div className="mixer-panel__footer-bottom">
          <img src="/logo_fill.svg" className="mixer-panel__footer-logo" />
          <p className="mixer-panel__footer-text">© {new Date().getFullYear()} グルメインフォ</p>
        </div>
      </div>
    </div>
  )
}