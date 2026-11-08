import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { jaJP } from '@clerk/localizations'
import './index.css'
import App from './App.tsx'
import { navigate } from './lib/navigation.ts'
import { SIGN_IN_PATH, SIGN_UP_PATH } from './lib/authRoute.ts'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// 再送信ボタンの横に出る「(30)」のカウントが「コード入力の制限時間」に見えてしまうため、
// 再送信の待ち時間だと分かる文言にする（コード自体の有効期限は Clerk の既定で10分）
const RESEND_LABEL = 'コードが届かない場合は再送信'
const localization = {
  ...jaJP,
  signIn: {
    ...jaJP.signIn,
    emailCode: { ...jaJP.signIn?.emailCode, resendButton: RESEND_LABEL },
  },
  signUp: {
    ...jaJP.signUp,
    emailCode: { ...jaJP.signUp?.emailCode, resendButton: RESEND_LABEL },
  },
}

if (!PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY が設定されていません')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={localization}
      // ログイン/アカウント作成は専用ページ（AuthPage）で表示する
      signInUrl={SIGN_IN_PATH}
      signUpUrl={SIGN_UP_PATH}
      // Clerkの内部遷移(ログインのステップ移動・完了後の遷移等)をクライアントサイド化し、
      // ページ全体のリロードを回避する。navigate は popstate を発火して画面にも反映させる
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      appearance={{
        variables: {
          colorPrimary: '#70523E',
          fontFamily: '"Noto Sans JP", sans-serif',
          borderRadius: '10px',
        },
        elements: {
          // タイトル(「KADAI INFOにサインイン」)は残し、
          // サブタイトル(「お帰りなさい！続行するにはサインインしてください」)のみ非表示
          headerSubtitle: { display: 'none' },
          // 再送信ボタンは Clerk が文言の後ろに「 (30)」の待ち秒数を直接付けて表示する。
          // 秒数は不要なので元の文字を隠し、同じ文言を秒数なしで表示する
          // （待ち時間中にボタンが押せない挙動はそのまま）
          formResendCodeLink: {
            fontSize: 0,
            '&::before': {
              content: `"${RESEND_LABEL}"`,
              fontSize: '12px',
              lineHeight: '16px',
            },
          },
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
