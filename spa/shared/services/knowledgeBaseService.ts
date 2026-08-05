import { supabase } from '../supabase/client';
import type {
  CreateKnowledgeBaseArticleInput,
  CreateKnowledgeBaseCategoryInput,
  KnowledgeBaseArticle,
  KnowledgeBaseArticleVisibility,
  KnowledgeBaseArticleStatus,
  KnowledgeBaseCategory,
  KnowledgeBaseCategoryVisibility,
  KnowledgeBaseEligibleViewer,
  KnowledgeBaseVisibilityConfiguration,
  SetKnowledgeBaseArticleVisibilityInput,
  SetKnowledgeBaseCategoryVisibilityInput,
  UpdateKnowledgeBaseArticleInput,
  UpdateKnowledgeBaseCategoryInput,
} from '../types/knowledge-base';

type Row = Record<string, unknown>;
const record = (value: unknown): Row => typeof value === 'object' && value !== null ? value as Row : {};
const textValue = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] as string : '';
const nullableText = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] as string : null;
const numberValue = (row: Row, key: string) => typeof row[key] === 'number' ? row[key] as number : Number(row[key] || 0);
const rpcRow = (data: unknown): Row => record(Array.isArray(data) ? data[0] : data);

const mapCategory = (value: unknown): KnowledgeBaseCategory => {
  const row = record(value);
  const visibilityMode: KnowledgeBaseCategoryVisibility = row.visibility_mode === 'selected_users' ? 'selected_users' : 'all_authorized';
  return { id: textValue(row,'id'), name: textValue(row,'name'), slug: textValue(row,'slug'), description: nullableText(row,'description'), icon: nullableText(row,'icon'), sortOrder: numberValue(row,'sort_order'), isActive: row.is_active === true, createdBy: nullableText(row,'created_by'), createdAt: textValue(row,'created_at'), updatedAt: textValue(row,'updated_at'), visibilityMode };
};
const mapArticle = (value: unknown): KnowledgeBaseArticle => {
  const row = record(value);
  const visibilityMode: KnowledgeBaseArticleVisibility = row.visibility_mode === 'selected_users' ? 'selected_users' : 'inherit_category';
  return { id: textValue(row,'id'), categoryId: textValue(row,'category_id'), title: textValue(row,'title'), slug: textValue(row,'slug'), excerpt: nullableText(row,'excerpt'), content: textValue(row,'content'), status: textValue(row,'status') as KnowledgeBaseArticleStatus, sortOrder: numberValue(row,'sort_order'), createdBy: nullableText(row,'created_by'), updatedBy: nullableText(row,'updated_by'), publishedAt: nullableText(row,'published_at'), createdAt: textValue(row,'created_at'), updatedAt: textValue(row,'updated_at'), visibilityMode };
};
const stringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const mapVisibility = <T extends string>(value: unknown, fallback: T): KnowledgeBaseVisibilityConfiguration<T> => {
  const row = rpcRow(value);
  return { visibilityMode: (typeof row.visibility_mode === 'string' ? row.visibility_mode : fallback) as T, viewerIds: stringArray(row.viewer_ids) };
};
const mapEligibleViewer = (value: unknown): KnowledgeBaseEligibleViewer => {
  const row = record(value);
  return { id: textValue(row, 'id'), displayName: nullableText(row, 'display_name'), email: nullableText(row, 'email'), roles: stringArray(row.roles).filter((role): role is 'admin' | 'seller' => role === 'admin' || role === 'seller'), avatarPath: nullableText(row, 'avatar_path') };
};

const fail = (error: unknown, fallback: string): never => {
  const row = record(error);
  const message = typeof row.message === 'string' ? row.message : fallback;
  if (message.toLowerCase().includes('jwt')) throw new Error('Authentication is required.');
  if (row.code === '42501') throw new Error('Only the POROGOLD owner may manage Knowledge Base content.');
  if (row.code === '23505') throw new Error('That Knowledge Base slug is already in use.');
  if (row.code === '23503') {
    if (message.toLowerCase().includes('attachment')) {
      throw new Error('Remove all article attachments before deleting this article.');
    }
    throw new Error(message || 'This item is still referenced and cannot be deleted.');
  }
  if (row.code === 'P0002') throw new Error('Knowledge Base item not found.');
  throw new Error(message);
};
const categoryArgs = (input: CreateKnowledgeBaseCategoryInput) => ({ p_name: input.name, p_slug: input.slug, p_description: input.description || null, p_icon: input.icon || null, p_sort_order: input.sortOrder ?? 0, p_is_active: input.isActive ?? true });
const articleArgs = (input: CreateKnowledgeBaseArticleInput) => ({ p_category_id: input.categoryId, p_title: input.title, p_slug: input.slug, p_excerpt: input.excerpt || null, p_content: input.content, p_sort_order: input.sortOrder ?? 0 });

export const knowledgeBaseService = {
  async getKnowledgeBaseCategories(): Promise<KnowledgeBaseCategory[]> {
    const { data,error } = await supabase.from('knowledge_base_categories').select('*').order('sort_order').order('name'); if (error) fail(error,'Unable to load Knowledge Base categories.'); return (data || []).map(mapCategory);
  },
  async getPublishedKnowledgeBaseArticles(): Promise<KnowledgeBaseArticle[]> {
    const { data,error } = await supabase.from('knowledge_base_articles').select('*').eq('status','published').order('sort_order').order('title'); if (error) fail(error,'Unable to load Knowledge Base articles.'); return (data || []).map(mapArticle);
  },
  async getKnowledgeBaseArticlesByCategory(categoryId: string): Promise<KnowledgeBaseArticle[]> {
    const { data,error } = await supabase.from('knowledge_base_articles').select('*').eq('category_id',categoryId).eq('status','published').order('sort_order').order('title'); if (error) fail(error,'Unable to load category articles.'); return (data || []).map(mapArticle);
  },
  async getKnowledgeBaseArticle(categorySlug: string, articleSlug: string): Promise<KnowledgeBaseArticle> {
    const { data,error } = await supabase.from('knowledge_base_articles').select('*, knowledge_base_categories!inner(slug)').eq('knowledge_base_categories.slug',categorySlug).eq('slug',articleSlug).eq('status','published').maybeSingle(); if (error) fail(error,'Unable to load the article.'); if (!data) fail({code:'P0002'},'Article not found.'); return mapArticle(data);
  },
  async getAllKnowledgeBaseArticlesForOwner(): Promise<KnowledgeBaseArticle[]> {
    const { data,error } = await supabase.from('knowledge_base_articles').select('*').order('category_id').order('sort_order'); if (error) fail(error,'Unable to load owner Knowledge Base articles.'); return (data || []).map(mapArticle);
  },
  async createCategory(input: CreateKnowledgeBaseCategoryInput) { const {data,error}=await supabase.rpc('kb_create_category',categoryArgs(input)); if(error) fail(error,'Unable to create the category.'); return mapCategory(rpcRow(data)); },
  async updateCategory(input: UpdateKnowledgeBaseCategoryInput) { const {data,error}=await supabase.rpc('kb_update_category',{p_id:input.id,...categoryArgs(input)}); if(error) fail(error,'Unable to update the category.'); return mapCategory(rpcRow(data)); },
  async deleteCategory(id: string) { const {error}=await supabase.rpc('kb_delete_category',{p_id:id}); if(error) fail(error,'Unable to delete the category.'); },
  async createArticle(input: CreateKnowledgeBaseArticleInput) { const {data,error}=await supabase.rpc('kb_create_article',articleArgs(input)); if(error) fail(error,'Unable to create the article.'); return mapArticle(rpcRow(data)); },
  async updateArticle(input: UpdateKnowledgeBaseArticleInput) { const {data,error}=await supabase.rpc('kb_update_article',{p_id:input.id,...articleArgs(input)}); if(error) fail(error,'Unable to update the article.'); return mapArticle(rpcRow(data)); },
  async publishArticle(id: string) { const {data,error}=await supabase.rpc('kb_publish_article',{p_id:id}); if(error) fail(error,'Unable to publish the article.'); return mapArticle(rpcRow(data)); },
  async archiveArticle(id: string) { const {data,error}=await supabase.rpc('kb_archive_article',{p_id:id}); if(error) fail(error,'Unable to archive the article.'); return mapArticle(rpcRow(data)); },
  async deleteArticle(id: string) { const {error}=await supabase.rpc('kb_delete_article',{p_id:id}); if(error) fail(error,'Unable to delete the article.'); },
  async createCategoryWithVisibility(input: CreateKnowledgeBaseCategoryInput, visibility: KnowledgeBaseVisibilityConfiguration<KnowledgeBaseCategoryVisibility>) { const { data, error } = await supabase.rpc('kb_create_category_with_visibility', { ...categoryArgs(input), p_visibility_mode: visibility.visibilityMode, p_viewer_ids: visibility.viewerIds }); if (error) fail(error, 'Unable to create the category.'); return mapCategory(rpcRow(data)); },
  async updateCategoryWithVisibility(input: UpdateKnowledgeBaseCategoryInput, visibility: KnowledgeBaseVisibilityConfiguration<KnowledgeBaseCategoryVisibility>) { const { data, error } = await supabase.rpc('kb_update_category_with_visibility', { p_id: input.id, ...categoryArgs(input), p_visibility_mode: visibility.visibilityMode, p_viewer_ids: visibility.viewerIds }); if (error) fail(error, 'Unable to update the category.'); return mapCategory(rpcRow(data)); },
  async createArticleWithVisibility(input: CreateKnowledgeBaseArticleInput, visibility: KnowledgeBaseVisibilityConfiguration<KnowledgeBaseArticleVisibility>) { const { data, error } = await supabase.rpc('kb_create_article_with_visibility', { ...articleArgs(input), p_visibility_mode: visibility.visibilityMode, p_viewer_ids: visibility.viewerIds }); if (error) fail(error, 'Unable to create the article.'); return mapArticle(rpcRow(data)); },
  async updateArticleWithVisibility(input: UpdateKnowledgeBaseArticleInput, visibility: KnowledgeBaseVisibilityConfiguration<KnowledgeBaseArticleVisibility>) { const { data, error } = await supabase.rpc('kb_update_article_with_visibility', { p_id: input.id, ...articleArgs(input), p_visibility_mode: visibility.visibilityMode, p_viewer_ids: visibility.viewerIds }); if (error) fail(error, 'Unable to update the article.'); return mapArticle(rpcRow(data)); },
  async getEligibleViewers(): Promise<KnowledgeBaseEligibleViewer[]> { const { data, error } = await supabase.rpc('get_kb_eligible_viewers'); if (error) fail(error, 'Unable to load eligible Knowledge Base viewers.'); return (Array.isArray(data) ? data : []).map(mapEligibleViewer); },
  async getCategoryVisibility(categoryId: string): Promise<KnowledgeBaseVisibilityConfiguration<KnowledgeBaseCategoryVisibility>> { const { data, error } = await supabase.rpc('kb_get_category_visibility', { p_category_id: categoryId }); if (error) fail(error, 'Unable to load category visibility.'); return mapVisibility(data, 'all_authorized'); },
  async getArticleVisibility(articleId: string): Promise<KnowledgeBaseVisibilityConfiguration<KnowledgeBaseArticleVisibility>> { const { data, error } = await supabase.rpc('kb_get_article_visibility', { p_article_id: articleId }); if (error) fail(error, 'Unable to load article visibility.'); return mapVisibility(data, 'inherit_category'); },
  async setCategoryVisibility(input: SetKnowledgeBaseCategoryVisibilityInput): Promise<KnowledgeBaseVisibilityConfiguration<KnowledgeBaseCategoryVisibility>> { const { data, error } = await supabase.rpc('kb_set_category_visibility', { p_category_id: input.categoryId, p_visibility_mode: input.visibilityMode, p_viewer_ids: input.viewerIds }); if (error) fail(error, 'Unable to update category visibility.'); return mapVisibility(data, 'all_authorized'); },
  async setArticleVisibility(input: SetKnowledgeBaseArticleVisibilityInput): Promise<KnowledgeBaseVisibilityConfiguration<KnowledgeBaseArticleVisibility>> { const { data, error } = await supabase.rpc('kb_set_article_visibility', { p_article_id: input.articleId, p_visibility_mode: input.visibilityMode, p_viewer_ids: input.viewerIds }); if (error) fail(error, 'Unable to update article visibility.'); return mapVisibility(data, 'inherit_category'); },
};
