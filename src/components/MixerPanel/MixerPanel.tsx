import { SignedIn, SignedOut, SignInButton, SignOutButton, UserButton, useUser } from "@clerk/clerk-react"
import "./MixerPanel.css"
import { type Cafe } from "../../lib/dataClient"
import { type GenreId } from "../../utils/genreFilter"

interface MixerPanelProps {
  onClose: () => void
  onShowCafeList: () => void
  onShowFavoritesList: () => void
  onAreaSelect: (lng: number, lat: number) => void
  onShowNearbyCafes: () => void
  genres?: readonly { id: GenreId; label: string }[]
  selectedGenre?: GenreId[]
  onGenreSelect?: (genreId: GenreId) => void
  favoriteCafes?: Cafe[]
  onFavoriteSelect?: (cafe: Cafe) => void
}

export default function MixerPanel({ onClose, onShowCafeList, onShowFavoritesList, onAreaSelect, onShowNearbyCafes, genres, selectedGenre, onGenreSelect, favoriteCafes = [], onFavoriteSelect }: MixerPanelProps) {
  const { user } = useUser()

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

      {/* アカウントセクション */}
      <div className="mixer-panel__section">
        <h3 className="mixer-panel__section-title">ユーザー情報</h3>
        <SignedOut>
          <div className="mixer-panel__account">
            <div className="mixer-panel__avatar-placeholder" />
            <SignInButton mode="modal">
              <button className="mixer-panel__genre-button" type="button">
                ログイン
              </button>
            </SignInButton>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="mixer-panel__account">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: { width: "48px", height: "48px" },
                },
              }}
            />
            <div className="mixer-panel__account-info">
              <span className="mixer-panel__account-email">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
              <span className="mixer-panel__account-name">
                {user?.fullName ?? user?.username}
              </span>
            </div>
            <SignOutButton>
              <button className="mixer-panel__genre-button mixer-panel__account-action" type="button">
                ログアウト
              </button>
            </SignOutButton>
          </div>
        </SignedIn>
      </div>

      {/* お気に入りセクション（未ログイン時は空表示） */}
      <div className="mixer-panel__section">
          <h3 className="mixer-panel__section-title">お気に入りの飲食店</h3>
          {favoriteCafes.length > 0 ? (
            <div className="mixer-panel__favorites-scroll">
              {favoriteCafes.map((cafe) => (
                <button
                  key={cafe.id}
                  className="mixer-panel__favorite-card"
                  onClick={() => onFavoriteSelect?.(cafe)}
                >
                  {cafe.media_url && (
                    <img
                      src={cafe.media_url}
                      alt={cafe.store_name ?? ""}
                      className="mixer-panel__favorite-thumb"
                      loading="lazy"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = "none"
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="mixer-panel__favorites-empty">まだお気に入りがありません</p>
          )}
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
              <div className="mixer-panel__option-desc">飲食店を一覧で表示</div>
            </div>
          </button>

          <button
            className="mixer-panel__option-button"
            onClick={onShowFavoritesList}
          >
            <div className="mixer-panel__option-content">
              <div className="mixer-panel__option-title">お気に入りを一覧表示</div>
              <div className="mixer-panel__option-desc">保存した飲食店を一覧で表示</div>
            </div>
          </button>

          <button
            className="mixer-panel__option-button"
            onClick={onShowNearbyCafes}
          >
            <div className="mixer-panel__option-content">
              <div className="mixer-panel__option-title">近くの飲食店を表示</div>
              <div className="mixer-panel__option-desc">500m内の飲食店を表示</div>
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
                  className={`mixer-panel__genre-button${selectedGenre?.includes(genre.id) ? ' active' : ''}`}
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