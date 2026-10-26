import { useEffect, useState } from 'react'
import type { Collective } from '../model/collective'
import { loadCollective } from '../nostr/data'

/** Loads the groups referenced by a set of actions. */
export function useCollectives(addresses: (string | undefined)[]): Map<string, Collective> {
  const [groups, setGroups] = useState(new Map<string, Collective>())
  const key = [...new Set(addresses.filter((a): a is string => Boolean(a)))].sort().join('|')
  useEffect(() => {
    let cancelled = false
    const wanted = key ? key.split('|') : []
    const load = async (remote: boolean) => {
      const found = await Promise.all(wanted.map((a) => loadCollective(a, remote)))
      if (cancelled) return
      setGroups(new Map(found.filter((c): c is Collective => c !== null).map((c) => [c.address, c])))
    }
    void load(false).then(() => load(true))
    return () => {
      cancelled = true
    }
  }, [key])
  return groups
}
