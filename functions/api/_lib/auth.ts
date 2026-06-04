/// <reference types="@cloudflare/workers-types" />
import { verifyToken } from "@clerk/backend"

// Pages Functions の env バインディング型（favorites API 共通）
export interface Env {
  DB: D1Database
  // Clerk セッショントークン検証用。jwtKey(PEM公開鍵)があれば networkless 検証。
  CLERK_JWT_KEY?: string
  CLERK_SECRET_KEY?: string
  // 任意: トークンの azp を検証して横流しを防ぐ（カンマ区切りの許可オリジン）
  CLERK_AUTHORIZED_PARTIES?: string
}

// Authorization ヘッダから Bearer トークンを取り出す
const extractBearer = (request: Request): string | null => {
  const header = request.headers.get("Authorization") || request.headers.get("authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

/**
 * Clerk のセッショントークンを検証し、ユーザーID(sub)を返す。
 * 未認証・検証失敗時は null。
 * jwtKey(PEM公開鍵)があればネットワークI/Oなしで検証する。
 */
export const getAuthUserId = async (request: Request, env: Env): Promise<string | null> => {
  const token = extractBearer(request)
  if (!token) return null

  const authorizedParties = env.CLERK_AUTHORIZED_PARTIES
    ? env.CLERK_AUTHORIZED_PARTIES.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined

  try {
    const payload = await verifyToken(token, {
      jwtKey: env.CLERK_JWT_KEY,
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties,
    })
    return payload.sub ?? null
  } catch (e) {
    return null
  }
}

// 共通レスポンスヘルパ（ユーザー固有データはキャッシュしない）
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
}

export const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })

export const unauthorized = (): Response =>
  jsonResponse({ error: "unauthorized" }, 401)
