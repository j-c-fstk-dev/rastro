import { useCallback, useEffect, useState } from 'react'
import { toDecleanup } from '../export/decleanup'
import { useI18n } from '../i18n'
import { buildWitnessTemplate, METRICS, TYPE_SPEC, type Action, type MetricKey, type Witness } from '../model/action'
import { statusFor } from '../model/status'
import { actionRef, groupRef, loadAction, loadWitnesses } from '../nostr/data'
import { sign } from '../nostr/keys'
import { enqueueEvent } from '../nostr/outbox'
import { absoluteLink } from '../router'
import { useSession } from '../session'
import { displayName, formatDateTime, formatNumber } from '../ui/format'
import { IconCheck, IconDownload, IconQr, IconShare } from '../ui/icons'
import { Photo } from '../ui/Photo'
import { QrCode } from '../ui/QrCode'
import { StatusLabel, Trail } from '../ui/Trail'
import { useCollectives } from '../ui/useCollectives'
import { actionTitle, optionLabel } from '../ui/labels'
import { useProfiles } from '../ui/useProfiles'

export function ActionPage({ id, fromQr, isNew }: { id: string; fromQr: boolean; isNew: boolean }) {
  const { sk, pubkey, start } = useSession()
  const { t, tn, locale } = useI18n()
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
    // Keep picking up new testimonies while the page is open.
    const timer = setInterval(() => document.visibilityState === 'visible' && void refresh(true), 8000)
    return () => clearInterval(timer)
  }, [refresh])

  const profiles = useProfiles(action ? [action.pubkey, ...witnesses.map((w) => w.pubkey)] : [])
  const groups = useCollectives([action?.collective])

  if (action === undefined) return <main className="page"><p className="muted">{t('action.loading')}</p></main>
  if (action === null)
    return (
      <main className="page stack">
        <h1>{t('action.notFoundTitle')}</h1>
        <p className="muted">{t('action.notFoundBody')}</p>
      </main>
    )

  const { status, witnesses: counted } = statusFor(action, witnesses, groups)
  const group = action.collective ? groups.get(action.collective) : undefined
  const isMine = action.pubkey === pubkey
  const alreadyWitnessed = counted.some((w) => w.pubkey === pubkey)
  const ref = actionRef(action)
  const presenceLink = absoluteLink(`a/${ref}?w=1`)
  const publicLink = absoluteLink(`a/${ref}`)
  const title = actionTitle(t, action)

  const witness = async () => {
    setBusy(true)
    const key = sk ?? (await start(name.trim()))
    await enqueueEvent(sign(key, buildWitnessTemplate(action, fromQr ? 'presencial' : 'remoto', note.trim())))
    await refresh(false)
    setBusy(false)
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Rastro: ${title}`, text: t('action.shareText'), url: publicLink }).catch(() => {})
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

  // The type's own numbers first, in form order, then anything else that was recorded.
  const order = [...TYPE_SPEC[action.type].metrics, ...(Object.keys(METRICS) as MetricKey[])]
  const facts = [...new Set(order)].filter((k) => action.metrics[k] !== undefined)

  return (
    <main className={`page ${sk ? '' : 'no-tabbar'}`}>
      {showQr && isMine && (
        <div className="qr-overlay" role="dialog" aria-modal="true" aria-label={t('action.qrTitle')}>
          <h2>{t('action.qrTitle')}</h2>
          <QrCode value={presenceLink} />
          <p>{t('action.qrBody')}</p>
          <p className="qr-count">{tn('witness.count', counted.length)}</p>
          <button className="btn" onClick={() => setShowQr(false)}>{t('action.close')}</button>
        </div>
      )}

      <div className="action-hero">
        <div className="spread">
          <StatusLabel status={status} />
          <span className="muted small">{formatDateTime(action.createdAt, locale)}</span>
        </div>
        <h1>{title}</h1>
        <p className="muted">
          {t('action.by', { name: displayName(action.pubkey, profiles) })}
          {isMine && ` ${t('action.you')}`}
          {group && (
            <>
              {', '}
              <a href={`#/g/${groupRef(group)}`}>{t('action.in', { group: group.name })}</a>
            </>
          )}
        </p>
      </div>

      <div className={`action-photos ${action.photos.length === 1 ? 'single' : ''}`}>
        {action.photos.map((p) => {
          const label = t(p.role === 'before' ? 'new.before' : 'new.after')
          return (
            <figure key={p.sha256}>
              <Photo photo={p} alt={label} />
              <span className="photo-tag">{label}</span>
            </figure>
          )
        })}
      </div>

      {facts.length > 0 && (
        <dl className="facts">
          {facts.map((k) => (
            <div key={k}>
              <dt>{t(`metric.${k}`)}</dt>
              <dd>
                {formatNumber(action.metrics[k]!, locale)}
                {METRICS[k].unit && <small>{METRICS[k].unit}</small>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {action.options.length > 0 && (
        <div className="chips" style={{ marginBottom: 18 }}>
          {action.options.map((o) => <span key={o} className="chip">{optionLabel(t, action.type, o)}</span>)}
        </div>
      )}
      {action.description && <p className="notes">{action.description}</p>}

      <section className="proof" aria-labelledby="witnesses-title">
        <div className="proof-head">
          <div className="spread">
            <h2 id="witnesses-title">{t('action.witnesses')}</h2>
            <span className="muted small">{tn('witness.count', counted.length)}</span>
          </div>
          <Trail witnesses={counted} status={status} large />
          <p className="muted small">{t(`status.help.${status}`)}</p>
        </div>
        {counted.length === 0 && <p className="muted">{t('action.noWitnesses')}</p>}
        <ul className="witness-list">
          {counted.map((w) => (
            <li key={w.id}>
              <strong>{displayName(w.pubkey, profiles)}</strong>
              <span className={`witness-mode ${w.mode === 'presencial' ? 'onsite' : ''}`}>
                {t(w.mode === 'presencial' ? 'action.onSite' : 'action.remote')}
              </span>
              {w.note && <p>{w.note}</p>}
            </li>
          ))}
        </ul>

        {!isMine && !alreadyWitnessed && (
          <div className="stack witness-form">
            <h3>{t(fromQr ? 'action.askOnSite' : 'action.askRemote')}</h3>
            {!sk && (
              <label className="field">
                <span>{t('action.yourName')}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="nickname" />
              </label>
            )}
            <label className="field">
              <span>{t('action.note')}</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('action.notePlaceholder')} />
            </label>
            <button className="btn btn-flag btn-block" onClick={() => void witness()} disabled={busy || (!sk && !name.trim())}>
              {t(fromQr ? 'action.iWasThere' : 'action.iSawIt')}
            </button>
          </div>
        )}
        {alreadyWitnessed && <p className="ok row"><IconCheck width={20} /> {t('action.confirmed')}</p>}
      </section>

      <div className="stack">
        {isMine && (
          <button className="btn btn-flag btn-block" onClick={() => setShowQr(true)}>
            <IconQr /> {t('action.showQr')}
          </button>
        )}
        <button className="btn btn-block" onClick={() => void share()}>
          <IconShare /> {copied ? t('action.copied') : t('action.share')}
        </button>
        {isMine && action.type === 'cleanup' && (
          <button className="btn btn-text" onClick={exportDecleanup}>
            <IconDownload /> {t('action.export')}
          </button>
        )}
      </div>
    </main>
  )
}
