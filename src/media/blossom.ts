import { createUploadAuth, encodeAuthorizationHeader } from 'nostr-tools/nipb7'
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure'
import { nowSeconds } from '../clock'
import { getBlossomServers } from '../nostr/config'

const trimSlash = (s: string) => s.replace(/\/+$/, '')

/** Blossom servers address files by hash, so the same URL shape works on any of them. */
export const blobUrl = (server: string, sha256: string) => `${trimSlash(server)}/${sha256}.jpg`

/** Candidate URLs for a photo: the one in the event first, then every configured server. */
export function candidateUrls(url: string, sha256: string): string[] {
  return [...new Set([url, ...getBlossomServers().map((s) => blobUrl(s, sha256))])]
}

export interface UploadAttempt {
  server: string
  ok: boolean
  /** HTTP status and the server's reason, or the network error. */
  detail: string
}

const LOG_KEY = 'rastro.uploadLog'

/** The result of the most recent upload, per server, so problems can be seen on the "You" screen. */
export function lastUploadLog(): { at: number; attempts: UploadAttempt[] } | null {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? 'null')
  } catch {
    return null
  }
}

async function reasonOf(res: Response): Promise<string> {
  const header = res.headers.get('X-Reason')
  if (header) return header
  const text = await res.text().catch(() => '')
  return text.slice(0, 140)
}

/** Uploads to every configured server for redundancy. Succeeds if at least one stored it. */
export async function uploadBlob(sk: Uint8Array, blob: Blob, sha256: string): Promise<boolean> {
  // Sign with corrected time: servers reject authorizations stamped too far in the past or future.
  const now = nowSeconds()
  const auth = await createUploadAuth(
    async (draft: EventTemplate) =>
      finalizeEvent(
        { ...draft, created_at: now, tags: draft.tags.map((t) => (t[0] === 'expiration' ? ['expiration', String(now + 3600)] : t)) },
        sk,
      ),
    sha256,
  )
  const header = encodeAuthorizationHeader(auth)
  const attempts = await Promise.all(
    getBlossomServers().map(async (server): Promise<UploadAttempt> => {
      try {
        const res = await fetch(`${trimSlash(server)}/upload`, {
          method: 'PUT',
          body: blob,
          headers: { Authorization: header, 'Content-Type': blob.type || 'image/jpeg' },
        })
        if (res.ok) {
          // Some servers re-encode photos. A copy under another hash can't be found by the app or verified.
          const descriptor = (await res.json().catch(() => null)) as { sha256?: string } | null
          if (descriptor?.sha256 && descriptor.sha256 !== sha256) {
            return { server, ok: false, detail: `${res.status} stored a modified copy (${descriptor.sha256.slice(0, 8)}…)` }
          }
          return { server, ok: true, detail: String(res.status) }
        }
        return { server, ok: false, detail: `${res.status} ${await reasonOf(res)}`.trim() }
      } catch (err) {
        // Browsers report blocked cross-origin requests and offline servers the same way.
        return { server, ok: false, detail: err instanceof Error ? err.message : String(err) }
      }
    }),
  )
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify({ at: Date.now(), attempts }))
  } catch {
    // diagnostics only
  }
  return attempts.some((a) => a.ok)
}
