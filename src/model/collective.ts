import type { Event, EventTemplate } from 'nostr-tools/pure'
import { APP_TAG } from './action'
import { nowSeconds } from '../clock'
import { KIND_COLLECTIVE } from './kinds'

/**
 * A group of people acting together. Its owner keeps the member list;
 * nobody can approve or delete anyone else's actions.
 */
export interface Collective {
  /** Address used by actions to point at this group: `33910:<owner>:<d>`. */
  address: string
  owner: string
  d: string
  name: string
  description: string
  members: string[]
  updatedAt: number
}

export const collectiveAddress = (owner: string, d: string) => `${KIND_COLLECTIVE}:${owner}:${d}`

export function parseAddress(address: string): { owner: string; d: string } | null {
  const [kind, owner, ...rest] = address.split(':')
  if (kind !== String(KIND_COLLECTIVE) || !/^[0-9a-f]{64}$/.test(owner ?? '') || rest.length === 0) return null
  return { owner, d: rest.join(':') }
}

export function buildCollectiveTemplate(
  c: Pick<Collective, 'd' | 'name' | 'description' | 'members'>,
  now = nowSeconds(),
): EventTemplate {
  return {
    kind: KIND_COLLECTIVE,
    created_at: now,
    content: c.description,
    tags: [
      ['d', c.d],
      ['name', c.name],
      ['alt', `Rastro group: ${c.name}`],
      ...[...new Set(c.members)].map((m) => ['p', m]),
      APP_TAG,
    ],
  }
}

export function parseCollective(event: Event): Collective | null {
  if (event.kind !== KIND_COLLECTIVE) return null
  const d = event.tags.find((t) => t[0] === 'd')?.[1]
  const name = event.tags.find((t) => t[0] === 'name')?.[1]
  if (!d || !name) return null
  const members = [...new Set(event.tags.filter((t) => t[0] === 'p' && /^[0-9a-f]{64}$/.test(t[1])).map((t) => t[1]))]
  return {
    address: collectiveAddress(event.pubkey, d),
    owner: event.pubkey,
    d,
    name,
    description: event.content,
    members,
    updatedAt: event.created_at,
  }
}

/** The owner always counts as a member. */
export const memberSet = (c: Collective) => new Set([c.owner, ...c.members])

/** Keeps only the newest version of each group (replaceable events). */
export function latestCollectives(events: Event[]): Collective[] {
  const byAddress = new Map<string, Collective>()
  for (const e of events) {
    const c = parseCollective(e)
    if (!c) continue
    const prev = byAddress.get(c.address)
    if (!prev || c.updatedAt > prev.updatedAt) byAddress.set(c.address, c)
  }
  return [...byAddress.values()].sort((a, b) => a.name.localeCompare(b.name))
}
