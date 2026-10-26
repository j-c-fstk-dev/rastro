import type { Event } from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'
import { parseAction, parseWitness, type Action, type Witness } from '../model/action'
import { KIND_ACTION, KIND_PROFILE, KIND_WITNESS } from '../model/kinds'
import { mergeEvents, queryLocal, queryRelays } from './client'
import { getRelays } from './config'
import { getEvent } from './store'

export interface Profile {
  name?: string
  picture?: string
}

const isAction = (e: Event) => e.kind === KIND_ACTION
const witnessesOf = (ids: Set<string>) => (e: Event) =>
  e.kind === KIND_WITNESS && e.tags.some((t) => t[0] === 'e' && ids.has(t[1]))

export async function loadAction(id: string): Promise<Action | null> {
  const local = await getEvent(id)
  if (local) return parseAction(local)
  const [remote] = await queryRelays({ ids: [id] })
  return remote ? parseAction(remote) : null
}

/** Local actions first; pass `remote` to also ask the relays. */
export async function loadFeed(remote: boolean): Promise<Action[]> {
  const local = await queryLocal(isAction)
  const found = remote ? await queryRelays({ kinds: [KIND_ACTION], '#t': ['cleanup'], limit: 50 }) : []
  return mergeEvents(local, found).map(parseAction).filter((a): a is Action => a !== null)
}

export async function loadWitnesses(actionIds: string[], remote: boolean): Promise<Witness[]> {
  if (actionIds.length === 0) return []
  const ids = new Set(actionIds)
  const local = await queryLocal(witnessesOf(ids))
  const found = remote ? await queryRelays({ kinds: [KIND_WITNESS], '#e': actionIds }) : []
  return mergeEvents(local, found).map(parseWitness).filter((w): w is Witness => w !== null)
}

export async function loadProfiles(pubkeys: string[], remote: boolean): Promise<Map<string, Profile>> {
  const wanted = new Set(pubkeys)
  const local = await queryLocal((e) => e.kind === KIND_PROFILE && wanted.has(e.pubkey))
  const found = remote && wanted.size > 0 ? await queryRelays({ kinds: [KIND_PROFILE], authors: [...wanted] }) : []
  const profiles = new Map<string, Profile>()
  // Newest first, so the first profile seen per author wins.
  for (const e of mergeEvents(local, found)) {
    if (profiles.has(e.pubkey)) continue
    try {
      const data = JSON.parse(e.content) as Record<string, unknown>
      profiles.set(e.pubkey, {
        name: typeof data.name === 'string' ? data.name : undefined,
        picture: typeof data.picture === 'string' ? data.picture : undefined,
      })
    } catch {
      // ignore malformed profiles
    }
  }
  return profiles
}

/** Shareable reference to an action, with relay hints so other apps can find it. */
export const actionRef = (action: Pick<Action, 'id' | 'pubkey'>) =>
  nip19.neventEncode({ id: action.id, author: action.pubkey, kind: KIND_ACTION, relays: getRelays().slice(0, 2) })

/** Accepts an nevent or a hex id. */
export function parseActionRef(ref: string): string | null {
  if (/^[0-9a-f]{64}$/.test(ref)) return ref
  try {
    const decoded = nip19.decode(ref)
    if (decoded.type === 'nevent') return decoded.data.id
    if (decoded.type === 'note') return decoded.data
  } catch {
    // not a nip19 string
  }
  return null
}
