import { useEffect, useState } from 'react'
import { loadProfiles, type Profile } from '../nostr/data'

export function useProfiles(pubkeys: string[]): Map<string, Profile> {
  const [profiles, setProfiles] = useState(new Map<string, Profile>())
  const key = [...new Set(pubkeys)].sort().join(',')
  useEffect(() => {
    let cancelled = false
    const wanted = key ? key.split(',') : []
    void loadProfiles(wanted, false).then((p) => !cancelled && setProfiles(p))
    void loadProfiles(wanted, true).then((p) => !cancelled && setProfiles(p))
    return () => {
      cancelled = true
    }
  }, [key])
  return profiles
}
