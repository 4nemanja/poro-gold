export const TEMPLATE_LANGUAGES = [
  'english',
  'russian',
  'serbian',
  'spanish',
  'french',
  'german',
  'polish',
  'czech',
] as const;

export type TemplateLanguage = (typeof TEMPLATE_LANGUAGES)[number];

export const TEMPLATE_LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  english: 'English',
  russian: 'Russian',
  serbian: 'Serbian',
  spanish: 'Spanish',
  french: 'French',
  german: 'German',
  polish: 'Polish',
  czech: 'Czech',
};

export const getTemplateLanguageLabel = (language: TemplateLanguage): string =>
  TEMPLATE_LANGUAGE_LABELS[language];

export const isTemplateLanguage = (value: string): value is TemplateLanguage =>
  (TEMPLATE_LANGUAGES as readonly string[]).includes(value);

export interface TemplateClassification {
  platformId: string | null;
  platformName: string | null;
  language: TemplateLanguage;
}

export interface TemplateMutationInput {
  title: string;
  category: string;
  content: string;
  status: 'Active' | 'Inactive';
  platformId?: string | null;
  language?: TemplateLanguage;
}
