import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useProfile } from '../shared/profile/ProfileProvider';
import { getLanguageOption } from './languages';
import { en } from './translations/en';
import { sr } from './translations/sr';
import type { DashboardLanguage } from './types';
import * as formatters from './formatters';
type TranslationKey = { [K in keyof typeof en]: keyof typeof en[K] extends string ? `${K}.${keyof typeof en[K] & string}` : never }[keyof typeof en];
const dictionaries = { en, sr } as const;
const translate = (language: DashboardLanguage, key: TranslationKey) => { const [section, item] = key.split('.') as [keyof typeof en, string]; return dictionaries[language][section][item as keyof typeof en[typeof section]] as string; };
interface I18nContextValue { language: DashboardLanguage; locale: string; t: (key: TranslationKey) => string; setLanguage: (language: DashboardLanguage) => Promise<void>; format: typeof formatters; }
const I18nContext = createContext<I18nContextValue | null>(null);
export const I18nProvider = ({ children }: { children: ReactNode }) => { const { profile, setPreferredLanguage } = useProfile(); const language = getLanguageOption(profile?.preferredLanguage).code; useEffect(()=>{ document.documentElement.lang=language==='sr'?'sr-Latn':'en'; },[language]); const value = useMemo(() => ({ language, locale: getLanguageOption(language).locale, t: (key: TranslationKey) => translate(language, key), setLanguage: setPreferredLanguage, format: formatters }), [language, setPreferredLanguage]); return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>; };
export const useI18n = () => { const context = useContext(I18nContext); if (!context) throw new Error('useI18n must be used inside I18nProvider'); return context; };
