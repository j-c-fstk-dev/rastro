import type { Event } from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'
import { parseAction, parseWitness, type Action, type Witness } from '../model/action'
import { latestCollectives, parseAddress, type Collective } from '../model/collective'
import { KIND_ACTION, KIND_COLLECTIVE, KIND_PROFILE, KIND_WITNESS } from '../model/kinds'
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

/** Actions that point at a group. */
export async function loadGroupActions(address: string, remote: boolean): Promise<Action[]> {
  const inGroup = (e: Event) => isAction(e) && e.tags.some((t) => t[0] === 'a' && t[1] === address)
  const local = await queryLocal(inGroup)
  const found = remote ? await queryRelays({ kinds: [KIND_ACTION], '#a': [address] }) : []
  return mergeEvents(local, found).map(parseAction).filter((a): a is Action => a !== null)
}

const isCollective = (e: Event) => e.kind === KIND_COLLECTIVE

/** Groups this person owns or belongs to. */
export async function loadMyCollectives(pubkey: string, remote: boolean): Promise<Collective[]> {
  const mine = (e: Event) => isCollective(e) && (e.pubkey === pubkey || e.tags.some((t) => t[0] === 'p' && t[1] === pubkey))
  const local = await queryLocal(mine)
  const found = remote
    ? mergeEvents(
        await queryRelays({ kinds: [KIND_COLLECTIVE], authors: [pubkey] }),
        await queryRelays({ kinds: [KIND_COLLECTIVE], '#p': [pubkey] }),
      )
    : []
  // A newer version may have removed this person, so filter after picking the latest.
  return latestCollectives(mergeEvents(local, found)).filter((c) => c.owner === pubkey || c.members.includes(pubkey))
}

export async function loadCollective(address: string, remote: boolean): Promise<Collective | null> {
  const ref = parseAddress(address)
  if (!ref) return null
  const match = (e: Event) => isCollective(e) && e.pubkey === ref.owner && e.tags.some((t) => t[0] === 'd' && t[1] === ref.d)
  const local = await queryLocal(match)
  const found = remote ? await queryRelays({ kinds: [KIND_COLLECTIVE], authors: [ref.owner], '#d': [ref.d] }) : []
  return latestCollectives(mergeEvents(local, found))[0] ?? null
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

/** Shareable reference to a group. */
export const groupRef = (c: Pick<Collective, 'owner' | 'd'>) =>
  nip19.naddrEncode({ kind: KIND_COLLECTIVE, pubkey: c.owner, identifier: c.d, relays: getRelays().slice(0, 2) })

/** Turns a group reference (naddr) back into its address. */
export function parseGroupRef(ref: string): string | null {
  try {
    const decoded = nip19.decode(ref)
    if (decoded.type === 'naddr' && decoded.data.kind === KIND_COLLECTIVE) {
      return `${KIND_COLLECTIVE}:${decoded.data.pubkey}:${decoded.data.identifier}`
    }
  } catch {
    // not an naddr
  }
  return null
}

/** Finds an npub in scanned or pasted text and returns its hex pubkey. */
export function pubkeyFromText(text: string): string | null {
  const match = text.match(/npub1[02-9ac-hj-np-z]{58}/)
  if (!match) return null
  try {
    const decoded = nip19.decode(match[0])
    return decoded.type === 'npub' ? decoded.data : null
  } catch {
    return null
  }
}
