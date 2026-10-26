import { parseActionRef } from './nostr/data'
import { go, useRoute } from './router'
import { useSession } from './session'
import { ActionPage } from './screens/ActionPage'
import { Home } from './screens/Home'
import { Me } from './screens/Me'
import { NewAction } from './screens/NewAction'
import { Scan } from './screens/Scan'
import { Welcome } from './screens/Welcome'

export function App() {
  const { sk, pending, online } = useSession()
  const { path, params } = useRoute()
  const [screen, arg] = path
  const actionId = screen === 'a' && arg ? parseActionRef(arg) : null

  // Public action pages work without an identity, so anyone with a link can check them.
  if (!sk && !actionId) return <Welcome />

  let content
  if (actionId) content = <ActionPage key={actionId} id={actionId} fromQr={params.get('w') === '1'} isNew={params.get('new') === '1'} />
  else if (screen === 'new') content = <NewAction />
  else if (screen === 'scan') content = <Scan />
  else if (screen === 'me') content = <Me />
  else content = <Home />

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          Rastro
        </a>
        {sk && (
          <nav>
            {(!online || pending > 0) && (
              <span className="pending" title="Aguardando envio">
                {online ? `${pending} enviando` : `offline · ${pending}`}
              </span>
            )}
            <button className="icon-button" onClick={() => go('me')} aria-label="Você">
              ☺
            </button>
          </nav>
        )}
      </header>
      {content}
    </>
  )
}
