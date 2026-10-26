import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { KeyError } from '../nostr/keys'
import { useSession } from '../session'
import { LangSwitch } from '../ui/LangSwitch'
import { Trail } from '../ui/Trail'
import type { Witness } from '../model/action'

const demoTrail: Witness[] = [
  { id: '1', pubkey: 'a', actionId: '', mode: 'presencial', note: '', createdAt: 0 },
  { id: '2', pubkey: 'b', actionId: '', mode: 'presencial', note: '', createdAt: 0 },
  { id: '3', pubkey: 'c', actionId: '', mode: 'remoto', note: '', createdAt: 0 },
]

export function Welcome() {
  const { start, restore } = useSession()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [key, setKey] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onStart = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await start(name.trim())
  }

  const onRestore = (e: FormEvent) => {
    e.preventDefault()
    try {
      restore(key, password || undefined)
    } catch (err) {
      if (err instanceof KeyError) setError(t(err.code === 'needs-password' ? 'keys.needsPassword' : 'keys.notNsec'))
      else setError(t('welcome.restoreError'))
    }
  }

  return (
    <main className="welcome">
      <div className="welcome-top">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={40} height={40} />
        <LangSwitch />
      </div>
      <div className="welcome-mark">
        <Trail witnesses={demoTrail} status="confirmed" large />
        <h1>Rastro</h1>
        <p className="lead">{t('app.tagline')}</p>
      </div>

      {!restoring ? (
        <form onSubmit={onStart} className="stack">
          <label className="field">
            <span>{t('welcome.nameLabel')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('welcome.namePlaceholder')} required autoComplete="nickname" />
          </label>
          <button className="btn btn-flag btn-block" disabled={busy || !name.trim()}>
            {t('welcome.start')}
          </button>
          <p className="muted small">{t('welcome.explain')}</p>
          <button type="button" className="btn btn-text" onClick={() => setRestoring(true)}>
            {t('welcome.haveKey')}
          </button>
        </form>
      ) : (
        <form onSubmit={onRestore} className="stack">
          <label className="field">
            <span>{t('welcome.keyLabel')}</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} required />
          </label>
          {key.trim().startsWith('ncryptsec') && (
            <label className="field">
              <span>{t('welcome.keyPassword')}</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn btn-ink btn-block">{t('welcome.restore')}</button>
          <button type="button" className="btn btn-text" onClick={() => setRestoring(false)}>
            {t('welcome.back')}
          </button>
        </form>
      )}
    </main>
  )
}
