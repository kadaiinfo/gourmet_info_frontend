/// <reference types="@cloudflare/workers-types" />
import { getPublishedStores, type StoresEnv } from "../../_lib/stores"

// GET /api/og_image/:id
// OGP用の店舗サムネイル。Instagram CDN の media_url は有効期限があり
// SNSクローラーが直接参照すると期限切れで画像が出ないことがあるため、
// 自ドメインの安定したURLでプロキシする（KV上の最新 media_url を都度参照）。
const handleRequest: PagesFunction<StoresEnv> = async (ctx) => {
  const rawId = String(ctx.params.id ?? "")
  let id: string
  try {
    id = decodeURIComponent(rawId)
  } catch {
    id = rawId
  }

  // 画像が用意できないときは既定のOGP画像へフォールバック
  const fallback = () =>
    Response.redirect(new URL("/OGP.png", ctx.request.url).toString(), 302)

  try {
    const store = (await getPublishedStores(ctx.env)).find((s) => s.id === id)
    if (!store?.media_url) return fallback()

    const upstream = await fetch(store.media_url, {
      // Instagram CDN への取得結果を edge にキャッシュして負荷と遅延を抑える
      cf: { cacheEverything: true, cacheTtl: 21600 },
    })
    if (!upstream.ok) return fallback()

    const headers = new Headers()
    headers.set("content-type", upstream.headers.get("content-type") ?? "image/jpeg")
    // media_url は毎朝更新されるため、キャッシュは6時間に留める
    headers.set("cache-control", "public, max-age=3600, s-maxage=21600")
    return new Response(upstream.body, { headers })
  } catch {
    return fallback()
  }
}

export const onRequestGet = handleRequest
// HEAD で事前確認してくるクローラーが SPA フォールバック(text/html)を
// 受け取らないよう、HEAD も同じハンドラで処理する（ボディはランタイムが落とす）
export const onRequestHead = handleRequest
