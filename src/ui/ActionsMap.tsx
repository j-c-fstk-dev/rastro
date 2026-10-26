import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decodeGeohash } from '../geo/geohash'
import type { Action } from '../model/action'

/** Approximate radius (m) of a geohash cell, so the map never shows more precision than was published. */
const RADIUS_BY_PRECISION: Record<number, number> = { 4: 20000, 5: 2400, 6: 610, 7: 76 }

export function ActionsMap({ actions, className, label, me }: {
  actions: Action[]
  className: string
  label: (a: Action) => string
  /** The viewer's position, shown as a pin and centred on when set. */
  me?: { lat: number; lon: number } | null
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(map)

    const located = actions.filter((a) => a.geohash)
    const bounds: L.LatLngExpression[] = []
    for (const a of located) {
      const { lat, lon } = decodeGeohash(a.geohash!)
      bounds.push([lat, lon])
      const radius = RADIUS_BY_PRECISION[a.geohash!.length] ?? 2400
      const color = getComputedStyle(document.documentElement).getPropertyValue('--flag').trim() || '#ff5b14'
      L.circle([lat, lon], { radius, color, weight: 2, fillOpacity: 0.18 }).addTo(map)
      const link = document.createElement('a')
      link.href = `#/a/${a.id}`
      link.textContent = label(a)
      L.circleMarker([lat, lon], { radius: 7, color: '#14251c', weight: 2, fillColor: color, fillOpacity: 1 })
        .bindPopup(link)
        .addTo(map)
    }
    if (me) {
      const icon = L.divIcon({ className: 'pick-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] })
      L.marker([me.lat, me.lon], { icon, interactive: false }).addTo(map)
      map.setView([me.lat, me.lon], 12)
    } else if (bounds.length > 0) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 13 })
    else map.setView([0, 0], 2)
    return () => {
      map.remove()
    }
  }, [actions, label, me])

  return <div ref={ref} className={className} />
}
