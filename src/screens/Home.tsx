import { useEffect, useState } from 'react'
import type { Action, Witness } from '../model/action'
import { computeStatus } from '../model/status'
import { loadFeed, loadWitnesses } from '../nostr/data'
import { go } from '../router'
import { useSession } from '../session'
import { displayName, formatDate, formatNumber } from '../ui/format'
import { Photo } from '../ui/Photo'
import { StatusBadge } from '../ui/StatusBadge'
import { useProfiles } from '../ui/useProfiles'

export function Home() {
  const { pubkey } = useSession()
  const [actions, setActions] = useState<Action[] | null>(null)
  const [witnesses, setWitnesses] = useState<Witness[]>([])
  const [mineOnly, setMineOnly] = useState(false)
  const profiles = useProfiles(actions?.map((a) => a.pubkey) ?? [])

  useEffect(() => {
    let cancelled = false
    const load = async (remote: boolean) => {
      const feed = await loadFeed(remote)
      if (cancelled) return
      setActions(feed)
      const ws = await loadWitnesses(feed.map((a) => a.id), remote)
      if (!cancelled) setWitnesses(ws)
    }
    void load(false).then(() => load(true))
    return () => {
      cancelled = true
    }
  }, [])

  const visible = actions?.filter((a) => !mineOnly || a.pubkey === pubkey) ?? []

  return (
    <main className="page">
      <div className="hero-actions">
        <button className="button primary big" onClick={() => go('new')}>
          + Registrar ação
        </button>
        <button className="button big" onClick={() => go('scan')}>
          Escanear QR de presença
        </button>
      </div>

      <div className="section-head">
        <h2>Ações</h2>
        <div className="segmented">
          <button className={!mineOnly ? 'active' : ''} onClick={() => setMineOnly(false)}>
            Todas
          </button>
          <button className={mineOnly ? 'active' : ''} onClick={() => setMineOnly(true)}>
            Minhas
          </button>
        </div>
      </div>

      {actions === null && <p className="muted">Carregando…</p>}
      {actions !== null && visible.length === 0 && (
        <div className="empty">
          <p>Nenhuma ação por aqui ainda.</p>
          <p className="muted small">Registre o primeiro mutirão: fotos de antes e depois, alguns números e pronto.</p>
        </div>
      )}

      <ul className="cards">
        {visible.map((action) => {
          const { status, witnesses: ws } = computeStatus(action, witnesses)
          const cover = action.photos.find((p) => p.role === 'after') ?? action.photos[0]
          return (
            <li key={action.id}>
              <a className="card" href={`#/a/${action.id}`}>
                {cover ? <Photo photo={cover} alt="" className="card-photo" /> : <div className="card-photo" />}
                <div className="card-body">
                  <div className="card-top">
                    <StatusBadge status={status} />
                    <span className="muted small">{formatDate(action.createdAt)}</span>
                  </div>
                  <strong>{action.place || 'Ação de limpeza'}</strong>
                  <span className="muted small">
                    {action.metrics.weight_kg !== undefined && `${formatNumber(action.metrics.weight_kg)} kg · `}
                    {ws.length} {ws.length === 1 ? 'testemunha' : 'testemunhas'} · por {displayName(action.pubkey, profiles)}
                  </span>
                </div>
              </a>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
