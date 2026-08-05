import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { Button, Card, Select } from '../../../components/ui';
import { TEMPLATE_LANGUAGES, getTemplateLanguageLabel } from '../../../shared/types/templates';
import { DEFAULT_TEMPLATE_FILTERS, filterTemplates, getTemplatePlatformLabel, type TemplateFilters } from '../../../shared/templates/templateFilters';
import { Pill } from '../components/SharedUI';
import { sellerService } from '../services/sellerService';
import type { Platform, Template } from '../types';

export const TemplatesPage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [filters, setFilters] = useState<TemplateFilters>(DEFAULT_TEMPLATE_FILTERS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextTemplates, nextPlatforms] = await Promise.all([
        sellerService.getTemplates(),
        sellerService.getPlatforms(),
      ]);
      setTemplates(nextTemplates);
      setPlatforms(nextPlatforms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load templates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category).filter(Boolean))).sort(),
    [templates],
  );
  const filteredTemplates = useMemo(() => filterTemplates(templates, filters), [templates, filters]);
  const hasActiveFilters = filters.search.trim() !== ''
    || filters.platform !== 'all'
    || filters.language !== 'all'
    || filters.category !== 'all';

  const setFilter = <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Unable to copy this template to the clipboard.');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Card>
        <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search templates..." className="block w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>
            <Select value={filters.platform} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilter('platform', event.target.value)} options={[{ value: 'all', label: 'All' }, { value: 'all_platforms', label: 'All Platforms' }, ...platforms.map((platform) => ({ value: platform.id, label: platform.name }))]} />
            <Select value={filters.language} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilter('language', event.target.value as TemplateFilters['language'])} options={[{ value: 'all', label: 'All Languages' }, ...TEMPLATE_LANGUAGES.map((language) => ({ value: language, label: getTemplateLanguageLabel(language) }))]} />
            <Select value={filters.category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilter('category', event.target.value)} options={[{ value: 'all', label: 'All Categories' }, ...categoryOptions.map((category) => ({ value: category, label: category }))]} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
            <span>Showing {filteredTemplates.length} of {templates.length} templates</span>
            <Button variant="ghost" size="sm" disabled={!hasActiveFilters} onClick={() => setFilters(DEFAULT_TEMPLATE_FILTERS)}>Clear filters</Button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {isLoading && <div className="py-8 text-center text-sm text-gray-500">Loading templates...</div>}
          {!isLoading && templates.length === 0 && <div className="py-8 text-center text-sm text-gray-500">No templates yet.</div>}
          {!isLoading && templates.length > 0 && filteredTemplates.length === 0 && <div className="py-8 text-center text-sm text-gray-500">No templates match the selected filters.</div>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="flex min-w-0 flex-col justify-between p-5">
                <div>
                  <div className="mb-2 flex flex-wrap items-start gap-2">
                    <h3 className="mr-auto min-w-0 font-semibold text-gray-900">{template.title}</h3>
                    <Pill variant="blue">{template.category}</Pill>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{getTemplatePlatformLabel(template)}</span>
                    <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">{getTemplateLanguageLabel(template.language)}</span>
                  </div>
                  <p className="mb-4 whitespace-pre-wrap break-words text-sm text-gray-600">{template.content}</p>
                </div>
                <button type="button" onClick={() => void copy(template.content, template.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-100 bg-gray-50 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                  {copiedId === template.id ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" />Copied!</> : 'Copy to Clipboard'}
                </button>
              </Card>
            ))}
          </div>
        </div>
      </Card>
      {error && <Button variant="secondary" size="sm" onClick={() => void load()}>Retry</Button>}
    </div>
  );
};
