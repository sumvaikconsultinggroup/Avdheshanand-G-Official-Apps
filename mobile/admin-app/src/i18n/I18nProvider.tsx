import React, { createContext, useContext, useMemo } from 'react';
import { LANGUAGE_OPTIONS, LanguageCode, translations } from './translations';

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  languageOptions: typeof LANGUAGE_OPTIONS;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolveKey(obj: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);

  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = params[key];
    return value === undefined ? '' : String(value);
  });
}

// The admin app is English-only — language switching has been removed.
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<I18nContextValue>(() => {
    const language: LanguageCode = 'en';
    const t = (key: string, params?: Record<string, string | number>) => {
      const template = resolveKey(translations.en, key) || key;
      return interpolate(template, params);
    };

    return {
      language,
      // no-op kept for interface compatibility; the app stays in English.
      setLanguage: async () => {},
      t,
      languageOptions: LANGUAGE_OPTIONS,
    };
  }, []);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
