import { useCallback } from 'react'
import { useI18n } from '../i18n'
import { go } from '../router'
import { Scanner } from '../ui/Scanner'

/** Extracts the in-app route ("a/<ref>?w=1") from a scanned Rastro link. */
export function routeFromScan(text: string): string | null {
  const match = text.match(/#\/(a\/[^\s]+)/)
  return match ? match[1] : null
}

export function ScanPage() {
  const { t } = useI18n()
  const onResult = useCallback((text: string) => {
    const route = routeFromScan(text)
    if (route) go(route)
    return Boolean(route)
  }, [])
  return (
    <main className="page stack">
      <h1>{t('scan.title')}</h1>
      <Scanner onResult={onResult} wrongCode={t('scan.wrongCode')} />
    </main>
  )
}
