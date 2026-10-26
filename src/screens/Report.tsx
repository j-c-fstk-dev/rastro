import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { METRICS, type Action, type MetricKey, type Witness } from '../model/action'
import type { Collective } from '../model/collective'
import { statusFor } from '../model/status'
import { actionRef, loadCollective, loadFeed, loadGroupActions, loadWitnesses, parseGroupRef } from '../nostr/data'
import { absoluteLink } from '../router'
import { useSession } from '../session'
import { ActionsMap } from '../ui/ActionsMap'
import { displayName, formatDate, formatNumber } from '../ui/format'
import { IconPrint } from '../ui/icons'
import { Photo } from '../ui/Photo'
import { actionTitle, headlineText } from '../ui/labels'
import { useProfiles } from '../ui/useProfiles'

const toInput = (d: Date) => d.toISOString().slice(0, 10)
const TOTALS = Object.keys(METRICS) as MetricKey[]

/** Printable impact report for a group, or for the actions this person recorded. */
export function Report({ groupText }: { groupText?: string }) {
  const { pubkey } = useSession()
  const { t, tn, locale } = useI18n()
  const address = groupText ? parseGroupRef(groupText) : null
  const [group, setGroup] = useState<Collective | null>(null)
  const [actions, setActions] = useState<Action[] | null>(null)
  const [witnesses, setWitnesses] = useState<Witness[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(toInput(new Date()))
  const profiles = useProfiles(pubkey ? [pubkey] : [])

  useEffect(() => {
    let cancelled = false
    const load = async (remote: boolean) => {
      const [g, acts] = address
        ? await Promise.all([loadCollective(address, remote), loadGroupActions(address, remote)])
        : [null, (await loadFeed(remote)).filter((a) => a.pubkey === pubkey)]
      if (cancelled) return
      setGroup(g)
      setActions(acts)
      const ws = await loadWitnesses(acts.map((a) => a.id), remote)
      if (!cancelled) setWitnesses(ws)
    }
    void load(false).then(() => load(true))
    return () => {
      cancelled = true
    }
  }, [address, pubkey])

  const rows = useMemo(() => {
    const groups = new Map(group ? [[group.address, group]] : [])
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() / 1000 : 0
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() / 1000 : Infinity
    return (actions ?? [])
      .filter((a) => a.createdAt >= fromTs && a.createdAt <= toTs)
      .map((a) => ({ action: a, ...statusFor(a, witnesses, groups) }))
      .sort((a, b) => a.action.createdAt - b.action.createdAt)
  }, [actions, witnesses, group, from, to])

  const counted = rows.filter((r) => r.status !== 'observed')
  const pending = rows.length - counted.length
  const totals = TOTALS.map((k) => ({ key: k, sum: counted.reduce((s, r) => s + (r.action.metrics[k] ?? 0), 0) })).filter((x) => x.sum > 0)
  const photos = counted.flatMap((r) => r.action.photos.filter((p) => p.role === 'after')).slice(0, 8)
  const label = useCallback((a: Action) => actionTitle(t, a), [t])
  const scope = group ? t('report.scope.group', { name: group.name }) : t('report.scope.mine', { name: pubkey ? displayName(pubkey, profiles) : '' })

  return (
    <main className="page report">
      <div className="report-head">
        <h1>{t('report.title')}</h1>
        <p>{scope}</p>
        <p className="muted small">
          {from
            ? `${formatDate(new Date(`${from}T12:00`).getTime() / 1000, locale)} – ${formatDate(new Date(`${to}T12:00`).getTime() / 1000, locale)}`
            : t('report.until', { date: formatDate(new Date(`${to || toInput(new Date())}T12:00`).getTime() / 1000, locale) })}
        </p>
      </div>

      <div className="report-controls no-print">
        <label className="field"><span>{t('report.from')}</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field"><span>{t('report.to')}</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn btn-ink" style={{ gridColumn: '1 / -1' }} onClick={() => window.print()}><IconPrint /> {t('report.print')}</button>
      </div>

      {actions !== null && rows.length === 0 && <p className="muted">{t('report.empty')}</p>}

      {rows.length > 0 && (
        <div className="stack-lg">
          <section>
            <h2>{t('report.totals')}</h2>
            <dl className="report-totals">
              <div><dt>{t('report.actions')}</dt><dd>{counted.length}</dd></div>
              {totals.map(({ key, sum }) => (
                <div key={key}>
                  <dt>{t(`metric.${key}`)}</dt>
                  <dd>{formatNumber(sum, locale)}{METRICS[key].unit && <small> {METRICS[key].unit}</small>}</dd>
                </div>
              ))}
            </dl>
            {pending > 0 && <p className="muted small">{t('report.totalsNote', { n: pending })}</p>}
          </section>

          {counted.some((r) => r.action.geohash) && (
            <ActionsMap actions={counted.map((r) => r.action)} className="report-map" label={label} />
          )}
          {photos.length > 0 && (
            <div className="report-photos">{photos.map((p) => <Photo key={p.sha256} photo={p} alt="" />)}</div>
          )}

          <section className="stack">
            <h2>{tn('report.count', rows.length)}</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t('report.date')}</th>
                  <th>{t('report.place')}</th>
                  <th>{t('report.impact')}</th>
                  <th>{t('report.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ action, status, witnesses: ws }) => (
                  <tr key={action.id}>
                    <td>{formatDate(action.createdAt, locale)}</td>
                    <td><a href={absoluteLink(`a/${actionRef(action)}`)}>{label(action)}</a></td>
                    <td>{headlineText(t, locale, action) ?? '–'}</td>
                    <td>{t(`status.${status}`)}, {tn('witness.count', ws.length)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="stack">
            <h2>{t('report.verify')}</h2>
            <p>{t('report.verifyBody')}</p>
            <p className="muted small">{t('report.generated', { date: formatDate(Date.now() / 1000, locale) })}</p>
          </section>
        </div>
      )}
    </main>
  )
}
