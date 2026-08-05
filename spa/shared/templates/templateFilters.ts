import { getTemplateLanguageLabel, type TemplateClassification, type TemplateLanguage } from '../types/templates';

interface FilterableTemplate extends TemplateClassification {
  title: string;
  category: string;
  content: string;
}

export type TemplatePlatformFilter = 'all' | 'all_platforms' | string;

export interface TemplateFilters {
  search: string;
  platform: TemplatePlatformFilter;
  language: 'all' | TemplateLanguage;
  category: string;
}

export const DEFAULT_TEMPLATE_FILTERS: TemplateFilters = {
  search: '',
  platform: 'all',
  language: 'all',
  category: 'all',
};

export const getTemplatePlatformLabel = (template: TemplateClassification): string =>
  template.platformName?.trim() || 'All Platforms';

export const filterTemplates = <T extends FilterableTemplate>(
  templates: T[],
  filters: TemplateFilters,
): T[] => {
  const search = filters.search.trim().toLocaleLowerCase();

  return templates.filter((template) => {
    const searchable = [
      template.title,
      template.category,
      template.content,
      getTemplatePlatformLabel(template),
      getTemplateLanguageLabel(template.language),
    ].join('\n').toLocaleLowerCase();

    const matchesSearch = !search || searchable.includes(search);
    const matchesPlatform = filters.platform === 'all'
      || (filters.platform === 'all_platforms'
        ? template.platformId === null
        : template.platformId === filters.platform);
    const matchesLanguage = filters.language === 'all' || template.language === filters.language;
    const matchesCategory = filters.category === 'all' || template.category === filters.category;

    return matchesSearch && matchesPlatform && matchesLanguage && matchesCategory;
  });
};
