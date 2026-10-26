import { useI18n } from '../i18n'
import type { Witness } from '../model/action'
import type { Status } from '../model/status'

const STEPS = 5

/**
 * The rastro: a human footprint per witness, up to five, alternating right and left foot.
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
          <svg key={i} viewBox="0 0 24 44" className={`print ${kind}`}>
            <path d="M12.4 15C16.9 15 19.3 18.3 19 22.8 18.8 26.5 17.6 29.6 17.4 32.8 17.2 36 17.8 38.3 16.3 40.8 14.9 43.1 10.2 43.2 9 40.7 8 38.6 9.4 36.4 10 33.8 10.6 31.2 10.2 29.2 8.6 27.2 6.8 25 5.9 22.8 6.1 20.4 6.4 16.9 8.9 15 12.4 15z" />
            <ellipse cx="7.4" cy="10" rx="2.8" ry="3.5" />
            <ellipse cx="11.6" cy="8.1" rx="1.9" ry="2.3" />
            <ellipse cx="14.9" cy="8.7" rx="1.7" ry="2" />
            <ellipse cx="17.6" cy="10.4" rx="1.5" ry="1.7" />
            <ellipse cx="19.6" cy="13" rx="1.25" ry="1.4" />
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
