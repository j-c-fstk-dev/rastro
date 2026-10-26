import { useCallback } from 'react'
import { useI18n } from '../i18n'
import type { Action } from '../model/action'
import { ActionsMap } from '../ui/ActionsMap'
import { useFeed } from './Home'

export function MapPage() {
  const { t } = useI18n()
  const { actions } = useFeed()
  const label = useCallback((a: Action) => a.place || t('home.untitled'), [t])
  const located = actions?.filter((a) => a.geohash) ?? []
  return (
    <main className="page">
      <h1>{t('map.title')}</h1>
      {actions !== null && located.length === 0 && <p className="muted" style={{ marginTop: 8 }}>{t('map.empty')}</p>}
      {actions !== null && <ActionsMap actions={located} className="map" label={label} />}
      <p className="muted small" style={{ marginTop: 8 }}>{t('map.approx')}</p>
    </main>
  )
}
