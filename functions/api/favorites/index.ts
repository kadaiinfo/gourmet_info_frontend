/// <reference types="@cloudflare/workers-types" />
import { getAuthUserId, jsonResponse, unauthorized, type Env } from "../_lib/auth"

// GET /api/favorites — ログイン中ユーザーのお気に入り cafe_id 一覧
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const userId = await getAuthUserId(ctx.request, ctx.env)
  if (!userId) return unauthorized()

  try {
    const result = await ctx.env.DB.prepare(
      "SELECT cafe_id FROM favorites WHERE clerk_user_id = ?1 ORDER BY created_at DESC"
    )
      .bind(userId)
      .all<{ cafe_id: string }>()

    const cafeIds = (result.results ?? []).map((row) => row.cafe_id)
    return jsonResponse({ cafeIds })
  } catch (e) {
    return jsonResponse({ error: "internal error" }, 500)
  }
}

// POST /api/favorites — お気に入り追加（冪等）。body: { cafeId: string }
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = await getAuthUserId(ctx.request, ctx.env)
  if (!userId) return unauthorized()

  let cafeId: unknown
  try {
    const body = (await ctx.request.json()) as { cafeId?: unknown }
    cafeId = body?.cafeId
  } catch {
    return jsonResponse({ error: "invalid body" }, 400)
  }

  if (typeof cafeId !== "string" || cafeId.length === 0) {
    return jsonResponse({ error: "cafeId required" }, 400)
  }

  try {
    await ctx.env.DB.prepare(
      "INSERT OR IGNORE INTO favorites (clerk_user_id, cafe_id, created_at) VALUES (?1, ?2, ?3)"
    )
      .bind(userId, cafeId, new Date().toISOString())
      .run()

    return jsonResponse({ ok: true, cafeId }, 201)
  } catch (e) {
    return jsonResponse({ error: "internal error" }, 500)
  }
}
