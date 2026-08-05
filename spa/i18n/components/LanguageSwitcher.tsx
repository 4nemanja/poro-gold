import { useState } from 'react';
import { useI18n } from '../I18nProvider';
import type { DashboardLanguage } from '../types';

export const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useI18n();
  const [busy, setBusy] = useState<DashboardLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const change = async (next: DashboardLanguage) => {
    if (next === language || busy) return;
    setBusy(next); setError(null);
    try { await setLanguage(next); } catch { setError(t('common.error')); } finally { setBusy(null); }
  };
  return <div className="min-w-0"><div className="inline-flex rounded-lg border border-gray-700 p-0.5" aria-label={t('profile.interfaceLanguage')}><button type="button" aria-pressed={language==='en'} disabled={!!busy} onClick={()=>void change('en')} className={`rounded px-2 py-1 text-xs font-semibold ${language==='en'?'bg-white text-gray-900':'text-gray-300'}`}>{busy==='en'?'…':'ENG'}</button><button type="button" aria-pressed={language==='sr'} disabled={!!busy} onClick={()=>void change('sr')} className={`rounded px-2 py-1 text-xs font-semibold ${language==='sr'?'bg-white text-gray-900':'text-gray-300'}`}>{busy==='sr'?'…':'SRB'}</button></div>{error&&<p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}</div>;
};
