import { useState, type FormEvent } from 'react'
import { encodeGeohash } from '../geo/geohash'
import { blobUrl } from '../media/blossom'
import { prepareImage, type PreparedImage } from '../media/image'
import {
  buildActionTemplate,
  METRICS,
  WASTE_TYPES,
  type MetricKey,
  type PhotoRole,
  type WasteType,
} from '../model/action'
import { getBlossomServers } from '../nostr/config'
import { sign } from '../nostr/keys'
import { enqueueBlob, enqueueEvent } from '../nostr/outbox'
import { go } from '../router'
import { useSession } from '../session'

type Photos = Partial<Record<PhotoRole, PreparedImage & { preview: string }>>
type GeoState = { status: 'idle' | 'loading' | 'error' } | { status: 'ok'; lat: number; lon: number }

const ROLE_LABEL: Record<PhotoRole, string> = { before: 'Antes', after: 'Depois' }

export function NewAction() {
  const { sk } = useSession()
  const [photos, setPhotos] = useState<Photos>({})
  const [place, setPlace] = useState('')
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [precise, setPrecise] = useState(false)
  const [metrics, setMetrics] = useState<Partial<Record<MetricKey, string>>>({})
  const [waste, setWaste] = useState<WasteType[]>([])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pickPhoto = async (role: PhotoRole, file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      const prepared = await prepareImage(file)
      setPhotos((prev) => {
        if (prev[role]) URL.revokeObjectURL(prev[role].preview)
        return { ...prev, [role]: { ...prepared, preview: URL.createObjectURL(prepared.blob) } }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler a foto.')
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

  const toggleWaste = (w: WasteType) =>
    setWaste((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]))

  const publish = async (e: FormEvent) => {
    e.preventDefault()
    if (!sk) return
    setBusy(true)
    try {
      const server = getBlossomServers()[0]
      const photoList = (Object.entries(photos) as [PhotoRole, PreparedImage][]).map(([role, p]) => ({
        role,
        sha256: p.sha256,
        mime: p.mime,
        url: blobUrl(server, p.sha256),
      }))
      for (const [, p] of Object.entries(photos) as [PhotoRole, PreparedImage][]) await enqueueBlob(p.sha256, p.blob)

      const numbers: Partial<Record<MetricKey, number>> = {}
      for (const [key, raw] of Object.entries(metrics)) {
        const value = Number(String(raw).replace(',', '.'))
        if (raw && Number.isFinite(value) && value >= 0) numbers[key as MetricKey] = value
      }

      const event = sign(
        sk,
        buildActionTemplate({
          type: 'cleanup',
          description: description.trim(),
          place: place.trim() || undefined,
          geohash: geo.status === 'ok' ? encodeGeohash(geo.lat, geo.lon, precise ? 7 : 5) : undefined,
          metrics: numbers,
          waste,
          photos: photoList,
        }),
      )
      await enqueueEvent(event)
      go(`a/${event.id}?new=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado ao publicar.')
      setBusy(false)
    }
  }

  const hasPhoto = Boolean(photos.before || photos.after)

  return (
    <main className="page">
      <h1>Nova ação de limpeza</h1>
      <form onSubmit={publish} className="stack">
        <section className="stack">
          <h2>Fotos</h2>
          <div className="photo-pair">
            {(['before', 'after'] as PhotoRole[]).map((role) => (
              <label key={role} className="photo-slot">
                {photos[role] ? <img src={photos[role].preview} alt={ROLE_LABEL[role]} /> : <span>+ Foto</span>}
                <em>{ROLE_LABEL[role]}</em>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => void pickPhoto(role, e.target.files?.[0])}
                />
              </label>
            ))}
          </div>
          <p className="muted small">
            Os dados escondidos das fotos (GPS, câmera, horário) são removidos. Evite mostrar rostos, principalmente de
            crianças, sem autorização.
          </p>
        </section>

        <section className="stack">
          <h2>Onde</h2>
          <label className="field">
            <span>Nome do lugar</span>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ex.: Praia do Campeche, Florianópolis" />
          </label>
          <div className="row">
            <button type="button" className="button" onClick={locate} disabled={geo.status === 'loading'}>
              {geo.status === 'ok' ? '✓ Localização registrada' : geo.status === 'loading' ? 'Buscando…' : 'Usar minha localização'}
            </button>
          </div>
          {geo.status === 'error' && <p className="error small">Não foi possível obter a localização. Você pode seguir sem ela.</p>}
          {geo.status === 'ok' && (
            <label className="check">
              <input type="checkbox" checked={precise} onChange={(e) => setPrecise(e.target.checked)} />
              <span>
                Publicar localização precisa (~150 m). Por padrão, só a região aproximada (~5 km) fica pública.
              </span>
            </label>
          )}
        </section>

        <section className="stack">
          <h2>Números</h2>
          <div className="metrics-grid">
            {(Object.keys(METRICS) as MetricKey[]).map((key) => (
              <label key={key} className="field">
                <span>
                  {METRICS[key].label}
                  {METRICS[key].unit && <small> ({METRICS[key].unit})</small>}
                </span>
                <input
                  inputMode="decimal"
                  value={metrics[key] ?? ''}
                  onChange={(e) => setMetrics((m) => ({ ...m, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <span className="label">Tipos de resíduo</span>
          <div className="chips">
            {(Object.keys(WASTE_TYPES) as WasteType[]).map((w) => (
              <button
                type="button"
                key={w}
                className={`chip ${waste.includes(w) ? 'on' : ''}`}
                aria-pressed={waste.includes(w)}
                onClick={() => toggleWaste(w)}
              >
                {WASTE_TYPES[w]}
              </button>
            ))}
          </div>
        </section>

        <label className="field">
          <span>Descrição (opcional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="button primary big" disabled={busy || !hasPhoto}>
          {busy ? 'Assinando…' : 'Assinar e publicar'}
        </button>
        {!hasPhoto && <p className="muted small center">Adicione pelo menos uma foto.</p>}
      </form>
    </main>
  )
}
