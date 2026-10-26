import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value, size = 320 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    void QRCode.toDataURL(value, { margin: 1, width: size, errorCorrectionLevel: 'M' }).then(setSrc)
  }, [value, size])
  return src ? <img className="qr" src={src} width={size} height={size} alt="QR code" /> : null
}
