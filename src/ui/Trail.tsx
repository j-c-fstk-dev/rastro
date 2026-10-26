import { useI18n } from '../i18n'
import type { Witness } from '../model/action'
import type { Status } from '../model/status'

const STEPS = 5

/**
 * The rastro: a footprint per witness, up to five.
 * Solid = was there, outline = saw it remotely; the whole trail turns moss once consolidated.
 */
export function Trail({ witnesses, status, large = false }: { witnesses: Witness[]; status: Status; large?: boolean }) {
  const { t, tn } = useI18n()
  const label = `${tn('witness.count', witnesses.length)}, ${t(`status.${status}`)}`
  return (
    <span className={`trail ${large ? 'trail-lg' : ''} ${status === 'consolidated' ? 'done' : ''}`} role="img" aria-label={label}>
      {Array.from({ length: STEPS }, (_, i) => {
        const w = witnesses[i]
        const kind = w ? (w.mode === 'presencial' ? 'onsite' : 'remote') : 'blank'
        return (
          <svg key={i} viewBox="0 0 20 30" className={`print ${kind}`}>
            <path d="M10 29c-4.2 0-6.4-3.6-6.4-8.4C3.6 15.4 6.2 11 10 11s6.4 4.4 6.4 9.6c0 4.8-2.2 8.4-6.4 8.4z" />
            <circle cx="5" cy="6.5" r="2.1" />
            <circle cx="9.6" cy="4.2" r="2" />
            <circle cx="14" cy="5.2" r="1.8" />
            <circle cx="17" cy="8.6" r="1.5" />
          </svg>
        )
      })}
    </span>
  )
}

export function StatusLabel({ status }: { status: Status }) {
  const { t } = useI18n()
  return <span className={`status status-${status}`}>{t(`status.${status}`)}</span>
}
