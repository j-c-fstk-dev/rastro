import { useEffect, useState } from 'react'
import { candidateUrls } from '../media/blossom'
import type { Photo as PhotoData } from '../model/action'
import { getBlob } from '../nostr/store'

/** Shows a photo from this device if available, otherwise from any Blossom server that has it. */
export function Photo({ photo, alt, className }: { photo: PhotoData; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [fallbacks, setFallbacks] = useState<string[]>([])

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    void getBlob(photo.sha256).then((blob) => {
      if (cancelled) return
      if (blob) {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      } else {
        const [first, ...rest] = candidateUrls(photo.url, photo.sha256)
        setSrc(first)
        setFallbacks(rest)
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photo.sha256, photo.url])

  if (!src) return <div className={`photo-placeholder ${className ?? ''}`} />
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        const [next, ...rest] = fallbacks
        if (next) {
          setSrc(next)
          setFallbacks(rest)
        }
      }}
    />
  )
}
