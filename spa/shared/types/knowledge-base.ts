export type KnowledgeBaseArticleStatus = 'draft' | 'published' | 'archived';
export type KnowledgeBaseCategoryVisibility = 'all_authorized' | 'selected_users';
export type KnowledgeBaseArticleVisibility = 'inherit_category' | 'selected_users';
export type KnowledgeBaseArticleVersionSourceAction =
  | 'created'
  | 'updated'
  | 'published'
  | 'archived'
  | 'restored'
  | 'migrated';

export type KnowledgeBaseAttachmentMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'application/pdf'
  | 'text/plain'
  | 'text/csv';

export interface KnowledgeBaseCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  visibilityMode: KnowledgeBaseCategoryVisibility;
}

export interface KnowledgeBaseArticle {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: KnowledgeBaseArticleStatus;
  sortOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  visibilityMode: KnowledgeBaseArticleVisibility;
}

export interface KnowledgeBaseArticleVersion {
  id: string;
  articleId: string;
  versionNumber: number;
  categoryId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: KnowledgeBaseArticleStatus;
  publishedAt: string | null;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  sourceAction: KnowledgeBaseArticleVersionSourceAction;
  visibilityMode: KnowledgeBaseArticleVisibility;
}

export interface KnowledgeBaseEligibleViewer {
  id: string;
  displayName: string | null;
  email: string | null;
  roles: Array<'admin' | 'seller'>;
  avatarPath: string | null;
}

export interface KnowledgeBaseVisibilityConfiguration<T extends string> {
  visibilityMode: T;
  viewerIds: string[];
}

export interface SetKnowledgeBaseCategoryVisibilityInput {
  categoryId: string;
  visibilityMode: KnowledgeBaseCategoryVisibility;
  viewerIds: string[];
}

export interface SetKnowledgeBaseArticleVisibilityInput {
  articleId: string;
  visibilityMode: KnowledgeBaseArticleVisibility;
  viewerIds: string[];
}

export interface KnowledgeBaseAttachment {
  id: string;
  articleId: string;
  storagePath: string;
  fileName: string;
  mimeType: KnowledgeBaseAttachmentMimeType;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
}

export interface CreateKnowledgeBaseAttachmentInput {
  id: string;
  articleId: string;
  storagePath: string;
  fileName: string;
  mimeType: KnowledgeBaseAttachmentMimeType;
  sizeBytes: number;
}

export interface RestoreKnowledgeBaseArticleVersionInput {
  articleId: string;
  versionNumber: number;
}

export interface CreateKnowledgeBaseCategoryInput {
  name: string; slug: string; description?: string; icon?: string; sortOrder?: number; isActive?: boolean;
}
export interface UpdateKnowledgeBaseCategoryInput extends CreateKnowledgeBaseCategoryInput { id: string; }
export interface CreateKnowledgeBaseArticleInput {
  categoryId: string; title: string; slug: string; excerpt?: string; content: string; sortOrder?: number;
}
export interface UpdateKnowledgeBaseArticleInput extends CreateKnowledgeBaseArticleInput { id: string; }
