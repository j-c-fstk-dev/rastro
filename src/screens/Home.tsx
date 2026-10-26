import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { Action, Witness } from '../model/action'
import { statusFor } from '../model/status'
import { loadFeed, loadWitnesses } from '../nostr/data'
import { useSession } from '../session'
import { dayOf, displayName, formatNumber, monthOf } from '../ui/format'
import { IconScan } from '../ui/icons'
import { Photo } from '../ui/Photo'
import { StatusLabel, Trail } from '../ui/Trail'
import { useCollectives } from '../ui/useCollectives'
import { useProfiles } from '../ui/useProfiles'

export function useFeed() {
  const [actions, setActions] = useState<Action[] | null>(null)
  const [witnesses, setWitnesses] = useState<Witness[]>([])
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
  return { actions, witnesses }
}

export function Home() {
  const { pubkey } = useSession()
  const { t, tn, locale } = useI18n()
  const { actions, witnesses } = useFeed()
  const [mineOnly, setMineOnly] = useState(false)
  const profiles = useProfiles(actions?.map((a) => a.pubkey) ?? [])
  const groups = useCollectives(actions?.map((a) => a.collective) ?? [])
  const visible = actions?.filter((a) => !mineOnly || a.pubkey === pubkey) ?? []

  return (
    <main className="page">
      <div className="home-head">
        <a className="btn btn-block" href="#/scan">
          <IconScan /> {t('home.scan')}
        </a>
        <div className="spread">
          <h1>{t('nav.log')}</h1>
          <div className="segmented" role="group">
            <button aria-pressed={!mineOnly} onClick={() => setMineOnly(false)}>{t('home.all')}</button>
            <button aria-pressed={mineOnly} onClick={() => setMineOnly(true)}>{t('home.mine')}</button>
          </div>
        </div>
      </div>

      {actions === null && <p className="muted">{t('home.loading')}</p>}
      {actions !== null && visible.length === 0 && (
        <div className="empty">
          <h2>{mineOnly ? t('home.emptyMine') : t('home.emptyTitle')}</h2>
          <p className="muted">{t('home.emptyBody')}</p>
          <a className="btn btn-flag" href="#/new">{t('new.title')}</a>
        </div>
      )}

      <ul className="log">
        {visible.map((action) => {
          const { status, witnesses: ws } = statusFor(action, witnesses, groups)
          const cover = action.photos.find((p) => p.role === 'after') ?? action.photos[0]
          const weight = action.metrics.weight_kg
          return (
            <li key={action.id}>
              <a className="entry" href={`#/a/${action.id}`}>
                <div className="entry-date">
                  <b>{dayOf(action.createdAt)}</b>
                  <span>{monthOf(action.createdAt, locale)}</span>
                </div>
                <div className="entry-main">
                  <h3>{action.place || t('home.untitled')}</h3>
                  <span className="entry-meta">
                    {weight !== undefined ? `${formatNumber(weight, locale)} kg, ` : ''}
                    {t('home.by', { name: displayName(action.pubkey, profiles) })}
                  </span>
                  <div className="row">
                    <Trail witnesses={ws} status={status} />
                    <StatusLabel status={status} />
                  </div>
                  <span className="visually-hidden">{tn('witness.count', ws.length)}</span>
                </div>
                {cover ? <Photo photo={cover} alt="" className="entry-photo" /> : <div className="entry-photo" />}
              </a>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
