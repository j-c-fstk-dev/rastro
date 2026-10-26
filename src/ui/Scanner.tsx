import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

// BarcodeDetector is not in TypeScript's DOM lib yet.
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> }
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike
  }
}

export const canScan = () => typeof window.BarcodeDetector === 'function'

/** Camera QR reader. `onResult` returns true when the code was usable, which stops scanning. */
export function Scanner({ onResult, wrongCode }: { onResult: (text: string) => boolean; wrongCode: string }) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const supported = canScan()

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
        if (codes.some((c) => onResult(c.rawValue))) return
        if (codes.length > 0) setError(wrongCode)
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
      .catch(() => setError(t('scan.noCamera')))

    return () => {
      stopped = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [supported, onResult, wrongCode, t])

  return (
    <div className="stack">
      {supported ? (
        <div className="scanner">
          <video ref={videoRef} playsInline muted />
        </div>
      ) : (
        <p>{t('scan.unsupported')}</p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
