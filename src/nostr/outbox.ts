import type { Event } from 'nostr-tools/pure'
import { uploadBlob } from '../media/blossom'
import { publishEvent } from './client'
import { loadSecretKey } from './keys'
import { getBlob, outboxItems, putOutbox, removeOutbox, saveBlob, saveEvent } from './store'

type Listener = (pending: number) => void
const listeners = new Set<Listener>()
let flushing: Promise<void> | null = null
let rerun = false

async function notify() {
  const pending = (await outboxItems()).length
  listeners.forEach((l) => l(pending))
}

export function onPendingChange(listener: Listener): () => void {
  listeners.add(listener)
  void notify()
  return () => listeners.delete(listener)
}

/** Stores a signed event locally right away and queues it for the network. */
export async function enqueueEvent(event: Event) {
  await saveEvent(event)
  await putOutbox({ type: 'event', id: event.id, event })
  await notify()
  void flush()
}

export async function enqueueBlob(sha256: string, blob: Blob) {
  await saveBlob(sha256, blob)
  await putOutbox({ type: 'blob', id: `blob:${sha256}`, sha256 })
}

/** Sends whatever is pending: photos first, then events. Safe to call any time. */
export function flush(): Promise<void> {
  if (flushing) {
    // Something new may have been queued after the running pass read the outbox.
    rerun = true
    return flushing
  }
  flushing = (async () => {
    try {
      do {
        rerun = false
        await sendPending()
      } while (rerun)
    } finally {
      flushing = null
      await notify()
    }
  })()
  return flushing
}

async function sendPending() {
  const sk = loadSecretKey()
  if (!sk || !navigator.onLine) return
  const items = await outboxItems()
  for (const item of items.filter((i) => i.type === 'blob')) {
    const blob = await getBlob(item.sha256)
    if (!blob || (await uploadBlob(sk, blob, item.sha256))) await removeOutbox(item.id)
  }
  for (const item of items.filter((i) => i.type === 'event')) {
    if (await publishEvent(item.event)) await removeOutbox(item.id)
  }
}

export function startOutbox() {
  window.addEventListener('online', () => void flush())
  setInterval(() => void flush(), 30_000)
  void flush()
}
