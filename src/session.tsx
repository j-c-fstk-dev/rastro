import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KIND_PROFILE } from './model/kinds'
import { createIdentity, loadSecretKey, pubkeyOf, restoreIdentity, sign } from './nostr/keys'
import { enqueueEvent, onPendingChange } from './nostr/outbox'

interface Session {
  sk: Uint8Array | null
  pubkey: string | null
  pending: number
  online: boolean
  start: (name: string) => Promise<Uint8Array>
  restore: (key: string, password?: string) => void
  updateName: (name: string) => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sk, setSk] = useState<Uint8Array | null>(() => loadSecretKey())
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => onPendingChange(setPending), [])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const session = useMemo<Session>(() => {
    const publishProfile = async (key: Uint8Array, name: string) => {
      const created_at = Math.floor(Date.now() / 1000)
      await enqueueEvent(sign(key, { kind: KIND_PROFILE, created_at, content: JSON.stringify({ name }), tags: [] }))
    }
    return {
      sk,
      pubkey: sk ? pubkeyOf(sk) : null,
      pending,
      online,
      start: async (name) => {
        const key = createIdentity()
        await publishProfile(key, name)
        setSk(key)
        return key
      },
      restore: (key, password) => setSk(restoreIdentity(key, password)),
      updateName: async (name) => {
        if (sk) await publishProfile(sk, name)
      },
    }
  }, [sk, pending, online])

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession outside SessionProvider')
  return session
}
