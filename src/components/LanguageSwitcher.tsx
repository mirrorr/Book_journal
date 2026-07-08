import { LANGUAGES, useI18n } from '../i18n';

/** Flag pill for switching the UI language; styled like the app's toggles. */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`inline-flex rounded-full border border-ivory-300 bg-white p-0.5 shadow-sm ${className}`}
      role="group"
      aria-label="Language"
    >
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => setLang(language.code)}
          aria-pressed={lang === language.code}
          aria-label={language.label}
          title={language.label}
          className={`rounded-full px-2.5 py-1 text-base leading-none transition ${
            lang === language.code
              ? 'bg-sepia-100 shadow-sm ring-1 ring-sepia-300'
              : 'opacity-45 grayscale-50 hover:opacity-100'
          }`}
        >
          {language.flag}
        </button>
      ))}
    </div>
  );
}
