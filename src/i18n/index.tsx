import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import fi, { type Dict } from './fi';
import en from './en';

export interface Language {
  code: string;
  /** Flag shown in the switcher. */
  flag: string;
  /** Native name, used as the button's accessible label. */
  label: string;
  /** Locale for Intl date formatting. */
  intlLocale: string;
  dict: Dict;
}

/** Add a new language: create a dictionary file and append one entry here. */
export const LANGUAGES: Language[] = [
  { code: 'fi', flag: '🇫🇮', label: 'Suomi', intlLocale: 'fi-FI', dict: fi },
  { code: 'en', flag: '🇬🇧', label: 'English', intlLocale: 'en-GB', dict: en },
];

const STORAGE_KEY = 'lukumaku.lang';

function initialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  const fromStore = LANGUAGES.find((l) => l.code === stored);
  if (fromStore) return fromStore;
  const browser = navigator.language?.toLowerCase() ?? '';
  return LANGUAGES.find((l) => browser.startsWith(l.code)) ?? LANGUAGES[0];
}

interface I18nContextValue {
  /** The active dictionary — `t.form.summary` etc. */
  t: Dict;
  lang: string;
  /** Intl locale of the active language, for date formatting. */
  locale: string;
  setLang: (code: string) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language.code;
  }, [language]);

  const setLang = (code: string) => {
    const next = LANGUAGES.find((l) => l.code === code);
    if (!next) return;
    localStorage.setItem(STORAGE_KEY, next.code);
    setLanguage(next);
  };

  return (
    <I18nContext.Provider
      value={{ t: language.dict, lang: language.code, locale: language.intlLocale, setLang }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>.');
  return ctx;
}
