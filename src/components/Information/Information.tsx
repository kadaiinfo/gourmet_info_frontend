// src/features/map/components/information.tsx
import { useState, useCallback, useEffect, useRef } from "react"
import "./Information.css"
import { getCafeDetail, type Cafe, type DetailedCafe } from "../../lib/dataClient"

// Instagram埋め込みスクリプトの型定義
declare global {
    interface Window {
        instgrm?: {
            Embeds: {
                process: () => void
            }
        }
    }
}

type InformationProps = {
    cafe: Cafe
    onClose?: () => void
    expandTrigger?: number
    isFavorite?: boolean
    onToggleFavorite?: () => void
}

export default function Information({ cafe, onClose, expandTrigger = 0, isFavorite = false, onToggleFavorite }: InformationProps) {
    const [detailedCafe, setDetailedCafe] = useState<DetailedCafe | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [hasBeenExpanded, setHasBeenExpanded] = useState(false)
    const [isEmbedLoaded, setIsEmbedLoaded] = useState(false)
    // 埋め込みが表示できない（年齢制限・削除・非公開など）時にサムネイルへフォールバック
    const [embedFailed, setEmbedFailed] = useState(false)
    const [isScriptLoaded, setIsScriptLoaded] = useState(false)
    const infoDetailRef = useRef<HTMLDivElement>(null)
    const embedContainerRef = useRef<HTMLDivElement>(null)

    // 外部からの展開トリガーを監視
    useEffect(() => {
        if (expandTrigger > 0) {
            setIsExpanded(true)
            setHasBeenExpanded(true)

            // スライドを開く際にスクロールを一番上にリセット
            setTimeout(() => {
                if (infoDetailRef.current) {
                    infoDetailRef.current.scrollTop = 0
                    infoDetailRef.current.scrollTo(0, 0)
                }
            }, 0)
        }
    }, [expandTrigger])

    // 詳細データを遅延読み込み
    useEffect(() => {
        if (cafe) {
            // 新しいカフェが選択されたら詳細データを取得
            const loadDetail = async () => {
                try {
                    const detail = await getCafeDetail(cafe.id)
                    setDetailedCafe(detail)
                } catch (error) {
                    console.error('Failed to load cafe detail:', error)
                    setDetailedCafe(null)
                }
            }
            loadDetail()

            // 展開状態をリセット(モバイルの場合)
            setIsExpanded(false)
            setIsClosing(false)
            setHasBeenExpanded(false)
            // 埋め込みロード状態をリセット
            setIsEmbedLoaded(false)

            // 新しいカフェが選択された時のスクロールリセット
            if (infoDetailRef.current) {
                infoDetailRef.current.scrollTop = 0
            }
        }
    }, [cafe])

    // Instagram埋め込みスクリプトを読み込む
    useEffect(() => {
        // スクリプトが既に読み込まれているかチェック
        if (window.instgrm) {
            setIsScriptLoaded(true)
        } else if (!document.querySelector('script[src="//www.instagram.com/embed.js"]')) {
            const script = document.createElement('script')
            script.src = '//www.instagram.com/embed.js'
            script.async = true
            script.onload = () => setIsScriptLoaded(true)
            document.body.appendChild(script)
        } else {
            // すでにスクリプトタグはあるが window.instgrm がまだない場合（読み込み中）
            // ポーリングしてチェック
            const interval = setInterval(() => {
                if (window.instgrm) {
                    setIsScriptLoaded(true)
                    clearInterval(interval)
                }
            }, 100)
            return () => clearInterval(interval)
        }
    }, [])

    // 店舗が変更されたらInstagram埋め込みを再処理
    useEffect(() => {
        // cafe.permalink（軽量データ）または detailedCafe.permalink（詳細データ）があれば処理開始
        const permalink = cafe.permalink || detailedCafe?.permalink

        if (permalink && isScriptLoaded && window.instgrm) {
            setIsEmbedLoaded(false) // 再処理開始時に未ロード状態にする
            setEmbedFailed(false)

            // DOMの更新を待ってから処理
            requestAnimationFrame(() => {
                if (window.instgrm) {
                    window.instgrm.Embeds.process()
                }
            })
        }
    }, [cafe, detailedCafe, isScriptLoaded])

    // iframeの生成と読み込み完了を監視
    useEffect(() => {
        const container = embedContainerRef.current
        const permalink = cafe.permalink || detailedCafe?.permalink
        if (!container || !permalink) return

        // 埋め込みが実際に表示できているかを高さで判定する下限値(px)。
        // 年齢制限・削除・非公開などで中身が出ない場合、iframe が無い/極端に低いため
        // これを下回ったらサムネイルへフォールバックする。
        const MIN_EMBED_HEIGHT = 200

        // 完了確定は一度だけ。load を取りこぼしても無限スピナーにしない。
        let done = false
        let evalTimer: ReturnType<typeof setTimeout> | undefined
        const evaluateEmbed = () => {
            const iframe = container.querySelector('iframe') as HTMLIFrameElement | null
            // Instagram のリサイズ(postMessage)後に測るため、markLoaded から少し遅らせて呼ぶ
            if (!iframe || iframe.offsetHeight < MIN_EMBED_HEIGHT) {
                setEmbedFailed(true)
            }
        }
        const markLoaded = () => {
            if (done) return
            done = true
            setIsEmbedLoaded(true)
            // 表示反映後に高さを見て、埋め込めていなければフォールバック
            evalTimer = setTimeout(evaluateEmbed, 1200)
        }

        const watchIframe = (iframe: HTMLIFrameElement) => {
            // load 監視に加え、既に読み込み済み（load 取りこぼし）にも備える
            iframe.addEventListener('load', markLoaded)
        }

        // process() が先行して既に iframe を生成しているケースを拾う
        // （隣のカードの process() で作られる等のレース対策）
        const existing = container.querySelector('iframe')
        if (existing) watchIframe(existing as HTMLIFrameElement)

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'IFRAME') {
                        watchIframe(node as HTMLIFrameElement)
                        observer.disconnect()
                    }
                })
            })
        })

        observer.observe(container, { childList: true, subtree: true })

        // 保険: load を取りこぼしても一定時間で必ず表示に切り替える（無限スピナー防止）
        const fallback = setTimeout(markLoaded, 4000)

        return () => {
            observer.disconnect()
            clearTimeout(fallback)
            if (evalTimer) clearTimeout(evalTimer)
        }
    }, [cafe, detailedCafe])

    const imgSrc = detailedCafe
        ? detailedCafe.media_url ?? ""
        : cafe.media_url ?? ""

    const permalink = cafe.permalink || detailedCafe?.permalink

    // 画面サイズを監視
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)

        return () => {
            window.removeEventListener('resize', checkIsMobile)
        }
    }, [])

    // クリックで展開/折りたたみ
    const handleToggle = useCallback(() => {
        if (isClosing) return // アニメーション中は操作を無効化

        if (isExpanded) {
            // 閉じる際のアニメーション
            setIsClosing(true)
            // アニメーション完了後に状態を更新
            setTimeout(() => {
                setIsExpanded(false)
                setIsClosing(false)
            }, 350) // アニメーション時間に合わせる
        } else {
            // 開く際はすぐに展開
            setIsExpanded(true)
            setHasBeenExpanded(true)

            // スライドを開く際にスクロールを一番上にリセット
            setTimeout(() => {
                if (infoDetailRef.current) {
                    infoDetailRef.current.scrollTop = 0
                    infoDetailRef.current.scrollTo(0, 0)
                }
            }, 0)
        }
    }, [isExpanded, isClosing])

    // 閉じるボタンの処理
    const handleClose = useCallback(() => {
        if (isClosing) return // アニメーション中は操作を無効化

        if (isMobile) {
            // スマホ版では展開状態から折りたたみ状態に戻す
            if (isExpanded) {
                setIsClosing(true)
                setTimeout(() => {
                    setIsExpanded(false)
                    setIsClosing(false)
                }, 350) // アニメーション完了後に折りたたみ状態に
            }
        } else {
            // デスクトップ版では完全に閉じる
            if (onClose) {
                onClose()
            }
        }
    }, [isClosing, isExpanded, isMobile, onClose])

    return (
        <aside className={`info ${isExpanded ? 'info--expanded' : 'info--collapsed'} ${isClosing ? 'info--closing' : ''}`}>
            {/* スマホ版:下部に固定表示される簡易情報 */}
            <div className="info__preview" onClick={handleToggle}>
                {!hasBeenExpanded && <img src="/tap.png" className="info__preview-tap" alt="tap" />}
                <div className="info__preview-content">
                    <h3 className="info__preview-title">{cafe.store_name ?? "—"}</h3>
                    <p className="info__preview-address">{cafe.address ?? "—"}</p>
                </div>
            </div>

            {/* 全画面表示される詳細情報 */}
            <div className="info__detail" ref={infoDetailRef}>
                <div className="info__header">
                    {onToggleFavorite && (
                        <button
                            type="button"
                            className={`info__favorite-button${isFavorite ? " is-active" : ""}`}
                            onClick={onToggleFavorite}
                            aria-pressed={isFavorite}
                            aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに保存"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            {isFavorite ? "お気に入り済み" : "お気に入りに保存"}
                        </button>
                    )}
                    {onClose && (
                        <button className="info__close" onClick={handleClose} aria-label="閉じる">
                            ×
                        </button>
                    )}
                </div>

                <div className="info__body">
                    {/* Instagram埋め込み。年齢制限・削除等で表示できない場合はサムネイルへフォールバック */}
                    {permalink && !embedFailed ? (
                        <div
                            key={permalink}
                            className="info__instagram-embed"
                            ref={embedContainerRef}
                        >
                            {!isEmbedLoaded && (
                                <div className="info__embed-loading">
                                    {cafe.media_url && (
                                        <img
                                            src={cafe.media_url}
                                            alt={cafe.store_name ?? "cafe"}
                                            className="info__embed-placeholder-img"
                                            onError={(e) => {
                                                ;(e.currentTarget as HTMLImageElement).style.display = "none"
                                            }}
                                        />
                                    )}
                                    <div className="info__embed-spinner-overlay">
                                        <div className="info__spinner"></div>
                                    </div>
                                </div>
                            )}
                            <blockquote
                                className="instagram-media"
                                data-instgrm-captioned
                                data-instgrm-permalink={permalink}
                                data-instgrm-version="14"
                                style={{
                                    background: '#FFF',
                                    border: 0,
                                    borderRadius: '3px',
                                    boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
                                    margin: '1px auto',
                                    maxWidth: '540px',
                                    minWidth: '326px',
                                    padding: 0,
                                    width: 'calc(100% - 2px)',
                                    display: isEmbedLoaded ? 'block' : 'none' // ロード完了まで非表示
                                }}
                            >
                            </blockquote>
                        </div>
                    ) : permalink && embedFailed ? (
                        // 埋め込みが表示できない投稿はサムネイル＋Instagramリンクで代替
                        <a
                            className="info__embed-fallback"
                            href={permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {imgSrc ? (
                                <img
                                    className="info__embed-fallback-img"
                                    src={imgSrc}
                                    alt={cafe.store_name ?? "cafe"}
                                    loading="lazy"
                                    onError={(e) => {
                                        ;(e.currentTarget as HTMLImageElement).src = "/icon.jpg"
                                    }}
                                />
                            ) : (
                                <div className="info__embed-fallback-noimg" />
                            )}
                        </a>
                    ) : imgSrc && (
                        <img
                            className="info__image"
                            src={imgSrc}
                            alt={cafe.store_name ?? "cafe"}
                            loading="lazy"
                            onError={(e) => {
                                // 画像取得に失敗したら非表示にする簡易処理
                                (e.currentTarget as HTMLImageElement).style.display = "none"
                            }}
                        />
                    )}

                    {/* 埋め込みがない場合は即座に表示、ある場合は読み込み完了まで非表示 */}
                    {(!(cafe.permalink || detailedCafe?.permalink) || isEmbedLoaded) && (
                        <div className="info__details">
                            <h4 className="info__section-title">基本情報</h4>
                            <dl className="info__details-list">
                                <div className="info__detail-row">
                                    <dt>店名</dt>
                                    <dd>
                                        <div className="info__text-with-copy">
                                            <span>{cafe.store_name ?? "—"}</span>
                                            {cafe.store_name && <CopyButton text={cafe.store_name} />}
                                        </div>
                                    </dd>
                                </div>
                                <div className="info__detail-row">
                                    <dt>住所</dt>
                                    <dd>
                                        <div className="info__text-with-copy">
                                            <span>{cafe.address ?? "—"}</span>
                                            {cafe.address && <CopyButton text={cafe.address} />}
                                        </div>
                                    </dd>
                                </div>
                                <div className="info__detail-row">
                                    <dt>営業時間</dt>
                                    <dd>
                                        {detailedCafe?.opening_hours
                                            ? detailedCafe.opening_hours.split('\n').map((line, i) => (
                                                <div key={i}>{line}</div>
                                            ))
                                            : "店舗に直接お問い合わせください"
                                        }
                                    </dd>
                                </div>

                            </dl>

                            <p className="info__note">
                                ※上記は取材時の情報に基づきます。正確な情報は店舗に直接お問い合わせください。
                                {detailedCafe?.timestamp && (
                                    <span>
                                        (取材日:{new Date(detailedCafe.timestamp).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')})
                                    </span>
                                )}

                                <a
                                    className="info__correction-link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href="https://kadaiinfo.com/contact"
                                >
                                    情報修正のご依頼はこちら
                                </a>
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </aside >
    )
}

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <button className="info__copy-button" onClick={handleCopy} aria-label="コピー">
            {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            )}
        </button>
    );
};
