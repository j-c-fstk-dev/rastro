import { useEffect, useState, type FormEvent } from 'react'
import { encodeGeohash } from '../geo/geohash'
import { useI18n } from '../i18n'
import { blobUrl } from '../media/blossom'
import { prepareImage, type PreparedImage } from '../media/image'
import { buildActionTemplate, METRICS, WASTE_TYPES, type MetricKey, type PhotoRole, type WasteType } from '../model/action'
import type { Collective } from '../model/collective'
import { getBlossomServers } from '../nostr/config'
import { loadMyCollectives } from '../nostr/data'
import { sign } from '../nostr/keys'
import { enqueueBlob, enqueueEvent } from '../nostr/outbox'
import { go } from '../router'
import { useSession } from '../session'
import { IconCamera, IconCheck, IconPin } from '../ui/icons'

type Photos = Partial<Record<PhotoRole, PreparedImage & { preview: string }>>
type GeoState = { status: 'idle' | 'loading' | 'error' } | { status: 'ok'; lat: number; lon: number }

const LAST_GROUP_KEY = 'rastro.lastGroup'

function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const n = Number(value) || 0
  return (
    <div className="stepper">
      <button type="button" aria-label={t('new.decrease', { label })} onClick={() => onChange(String(Math.max(0, n - 1)))}>−</button>
      <input inputMode="numeric" aria-label={label} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
      <button type="button" aria-label={t('new.increase', { label })} onClick={() => onChange(String(n + 1))}>+</button>
    </div>
  )
}

export function NewAction() {
  const { sk, pubkey } = useSession()
  const { t } = useI18n()
  const [photos, setPhotos] = useState<Photos>({})
  const [place, setPlace] = useState('')
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [precise, setPrecise] = useState(false)
  const [metrics, setMetrics] = useState<Partial<Record<MetricKey, string>>>({})
  const [waste, setWaste] = useState<WasteType[]>([])
  const [description, setDescription] = useState('')
  const [groups, setGroups] = useState<Collective[]>([])
  const [group, setGroup] = useState(() => localStorage.getItem(LAST_GROUP_KEY) ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pubkey) return
    let cancelled = false
    void loadMyCollectives(pubkey, false).then((g) => !cancelled && setGroups(g))
    void loadMyCollectives(pubkey, true).then((g) => !cancelled && setGroups(g))
    return () => {
      cancelled = true
    }
  }, [pubkey])

  const pickPhoto = async (role: PhotoRole, file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      const prepared = await prepareImage(file)
      setPhotos((prev) => {
        if (prev[role]) URL.revokeObjectURL(prev[role].preview)
        return { ...prev, [role]: { ...prepared, preview: URL.createObjectURL(prepared.blob) } }
      })
    } catch {
      setError(t('new.photoError'))
    }
  }

  const locate = () => {
    setGeo({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ status: 'ok', lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeo({ status: 'error' }),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const toggleWaste = (w: WasteType) => setWaste((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]))

  const publish = async (e: FormEvent) => {
    e.preventDefault()
    if (!sk) return
    setBusy(true)
    setError('')
    try {
      const server = getBlossomServers()[0]
      const chosen = Object.entries(photos) as [PhotoRole, PreparedImage][]
      for (const [, p] of chosen) await enqueueBlob(p.sha256, p.blob)

      const numbers: Partial<Record<MetricKey, number>> = {}
      for (const [key, raw] of Object.entries(metrics)) {
        const value = Number(String(raw).replace(',', '.'))
        if (raw && Number.isFinite(value) && value >= 0) numbers[key as MetricKey] = value
      }

      const validGroup = groups.some((g) => g.address === group) ? group : undefined
      localStorage.setItem(LAST_GROUP_KEY, validGroup ?? '')
      const event = sign(
        sk,
        buildActionTemplate({
          type: 'cleanup',
          description: description.trim(),
          place: place.trim() || undefined,
          geohash: geo.status === 'ok' ? encodeGeohash(geo.lat, geo.lon, precise ? 7 : 5) : undefined,
          collective: validGroup,
          metrics: numbers,
          waste,
          photos: chosen.map(([role, p]) => ({ role, sha256: p.sha256, mime: p.mime, url: blobUrl(server, p.sha256) })),
        }),
      )
      await enqueueEvent(event)
      go(`a/${event.id}?new=1`)
    } catch {
      setError(t('new.error'))
      setBusy(false)
    }
  }

  const hasPhoto = Boolean(photos.before || photos.after)

  return (
    <main className="page">
      <form onSubmit={publish} className="stack-lg">
        <h1>{t('new.title')}</h1>

        <section className="stack">
          <h2>{t('new.photos')}</h2>
          <div className="photo-pair">
            {(['before', 'after'] as PhotoRole[]).map((role) => {
              const label = t(role === 'before' ? 'new.before' : 'new.after')
              return (
                <label key={role} className={`photo-slot ${photos[role] ? 'filled' : ''}`}>
                  {photos[role] ? (
                    <img src={photos[role].preview} alt={label} />
                  ) : (
                    <span className="slot-empty"><IconCamera />{t('new.addPhoto')}</span>
                  )}
                  <span className="photo-tag">{label}</span>
                  <input type="file" accept="image/*" capture="environment" aria-label={`${t('new.addPhoto')}: ${label}`} onChange={(e) => void pickPhoto(role, e.target.files?.[0])} />
                </label>
              )
            })}
          </div>
          <p className="muted small">{t('new.photoPrivacy')}</p>
        </section>

        <section className="stack">
          <h2>{t('new.where')}</h2>
          <label className="field">
            <span>{t('new.place')}</span>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t('new.placePlaceholder')} />
          </label>
          <button type="button" className="btn" onClick={locate} disabled={geo.status === 'loading'}>
            {geo.status === 'ok' ? <IconCheck /> : <IconPin />}
            {geo.status === 'ok' ? t('new.located') : geo.status === 'loading' ? t('new.locating') : t('new.locate')}
          </button>
          {geo.status === 'error' && <p className="error small">{t('new.locateError')}</p>}
          {geo.status === 'ok' && (
            <label className="check">
              <input type="checkbox" checked={precise} onChange={(e) => setPrecise(e.target.checked)} />
              <span>{t('new.precise')}</span>
            </label>
          )}
        </section>

        <section className="stack">
          <h2>{t('new.numbers')}</h2>
          <div className="metrics-grid">
            {(Object.keys(METRICS) as MetricKey[]).map((key) => {
              const label = t(`metric.${key}`)
              const set = (v: string) => setMetrics((m) => ({ ...m, [key]: v }))
              return (
                <div key={key} className="field">
                  <span className="label">
                    {label} {METRICS[key].unit && <small>({METRICS[key].unit})</small>}
                  </span>
                  {METRICS[key].step ? (
                    <Stepper label={label} value={metrics[key] ?? ''} onChange={set} />
                  ) : (
                    <input inputMode="decimal" aria-label={label} value={metrics[key] ?? ''} onChange={(e) => set(e.target.value)} />
                  )}
                </div>
              )
            })}
          </div>
          <span className="label">{t('new.wasteTypes')}</span>
          <div className="chips">
            {WASTE_TYPES.map((w) => (
              <button type="button" key={w} className="chip" aria-pressed={waste.includes(w)} onClick={() => toggleWaste(w)}>
                {t(`waste.${w}`)}
              </button>
            ))}
          </div>
        </section>

        {groups.length > 0 && (
          <label className="field">
            <span>{t('new.group')}</span>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">{t('new.noGroup')}</option>
              {groups.map((g) => (
                <option key={g.address} value={g.address}>{g.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>{t('new.description')}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>

        <div className="publish-bar stack">
          {error && <p className="error">{error}</p>}
          {!hasPhoto && <p className="muted small center">{t('new.needPhoto')}</p>}
          <button className="btn btn-flag btn-block" disabled={busy || !hasPhoto}>
            {busy ? t('new.publishing') : t('new.publish')}
          </button>
        </div>
      </form>
    </main>
  )
}
