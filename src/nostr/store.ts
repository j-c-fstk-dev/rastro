import { createStore, del, entries, get, set, values } from 'idb-keyval'
import type { Event } from 'nostr-tools/pure'

// Everything this device has seen or created, so the app keeps working offline.
const events = createStore('rastro-events', 'events')
// Things signed on this device that still have to reach the network.
const outbox = createStore('rastro-outbox', 'outbox')
// Photo files kept locally by hash until (and after) they are uploaded.
const blobs = createStore('rastro-blobs', 'blobs')

export type OutboxItem =
  | { type: 'event'; id: string; event: Event }
  | { type: 'blob'; id: string; sha256: string }

export const saveEvent = (event: Event) => set(event.id, event, events)
export const getEvent = (id: string) => get<Event>(id, events)
export const allEvents = () => values<Event>(events)

export const putOutbox = (item: OutboxItem) => set(item.id, item, outbox)
export const removeOutbox = (id: string) => del(id, outbox)
export const outboxItems = async () => (await entries<string, OutboxItem>(outbox)).map(([, item]) => item)

export const saveBlob = (sha256: string, blob: Blob) => set(sha256, blob, blobs)
export const getBlob = (sha256: string) => get<Blob>(sha256, blobs)
