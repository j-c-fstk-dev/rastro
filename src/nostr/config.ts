// Default public infrastructure. Users can point the app at their own node in Settings.
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
]

// Photos go to all of them; one success is enough. "You → Sending" shows which ones accepted the last upload.
export const DEFAULT_BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://nostr.download',
  'https://blossom.band',
  'https://files.v0l.io',
]

const RELAYS_KEY = 'rastro.relays'
const BLOSSOM_KEY = 'rastro.blossom'

function readList(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key)
    const list = raw ? (JSON.parse(raw) as unknown) : null
    if (Array.isArray(list) && list.length > 0 && list.every((x) => typeof x === 'string')) return list
  } catch {
    // ignore unreadable settings
  }
  return fallback
}

export const getRelays = () => readList(RELAYS_KEY, DEFAULT_RELAYS)
export const getBlossomServers = () => readList(BLOSSOM_KEY, DEFAULT_BLOSSOM_SERVERS)

export function setRelays(list: string[]) {
  localStorage.setItem(RELAYS_KEY, JSON.stringify(list))
}

export function setBlossomServers(list: string[]) {
  localStorage.setItem(BLOSSOM_KEY, JSON.stringify(list))
}

export function resetInfrastructure() {
  localStorage.removeItem(RELAYS_KEY)
  localStorage.removeItem(BLOSSOM_KEY)
}
