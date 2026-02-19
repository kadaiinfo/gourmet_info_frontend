import cafe_data from "../data/cafe_data_kv.json"
import { normalizeText } from "../utils/textNormalization"
import { hiraganaToRomaji } from "../utils/romajiUtils"

// APIから取得するデータの型定義
type CafeDataFromAPI = {
    id: string
    store_name?: string | null
    address?: string | null
    lat: number
    lng: number
    caption?: string | null
    media_url?: string | null
    thumbnail_url?: string | null
    permalink?: string | null
    username?: string | null
    media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string
    like_count?: number
    comments_count?: number
    timestamp?: string
    opening_hours?: string | null
    place_id?: string | null
    formatted_address?: string | null
    phone_number?: string | null
    website?: string | null
    open_now?: boolean | null
    rating?: number | null
    user_ratings_total?: number | null
    categories?: string[] | null
    google_maps_uri?: string | null
}

// 軽量データ構造（地図表示用に最小限のフィールドのみの型を定義）
export type Cafe = {
    id: string
    lat: number
    lng: number
    store_name: string | null
    address: string | null
    media_url: string | null  // サムネイル用
    permalink: string | null // 埋め込み用リンク（高速化のため追加）
    timestamp?: string // ソート用
    opening_hours?: string | null // 営業時間フィルター用
}

// 詳細データ構造（Informationパネル用の型を定義）
export type DetailedCafe = {
    id: string
    store_name?: string | null
    address?: string | null
    caption?: string | null
    media_url?: string | null
    thumbnail_url?: string | null
    permalink?: string | null
    embed_html?: string | null
    username?: string | null
    lat: number
    lng: number
    media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string
    like_count?: number
    comments_count?: number
    timestamp?: string
    opening_hours?: string | null
    place_id?: string | null
    formatted_address?: string | null
    phone_number?: string | null
    website?: string | null
    open_now?: boolean | null
    rating?: number | null
    user_ratings_total?: number | null
    categories?: string[] | null
    google_maps_uri?: string | null
}

// APIから取得したデータのキャッシュ
let apiDataCache: CafeDataFromAPI[] | null = null
let cafeDataCache: Cafe[] | null = null

// 開発環境かどうかを判定
const isDevelopment = import.meta.env.MODE === 'development'

// APIからカフェデータを取得（開発環境ではローカルデータを使用）
const fetchCafeDataFromAPI = async (): Promise<CafeDataFromAPI[]> => {
    if (apiDataCache) {
        return apiDataCache
    }

    // 開発環境ではローカルデータを使用
    if (isDevelopment) {
        console.log('Using local data in development mode')
        apiDataCache = cafe_data as CafeDataFromAPI[]
        return apiDataCache
    }

    // 本番環境ではAPI(Cloudflare KV)から取得
    try {
        const response = await fetch('/api/fetch_cafedata')
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: CafeDataFromAPI[] = await response.json()
        apiDataCache = data
        return data
    } catch (error) {
        console.error('Failed to fetch cafe data:', error)
        // APIが失敗した場合もローカルデータにフォールバック
        console.warn('Falling back to local data')
        apiDataCache = cafe_data as CafeDataFromAPI[]
        return apiDataCache
    }
}

// 軽量データを生成
const generateCafeData = (apiData: CafeDataFromAPI[]): Cafe[] => {
    return apiData
        .filter(cafe => cafe.media_type !== "VIDEO") // リール動画を除外
        .map(cafe => ({
            id: cafe.id,
            lat: cafe.lat,
            lng: cafe.lng,
            store_name: cafe.store_name ?? null,
            address: cafe.address ?? null,
            media_url: cafe.media_url ?? null,
            permalink: cafe.permalink ?? null,
            timestamp: cafe.timestamp,
            opening_hours: cafe.opening_hours ?? null
        }))
}

// 軽量データを取得
export const getCafeData = async (): Promise<Cafe[]> => {
    if (cafeDataCache) {
        return cafeDataCache
    }

    const apiData = await fetchCafeDataFromAPI()
    const cafes = generateCafeData(apiData)

    // 日付順（新しい順）にソート
    cafes.sort((a, b) => {
        if (!a.timestamp) return 1
        if (!b.timestamp) return -1
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    cafeDataCache = cafes
    return cafeDataCache
}

// 詳細データを取得
export const getCafeDetail = async (id: string): Promise<DetailedCafe | null> => {
    const apiData = await fetchCafeDataFromAPI()
    const cafe = apiData.find(cafe => cafe.id === id)
    return cafe || null
}

// 検索機能
export const searchCafes = async (query: string): Promise<Cafe[]> => {
    const cafeData = await getCafeData()

    if (!query.trim()) {
        return cafeData
    }

    const normalizedQuery = normalizeText(query)
    const romajiQuery = hiraganaToRomaji(normalizedQuery)

    return cafeData.filter(cafe => {
        const normalizedStoreName = normalizeText(cafe.store_name || "")
        const normalizedAddress = normalizeText(cafe.address || "")
        return normalizedStoreName.includes(normalizedQuery) ||
            normalizedAddress.includes(normalizedQuery) ||
            normalizedStoreName.toLowerCase().includes(romajiQuery) // ローマ字検索対応
    })
}
