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
function parseTimeStr(timeStr: string, meridiem?: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!match) return null
  const mer = match[3] || meridiem
  return toMinutes(match[1], match[2], mer)
}

// "start – end" 形式の1つの時間帯をパースして [startMin, endMin] を返す
function parseRange(rangeStr: string): [number, number] | null {
  const match = rangeStr.trim().match(
    /^(\d{1,2}:\d{2})(?:\s*(AM|PM))?\s*[-–]\s*(\d{1,2}:\d{2})(?:\s*(AM|PM))?$/i
  )
  if (!match) return null

  const [, startTime, startMer, endTime, endMer] = match

  let effectiveStartMer = startMer || undefined
  let effectiveEndMer = endMer || undefined

  if (!startMer && endMer) {
    // 終了側だけ AM/PM がある場合、開始側を推測する
    // 例: "5:00 – 11:00 PM" → 両方PM（5PM〜11PM）
    // 例: "10:00 – 6:00 PM" → AMからPM（10AM〜6PM）
    // 例: "12:00 – 5:00 PM" → 両方PM（12PM〜5PM）※12は正午として扱う
    const startH = parseInt(startTime.split(':')[0])
    const endH = parseInt(endTime.split(':')[0])
    if (startH === 12) {
      // 12:00 は正午（PM）として扱う
      effectiveStartMer = 'PM'
      effectiveEndMer = 'PM'
    } else if (startH > endH) {
      // 開始時刻 > 終了時刻（PM換算）→ 開始は AM
      effectiveStartMer = 'AM'
      effectiveEndMer = 'PM'
    } else {
      // 開始時刻 <= 終了時刻（PM換算）→ 両方 PM
      effectiveStartMer = 'PM'
      effectiveEndMer = 'PM'
    }
  } else if (startMer && !endMer) {
    // 開始側だけ AM/PM がある場合、終了側も同じにする
    effectiveEndMer = startMer
  }

  const startMinutes = parseTimeStr(startTime, effectiveStartMer)
  const endMinutes = parseTimeStr(endTime, effectiveEndMer)

  if (startMinutes === null || endMinutes === null) return null
  return [startMinutes, endMinutes]
}

// 現在時刻が時間帯内かどうか判定（日またぎ対応）
function isInRange(currentMinutes: number, start: number, end: number): boolean {
  if (end < start) {
    return currentMinutes >= start || currentMinutes < end
  }
  return currentMinutes >= start && currentMinutes < end
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

  // 定休日 / 閉業 / Closed
  if (todayLine.includes('定休日') || todayLine.includes('閉業') || /closed/i.test(todayLine)) return false

  // 24時間営業
  if (todayLine.includes('24 時間営業') || /open 24 hours/i.test(todayLine)) return true

  // 曜日部分を除いた時間文字列を抽出
  const colonIdx = todayLine.indexOf(':')
  if (colonIdx === -1) return null
  const timePart = todayLine.slice(colonIdx + 1).trim()

  // カンマ区切りで複数時間帯に分割してそれぞれ判定
  const rangeStrings = timePart.split(',')
  for (const rangeStr of rangeStrings) {
    const range = parseRange(rangeStr)
    if (range && isInRange(currentMinutes, range[0], range[1])) {
      return true
    }
  }

  // いずれの時間帯にも該当しなかった場合
  // パースできた時間帯が1つでもあれば閉店、なければ判定不能
  const parsedAny = rangeStrings.some(r => parseRange(r) !== null)
  return parsedAny ? false : null
}
