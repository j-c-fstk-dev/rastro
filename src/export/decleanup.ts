import type { Action, Witness } from '../model/action'
import { en } from '../i18n/en'
import { decodeGeohash } from '../geo/geohash'
import type { Status } from '../model/status'

/**
 * Exports an action using the field names of DeCleanup Network's public impact API,
 * plus references to the signed Nostr events as proof.
 */
export function toDecleanup(action: Action, witnesses: Witness[], status: Status, ref: string) {
  const coords = action.geohash ? decodeGeohash(action.geohash) : null
  const photo = (role: 'before' | 'after') => action.photos.find((p) => p.role === role)?.url ?? null
  return {
    source: 'rastro',
    submittedAt: new Date(action.createdAt * 1000).toISOString(),
    location: {
      placeName: action.place ?? null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
      precision: action.geohash ? `geohash:${action.geohash.length}` : null,
    },
    impact: {
      weightKg: action.metrics.weight_kg ?? null,
      areaSqm: action.metrics.area_sqm ?? null,
      bags: action.metrics.bags ?? null,
      durationMinutes: action.metrics.duration_min ?? null,
      // DeCleanup uses English labels, e.g. "Plastic".
      wasteTypes: action.waste.map((w) => en[`waste.${w}`]),
      contributorsCount: action.metrics.participants ?? witnesses.length + 1,
    },
    recyclables: {
      hasRecyclables: (action.metrics.recyclables_kg ?? 0) > 0,
      amountKg: action.metrics.recyclables_kg ?? null,
    },
    media: { beforePhotoUrl: photo('before'), afterPhotoUrl: photo('after') },
    summary: action.description,
    proof: {
      protocol: 'nostr',
      event: ref,
      author: action.pubkey,
      status,
      witnesses: witnesses.map((w) => ({ pubkey: w.pubkey, mode: w.mode, event: w.id })),
    },
  }
}
