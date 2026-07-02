/// <reference types="@cloudflare/workers-types" />

// KV(cafe-map) の店舗データを functions 間で共通利用するためのヘルパー

export type StoresEnv = {
  "cafe-map": KVNamespace
}

export type StoreRecord = {
  id: string
  store_name?: string | null
  address?: string | null
  lat?: number
  lng?: number
  media_url?: string | null
  media_type?: string
  timestamp?: string
  opening_hours?: string | null
  categories?: string[] | null
}

export const SITE_ORIGIN = "https://kadaiinfo-gourmet.com"

// 店舗詳細ページの正規URL（SPA 側 src/lib/storeRoute.ts と同じパス形式）
export const storeUrl = (id: string) => `${SITE_ORIGIN}/store/${encodeURIComponent(id)}`

// 地図に掲載している店舗一覧（リール動画はフロント同様に除外）
export async function getPublishedStores(env: StoresEnv): Promise<StoreRecord[]> {
  const text = await env["cafe-map"].get("cafe_data_kv.json", { type: "text" })
  if (!text) return []
  const all = JSON.parse(text) as StoreRecord[]
  return all.filter((s) => s.media_type !== "VIDEO")
}
