import { useState } from 'react'
import { DEFAULT_BLOSSOM_SERVERS, DEFAULT_RELAYS, getBlossomServers, getRelays, resetInfrastructure, setBlossomServers, setRelays } from '../nostr/config'
import { encryptedBackup, forgetIdentity, npubOf, nsecOf } from '../nostr/keys'
import { flush } from '../nostr/outbox'
import { useSession } from '../session'
import { QrCode } from '../ui/QrCode'
import { useProfiles } from '../ui/useProfiles'

const toLines = (list: string[]) => list.join('\n')
const fromLines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean)

export function Me() {
  const { sk, pubkey, pending, online, updateName } = useSession()
  const profiles = useProfiles(pubkey ? [pubkey] : [])
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [backup, setBackup] = useState('')
  const [relays, setRelaysText] = useState(toLines(getRelays()))
  const [servers, setServersText] = useState(toLines(getBlossomServers()))
  const [saved, setSaved] = useState('')

  if (!sk || !pubkey) return null
  const currentName = profiles.get(pubkey)?.name ?? ''

  const saveInfra = () => {
    setRelays(fromLines(relays).filter((r) => r.startsWith('wss://') || r.startsWith('ws://')))
    setBlossomServers(fromLines(servers).filter((s) => s.startsWith('https://') || s.startsWith('http://')))
    setRelaysText(toLines(getRelays()))
    setServersText(toLines(getBlossomServers()))
    setSaved('Salvo.')
  }

  const reset = () => {
    resetInfrastructure()
    setRelaysText(toLines(DEFAULT_RELAYS))
    setServersText(toLines(DEFAULT_BLOSSOM_SERVERS))
    setSaved('Padrões restaurados.')
  }

  const leave = () => {
    if (confirm('Apagar a chave deste aparelho? Sem o backup, você perde o acesso a esta identidade para sempre.')) {
      forgetIdentity()
      location.reload()
    }
  }

  return (
    <main className="page stack">
      <h1>Você</h1>

      <section className="panel stack">
        <label className="field">
          <span>Nome</span>
          <input value={name || currentName} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="button" disabled={!name.trim() || name === currentName} onClick={() => void updateName(name.trim())}>
          Atualizar nome
        </button>
        <p className="muted small break">Sua identidade pública: {npubOf(pubkey)}</p>
      </section>

      <section className="panel stack">
        <h2>Envio</h2>
        <p>
          {online ? 'Conectado.' : 'Sem internet — tudo fica guardado e é enviado quando a conexão voltar.'}{' '}
          {pending > 0 ? `${pending} ${pending === 1 ? 'item aguardando' : 'itens aguardando'} envio.` : 'Nada pendente.'}
        </p>
        {pending > 0 && online && (
          <button className="button" onClick={() => void flush()}>
            Enviar agora
          </button>
        )}
      </section>

      <section className="panel stack">
        <h2>Backup da chave</h2>
        <p className="small">
          Sua chave só existe neste aparelho. Se perder o celular sem backup, perde a identidade. Proteja com uma senha e
          guarde o código (ou o QR) num lugar seguro.
        </p>
        {!backup ? (
          <>
            <label className="field">
              <span>Crie uma senha para o backup</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
            </label>
            <button className="button primary" disabled={password.length < 8} onClick={() => setBackup(encryptedBackup(sk, password))}>
              Gerar backup protegido
            </button>
            <button
              className="link"
              onClick={() => confirm('A chave sem senha dá controle total da sua identidade a quem a vir. Mostrar mesmo assim?') && setBackup(nsecOf(sk))}
            >
              Mostrar chave sem senha
            </button>
          </>
        ) : (
          <div className="stack center">
            <QrCode value={backup} size={240} />
            <code className="break">{backup}</code>
            <button className="button" onClick={() => setBackup('')}>
              Esconder
            </button>
          </div>
        )}
      </section>

      <section className="panel stack">
        <h2>Servidores</h2>
        <p className="small muted">
          Por onde suas ações circulam. Coloque aqui o endereço do nó da sua comunidade. Ninguém é dono da rede: dá para
          trocar a qualquer momento.
        </p>
        <label className="field">
          <span>Relays (um por linha)</span>
          <textarea rows={4} value={relays} onChange={(e) => setRelaysText(e.target.value)} />
        </label>
        <label className="field">
          <span>Servidores de fotos — Blossom (um por linha)</span>
          <textarea rows={3} value={servers} onChange={(e) => setServersText(e.target.value)} />
        </label>
        <div className="row">
          <button className="button" onClick={saveInfra}>Salvar</button>
          <button className="link" onClick={reset}>Restaurar padrões</button>
        </div>
        {saved && <p className="ok small">{saved}</p>}
      </section>

      <button className="link danger" onClick={leave}>
        Apagar chave deste aparelho
      </button>
    </main>
  )
}
