import { LANGS, useI18n, type Lang } from '../i18n'

export function LangSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      {(Object.keys(LANGS) as Lang[]).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} lang={LANGS[l].locale} title={LANGS[l].label}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
