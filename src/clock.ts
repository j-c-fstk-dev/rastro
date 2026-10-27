// Device clocks are often wrong (a dual-boot laptop can be hours off), and relays and photo
// servers reject signatures whose time is far from theirs. The app measures the offset against
// the server it is loaded from and uses corrected time for everything it signs.

const OFFSET_KEY = 'rastro.clockOffsetMs'
/** Below this, the difference is network delay or ordinary drift, not a wrong clock. */
const NOTICEABLE_MS = 2 * 60 * 1000

function readStoredOffset(): number {
  try {
    const n = Number(localStorage.getItem(OFFSET_KEY))
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

let offsetMs = readStoredOffset()

/** Corrected current time in milliseconds. */
export const nowMs = () => Date.now() + offsetMs
/** Corrected current time in Unix seconds, as Nostr uses. */
export const nowSeconds = () => Math.floor(nowMs() / 1000)

/** How far the device clock is from real time, when it is far enough to matter. */
export const clockSkewMs = () => (Math.abs(offsetMs) >= NOTICEABLE_MS ? -offsetMs : 0)

/** Reads the server's Date header (same origin, so it is readable) and stores the offset. */
export async function calibrateClock(url = import.meta.env.BASE_URL): Promise<void> {
  if (!navigator.onLine) return
  try {
    const sent = Date.now()
    const res = await fetch(`${url}?clock=${sent}`, { method: 'HEAD', cache: 'no-store' })
    const received = Date.now()
    const header = res.headers.get('Date')
    if (!header) return
    const server = new Date(header).getTime()
    if (!Number.isFinite(server)) return
    // The Date header has one-second resolution; assume it was stamped halfway through the request.
    const measured = server + 500 - (sent + received) / 2
    offsetMs = Math.abs(measured) >= NOTICEABLE_MS ? measured : 0
    localStorage.setItem(OFFSET_KEY, String(offsetMs))
  } catch {
    // Keep the last known offset.
  }
}
