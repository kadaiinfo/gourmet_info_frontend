import { useEffect, useRef, useState } from "react"
import { useAuth, useClerk } from "@clerk/clerk-react"
import {
  SIGN_IN_PATH,
  VERIFY_CODE_PATH,
  clearPendingAuth,
  getPendingAuth,
  isAuthPath,
  isCodeEntryPath,
} from "../lib/authRoute"
import { navigate } from "../lib/navigation"

type ClerkClient = ReturnType<typeof useClerk>["client"]

// メール認証コードの入力待ちで止まっている手続きがあるか
export const getPendingCodeStep = (client: ClerkClient): "sign-in" | "sign-up" | null => {
  const signIn = client?.signIn
  if (
    signIn?.status === "needs_first_factor" &&
    signIn.firstFactorVerification?.status === "unverified" &&
    signIn.firstFactorVerification?.strategy === "email_code"
  ) {
    return "sign-in"
  }
  const signUp = client?.signUp
  if (
    signUp?.status === "missing_requirements" &&
    signUp.verifications?.emailAddress?.status === "unverified" &&
    signUp.verifications?.emailAddress?.strategy === "email_code"
  ) {
    return "sign-up"
  }
  return null
}

// 起動時（ページ読み込み時）に、中断したコード入力を再開させる。
// - ホーム画面アプリ（PWA）はアプリ切り替えで再起動されると start_url（/）から開き直すため、
//   ログイン開始の記録（authPending）があればコード入力ページへ移動する
// - コード入力ステップの URL のまま再読み込みされた場合も同様
// 再開には自前のコード入力ページ（/verify-code）を使う（Clerk 画面はコードを再送信するため）。
//
// 戻り値: 起動時の判定が終わったか。終わるまではコード入力系の URL で Clerk 画面を出さない。
export function useResumePendingAuth(): boolean {
  const clerk = useClerk()
  const { isLoaded, isSignedIn } = useAuth()
  // 判定に使うのは「ページを読み込んだ時点の URL」
  const initialPathRef = useRef(window.location.pathname)
  const handledRef = useRef(false)
  const [resolved, setResolved] = useState(() => !isCodeEntryPath(window.location.pathname))

  useEffect(() => {
    if (!isLoaded) return

    // ログインが完了したら再開用の記録は不要
    if (isSignedIn) {
      clearPendingAuth()
      handledRef.current = true
      setResolved(true)
      return
    }

    // 判定は起動時の1回だけ（アプリ内の通常の遷移は Clerk に任せる）
    if (handledRef.current) return
    handledRef.current = true

    const initialPath = initialPathRef.current
    const step = getPendingCodeStep(clerk.client)
    const onCodeEntryPath = isCodeEntryPath(initialPath)
    const resumeFromTop = !isAuthPath(initialPath) && getPendingAuth() !== null

    if (step && (onCodeEntryPath || resumeFromTop)) {
      navigate(VERIFY_CODE_PATH, { replace: true })
    } else if (onCodeEntryPath) {
      // 再開できる手続きが無いのにコード入力の URL にいる → ログインの最初から
      navigate(SIGN_IN_PATH, { replace: true })
    } else if (resumeFromTop) {
      // 期限切れ・別の手段で完了など
      clearPendingAuth()
    }
    setResolved(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  return resolved
}
