import { createUploadAuth, encodeAuthorizationHeader } from 'nostr-tools/nipb7'
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure'
import { getBlossomServers } from '../nostr/config'

const trimSlash = (s: string) => s.replace(/\/+$/, '')

/** Blossom servers address files by hash, so the same URL shape works on any of them. */
export const blobUrl = (server: string, sha256: string) => `${trimSlash(server)}/${sha256}.jpg`

/** Candidate URLs for a photo: the one in the event first, then every configured server. */
export function candidateUrls(url: string, sha256: string): string[] {
  return [...new Set([url, ...getBlossomServers().map((s) => blobUrl(s, sha256))])]
}

/** Uploads to every configured server for redundancy. Succeeds if at least one stored it. */
export async function uploadBlob(sk: Uint8Array, blob: Blob, sha256: string): Promise<boolean> {
  const auth = await createUploadAuth(async (draft: EventTemplate) => finalizeEvent(draft, sk), sha256)
  const header = encodeAuthorizationHeader(auth)
  const results = await Promise.allSettled(
    getBlossomServers().map(async (server) => {
      const res = await fetch(`${trimSlash(server)}/upload`, {
        method: 'PUT',
        body: blob,
        headers: { Authorization: header, 'Content-Type': blob.type || 'image/jpeg', 'X-SHA-256': sha256 },
      })
      if (!res.ok) throw new Error(`${server}: ${res.status}`)
    }),
  )
  return results.some((r) => r.status === 'fulfilled')
}
