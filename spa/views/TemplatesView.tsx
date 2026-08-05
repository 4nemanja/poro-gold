import { useMemo, useState, type ChangeEvent } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { Button, Card, Input, Modal, Select } from '../components/ui';
import { TEMPLATE_LANGUAGES, getTemplateLanguageLabel, type TemplateLanguage } from '../shared/types/templates';
import { DEFAULT_TEMPLATE_FILTERS, filterTemplates, getTemplatePlatformLabel, type TemplateFilters } from '../shared/templates/templateFilters';
import type { Platform, Template, TemplateInput } from '../types';

interface TemplatesState {
  templates: Template[];
  platforms: Platform[];
  canManageTemplates: boolean;
}

interface TemplatesActions {
  addTemplate: (template: TemplateInput) => Promise<void>;
  updateTemplate: (id: string, template: TemplateInput) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

interface TemplatesViewProps {
  state: TemplatesState;
  actions: TemplatesActions;
}

type TemplateFormData = TemplateInput;

const emptyForm: TemplateFormData = {
  title: '',
  category: '',
  content: '',
  status: 'Active',
  platformId: null,
  language: 'english',
};

export const TemplatesView = ({ state, actions }: TemplatesViewProps) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [filters, setFilters] = useState<TemplateFilters>(DEFAULT_TEMPLATE_FILTERS);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activePlatforms = useMemo(
    () => state.platforms.filter((platform) => platform.status === 'Active'),
    [state.platforms],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(state.templates.map((template) => template.category).filter(Boolean))).sort(),
    [state.templates],
  );
  const filteredTemplates = useMemo(
    () => filterTemplates(state.templates, filters),
    [state.templates, filters],
  );
  const hasActiveFilters = filters.search.trim() !== ''
    || filters.platform !== 'all'
    || filters.language !== 'all'
    || filters.category !== 'all';

  const setFilter = <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const openAddModal = () => {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      category: template.category,
      content: template.content,
      status: template.status,
      platformId: template.platformId,
      language: template.language,
    });
    setFormError(null);
    setShowModal(true);
  };

  const isValid = Boolean(formData.title.trim() && formData.category.trim() && formData.content.trim());

  const handleSave = async () => {
    if (!isValid) {
      setFormError('Title, category, and content are required.');
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingTemplate) await actions.updateTemplate(editingTemplate.id, formData);
      else await actions.addTemplate(formData);
      setShowModal(false);
      setEditingTemplate(null);
      setFormData(emptyForm);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save the template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await actions.deleteTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete the template.');
    } finally {
      setIsSaving(false);
    }
  };

  const platformOptions = [
    { value: '', label: 'All Platforms' },
    ...activePlatforms.map((platform) => ({ value: platform.id, label: platform.name })),
  ];
  if (editingTemplate?.platformId && !activePlatforms.some((platform) => platform.id === editingTemplate.platformId)) {
    platformOptions.push({ value: editingTemplate.platformId, label: `${getTemplatePlatformLabel(editingTemplate)} (inactive)` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="mt-1 text-sm text-gray-500">Reusable messages classified by safe-use platform and language.</p>
        </div>
        {state.canManageTemplates && <Button size="sm" onClick={openAddModal}><Plus className="mr-1 h-4 w-4" />New Template</Button>}
      </div>

      <Card>
        <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search templates..." className="block w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm focus:border-gray-900 focus:ring-gray-900" />
            </div>
            <Select value={filters.platform} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilter('platform', event.target.value)} options={[{ value: 'all', label: 'All' }, { value: 'all_platforms', label: 'All Platforms' }, ...activePlatforms.map((platform) => ({ value: platform.id, label: platform.name }))]} />
            <Select value={filters.language} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilter('language', event.target.value as TemplateFilters['language'])} options={[{ value: 'all', label: 'All Languages' }, ...TEMPLATE_LANGUAGES.map((language) => ({ value: language, label: getTemplateLanguageLabel(language) }))]} />
            <Select value={filters.category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilter('category', event.target.value)} options={[{ value: 'all', label: 'All Categories' }, ...categoryOptions.map((category) => ({ value: category, label: category }))]} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
            <span>Showing {filteredTemplates.length} of {state.templates.length} templates</span>
            <Button variant="ghost" size="sm" disabled={!hasActiveFilters} onClick={() => setFilters(DEFAULT_TEMPLATE_FILTERS)}>Clear filters</Button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="flex items-start gap-3 p-4 transition-colors hover:bg-gray-50 sm:gap-4 sm:p-6">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">{template.title}</h4>
                  <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{template.category}</span>
                  <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/10">{getTemplatePlatformLabel(template)}</span>
                  <span className="inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/10">{getTemplateLanguageLabel(template.language)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">{template.content}</p>
              </div>
              {state.canManageTemplates && <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="icon" aria-label={`Edit ${template.title}`} onClick={() => openEditModal(template)}><Edit2 className="h-4 w-4 text-gray-500" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${template.title}`} className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setTemplateToDelete(template)}><Trash2 className="h-4 w-4" /></Button>
              </div>}
            </div>
          ))}
          {state.templates.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No templates yet.</div>}
          {state.templates.length > 0 && filteredTemplates.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No templates match the selected filters.</div>}
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTemplate ? 'Edit Template' : 'New Template'}>
        <div className="mt-4 space-y-4">
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <Input label="Title" value={formData.title} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Need 2FA Code" />
          <Input label="Category" value={formData.category} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData((current) => ({ ...current, category: event.target.value }))} placeholder="e.g. Operations" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Platform" value={formData.platformId ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFormData((current) => ({ ...current, platformId: event.target.value || null }))} options={platformOptions} />
            <Select label="Language" value={formData.language ?? 'english'} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFormData((current) => ({ ...current, language: event.target.value as TemplateLanguage }))} options={TEMPLATE_LANGUAGES.map((language) => ({ value: language, label: getTemplateLanguageLabel(language) }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <textarea rows={4} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900" value={formData.content} onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))} placeholder="Template message content..." />
          </div>
          <Select label="Status" value={formData.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFormData((current) => ({ ...current, status: event.target.value as TemplateFormData['status'] }))} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={!isValid || isSaving}>{isSaving ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}</Button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(templateToDelete)} onClose={() => setTemplateToDelete(null)} title="Delete Template">
        <p className="mt-2 text-sm text-gray-500">Are you sure you want to delete this template?</p>
        {formError && <p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setTemplateToDelete(null)} disabled={isSaving}>Cancel</Button>
          <Button variant="danger" onClick={() => void handleConfirmDelete()} disabled={isSaving}>{isSaving ? 'Deleting...' : 'Confirm'}</Button>
        </div>
      </Modal>
    </div>
  );
};
