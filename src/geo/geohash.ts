const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

/** Encodes a coordinate as a geohash. 5 chars ≈ 5 km, 7 chars ≈ 150 m. */
export function encodeGeohash(lat: number, lon: number, precision = 5): string {
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180
  let hash = ''
  let bit = 0, ch = 0, evenBit = true
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2
      if (lon >= mid) { ch = (ch << 1) | 1; lonMin = mid } else { ch = ch << 1; lonMax = mid }
    } else {
      const mid = (latMin + latMax) / 2
      if (lat >= mid) { ch = (ch << 1) | 1; latMin = mid } else { ch = ch << 1; latMax = mid }
    }
    evenBit = !evenBit
    if (++bit === 5) { hash += BASE32[ch]; bit = 0; ch = 0 }
  }
  return hash
}

/** Returns the center of a geohash cell. */
export function decodeGeohash(hash: string): { lat: number; lon: number } {
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180
  let evenBit = true
  for (const c of hash) {
    const idx = BASE32.indexOf(c)
    if (idx < 0) throw new Error(`invalid geohash: ${hash}`)
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1
      if (evenBit) {
        const mid = (lonMin + lonMax) / 2
        if (bitN) lonMin = mid; else lonMax = mid
      } else {
        const mid = (latMin + latMax) / 2
        if (bitN) latMin = mid; else latMax = mid
      }
      evenBit = !evenBit
    }
  }
  return { lat: (latMin + latMax) / 2, lon: (lonMin + lonMax) / 2 }
}
