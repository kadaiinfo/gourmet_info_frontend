// 曜日マッピング（getDay() の戻り値 0=日 〜 6=土 に対応）
const DAY_JA = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// "H:MM" 文字列を分数（0時からの分）に変換
function toMinutes(hourStr: string, minuteStr: string, meridiem?: string): number {
  let h = parseInt(hourStr)
  const m = parseInt(minuteStr)
  if (meridiem) {
    const mer = meridiem.toUpperCase()
    if (mer === 'AM' && h === 12) h = 0
    if (mer === 'PM' && h !== 12) h += 12
  }
  return h * 60 + m
}

// "H:MM AM/PM" のような時刻文字列から分を返す（AM/PMなしは24h扱い）
function parseTimeStr(timeStr: string, fallbackMeridiem?: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!match) return null
  const meridiem = match[3] || fallbackMeridiem
  return toMinutes(match[1], match[2], meridiem)
}

/**
 * opening_hours 文字列と現在時刻から営業中かどうかを判定する。
 * - true:  営業中
 * - false: 閉店中（定休日含む）
 * - null:  判定不能（opening_hours が null / パース失敗）
 */
export function isOpenNow(opening_hours: string | null | undefined): boolean | null {
  if (!opening_hours) return null

  const now = new Date()
  const dayOfWeek = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const todayJa = DAY_JA[dayOfWeek]
  const todayEn = DAY_EN[dayOfWeek]

  const lines = opening_hours.split('\n')
  const todayLine = lines.find(line =>
    line.startsWith(todayJa + ':') || line.startsWith(todayEn + ':')
  )

  if (!todayLine) return null

  // 定休日 / Closed
  if (todayLine.includes('定休日') || /closed/i.test(todayLine)) return false

  // 24時間営業
  if (todayLine.includes('24 時間営業') || /open 24 hours/i.test(todayLine)) return true

  // 曜日部分を除いた時間文字列を抽出
  const colonIdx = todayLine.indexOf(':')
  if (colonIdx === -1) return null
  const timePart = todayLine.slice(colonIdx + 1).trim()

  // "start – end" をパース。区切りはハイフン(-) または endash(–)
  const rangeMatch = timePart.match(
    /^(\d{1,2}:\d{2})(?:\s*(AM|PM))?\s*[-–]\s*(\d{1,2}:\d{2})(?:\s*(AM|PM))?$/i
  )
  if (!rangeMatch) return null

  const [, startTime, startMer, endTime, endMer] = rangeMatch

  // 末尾の AM/PM が両方に適用されるケース（例: "6:30 – 10:30 AM"）
  const effectiveStartMer = startMer || (endMer && !startMer ? endMer : undefined)
  const effectiveEndMer = endMer || undefined

  const startMinutes = parseTimeStr(startTime, effectiveStartMer)
  const endMinutes = parseTimeStr(endTime, effectiveEndMer)

  if (startMinutes === null || endMinutes === null) return null

  // 日をまたぐ営業時間（例: 22:00 – 2:00）
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}
