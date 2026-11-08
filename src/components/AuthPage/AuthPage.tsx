import { SignIn, SignUp } from "@clerk/clerk-react"
import {
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  VERIFY_CODE_PATH,
  clearPendingAuth,
  getAuthReturnTo,
  isSignUpPath,
} from "../../lib/authRoute"
import { navigate } from "../../lib/navigation"
import ResumeCodeForm from "./ResumeCodeForm"
import "./AuthPage.css"

// Google ログインで毎回アカウント選択画面を出す。
// 指定しないと、ブラウザで Google に1アカウントだけログインしている場合に選択画面が出ず、
// 「アカウントを作成」から別アカウントを作りたくても前回のアカウントで自動的に進んでしまう。
const OIDC_PROMPT = "select_account"

type AuthPageProps = {
  pathname: string
  // 起動時のコード入力再開の判定が終わったか（終わるまで Clerk 画面を出さない）
  ready: boolean
}

// ログイン/アカウント作成の専用ページ（地図の上に全面表示）。
// Clerk のパスルーティングで各ステップが URL（/sign-in/factor-one 等）に載るため、
// ページが再読み込みされても同じステップから続けられる。
export default function AuthPage({ pathname, ready }: AuthPageProps) {
  const returnTo = getAuthReturnTo()

  const handleClose = () => {
    clearPendingAuth()
    navigate(returnTo)
  }

  return (
    <div className="auth-page" role="dialog" aria-modal="true" aria-label="ログイン">
      <button type="button" className="auth-page__close" onClick={handleClose} aria-label="閉じる">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        閉じる
      </button>
      <div className="auth-page__content">
        {!ready ? (
          <div className="auth-page__loading" aria-label="読み込み中" />
        ) : pathname === VERIFY_CODE_PATH ? (
          <ResumeCodeForm />
        ) : isSignUpPath(pathname) ? (
          <SignUp
            routing="path"
            path={SIGN_UP_PATH}
            signInUrl={SIGN_IN_PATH}
            fallbackRedirectUrl={returnTo}
            signInFallbackRedirectUrl={returnTo}
            oidcPrompt={OIDC_PROMPT}
          />
        ) : (
          <SignIn
            routing="path"
            path={SIGN_IN_PATH}
            signUpUrl={SIGN_UP_PATH}
            fallbackRedirectUrl={returnTo}
            signUpFallbackRedirectUrl={returnTo}
            oidcPrompt={OIDC_PROMPT}
          />
        )}
      </div>
    </div>
  )
}
