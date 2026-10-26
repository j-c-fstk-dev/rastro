import { useState } from 'react'
import { useI18n } from '../i18n'
import { DEFAULT_BLOSSOM_SERVERS, DEFAULT_RELAYS, getBlossomServers, getRelays, resetInfrastructure, setBlossomServers, setRelays } from '../nostr/config'
import { encryptedBackup, forgetIdentity, npubOf, nsecOf } from '../nostr/keys'
import { flush } from '../nostr/outbox'
import { useSession } from '../session'
import { IconPrint } from '../ui/icons'
import { LangSwitch } from '../ui/LangSwitch'
import { QrCode } from '../ui/QrCode'
import { useProfiles } from '../ui/useProfiles'

const toLines = (list: string[]) => list.join('\n')
const fromLines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean)

export function Me() {
  const { sk, pubkey, pending, online, updateName } = useSession()
  const { t, tn } = useI18n()
  const profiles = useProfiles(pubkey ? [pubkey] : [])
  const [name, setName] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [backup, setBackup] = useState('')
  const [relays, setRelaysText] = useState(toLines(getRelays()))
  const [servers, setServersText] = useState(toLines(getBlossomServers()))
  const [saved, setSaved] = useState('')

  if (!sk || !pubkey) return null
  const currentName = profiles.get(pubkey)?.name ?? ''
  const npub = npubOf(pubkey)

  const saveInfra = () => {
    setRelays(fromLines(relays).filter((r) => /^wss?:\/\//.test(r)))
    setBlossomServers(fromLines(servers).filter((s) => /^https?:\/\//.test(s)))
    setRelaysText(toLines(getRelays()))
    setServersText(toLines(getBlossomServers()))
    setSaved(t('me.saved'))
  }

  const reset = () => {
    resetInfrastructure()
    setRelaysText(toLines(DEFAULT_RELAYS))
    setServersText(toLines(DEFAULT_BLOSSOM_SERVERS))
    setSaved(t('me.resetDone'))
  }

  const leave = () => {
    if (confirm(t('me.forgetConfirm'))) {
      forgetIdentity()
      location.reload()
    }
  }

  return (
    <main className="page stack-lg">
      <div className="spread">
        <h1>{t('me.title')}</h1>
        <LangSwitch />
      </div>

      <section className="panel stack">
        <label className="field">
          <span>{t('me.name')}</span>
          <input value={name ?? currentName} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn" disabled={!name?.trim() || name === currentName} onClick={() => void updateName(name!.trim())}>
          {t('me.updateName')}
        </button>
      </section>

      <section className="panel stack">
        <h2>{t('me.identity')}</h2>
        <div className="qr-inline">
          <QrCode value={`nostr:${npub}`} size={240} />
          <p className="muted small center">{t('me.identityHint')}</p>
          <code className="break">{npub}</code>
        </div>
      </section>

      <section className="panel stack">
        <h2>{t('me.sync')}</h2>
        <p>
          {online ? t('me.online') : t('me.offline')} {pending > 0 ? tn('me.pending', pending) : t('me.nothingPending')}
        </p>
        {pending > 0 && online && <button className="btn" onClick={() => void flush()}>{t('me.sendNow')}</button>}
        <a className="btn btn-text" href="#/report"><IconPrint /> {t('report.title')}</a>
      </section>

      <section className="panel stack">
        <h2>{t('me.backup')}</h2>
        <p className="small">{t('me.backupBody')}</p>
        {!backup ? (
          <>
            <label className="field">
              <span>{t('me.backupPassword')}</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" />
            </label>
            <button className="btn btn-ink" disabled={password.length < 8} onClick={() => setBackup(encryptedBackup(sk, password))}>
              {t('me.backupCreate')}
            </button>
            <button className="btn btn-text" onClick={() => confirm(t('me.backupPlainConfirm')) && setBackup(nsecOf(sk))}>
              {t('me.backupPlain')}
            </button>
          </>
        ) : (
          <div className="qr-inline">
            <QrCode value={backup} size={240} />
            <code className="break">{backup}</code>
            <button className="btn" onClick={() => setBackup('')}>{t('me.hide')}</button>
          </div>
        )}
      </section>

      <section className="panel stack">
        <h2>{t('me.servers')}</h2>
        <p className="small muted">{t('me.serversBody')}</p>
        <label className="field">
          <span>{t('me.relays')}</span>
          <textarea rows={4} value={relays} onChange={(e) => setRelaysText(e.target.value)} spellCheck={false} />
        </label>
        <label className="field">
          <span>{t('me.blossom')}</span>
          <textarea rows={3} value={servers} onChange={(e) => setServersText(e.target.value)} spellCheck={false} />
        </label>
        <div className="row">
          <button className="btn" onClick={saveInfra}>{t('me.save')}</button>
          <button className="btn btn-text" onClick={reset}>{t('me.reset')}</button>
        </div>
        {saved && <p className="ok small">{saved}</p>}
      </section>

      <button className="btn btn-text danger" onClick={leave}>{t('me.forget')}</button>
    </main>
  )
}
