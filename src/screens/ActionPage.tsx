import { useCallback, useEffect, useState } from 'react'
import { toDecleanup } from '../export/decleanup'
import { buildWitnessTemplate, METRICS, WASTE_TYPES, type Action, type MetricKey, type Witness } from '../model/action'
import { computeStatus } from '../model/status'
import { actionRef, loadAction, loadWitnesses } from '../nostr/data'
import { sign } from '../nostr/keys'
import { enqueueEvent } from '../nostr/outbox'
import { absoluteLink } from '../router'
import { useSession } from '../session'
import { displayName, formatDateTime, formatNumber } from '../ui/format'
import { Photo } from '../ui/Photo'
import { QrCode } from '../ui/QrCode'
import { StatusBadge } from '../ui/StatusBadge'
import { useProfiles } from '../ui/useProfiles'

const STATUS_HELP = {
  observed: 'Publicada por quem fez. Ainda sem testemunhas.',
  confirmed: 'Pelo menos 2 pessoas confirmaram esta ação.',
  consolidated: 'Confirmada por 5 pessoas, ou por 2 membros do coletivo que estavam no local.',
}

export function ActionPage({ id, fromQr, isNew }: { id: string; fromQr: boolean; isNew: boolean }) {
  const { sk, pubkey, start } = useSession()
  const [action, setAction] = useState<Action | null | undefined>(undefined)
  const [witnesses, setWitnesses] = useState<Witness[]>([])
  const [showQr, setShowQr] = useState(isNew)
  const [note, setNote] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(
    async (remote: boolean) => {
      const found = await loadAction(id)
      setAction((prev) => found ?? (remote ? null : prev))
      if (found) setWitnesses(await loadWitnesses([found.id], remote))
    },
    [id],
  )

  useEffect(() => {
    // Open the presence QR once after publishing, not again on reload.
    if (isNew) history.replaceState(null, '', location.hash.replace(/\?.*$/, ''))
  }, [isNew])

  useEffect(() => {
    void refresh(false).then(() => refresh(true))
    // While the presence QR is open, keep picking up new testimonies.
    const timer = setInterval(() => void refresh(true), 8000)
    return () => clearInterval(timer)
  }, [refresh])

  const profiles = useProfiles(action ? [action.pubkey, ...witnesses.map((w) => w.pubkey)] : [])

  if (action === undefined) return <main className="page"><p className="muted">Buscando a ação…</p></main>
  if (action === null)
    return (
      <main className="page">
        <h1>Ação não encontrada</h1>
        <p className="muted">Ela pode ainda não ter chegado aos servidores que este aparelho usa. Tente de novo com internet.</p>
      </main>
    )

  const { status, witnesses: counted } = computeStatus(action, witnesses)
  const isMine = action.pubkey === pubkey
  const alreadyWitnessed = counted.some((w) => w.pubkey === pubkey)
  const ref = actionRef(action)
  const presenceLink = absoluteLink(`a/${ref}?w=1`)
  const publicLink = absoluteLink(`a/${ref}`)

  const witness = async () => {
    setBusy(true)
    const key = sk ?? (await start(name.trim()))
    const event = sign(key, buildWitnessTemplate(action, fromQr ? 'presencial' : 'remoto', note.trim()))
    await enqueueEvent(event)
    await refresh(false)
    setBusy(false)
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Rastro', text: action.place ?? 'Ação no Rastro', url: publicLink }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
    }
  }

  const exportDecleanup = () => {
    const data = toDecleanup(action, counted, status, ref)
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `rastro-${action.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const metricKeys = (Object.keys(METRICS) as MetricKey[]).filter((k) => action.metrics[k] !== undefined)

  return (
    <main className="page">
      {showQr && isMine && (
        <div className="qr-overlay" role="dialog" aria-label="QR de presença">
          <h2>Quem estava lá, escaneie</h2>
          <QrCode value={presenceLink} />
          <p className="muted small center">
            Cada pessoa confirma com a própria chave. {counted.length} {counted.length === 1 ? 'testemunha' : 'testemunhas'} até agora.
          </p>
          <button className="button primary big" onClick={() => setShowQr(false)}>
            Fechar
          </button>
        </div>
      )}

      <div className="action-head">
        <StatusBadge status={status} />
        <span className="muted small">{formatDateTime(action.createdAt)}</span>
      </div>
      <h1>{action.place || 'Ação de limpeza'}</h1>
      <p className="muted">por {displayName(action.pubkey, profiles)}{isMine && ' (você)'}</p>

      <div className="photo-pair">
        {action.photos.map((p) => (
          <figure key={p.sha256}>
            <Photo photo={p} alt={p.role === 'before' ? 'Antes' : 'Depois'} />
            <figcaption>{p.role === 'before' ? 'Antes' : 'Depois'}</figcaption>
          </figure>
        ))}
      </div>

      {metricKeys.length > 0 && (
        <dl className="metrics">
          {metricKeys.map((k) => (
            <div key={k}>
              <dt>{METRICS[k].label}</dt>
              <dd>
                {formatNumber(action.metrics[k]!)} <small>{METRICS[k].unit}</small>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {action.waste.length > 0 && (
        <div className="chips">
          {action.waste.map((w) => (
            <span key={w} className="chip on">{WASTE_TYPES[w]}</span>
          ))}
        </div>
      )}
      {action.description && <p className="description">{action.description}</p>}

      <section className="stack panel">
        <h2>Testemunhas</h2>
        <p className="muted small">{STATUS_HELP[status]}</p>
        {counted.length === 0 && <p className="muted">Ninguém confirmou ainda.</p>}
        <ul className="witnesses">
          {counted.map((w) => (
            <li key={w.id}>
              <strong>{displayName(w.pubkey, profiles)}</strong>
              <span className={`tag ${w.mode}`}>{w.mode === 'presencial' ? 'esteve no local' : 'viu remotamente'}</span>
              {w.note && <p>{w.note}</p>}
            </li>
          ))}
        </ul>

        {!isMine && !alreadyWitnessed && (
          <div className="stack witness-box">
            {fromQr ? <p><strong>Você estava neste mutirão?</strong></p> : <p>Você viu esta ação ou o resultado dela?</p>}
            {!sk && (
              <label className="field">
                <span>Seu nome (cria sua identidade neste aparelho)</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
            )}
            <label className="field">
              <span>Comentário (opcional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: ajudei no trecho norte" />
            </label>
            <button className="button primary big" onClick={() => void witness()} disabled={busy || (!sk && !name.trim())}>
              {fromQr ? 'Eu estive aqui' : 'Confirmar que vi'}
            </button>
          </div>
        )}
        {alreadyWitnessed && <p className="ok">✓ Você confirmou esta ação.</p>}
      </section>

      <div className="stack">
        {isMine && (
          <button className="button primary big" onClick={() => setShowQr(true)}>
            Mostrar QR de presença
          </button>
        )}
        <button className="button" onClick={() => void share()}>
          {copied ? 'Link copiado' : 'Compartilhar link público'}
        </button>
        {isMine && (
          <button className="button" onClick={exportDecleanup}>
            Exportar para DeCleanup (JSON)
          </button>
        )}
      </div>
    </main>
  )
}
