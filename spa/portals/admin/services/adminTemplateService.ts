import { supabase } from '../../../shared/supabase/client';
import type { Template, TemplateInput } from '../../../types';
import { isTemplateLanguage, type TemplateLanguage } from '../../../shared/types/templates';

interface TemplateRow {
  id: string;
  title: string;
  category: string;
  content: string;
  status: 'Active' | 'Inactive';
  platform_id: string | null;
  language: string;
  platforms: { name: string } | null;
}

const mapTemplate = (row: TemplateRow): Template => {
  if (!isTemplateLanguage(row.language)) throw new Error('Template language is invalid.');
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    status: row.status,
    platformId: row.platform_id,
    platformName: row.platforms?.name ?? null,
    language: row.language,
  };
};

const defaultLanguage = (language?: TemplateLanguage): TemplateLanguage => language ?? 'english';

export const adminTemplateService = {
  async list(): Promise<Template[]> {
    const { data, error } = await supabase.from('templates')
      .select('id, title, category, content, status, platform_id, language, platforms(name)')
      .order('title');
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as TemplateRow[]).map(mapTemplate);
  },
  async create(template: TemplateInput): Promise<void> {
    const { error } = await supabase.rpc('create_template', {
      p_title: template.title,
      p_category: template.category,
      p_content: template.content,
      p_status: template.status,
      p_platform_id: template.platformId ?? null,
      p_language: defaultLanguage(template.language),
    });
    if (error) throw new Error(error.message);
  },
  async update(id: string, template: TemplateInput): Promise<void> {
    const { data: existing, error: existingError } = await supabase.from('templates')
      .select('platform_id, language')
      .eq('id', id)
      .single();
    if (existingError) throw new Error(existingError.message);
    if (!isTemplateLanguage(existing.language)) throw new Error('Template language is invalid.');

    const { error } = await supabase.rpc('update_template', {
      p_id: id,
      p_title: template.title,
      p_category: template.category,
      p_content: template.content,
      p_status: template.status,
      p_platform_id: template.platformId === undefined ? existing.platform_id : template.platformId,
      p_language: defaultLanguage(template.language ?? existing.language),
    });
    if (error) throw new Error(error.message);
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_template', { p_id: id });
    if (error) throw new Error(error.message);
  },
};
