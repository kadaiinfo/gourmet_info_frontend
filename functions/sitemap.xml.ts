/// <reference types="@cloudflare/workers-types" />
import { getPublishedStores, storeUrl, SITE_ORIGIN, type StoresEnv } from "./_lib/stores"

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// GET /sitemap.xml
// 店舗ごとのディープリンク(/store/:id)を検索エンジンに知らせるサイトマップ。
// KV の店舗データから動的に生成する。
export const onRequestGet: PagesFunction<StoresEnv> = async (ctx) => {
  try {
    const stores = await getPublishedStores(ctx.env)

    const entries = [
      `<url><loc>${SITE_ORIGIN}/</loc></url>`,
      ...stores.map((s) => {
        // timestamp は ISO 形式なので日付部分だけを lastmod に使う
        const lastmod = s.timestamp ? `<lastmod>${s.timestamp.slice(0, 10)}</lastmod>` : ""
        return `<url><loc>${escapeXml(storeUrl(s.id))}</loc>${lastmod}</url>`
      }),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`

    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "max-age=3600, stale-while-revalidate=86400",
      },
    })
  } catch {
    return new Response("internal error", { status: 500 })
  }
}
