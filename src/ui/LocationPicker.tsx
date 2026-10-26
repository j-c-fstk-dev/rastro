import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decodeGeohash, encodeGeohash } from '../geo/geohash'

export interface Point {
  lat: number
  lon: number
}

/** Public radius (m) of the geohash cell for each precision used by the app. */
const PUBLIC_RADIUS = { 5: 2400, 7: 76 } as const

/**
 * Map to pick or adjust where the action happened. Tap the map or drag the pin.
 * The shaded circle is what will be public, given the chosen precision.
 */
export function LocationPicker({ value, onChange, precise, fallback }: {
  value: Point | null
  onChange: (p: Point) => void
  precise: boolean
  fallback: Point | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!ref.current) return
    const start = value ?? fallback
    const map = L.map(ref.current, { zoomControl: true }).setView(start ? [start.lat, start.lon] : [0, 0], start ? 13 : 2)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: e.latlng.lat, lon: e.latlng.lng }))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // The map is created once; position updates are handled below.
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !value) return
    const color = getComputedStyle(document.documentElement).getPropertyValue('--flag').trim() || '#ff5b14'
    const precision = precise ? 7 : 5
    const cell = decodeGeohash(encodeGeohash(value.lat, value.lon, precision))
    if (!markerRef.current) {
      const icon = L.divIcon({ className: 'pick-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] })
      markerRef.current = L.marker([value.lat, value.lon], { draggable: true, icon }).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng()
        onChangeRef.current({ lat: p.lat, lon: p.lng })
      })
      map.setView([value.lat, value.lon], 13)
    } else {
      markerRef.current.setLatLng([value.lat, value.lon])
    }
    circleRef.current?.remove()
    circleRef.current = L.circle([cell.lat, cell.lon], { radius: PUBLIC_RADIUS[precision], color, weight: 2, fillOpacity: 0.15 }).addTo(map)
  }, [value, precise])

  return <div ref={ref} className="picker-map" />
}
