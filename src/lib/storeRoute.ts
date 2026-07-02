// 店舗詳細のディープリンク /store/:id のパスユーティリティ。
// SPA 側のルーティングと共有URLの生成で同じ形式を使う
// （サーバー側の functions/store/[id].ts も同じパス形式を前提にしている）。
export const STORE_PATH_PREFIX = "/store/"

export const storePath = (id: string): string =>
    `${STORE_PATH_PREFIX}${encodeURIComponent(id)}`

export const getStoreIdFromPath = (pathname: string): string | null => {
    if (!pathname.startsWith(STORE_PATH_PREFIX)) return null
    const raw = pathname.slice(STORE_PATH_PREFIX.length)
    // 空文字やサブパス付き（/store/x/y）は店舗URLとして扱わない
    if (!raw || raw.includes("/")) return null
    try {
        return decodeURIComponent(raw)
    } catch {
        return null
    }
}
