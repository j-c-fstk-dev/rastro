import { finalizeEvent, generateSecretKey, getPublicKey, type EventTemplate, type VerifiedEvent } from 'nostr-tools/pure'
import { bytesToHex, hexToBytes } from 'nostr-tools/utils'
import * as nip19 from 'nostr-tools/nip19'
import * as nip49 from 'nostr-tools/nip49'

// The secret key never leaves this device except through an explicit backup.
const SECRET_KEY = 'rastro.sk'

export function loadSecretKey(): Uint8Array | null {
  const hex = localStorage.getItem(SECRET_KEY)
  return hex ? hexToBytes(hex) : null
}

export function createIdentity(): Uint8Array {
  const sk = generateSecretKey()
  localStorage.setItem(SECRET_KEY, bytesToHex(sk))
  return sk
}

/** Restores an identity from an nsec or a password-protected ncryptsec. */
export function restoreIdentity(input: string, password?: string): Uint8Array {
  const value = input.trim()
  let sk: Uint8Array
  if (value.startsWith('ncryptsec')) {
    if (!password) throw new Error('Esta chave está protegida por senha.')
    sk = nip49.decrypt(value, password)
  } else {
    const decoded = nip19.decode(value)
    if (decoded.type !== 'nsec') throw new Error('Isso não parece uma chave privada (nsec).')
    sk = decoded.data
  }
  localStorage.setItem(SECRET_KEY, bytesToHex(sk))
  return sk
}

export function forgetIdentity() {
  localStorage.removeItem(SECRET_KEY)
}

export const pubkeyOf = (sk: Uint8Array) => getPublicKey(sk)
export const npubOf = (pubkey: string) => nip19.npubEncode(pubkey)
export const nsecOf = (sk: Uint8Array) => nip19.nsecEncode(sk)
export const encryptedBackup = (sk: Uint8Array, password: string) => nip49.encrypt(sk, password)

export function sign(sk: Uint8Array, template: EventTemplate): VerifiedEvent {
  return finalizeEvent(template, sk)
}
