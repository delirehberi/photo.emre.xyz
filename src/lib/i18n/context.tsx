/**
 * Internationalization (i18n) Context & Hooks
 * photo.emre.xyz
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Dictionary, Locale } from './dictionary';
import { trDictionary } from './tr';
import { enDictionary } from './en';

const LOCALE_STORAGE_KEY = 'photo_emre_xyz_locale';

export function getDictionary(locale?: string | null): Dictionary {
  if (locale === 'en') {
    return enDictionary;
  }
  return trDictionary;
}

/**
 * Determines locale from a given URL or pathname string.
 * Returns 'en' if the path starts with '/en' or is '/en', otherwise returns 'tr'.
 */
export function getLocaleFromUrl(url: URL | string): Locale {
  const pathname = typeof url === 'string' ? url : url.pathname;
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return 'en';
  }
  return 'tr';
}

/**
 * Computes the target URL path for a specific locale based on the given pathname.
 * Handles adding '/en' for English or removing '/en' for Turkish.
 */
export function getLocalizedPath(
  pathname: string,
  targetLocale: Locale,
): string {
  let cleanPath = pathname;
  try {
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
    }
  } catch {
    // Ignore URL parse error and treat as pathname
  }

  // Remove /en prefix if present
  if (cleanPath === '/en' || cleanPath === '/en/') {
    cleanPath = '/';
  } else if (cleanPath.startsWith('/en/')) {
    cleanPath = cleanPath.slice(3);
  }

  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  if (targetLocale === 'en') {
    return cleanPath === '/' ? '/en' : `/en${cleanPath}`;
  }
  return cleanPath;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'tr',
  setLocale: () => {},
  t: trDictionary,
});

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) {
      return initialLocale;
    }
    if (typeof window !== 'undefined') {
      return getLocaleFromUrl(window.location.pathname);
    }
    return 'tr';
  });

  useEffect(() => {
    if (initialLocale) {
      setLocaleState(initialLocale);
      return;
    }
    if (typeof window !== 'undefined') {
      const urlLocale = getLocaleFromUrl(window.location.pathname);
      setLocaleState(urlLocale);
    }
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      // Dispatch storage event so other islands can synchronize instantly
      window.dispatchEvent(
        new CustomEvent('photo-locale-change', { detail: newLocale }),
      );
    }
  };

  useEffect(() => {
    const handleLocaleChange = (e: Event) => {
      const customEvent = e as CustomEvent<Locale>;
      if (
        customEvent.detail &&
        (customEvent.detail === 'tr' || customEvent.detail === 'en')
      ) {
        setLocaleState(customEvent.detail);
      }
    };

    window.addEventListener('photo-locale-change', handleLocaleChange);
    return () => {
      window.removeEventListener('photo-locale-change', handleLocaleChange);
    };
  }, []);

  const t = locale === 'en' ? enDictionary : trDictionary;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/**
 * Lightweight Language Toggle Link Component (TR | EN)
 * Renders semantic <a> links for instant navigation with zero-JS fallback,
 * while synchronizing client-side i18n state on click.
 */
export function LanguageToggle({
  currentLocale,
  currentPath,
}: {
  currentLocale?: Locale;
  currentPath?: string;
} = {}) {
  const { locale, setLocale } = useI18n();
  const [activePath, setActivePath] = useState<string>(currentPath || '/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActivePath(window.location.pathname);
    }
  }, []);

  const pathLocale = getLocaleFromUrl(activePath);
  const activeLocale = currentLocale || locale || pathLocale;

  const trHref = getLocalizedPath(activePath, 'tr');
  const enHref = getLocalizedPath(activePath, 'en');

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetLocale: Locale,
    targetHref: string,
  ) => {
    setLocale(targetLocale);
    if (typeof window !== 'undefined') {
      // If already at target path, prevent default navigation reload
      if (window.location.pathname === targetHref) {
        e.preventDefault();
        return;
      }
      // Otherwise allow standard link navigation or trigger location navigation
      window.location.href = targetHref;
    }
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-xs font-medium">
      <a
        href={trHref}
        onClick={(e) => handleClick(e, 'tr', trHref)}
        className={`px-2 py-1 rounded-md transition-all ${
          activeLocale === 'tr'
            ? 'bg-white text-zinc-900 shadow-xs font-semibold'
            : 'text-zinc-500 hover:text-zinc-800'
        }`}
        aria-label="Türkçe"
      >
        TR
      </a>
      <a
        href={enHref}
        onClick={(e) => handleClick(e, 'en', enHref)}
        className={`px-2 py-1 rounded-md transition-all ${
          activeLocale === 'en'
            ? 'bg-white text-zinc-900 shadow-xs font-semibold'
            : 'text-zinc-500 hover:text-zinc-800'
        }`}
        aria-label="English"
      >
        EN
      </a>
    </div>
  );
}
