import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import type { Action, Witness } from '../model/action'
import { buildCollectiveTemplate, type Collective } from '../model/collective'
import { statusFor } from '../model/status'
import { groupRef, loadCollective, loadGroupActions, loadMyCollectives, loadWitnesses, parseGroupRef, pubkeyFromText } from '../nostr/data'
import { sign } from '../nostr/keys'
import { enqueueEvent } from '../nostr/outbox'
import { go } from '../router'
import { useSession } from '../session'
import { canScan, Scanner } from '../ui/Scanner'
import { dayOf, displayName, monthOf } from '../ui/format'
import { IconPlus, IconPrint } from '../ui/icons'
import { StatusLabel, Trail } from '../ui/Trail'
import { actionTitle } from '../ui/labels'
import { useProfiles } from '../ui/useProfiles'

export function GroupsPage() {
  const { pubkey } = useSession()
  const { t, tn } = useI18n()
  const [groups, setGroups] = useState<Collective[] | null>(null)

  useEffect(() => {
    if (!pubkey) return
    let cancelled = false
    void loadMyCollectives(pubkey, false).then((g) => !cancelled && setGroups(g))
    void loadMyCollectives(pubkey, true).then((g) => !cancelled && setGroups(g))
    return () => {
      cancelled = true
    }
  }, [pubkey])

  return (
    <main className="page stack-lg">
      <div className="stack">
        <h1>{t('groups.title')}</h1>
        <p className="muted">{t('groups.intro')}</p>
      </div>
      {groups !== null && groups.length === 0 && <p>{t('groups.empty')}</p>}
      {groups && groups.length > 0 && (
        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.address}>
              <a href={`#/g/${groupRef(g)}`}>
                <h3>{g.name}</h3>
                <span className="muted small">{tn('groups.members', g.members.length + 1)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a className="btn btn-block" href="#/groups/new"><IconPlus /> {t('groups.create')}</a>
    </main>
  )
}

export function GroupPage({ refText }: { refText: string }) {
  const { pubkey } = useSession()
  const { t, tn, locale } = useI18n()
  const address = parseGroupRef(refText)
  const [group, setGroup] = useState<Collective | null | undefined>(undefined)
  const [actions, setActions] = useState<Action[]>([])
  const [witnesses, setWitnesses] = useState<Witness[]>([])

  useEffect(() => {
    if (!address) return setGroup(null)
    let cancelled = false
    const load = async (remote: boolean) => {
      const [g, acts] = await Promise.all([loadCollective(address, remote), loadGroupActions(address, remote)])
      if (cancelled) return
      setGroup((prev) => g ?? (remote ? null : prev))
      setActions(acts)
      const ws = await loadWitnesses(acts.map((a) => a.id), remote)
      if (!cancelled) setWitnesses(ws)
    }
    void load(false).then(() => load(true))
    return () => {
      cancelled = true
    }
  }, [address])

  const profiles = useProfiles(group ? [group.owner, ...group.members, ...actions.map((a) => a.pubkey)] : [])
  if (group === undefined) return <main className="page"><p className="muted">{t('home.loading')}</p></main>
  if (group === null) return <main className="page"><h1>{t('groups.notFound')}</h1></main>
  const groups = new Map([[group.address, group]])

  return (
    <main className="page stack-lg">
      <div className="stack">
        <h1>{group.name}</h1>
        {group.description && <p>{group.description}</p>}
        <div className="row">
          <a className="btn" href={`#/report?g=${refText}`}><IconPrint /> {t('groups.report')}</a>
          {group.owner === pubkey && <a className="btn btn-text" href={`#/g/${refText}/edit`}>{t('groups.edit')}</a>}
        </div>
      </div>

      <section className="stack">
        <h2>{t('groups.actions')}</h2>
        {actions.length === 0 && <p className="muted">{t('groups.noActions')}</p>}
        <ul className="log">
          {actions.map((a) => {
            const { status, witnesses: ws } = statusFor(a, witnesses, groups)
            return (
              <li key={a.id}>
                <a className="entry" href={`#/a/${a.id}`} style={{ gridTemplateColumns: '52px 1fr' }}>
                  <div className="entry-date"><b>{dayOf(a.createdAt)}</b><span>{monthOf(a.createdAt, locale)}</span></div>
                  <div className="entry-main">
                    <h3>{actionTitle(t, a)}</h3>
                    <span className="entry-meta">{t('home.by', { name: displayName(a.pubkey, profiles) })}</span>
                    <div className="row"><Trail witnesses={ws} status={status} /><StatusLabel status={status} /></div>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="stack">
        <h2>{t('groups.membersTitle')}</h2>
        <span className="muted small">{tn('groups.members', group.members.length + 1)}</span>
        <ul className="member-list">
          <li><strong>{displayName(group.owner, profiles)}</strong><span className="muted small">{t('groups.owner')}</span></li>
          {group.members.filter((m) => m !== group.owner).map((m) => (
            <li key={m}>{displayName(m, profiles)}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

const randomId = () => crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36), '')

export function GroupEdit({ refText }: { refText?: string }) {
  const { sk, pubkey } = useSession()
  const { t } = useI18n()
  const address = refText ? parseGroupRef(refText) : null
  const [loaded, setLoaded] = useState(!refText)
  const [d, setD] = useState(randomId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [candidate, setCandidate] = useState('')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const profiles = useProfiles(members)

  useEffect(() => {
    if (!address) return
    void loadCollective(address, true).then((g) => {
      if (g && g.owner === pubkey) {
        setD(g.d)
        setName(g.name)
        setDescription(g.description)
        setMembers(g.members)
      }
      setLoaded(true)
    })
  }, [address, pubkey])

  const addMember = useCallback(
    (text: string) => {
      const pk = pubkeyFromText(text)
      if (!pk) {
        setError(t('groups.invalidKey'))
        return false
      }
      setError('')
      setMembers((m) => (m.includes(pk) || pk === pubkey ? m : [...m, pk]))
      setCandidate('')
      setScanning(false)
      return true
    },
    [pubkey, t],
  )

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!sk || !pubkey) return
    const event = sign(sk, buildCollectiveTemplate({ d, name: name.trim(), description: description.trim(), members }))
    await enqueueEvent(event)
    go(`g/${groupRef({ owner: pubkey, d })}`)
  }

  if (!loaded) return <main className="page"><p className="muted">{t('home.loading')}</p></main>

  return (
    <main className="page">
      <form className="stack-lg" onSubmit={save}>
        <h1>{refText ? t('groups.edit') : t('groups.create')}</h1>
        <label className="field">
          <span>{t('groups.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>{t('groups.description')}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>

        <section className="stack">
          <h2>{t('groups.membersTitle')}</h2>
          <ul className="member-list">
            {members.map((m) => (
              <li key={m}>
                {displayName(m, profiles)}
                <button type="button" className="btn btn-text danger" onClick={() => setMembers((list) => list.filter((x) => x !== m))}>
                  {t('groups.remove')}
                </button>
              </li>
            ))}
          </ul>
          <label className="field">
            <span>{t('groups.addMember')}</span>
            <input value={candidate} onChange={(e) => setCandidate(e.target.value)} placeholder="npub1…" spellCheck={false} autoComplete="off" />
          </label>
          <p className="muted small">{t('groups.addHint')}</p>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button type="button" className="btn" onClick={() => addMember(candidate)} disabled={!candidate.trim()}>{t('groups.add')}</button>
            {canScan() && <button type="button" className="btn btn-text" onClick={() => setScanning((s) => !s)}>{t('groups.scanMember')}</button>}
          </div>
          {scanning && <Scanner onResult={addMember} wrongCode={t('scan.wrongKey')} />}
        </section>

        <button className="btn btn-flag btn-block" disabled={!name.trim()}>{t('groups.save')}</button>
      </form>
    </main>
  )
}
