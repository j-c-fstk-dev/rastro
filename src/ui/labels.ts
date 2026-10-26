import type { I18n } from '../i18n'
import type { MessageKey } from '../i18n/en'
import { headline, METRICS, TYPE_SPEC, type Action, type ActionDraft, type ActionType } from '../model/action'
import { formatNumber } from './format'

type T = I18n['t']

/** The place name, or the kind of action when no place was given. */
export const actionTitle = (t: T, a: Pick<Action, 'place' | 'type'>) => a.place || t(`type.${a.type}`)

export const optionLabel = (t: T, type: ActionType, option: string) =>
  t(`opt.${TYPE_SPEC[type].optionTag}.${option}` as MessageKey)

/** "12.5 kg", "40 plants", "3 hives"… or null when no number was recorded. */
export function headlineText(t: T, locale: string, a: Pick<ActionDraft, 'type' | 'metrics'>): string | null {
  const h = headline(a)
  if (!h) return null
  const unit = METRICS[h.key].unit || t(`metric.${h.key}`).toLocaleLowerCase(locale)
  return `${formatNumber(h.value, locale)} ${unit}`
}
