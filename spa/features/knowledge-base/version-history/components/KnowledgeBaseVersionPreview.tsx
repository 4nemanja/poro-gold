import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../../components/ui';
import type { KnowledgeBaseArticle, KnowledgeBaseArticleVersion, KnowledgeBaseCategory } from '../../../../shared/types/knowledge-base';
import { ArticleContent } from '../../components/ArticleContent';
import { statusLabel, versionActionLabel } from './KnowledgeBaseVersionItem';

interface KnowledgeBaseVersionPreviewProps {
  version: KnowledgeBaseArticleVersion;
  categories: KnowledgeBaseCategory[];
  isCurrent: boolean;
  onBack: () => void;
  onRequestRestore: () => void;
}

export const KnowledgeBaseVersionPreview = ({
  version,
  categories,
  isCurrent,
  onBack,
  onRequestRestore,
}: KnowledgeBaseVersionPreviewProps) => {
  const article: KnowledgeBaseArticle = {
    id: version.articleId,
    categoryId: version.categoryId,
    title: version.title,
    slug: version.slug,
    excerpt: version.excerpt,
    content: version.content,
    status: version.status,
    sortOrder: version.sortOrder,
    createdBy: version.createdBy,
    updatedBy: version.createdBy,
    publishedAt: version.publishedAt,
    createdAt: version.createdAt,
    updatedAt: version.createdAt,
    visibilityMode: version.visibilityMode,
  };
  const categoryName = categories.find((category) => category.id === version.categoryId)?.name;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="secondary" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to version list
        </Button>
        {!isCurrent && <Button size="sm" onClick={onRequestRestore}>Restore this version</Button>}
      </div>
      <div className="mt-4 rounded-lg border kb-border kb-subtle p-4">
        <h4 className="font-semibold kb-primary">Previewing Version {version.versionNumber}</h4>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="kb-muted">Action</dt><dd className="kb-primary">{versionActionLabel(version.sourceAction)}</dd></div>
          <div><dt className="kb-muted">Article status</dt><dd className="kb-primary">{statusLabel(version.status)}</dd></div>
          <div><dt className="kb-muted">Category</dt><dd className="kb-primary">{categoryName || 'Category unavailable'}</dd></div>
          <div><dt className="kb-muted">Created</dt><dd className="kb-primary">{new Date(version.createdAt).toLocaleString()}</dd></div>
          <div><dt className="kb-muted">Slug</dt><dd className="break-all kb-primary">{version.slug}</dd></div>
          <div><dt className="kb-muted">Sort order</dt><dd className="kb-primary">{version.sortOrder}</dd></div>
        </dl>
        <h5 className="mt-5 break-words text-2xl font-bold kb-primary">{version.title}</h5>
        {version.excerpt && <p className="mt-2 kb-muted">{version.excerpt}</p>}
      </div>
      <p className="mt-3 text-xs kb-muted">Attachments are not part of article versions.</p>
      <div className="mt-5 max-h-[48vh] overflow-y-auto rounded-lg border kb-border p-5">
        <ArticleContent article={article} />
      </div>
    </div>
  );
};
