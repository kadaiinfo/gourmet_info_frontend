/// <reference types="@cloudflare/workers-types" />
import { getAuthUserId, jsonResponse, unauthorized, type Env } from "../_lib/auth"

// DELETE /api/favorites/:cafe_id — お気に入り解除（冪等）
export const onRequestDelete: PagesFunction<Env, "cafe_id"> = async (ctx) => {
  const userId = await getAuthUserId(ctx.request, ctx.env)
  if (!userId) return unauthorized()

  const cafeId = ctx.params.cafe_id
  if (typeof cafeId !== "string" || cafeId.length === 0) {
    return jsonResponse({ error: "cafeId required" }, 400)
  }

  try {
    await ctx.env.DB.prepare(
      "DELETE FROM favorites WHERE clerk_user_id = ?1 AND cafe_id = ?2"
    )
      .bind(userId, cafeId)
      .run()

    return jsonResponse({ ok: true, cafeId })
  } catch (e) {
    return jsonResponse({ error: "internal error" }, 500)
  }
}
