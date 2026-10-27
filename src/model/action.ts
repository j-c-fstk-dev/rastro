import type { Event, EventTemplate } from 'nostr-tools/pure'
import { nowSeconds } from '../clock'
import { KIND_ACTION, KIND_COLLECTIVE, KIND_WITNESS } from './kinds'

export const ACTION_TYPES = ['cleanup', 'planting', 'apiary', 'agroforestry', 'community'] as const
export type ActionType = (typeof ACTION_TYPES)[number]

/** `step` marks whole-number counts, which get +/- buttons in the form. */
export const METRICS = {
  weight_kg: { unit: 'kg', step: false },
  bags: { unit: '', step: true },
  area_sqm: { unit: 'm²', step: false },
  duration_min: { unit: 'min', step: false },
  participants: { unit: '', step: true },
  recyclables_kg: { unit: 'kg', step: false },
  plants: { unit: '', step: true },
  species: { unit: '', step: true },
  hives: { unit: '', step: true },
  honey_kg: { unit: 'kg', step: false },
  biomass_kg: { unit: 'kg', step: false },
  people_reached: { unit: '', step: true },
} as const
export type MetricKey = keyof typeof METRICS

export const WASTE_TYPES = ['plastic', 'glass', 'metal', 'paper', 'organic', 'textile', 'electronic', 'cigarette', 'other'] as const

/**
 * What each type of action records: its numbers (in form order, the first is the headline)
 * and one set of choices, stored under `optionTag` (e.g. ['waste', 'plastic']).
 */
export const TYPE_SPEC = {
  cleanup: {
    metrics: ['weight_kg', 'bags', 'area_sqm', 'duration_min', 'participants', 'recyclables_kg'],
    optionTag: 'waste',
    options: WASTE_TYPES,
  },
  planting: {
    metrics: ['plants', 'species', 'area_sqm', 'participants', 'duration_min'],
    optionTag: 'plant',
    options: ['native', 'fruit', 'seeds', 'nursery', 'other'],
  },
  apiary: {
    metrics: ['hives', 'honey_kg', 'participants', 'duration_min'],
    optionTag: 'activity',
    options: ['inspection', 'harvest', 'split', 'feeding', 'swarm_rescue', 'other'],
  },
  agroforestry: {
    metrics: ['plants', 'area_sqm', 'biomass_kg', 'participants', 'duration_min'],
    optionTag: 'activity',
    options: ['planting', 'pruning', 'mulching', 'harvest', 'irrigation', 'other'],
  },
  community: {
    metrics: ['participants', 'people_reached', 'duration_min'],
    optionTag: 'activity',
    options: ['workshop', 'maintenance', 'mapping', 'gathering', 'other'],
  },
} as const satisfies Record<string, { metrics: readonly MetricKey[]; optionTag: string; options: readonly string[] }>

export const isActionType = (v: string): v is ActionType => (ACTION_TYPES as readonly string[]).includes(v)

/** The number that best summarises an action of this type, if it was recorded. */
export function headline(action: Pick<ActionDraft, 'type' | 'metrics'>): { key: MetricKey; value: number } | null {
  for (const key of TYPE_SPEC[action.type].metrics) {
    const value = action.metrics[key]
    if (value !== undefined) return { key, value }
  }
  return null
}

export type PhotoRole = 'before' | 'after'

export interface Photo {
  sha256: string
  url: string
  mime: string
  role: PhotoRole
}

export interface ActionDraft {
  type: ActionType
  description: string
  place?: string
  geohash?: string
  /** Address of the group this action belongs to: `33910:<owner pubkey>:<d>`. */
  collective?: string
  metrics: Partial<Record<MetricKey, number>>
  /** Choices for this type, e.g. waste types for a cleanup or activities at an apiary. */
  options: string[]
  photos: Photo[]
}

export interface Action extends ActionDraft {
  id: string
  pubkey: string
  createdAt: number
}

export type WitnessMode = 'presencial' | 'remoto'

export interface Witness {
  id: string
  pubkey: string
  actionId: string
  mode: WitnessMode
  note: string
  createdAt: number
}

export const APP_TAG = ['client', 'rastro', '0.1']

export function buildActionTemplate(draft: ActionDraft, now = nowSeconds()): EventTemplate {
  const tags: string[][] = [['t', draft.type]]
  tags.push(['alt', `Rastro: ${draft.type} action${draft.place ? ` at ${draft.place}` : ''}`])
  if (draft.collective) tags.push(['a', draft.collective])
  if (draft.geohash) tags.push(['g', draft.geohash])
  if (draft.place) tags.push(['location', draft.place])
  for (const [key, value] of Object.entries(draft.metrics)) {
    if (typeof value === 'number' && Number.isFinite(value)) tags.push(['m', key, String(value)])
  }
  const { optionTag, options } = TYPE_SPEC[draft.type]
  for (const o of draft.options) if ((options as readonly string[]).includes(o)) tags.push([optionTag, o])
  for (const p of draft.photos) {
    tags.push(['imeta', `url ${p.url}`, `x ${p.sha256}`, `m ${p.mime}`, `role ${p.role}`])
  }
  tags.push(APP_TAG)
  return { kind: KIND_ACTION, created_at: now, content: draft.description, tags }
}

function parseImeta(tag: string[]): Photo | null {
  const fields = new Map<string, string>()
  for (const entry of tag.slice(1)) {
    const space = entry.indexOf(' ')
    if (space > 0) fields.set(entry.slice(0, space), entry.slice(space + 1))
  }
  const url = fields.get('url')
  const sha256 = fields.get('x')
  if (!url || !sha256 || !/^[0-9a-f]{64}$/.test(sha256)) return null
  const role = fields.get('role') === 'before' ? 'before' : 'after'
  return { url, sha256, mime: fields.get('m') ?? 'image/jpeg', role }
}

export function parseAction(event: Event): Action | null {
  if (event.kind !== KIND_ACTION) return null
  const type = event.tags.find((t) => t[0] === 't' && isActionType(t[1]))?.[1] as ActionType | undefined
  if (!type) return null
  const metrics: Action['metrics'] = {}
  const spec = TYPE_SPEC[type]
  const options: string[] = []
  const photos: Photo[] = []
  let geohash: string | undefined
  let place: string | undefined
  let collective: string | undefined
  for (const tag of event.tags) {
    switch (tag[0]) {
      case 'm': {
        const value = Number(tag[2])
        if (tag[1] in METRICS && Number.isFinite(value)) metrics[tag[1] as MetricKey] = value
        break
      }
      case spec.optionTag:
        if ((spec.options as readonly string[]).includes(tag[1]) && !options.includes(tag[1])) options.push(tag[1])
        break
      case 'imeta': {
        const photo = parseImeta(tag)
        if (photo) photos.push(photo)
        break
      }
      case 'g':
        geohash ??= tag[1]
        break
      case 'location':
        place ??= tag[1]
        break
      case 'a':
        if (tag[1]?.startsWith(`${KIND_COLLECTIVE}:`)) collective ??= tag[1]
        break
    }
  }
  return {
    id: event.id,
    pubkey: event.pubkey,
    createdAt: event.created_at,
    type,
    description: event.content,
    place,
    geohash,
    collective,
    metrics,
    options,
    photos,
  }
}

export function buildWitnessTemplate(
  action: Pick<Action, 'id' | 'pubkey'>,
  mode: WitnessMode,
  note = '',
  now = nowSeconds(),
): EventTemplate {
  return {
    kind: KIND_WITNESS,
    created_at: now,
    content: note,
    tags: [
      ['e', action.id],
      ['p', action.pubkey],
      ['mode', mode],
      ['alt', 'Rastro: witness of an action'],
      APP_TAG,
    ],
  }
}

export function parseWitness(event: Event): Witness | null {
  if (event.kind !== KIND_WITNESS) return null
  const actionId = event.tags.find((t) => t[0] === 'e')?.[1]
  if (!actionId) return null
  const mode = event.tags.find((t) => t[0] === 'mode')?.[1] === 'presencial' ? 'presencial' : 'remoto'
  return { id: event.id, pubkey: event.pubkey, actionId, mode, note: event.content, createdAt: event.created_at }
}
