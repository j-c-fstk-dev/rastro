import { useCallback, useState } from 'react'
import { useI18n } from '../i18n'
import type { Action } from '../model/action'
import { ActionsMap } from '../ui/ActionsMap'
import { IconPin } from '../ui/icons'
import { useFeed } from './Home'

export function MapPage() {
  const { t } = useI18n()
  const { actions } = useFeed()
  const label = useCallback((a: Action) => a.place || t('home.untitled'), [t])
  const located = actions?.filter((a) => a.geohash) ?? []
  const [me, setMe] = useState<{ lat: number; lon: number } | null>(null)
  const [geoError, setGeoError] = useState('')

  const locate = () => {
    setGeoError('')
    navigator.geolocation?.getCurrentPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => setGeoError(t(err.code === err.PERMISSION_DENIED ? 'new.locationDenied' : 'map.locateError')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    )
  }

  return (
    <main className="page">
      <div className="spread">
        <h1>{t('map.title')}</h1>
        <button className="btn" onClick={locate}><IconPin /> {t('map.locateMe')}</button>
      </div>
      {geoError && <p className="error small" style={{ marginTop: 8 }}>{geoError}</p>}
      {actions !== null && located.length === 0 && <p className="muted" style={{ marginTop: 8 }}>{t('map.empty')}</p>}
      {actions !== null && <ActionsMap actions={located} className="map" label={label} me={me} />}
      <p className="muted small" style={{ marginTop: 8 }}>{t('map.approx')}</p>
    </main>
  )
}
