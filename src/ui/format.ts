import { npubOf } from '../nostr/keys'
import type { Profile } from '../nostr/data'

export function shortKey(pubkey: string): string {
  const npub = npubOf(pubkey)
  return `${npub.slice(0, 10)}…${npub.slice(-4)}`
}

export const displayName = (pubkey: string, profiles: Map<string, Profile>) =>
  profiles.get(pubkey)?.name || shortKey(pubkey)

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const formatDate = (seconds: number) => dateFormat.format(new Date(seconds * 1000))
export const formatDateTime = (seconds: number) =>
  `${dateFormat.format(new Date(seconds * 1000))}, ${timeFormat.format(new Date(seconds * 1000))}`

export const formatNumber = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
