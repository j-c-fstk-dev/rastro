import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/archivo/wdth.css'
import { App } from './App'
import { I18nProvider } from './i18n'
import { startOutbox } from './nostr/outbox'
import { SessionProvider } from './session'
import './styles.css'

registerSW({ immediate: true })
startOutbox()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </I18nProvider>
  </StrictMode>,
)
