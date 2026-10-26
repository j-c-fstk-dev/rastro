import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { startOutbox } from './nostr/outbox'
import { SessionProvider } from './session'
import './styles.css'

registerSW({ immediate: true })
startOutbox()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
)
