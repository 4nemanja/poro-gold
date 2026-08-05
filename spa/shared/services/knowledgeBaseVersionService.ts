import { supabase } from '../supabase/client';
import type {
  KnowledgeBaseArticle,
  KnowledgeBaseArticleVisibility,
  KnowledgeBaseArticleStatus,
  KnowledgeBaseArticleVersion,
  KnowledgeBaseArticleVersionSourceAction,
  RestoreKnowledgeBaseArticleVersionInput,
} from '../types/knowledge-base';
import { normalizeKnowledgeBaseServiceError } from './knowledgeBaseServiceError';

type Row = Record<string, unknown>;

const record = (value: unknown): Row =>
  typeof value === 'object' && value !== null ? value as Row : {};
const text = (row: Row, key: string): string =>
  typeof row[key] === 'string' ? row[key] as string : '';
const nullableText = (row: Row, key: string): string | null =>
  typeof row[key] === 'string' ? row[key] as string : null;
const number = (row: Row, key: string): number =>
  typeof row[key] === 'number' ? row[key] as number : Number(row[key] || 0);
const firstRow = (data: unknown): Row => record(Array.isArray(data) ? data[0] : data);

const mapVersion = (value: unknown): KnowledgeBaseArticleVersion => {
  const row = record(value);
  const visibilityMode: KnowledgeBaseArticleVisibility = row.visibility_mode === 'selected_users'
    ? 'selected_users'
    : 'inherit_category';
  return {
    id: text(row, 'id'),
    articleId: text(row, 'article_id'),
    versionNumber: number(row, 'version_number'),
    categoryId: text(row, 'category_id'),
    title: text(row, 'title'),
    slug: text(row, 'slug'),
    excerpt: nullableText(row, 'excerpt'),
    content: text(row, 'content'),
    status: text(row, 'status') as KnowledgeBaseArticleStatus,
    publishedAt: nullableText(row, 'published_at'),
    sortOrder: number(row, 'sort_order'),
    createdBy: nullableText(row, 'created_by'),
    createdAt: text(row, 'created_at'),
    sourceAction: text(row, 'source_action') as KnowledgeBaseArticleVersionSourceAction,
    visibilityMode,
  };
};

const mapArticle = (value: unknown): KnowledgeBaseArticle => {
  const row = record(value);
  const visibilityMode: KnowledgeBaseArticleVisibility = row.visibility_mode === 'selected_users'
    ? 'selected_users'
    : 'inherit_category';
  return {
    id: text(row, 'id'),
    categoryId: text(row, 'category_id'),
    title: text(row, 'title'),
    slug: text(row, 'slug'),
    excerpt: nullableText(row, 'excerpt'),
    content: text(row, 'content'),
    status: text(row, 'status') as KnowledgeBaseArticleStatus,
    sortOrder: number(row, 'sort_order'),
    createdBy: nullableText(row, 'created_by'),
    updatedBy: nullableText(row, 'updated_by'),
    publishedAt: nullableText(row, 'published_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    visibilityMode,
  };
};

export const knowledgeBaseVersionService = {
  async getArticleVersions(articleId: string): Promise<KnowledgeBaseArticleVersion[]> {
    const { data, error } = await supabase.rpc('get_kb_article_versions', {
      p_article_id: articleId,
    });
    if (error) throw normalizeKnowledgeBaseServiceError(error, 'Unable to load article versions.');
    return (Array.isArray(data) ? data : []).map(mapVersion);
  },

  async getArticleVersion(
    articleId: string,
    versionNumber: number,
  ): Promise<KnowledgeBaseArticleVersion> {
    const { data, error } = await supabase.rpc('get_kb_article_version', {
      p_article_id: articleId,
      p_version_number: versionNumber,
    });
    if (error) throw normalizeKnowledgeBaseServiceError(error, 'Unable to load the article version.');
    return mapVersion(firstRow(data));
  },

  async restoreArticleVersion(
    input: RestoreKnowledgeBaseArticleVersionInput,
  ): Promise<KnowledgeBaseArticle> {
    const { data, error } = await supabase.rpc('kb_restore_article_version', {
      p_article_id: input.articleId,
      p_version_number: input.versionNumber,
    });
    if (error) throw normalizeKnowledgeBaseServiceError(error, 'Unable to restore the article version.');
    return mapArticle(firstRow(data));
  },
};
