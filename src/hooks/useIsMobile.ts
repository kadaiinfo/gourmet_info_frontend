import { useEffect, useState } from "react"

// 既存コンポーネント（Information など）と同じ 768px 閾値でスマホ判定
const MOBILE_MAX_WIDTH = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_MAX_WIDTH
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_MAX_WIDTH)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return isMobile
}
