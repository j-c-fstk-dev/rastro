import { describe, expect, it } from 'vitest'
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import { buildActionTemplate, buildWitnessTemplate, parseAction, parseWitness, type ActionDraft, type Witness } from './action'
import { computeStatus } from './status'
import { decodeGeohash, encodeGeohash } from '../geo/geohash'

const draft: ActionDraft = {
  type: 'cleanup',
  description: 'Mutirão na praia',
  place: 'Campeche, Florianópolis',
  geohash: '6gkzm',
  metrics: { weight_kg: 12.5, bags: 8 },
  waste: ['plastic', 'glass'],
  photos: [{ sha256: 'a'.repeat(64), url: 'https://b.example/' + 'a'.repeat(64) + '.jpg', mime: 'image/jpeg', role: 'before' }],
}

describe('action events', () => {
  it('round-trips an action through a signed event', () => {
    const event = finalizeEvent(buildActionTemplate(draft), generateSecretKey())
    const action = parseAction(event)
    expect(action).toMatchObject({ ...draft, id: event.id, pubkey: event.pubkey })
  })

  it('round-trips a witness', () => {
    const author = getPublicKey(generateSecretKey())
    const event = finalizeEvent(buildWitnessTemplate({ id: 'f'.repeat(64), pubkey: author }, 'presencial', 'Estive lá'), generateSecretKey())
    expect(parseWitness(event)).toMatchObject({ actionId: 'f'.repeat(64), mode: 'presencial', note: 'Estive lá' })
  })

  it('ignores photos with an invalid hash', () => {
    const template = buildActionTemplate({ ...draft, photos: [] })
    template.tags.push(['imeta', 'url https://x/y.jpg', 'x not-a-hash'])
    expect(parseAction(finalizeEvent(template, generateSecretKey()))?.photos).toEqual([])
  })
})

describe('status', () => {
  const action = { id: 'act', pubkey: 'author' }
  const w = (pubkey: string, mode: Witness['mode'] = 'remoto', createdAt = 1): Witness =>
    ({ id: pubkey + mode, pubkey, actionId: 'act', mode, note: '', createdAt })

  it('starts as observed and ignores the author', () => {
    expect(computeStatus(action, [w('author'), w('a')]).status).toBe('observed')
  })

  it('counts one witness per person', () => {
    const result = computeStatus(action, [w('a'), w('a', 'presencial'), w('b')])
    expect(result.status).toBe('confirmed')
    expect(result.witnesses.find((x) => x.pubkey === 'a')?.mode).toBe('presencial')
  })

  it('consolidates with five trusted witnesses', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((p) => w(p))
    expect(computeStatus(action, five).status).toBe('consolidated')
    expect(computeStatus(action, five, { trusted: new Set(['a', 'b']) }).status).toBe('confirmed')
  })

  it('consolidates with two presencial collective members', () => {
    const ws = [w('a', 'presencial'), w('b', 'presencial')]
    expect(computeStatus(action, ws).status).toBe('confirmed')
    expect(computeStatus(action, ws, { members: new Set(['a', 'b']) }).status).toBe('consolidated')
  })

  it('ignores witnesses of other actions', () => {
    expect(computeStatus(action, [w('a'), { ...w('b'), actionId: 'other' }]).status).toBe('observed')
  })
})

describe('geohash', () => {
  it('encodes and decodes within the cell', () => {
    const hash = encodeGeohash(-27.6833, -48.4833, 5)
    expect(hash).toHaveLength(5)
    const { lat, lon } = decodeGeohash(hash)
    expect(Math.abs(lat + 27.6833)).toBeLessThan(0.05)
    expect(Math.abs(lon + 48.4833)).toBeLessThan(0.05)
  })
})
