import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { en, type MessageKey } from './en'
import { pt } from './pt'

export type Lang = 'en' | 'pt'
export const LANGS: Record<Lang, { label: string; locale: string }> = {
  en: { label: 'English', locale: 'en-US' },
  pt: { label: 'Português', locale: 'pt-BR' },
}

const dictionaries: Record<Lang, Record<MessageKey, string>> = { en, pt }
const LANG_KEY = 'rastro.lang'

type Vars = Record<string, string | number>
type PluralBase<K> = K extends `${infer B}_one` ? B : never
export type PluralKey = PluralBase<MessageKey>

export interface I18n {
  lang: Lang
  locale: string
  setLang: (lang: Lang) => void
  t: (key: MessageKey, vars?: Vars) => string
  /** Picks `<key>_one` or `<key>_other` and fills {n}. */
  tn: (key: PluralKey, n: number, vars?: Vars) => string
}

export function interpolate(template: string, vars?: Vars): string {
  return vars ? template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : template
}

export function readLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'en' || stored === 'pt') return stored
  } catch {
    // storage unavailable
  }
  return 'en'
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang)

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // storage unavailable: the choice lasts for this session only
    }
    document.documentElement.lang = LANGS[next].locale
    setLangState(next)
  }, [])

  const value = useMemo<I18n>(() => {
    const dict = dictionaries[lang]
    const t = (key: MessageKey, vars?: Vars) => interpolate(dict[key] ?? en[key], vars)
    const tn = (key: PluralKey, n: number, vars?: Vars) =>
      t(`${key}_${n === 1 ? 'one' : 'other'}` as MessageKey, { n: n.toLocaleString(LANGS[lang].locale), ...vars })
    document.documentElement.lang = LANGS[lang].locale
    return { lang, locale: LANGS[lang].locale, setLang, t, tn }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
