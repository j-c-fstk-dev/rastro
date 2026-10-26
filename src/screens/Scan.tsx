import { useEffect, useRef, useState } from 'react'
import { go } from '../router'

// BarcodeDetector is not in TypeScript's DOM lib yet.
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> }
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike
  }
}

/** Extracts the in-app route ("a/<ref>?w=1") from a scanned Rastro link. */
export function routeFromScan(text: string): string | null {
  const match = text.match(/#\/(a\/[^\s]+)/)
  return match ? match[1] : null
}

export function Scan() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const supported = typeof window.BarcodeDetector === 'function'

  useEffect(() => {
    if (!supported) return
    let stream: MediaStream | null = null
    let stopped = false
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] })

    const tick = async () => {
      const video = videoRef.current
      if (stopped || !video) return
      if (video.readyState >= 2) {
        const codes = await detector.detect(video).catch(() => [])
        const route = codes.map((c) => routeFromScan(c.rawValue)).find(Boolean)
        if (route) return go(route)
        if (codes.length > 0) setError('Esse QR não é de uma ação do Rastro.')
      }
      setTimeout(() => void tick(), 300)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          void videoRef.current.play()
        }
        void tick()
      })
      .catch(() => setError('Sem acesso à câmera. Autorize a câmera ou use o app de câmera do celular.'))

    return () => {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [supported])

  return (
    <main className="page">
      <h1>Escanear QR de presença</h1>
      {supported ? (
        <div className="scanner">
          <video ref={videoRef} playsInline muted />
        </div>
      ) : (
        <p>
          Este navegador não lê QR codes por aqui. Abra o <strong>app de câmera do celular</strong> e aponte para o QR:
          o link abre direto no Rastro.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </main>
  )
}
