import { useState, type FormEvent } from 'react'
import { useSession } from '../session'

export function Welcome() {
  const { start, restore } = useSession()
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
      setError(err instanceof Error ? err.message : 'Não foi possível restaurar a chave.')
    }
  }

  return (
    <main className="welcome">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="welcome-logo" />
      <h1>Rastro</h1>
      <p className="lead">Ações reais, assinadas por quem fez, confirmadas por quem estava lá.</p>

      {!restoring ? (
        <form onSubmit={onStart} className="stack">
          <label className="field">
            <span>Como você quer ser chamado?</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome ou apelido" required autoFocus />
          </label>
          <button className="button primary big" disabled={busy || !name.trim()}>
            Começar
          </button>
          <p className="muted small">
            Sem cadastro, sem e-mail, sem senha. Uma chave única é criada neste aparelho e assina tudo o que você
            registrar.
          </p>
          <button type="button" className="link" onClick={() => setRestoring(true)}>
            Já tenho uma chave
          </button>
        </form>
      ) : (
        <form onSubmit={onRestore} className="stack">
          <label className="field">
            <span>Sua chave (nsec… ou ncryptsec…)</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" required />
          </label>
          {key.trim().startsWith('ncryptsec') && (
            <label className="field">
              <span>Senha da chave</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="button primary big">Restaurar</button>
          <button type="button" className="link" onClick={() => setRestoring(false)}>
            Voltar
          </button>
        </form>
      )}
    </main>
  )
}
