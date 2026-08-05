import type { DashboardLanguage } from './types';
import { getLanguageOption } from './languages';
const locale = (language: DashboardLanguage) => getLanguageOption(language).locale;
export const formatLocalizedDate = (value: string | Date, language: DashboardLanguage) => new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium' }).format(new Date(value));
export const formatLocalizedDateTime = (value: string | Date, language: DashboardLanguage) => new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export const formatLocalizedNumber = (value: number, language: DashboardLanguage) => new Intl.NumberFormat(locale(language)).format(value);
export const formatLocalizedPercent = (value: number, language: DashboardLanguage) => new Intl.NumberFormat(locale(language), { style: 'percent', maximumFractionDigits: 2 }).format(value);
export const formatLocalizedCurrency = (value: number, currency: string, language: DashboardLanguage) => new Intl.NumberFormat(locale(language), { style: 'currency', currency }).format(value);
