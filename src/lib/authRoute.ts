import { navigate } from "./navigation"

// ログイン/アカウント作成は専用ページ（パスルーティング）で表示する。
// モーダルだと手続きの途中経過が URL に残らず、ホーム画面アプリや
// アプリ内ブラウザでメールアプリへ切り替えた際にページが再読み込みされると
// コード入力画面に戻れなくなるため。
export const SIGN_IN_PATH = "/sign-in"
export const SIGN_UP_PATH = "/sign-up"
// 再読み込み後にコード入力だけを再開する自前ページ（Clerk のルート外）。
// Clerk のコード入力画面は表示のたびにコードを再送信するため、
// 再読み込み後にそのまま使うとメールで確認してきたコードが使えなくなる。
export const VERIFY_CODE_PATH = "/verify-code"

// Clerk のメール認証コード入力ステップ（ここで再読み込みされたら自前ページで再開する）
const CODE_STEP_PATHS = [`${SIGN_IN_PATH}/factor-one`, `${SIGN_UP_PATH}/verify-email-address`]

const PENDING_KEY = "authPending"
// コード入力の再開を試みる猶予。Clerk のメール認証コードの有効期限（10分）に合わせる
const PENDING_TTL_MS = 10 * 60 * 1000

type PendingAuth = { startedAt: number; returnTo: string }

const startsWithSegment = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`)

export const isAuthPath = (pathname: string): boolean =>
  startsWithSegment(pathname, SIGN_IN_PATH) ||
  startsWithSegment(pathname, SIGN_UP_PATH) ||
  pathname === VERIFY_CODE_PATH

export const isSignUpPath = (pathname: string): boolean => startsWithSegment(pathname, SIGN_UP_PATH)

// 再読み込み直後に Clerk 画面をそのまま出すとコードが再送信されてしまうパス
export const isCodeEntryPath = (pathname: string): boolean =>
  pathname === VERIFY_CODE_PATH || CODE_STEP_PATHS.includes(pathname)

export const getPendingAuth = (): PendingAuth | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const pending = JSON.parse(raw) as PendingAuth
    if (typeof pending.startedAt !== "number" || Date.now() - pending.startedAt > PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_KEY)
      return null
    }
    return pending
  } catch {
    return null
  }
}

const savePendingAuth = (returnTo: string) => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ startedAt: Date.now(), returnTo }))
  } catch {
    // localStorage が使えない環境では再開機能なしで動作する
  }
}

export const clearPendingAuth = () => {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    // 何もしない
  }
}

// 手続き後に戻る先（ログイン画面を開いた時点の URL）
export const getAuthReturnTo = (): string => getPendingAuth()?.returnTo ?? "/"

// ログイン/アカウント作成ページを開く。開いた時点の URL を戻り先として記録する
export const openAuthPage = (kind: "sign-in" | "sign-up" = "sign-in") => {
  const here = window.location.pathname + window.location.search
  savePendingAuth(isAuthPath(window.location.pathname) ? getAuthReturnTo() : here)
  navigate(kind === "sign-in" ? SIGN_IN_PATH : SIGN_UP_PATH)
}
