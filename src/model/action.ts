import type { Event, EventTemplate } from 'nostr-tools/pure'
import { KIND_ACTION, KIND_WITNESS } from './kinds'

export const ACTION_TYPES = { cleanup: 'Limpeza' } as const
export type ActionType = keyof typeof ACTION_TYPES

export const METRICS = {
  weight_kg: { label: 'Peso removido', unit: 'kg' },
  bags: { label: 'Sacos', unit: '' },
  area_sqm: { label: 'Área limpa', unit: 'm²' },
  duration_min: { label: 'Duração', unit: 'min' },
  participants: { label: 'Participantes', unit: '' },
  recyclables_kg: { label: 'Recicláveis', unit: 'kg' },
} as const
export type MetricKey = keyof typeof METRICS

export const WASTE_TYPES = {
  plastic: 'Plástico',
  glass: 'Vidro',
  metal: 'Metal',
  paper: 'Papel',
  organic: 'Orgânico',
  textile: 'Tecido',
  electronic: 'Eletrônico',
  cigarette: 'Bitucas',
  other: 'Outros',
} as const
export type WasteType = keyof typeof WASTE_TYPES

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
  metrics: Partial<Record<MetricKey, number>>
  waste: WasteType[]
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

export function buildActionTemplate(draft: ActionDraft, now = Math.floor(Date.now() / 1000)): EventTemplate {
  const tags: string[][] = [['t', draft.type]]
  const weight = draft.metrics.weight_kg
  tags.push(['alt', `Rastro: ação de ${ACTION_TYPES[draft.type].toLowerCase()}${weight ? ` com ${weight} kg removidos` : ''}`])
  if (draft.geohash) tags.push(['g', draft.geohash])
  if (draft.place) tags.push(['location', draft.place])
  for (const [key, value] of Object.entries(draft.metrics)) {
    if (typeof value === 'number' && Number.isFinite(value)) tags.push(['m', key, String(value)])
  }
  for (const w of draft.waste) tags.push(['waste', w])
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
  const type = event.tags.find((t) => t[0] === 't' && t[1] in ACTION_TYPES)?.[1] as ActionType | undefined
  if (!type) return null
  const metrics: Action['metrics'] = {}
  const waste: WasteType[] = []
  const photos: Photo[] = []
  let geohash: string | undefined
  let place: string | undefined
  for (const tag of event.tags) {
    switch (tag[0]) {
      case 'm': {
        const value = Number(tag[2])
        if (tag[1] in METRICS && Number.isFinite(value)) metrics[tag[1] as MetricKey] = value
        break
      }
      case 'waste':
        if (tag[1] in WASTE_TYPES) waste.push(tag[1] as WasteType)
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
    metrics,
    waste,
    photos,
  }
}

export function buildWitnessTemplate(
  action: Pick<Action, 'id' | 'pubkey'>,
  mode: WitnessMode,
  note = '',
  now = Math.floor(Date.now() / 1000),
): EventTemplate {
  return {
    kind: KIND_WITNESS,
    created_at: now,
    content: note,
    tags: [
      ['e', action.id],
      ['p', action.pubkey],
      ['mode', mode],
      ['alt', 'Rastro: testemunho de uma ação'],
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
