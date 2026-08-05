import type { DashboardLanguageOption } from './types';
export const DASHBOARD_LANGUAGES: readonly DashboardLanguageOption[] = [
  { code: 'en', shortLabel: 'ENG', label: 'English', locale: 'en-US' },
  { code: 'sr', shortLabel: 'SRB', label: 'Srpski', locale: 'sr-Latn-RS' },
] as const;
export const getLanguageOption = (language: string | null | undefined): DashboardLanguageOption => DASHBOARD_LANGUAGES.find((option) => option.code === language) ?? DASHBOARD_LANGUAGES[0];
