import { SimplePool } from 'nostr-tools/pool'
import type { Event } from 'nostr-tools/pure'
import type { Filter } from 'nostr-tools/filter'
import { getRelays } from './config'
import { allEvents, saveEvent } from './store'

const pool = new SimplePool()

/** Publishes to every configured relay. Succeeds if at least one relay accepted the event. */
export async function publishEvent(event: Event): Promise<boolean> {
  const results = await Promise.allSettled(pool.publish(getRelays(), event, { maxWait: 8000 }))
  return results.some((r) => r.status === 'fulfilled')
}

/** Queries relays (events are signature-checked by the pool) and caches results locally. */
export async function queryRelays(filter: Filter, maxWait = 5000): Promise<Event[]> {
  if (!navigator.onLine) return []
  try {
    const found = await pool.querySync(getRelays(), filter, { maxWait })
    await Promise.all(found.map(saveEvent))
    return found
  } catch {
    return []
  }
}

/** Local events matching a predicate, newest first. */
export async function queryLocal(match: (e: Event) => boolean): Promise<Event[]> {
  return (await allEvents()).filter(match).sort((a, b) => b.created_at - a.created_at)
}

/** Merges two lists of events by id, newest first. */
export function mergeEvents(...lists: Event[][]): Event[] {
  const byId = new Map<string, Event>()
  for (const list of lists) for (const e of list) byId.set(e.id, e)
  return [...byId.values()].sort((a, b) => b.created_at - a.created_at)
}
