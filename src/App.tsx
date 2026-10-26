import { useI18n } from './i18n'
import { parseActionRef } from './nostr/data'
import { useRoute } from './router'
import { useSession } from './session'
import { ActionPage } from './screens/ActionPage'
import { GroupEdit, GroupPage, GroupsPage } from './screens/Groups'
import { Home } from './screens/Home'
import { MapPage } from './screens/MapPage'
import { Me } from './screens/Me'
import { NewAction } from './screens/NewAction'
import { Report } from './screens/Report'
import { ScanPage } from './screens/ScanPage'
import { Welcome } from './screens/Welcome'
import { IconGroup, IconLog, IconMap, IconPlus, IconUser } from './ui/icons'
import { LangSwitch } from './ui/LangSwitch'

type Tab = 'log' | 'map' | 'new' | 'groups' | 'me'

function TabBar({ current }: { current: Tab | null }) {
  const { t } = useI18n()
  const tab = (id: Tab, href: string, label: string, icon: React.ReactNode) => (
    <a className="tab" href={href} aria-current={current === id ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
    </a>
  )
  return (
    <nav className="tabbar" aria-label="Rastro">
      {tab('log', '#/', t('nav.log'), <IconLog />)}
      {tab('map', '#/map', t('nav.map'), <IconMap />)}
      <a className="tab tab-record" href="#/new" aria-current={current === 'new' ? 'page' : undefined}>
        <span className="record-disc"><IconPlus /></span>
        <span>{t('nav.record')}</span>
      </a>
      {tab('groups', '#/groups', t('nav.groups'), <IconGroup />)}
      {tab('me', '#/me', t('nav.you'), <IconUser />)}
    </nav>
  )
}

function route(screen?: string, arg?: string, sub?: string, params = new URLSearchParams(), actionId: string | null = null): [React.ReactNode, Tab | null] {
  if (actionId) return [<ActionPage key={actionId} id={actionId} fromQr={params.get('w') === '1'} isNew={params.get('new') === '1'} />, null]
  switch (screen) {
    case 'new':
      return [<NewAction />, 'new']
    case 'scan':
      return [<ScanPage />, null]
    case 'map':
      return [<MapPage />, 'map']
    case 'groups':
      return [arg === 'new' ? <GroupEdit /> : <GroupsPage />, 'groups']
    case 'g':
      if (!arg) break
      return [sub === 'edit' ? <GroupEdit key={arg} refText={arg} /> : <GroupPage key={arg} refText={arg} />, 'groups']
    case 'report':
      return [<Report groupText={params.get('g') ?? undefined} />, null]
    case 'me':
      return [<Me />, 'me']
  }
  return [<Home />, 'log']
}

export function App() {
  const { sk, pending, online } = useSession()
  const { t } = useI18n()
  const { path, params } = useRoute()
  const [screen, arg, sub] = path
  const actionId = screen === 'a' && arg ? parseActionRef(arg) : null

  // Public action pages work without an identity, so anyone with a link can check them.
  if (!sk && !actionId) return <Welcome />

  const [content, tab] = route(screen, arg, sub, params, actionId)

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          Rastro
        </a>
        {sk ? (
          (!online || pending > 0) && (
            <span className="sync-pill" role="status">
              {online ? t('sync.sending', { n: pending }) : t('sync.offline', { n: pending })}
            </span>
          )
        ) : (
          <LangSwitch />
        )}
      </header>
      {content}
      {sk && <TabBar current={tab} />}
    </>
  )
}
