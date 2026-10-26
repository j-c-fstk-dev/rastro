export interface PreparedImage {
  blob: Blob
  sha256: string
  mime: string
}

const MAX_SIDE = 1600
const QUALITY = 0.8

/**
 * Resizes and re-encodes a photo as JPEG on the device.
 * Re-encoding through a canvas drops EXIF metadata (GPS, camera, time) as a side effect.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto.'))), 'image/jpeg', QUALITY),
  )
  return { blob, sha256: await sha256Hex(blob), mime: 'image/jpeg' }
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
