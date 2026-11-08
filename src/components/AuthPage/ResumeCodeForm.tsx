import { useEffect, useState, type FormEvent } from "react"
import { useClerk, useSignIn, useSignUp } from "@clerk/clerk-react"
import { SIGN_IN_PATH, SIGN_UP_PATH, clearPendingAuth, getAuthReturnTo } from "../../lib/authRoute"
import { navigate } from "../../lib/navigation"
import { getPendingCodeStep } from "../../hooks/useResumePendingAuth"

// 再送信できるようになるまでの待ち時間（Clerk の画面に合わせる）
const RESEND_COOLDOWN_SEC = 30

// Clerk API のエラーコード → 表示する日本語メッセージ
const errorMessage = (err: unknown): string => {
  const code = (err as { errors?: { code?: string }[] })?.errors?.[0]?.code
  switch (code) {
    case "form_code_incorrect":
      return "コードが正しくありません。メールに届いた6桁のコードを確認してください。"
    case "verification_expired":
      return "コードの有効期限が切れました。「コードを再送信」から新しいコードを受け取ってください。"
    case "verification_failed":
    case "too_many_requests":
      return "試行回数が多すぎます。しばらく待ってから、最初からやり直してください。"
    default:
      return "確認できませんでした。もう一度お試しください。"
  }
}

// アプリが再読み込みされた後に、メール認証コードの入力だけを再開するフォーム。
// Clerk の標準画面は表示のたびにコードを再送信してしまうため、ここでは送信済みの
// コードをそのまま入力してもらい、再送信はユーザーが明示的に押したときだけ行う。
export default function ResumeCodeForm() {
  const clerk = useClerk()
  const { signIn, setActive: setActiveSignIn } = useSignIn()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const step = getPendingCodeStep(clerk.client)

  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // 再開できる手続きが無くなった（完了・期限切れ等）ならログインの最初へ
  useEffect(() => {
    if (!step && !submitting) navigate(SIGN_IN_PATH, { replace: true })
  }, [step, submitting])

  if (!step) return null

  const email =
    step === "sign-in"
      ? signIn?.identifier ?? null
      : signUp?.emailAddress ?? null

  const finish = async (sessionId: string | null, setActive: typeof setActiveSignIn | undefined) => {
    const returnTo = getAuthReturnTo()
    clearPendingAuth()
    if (sessionId && setActive) await setActive({ session: sessionId })
    navigate(returnTo, { replace: true })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = code.replace(/\s/g, "")
    if (!trimmed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      if (step === "sign-in" && signIn) {
        const result = await signIn.attemptFirstFactor({ strategy: "email_code", code: trimmed })
        if (result.status === "complete") {
          await finish(result.createdSessionId, setActiveSignIn)
        } else if (result.status === "needs_second_factor") {
          navigate(`${SIGN_IN_PATH}/factor-two`, { replace: true })
        } else {
          setError(errorMessage(null))
        }
      } else if (step === "sign-up" && signUp) {
        const result = await signUp.attemptEmailAddressVerification({ code: trimmed })
        if (result.status === "complete") {
          await finish(result.createdSessionId, setActiveSignUp)
        } else {
          // 他に必要な項目がある場合は Clerk の続きの画面へ
          navigate(`${SIGN_UP_PATH}/continue`, { replace: true })
        }
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError(null)
    try {
      if (step === "sign-in" && signIn) {
        const factor = signIn.supportedFirstFactors?.find((f) => f.strategy === "email_code")
        if (!factor || !("emailAddressId" in factor)) throw new Error("no email factor")
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId })
      } else if (step === "sign-up" && signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      }
      setResent(true)
      setCooldown(RESEND_COOLDOWN_SEC)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleRestart = () => {
    navigate(step === "sign-up" ? SIGN_UP_PATH : SIGN_IN_PATH, { replace: true })
  }

  return (
    <form className="resume-code" onSubmit={handleSubmit}>
      <h2 className="resume-code__title">メールを確認</h2>
      <p className="resume-code__text">
        {email ? <><strong>{email}</strong> に</> : null}
        お送りした確認コードを入力してください。
      </p>

      <input
        className="resume-code__input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        placeholder="6桁のコード"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-label="確認コード"
        autoFocus
      />

      {error && <p className="resume-code__error" role="alert">{error}</p>}
      {resent && !error && <p className="resume-code__info">新しいコードを送信しました。最新のメールのコードを入力してください。</p>}

      <button className="resume-code__submit" type="submit" disabled={submitting || code.trim() === ""}>
        {submitting ? "確認中…" : "続ける"}
      </button>

      <button className="resume-code__link" type="button" onClick={handleResend} disabled={cooldown > 0}>
        {cooldown > 0 ? `コードを再送信（${cooldown}秒後に押せます）` : "コードが届かない場合は再送信"}
      </button>
      <button className="resume-code__link" type="button" onClick={handleRestart}>
        別のメールアドレスで最初からやり直す
      </button>
    </form>
  )
}
