import { npubOf } from '../nostr/keys'
import type { Profile } from '../nostr/data'

export function shortKey(pubkey: string): string {
  const npub = npubOf(pubkey)
  return `${npub.slice(0, 10)}…${npub.slice(-4)}`
}

export const displayName = (pubkey: string, profiles: Map<string, Profile>) =>
  profiles.get(pubkey)?.name || shortKey(pubkey)

const at = (seconds: number) => new Date(seconds * 1000)

export const formatDate = (seconds: number, locale: string) =>
  at(seconds).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
export const formatDateTime = (seconds: number, locale: string) =>
  at(seconds).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const dayOf = (seconds: number) => at(seconds).getDate()
export const monthOf = (seconds: number, locale: string) => at(seconds).toLocaleDateString(locale, { month: 'short' })

export const formatNumber = (n: number, locale: string) => n.toLocaleString(locale, { maximumFractionDigits: 1 })
