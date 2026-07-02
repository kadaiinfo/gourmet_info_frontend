/// <reference types="@cloudflare/workers-types" />
import {
  getPublishedStores,
  storeUrl,
  SITE_ORIGIN,
  type StoresEnv,
  type StoreRecord,
} from "../_lib/stores"

type Env = StoresEnv & { ASSETS: Fetcher }

const SITE_NAME = "グルメインフォ"
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/OGP.png`

// GET /store/:id
// SPA の index.html に店舗ごとのタイトル・OGP・JSON-LD を差し込んで返す。
// SNS/LINE のクローラーは JS を実行しないため、メタタグはサーバー側で書き換える必要がある。
// ブラウザ側では SPA がこの URL を解釈して該当店舗の詳細パネルを開く。
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const rawId = String(ctx.params.id ?? "")
  let id: string
  try {
    id = decodeURIComponent(rawId)
  } catch {
    id = rawId
  }

  let store: StoreRecord | undefined
  let kvOk = true
  try {
    store = (await getPublishedStores(ctx.env)).find((s) => s.id === id)
  } catch {
    kvOk = false
  }

  // SPA のシェル（ビルド済み index.html）を静的アセットから取得
  const shell = await ctx.env.ASSETS.fetch(new URL("/", ctx.request.url))

  if (!store) {
    // KV 障害時は既定の OGP のまま SPA を返す（共有済みリンクを死なせない）
    if (!kvOk) return shell
    // 存在しない店舗ID（非公開化・削除済みなど）はトップへ
    return Response.redirect(new URL("/", ctx.request.url).toString(), 302)
  }

  const name = store.store_name ?? SITE_NAME
  const title = `${name} | ${SITE_NAME}`
  const details = [
    store.address ? `住所: ${store.address}` : null,
    store.categories?.length ? `ジャンル: ${store.categories.join("・")}` : null,
  ].filter(Boolean)
  const description = `鹿児島の「${name}」を地図でチェック。${details.length ? `${details.join(" / ")}。` : ""}鹿大生が紹介する鹿児島グルメ。`
  // Instagram CDN の URL は有効期限があるため、自ドメインのプロキシ(/api/og_image/:id)を
  // og:image に使う（クローラーがいつ取得しても安定して画像を返せる）
  const ogImage = store.media_url
    ? `${SITE_ORIGIN}/api/og_image/${encodeURIComponent(store.id)}`
    : DEFAULT_OG_IMAGE
  const canonical = storeUrl(store.id)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
    url: canonical,
    image: ogImage,
    ...(store.address ? { address: store.address } : {}),
    ...(typeof store.lat === "number" && typeof store.lng === "number"
      ? { geo: { "@type": "GeoCoordinates", latitude: store.lat, longitude: store.lng } }
      : {}),
    ...(store.categories?.length ? { servesCuisine: store.categories } : {}),
  }
  // script タグ内で HTML として解釈されないようエスケープ
  const jsonLdText = JSON.stringify(jsonLd).replace(/</g, "\\u003c")

  const setContent = (value: string) => ({
    element(el: Element) {
      el.setAttribute("content", value)
    },
  })

  const response = new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(title)
      },
    })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[property="og:url"]', setContent(canonical))
    .on('meta[property="og:image"]', setContent(ogImage))
    .on('meta[name="twitter:image"]', setContent(ogImage))
    .on("head", {
      element(el) {
        el.append(`<link rel="canonical" href="${canonical}">`, { html: true })
        el.append(`<script type="application/ld+json">${jsonLdText}</script>`, { html: true })
      },
    })
    .transform(new Response(shell.body, shell))

  // 店舗データは1日1〜2回しか変わらない。Instagram画像URLも毎朝更新されるため
  // edge キャッシュは1時間に留める
  response.headers.set("cache-control", "public, max-age=300, s-maxage=3600")
  return response
}
