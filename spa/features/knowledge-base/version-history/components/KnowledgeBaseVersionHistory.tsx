import { useState } from 'react';
import { Button, Modal } from '../../../../components/ui';
import type { KnowledgeBaseArticle, KnowledgeBaseArticleVersion, KnowledgeBaseCategory } from '../../../../shared/types/knowledge-base';
import { useKnowledgeBaseVersions } from '../hooks/useKnowledgeBaseVersions';
import { KnowledgeBaseVersionList } from './KnowledgeBaseVersionList';
import { KnowledgeBaseVersionPreview } from './KnowledgeBaseVersionPreview';
import { RestoreVersionDialog } from './RestoreVersionDialog';

interface KnowledgeBaseVersionHistoryProps {
  article: KnowledgeBaseArticle;
  categories: KnowledgeBaseCategory[];
  isOpen: boolean;
  onClose: () => void;
  onRestored: (articleId: string) => Promise<void>;
}

export const KnowledgeBaseVersionHistory = ({
  article,
  categories,
  isOpen,
  onClose,
  onRestored,
}: KnowledgeBaseVersionHistoryProps) => {
  const versions = useKnowledgeBaseVersions({
    articleId: article.id,
    canManage: true,
    isOpen,
    onRestored,
  });
  const [restoreTarget, setRestoreTarget] = useState<KnowledgeBaseArticleVersion | null>(null);
  const latestVersionNumber = versions.versions.reduce(
    (latest, version) => Math.max(latest, version.versionNumber),
    0,
  );
  const latestVersion = versions.versions.find((version) => version.versionNumber === latestVersionNumber);
  const hasLiveDiscrepancy = Boolean(latestVersion && (
    latestVersion.categoryId !== article.categoryId
    || latestVersion.title !== article.title
    || latestVersion.slug !== article.slug
    || latestVersion.excerpt !== article.excerpt
    || latestVersion.content !== article.content
    || latestVersion.status !== article.status
    || latestVersion.sortOrder !== article.sortOrder
    || latestVersion.publishedAt !== article.publishedAt
  ));

  const close = () => {
    if (versions.isRestoring) return;
    setRestoreTarget(null);
    versions.clearSelectedVersion();
    onClose();
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    if (await versions.restoreVersion(restoreTarget.versionNumber)) setRestoreTarget(null);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={close} title="Version History" maxWidth="sm:max-w-5xl">
        {versions.isLoadingVersion && <p className="text-sm kb-muted">Loading version preview...</p>}
        {versions.versionError && (
          <div className="mb-3 rounded-lg kb-error-bg p-3 text-sm">
            <p role="alert" className="kb-error-text">{versions.versionError}</p>
            <Button className="mt-3" size="sm" variant="secondary" onClick={versions.clearSelectedVersion}>Back to version list</Button>
          </div>
        )}
        {!versions.isLoadingVersion && versions.selectedVersion ? (
          <KnowledgeBaseVersionPreview
            version={versions.selectedVersion}
            categories={categories}
            isCurrent={versions.selectedVersion.versionNumber === latestVersionNumber}
            onBack={versions.clearSelectedVersion}
            onRequestRestore={() => setRestoreTarget(versions.selectedVersion)}
          />
        ) : !versions.isLoadingVersion && !versions.versionError ? (
          <KnowledgeBaseVersionList
            versions={versions.versions}
            isLoading={versions.isLoading}
            error={versions.error}
            success={versions.restoreSuccess}
            latestLabel={hasLiveDiscrepancy ? 'Latest recorded' : 'Current'}
            hasLiveDiscrepancy={hasLiveDiscrepancy}
            onRetry={() => void versions.refresh()}
            onSelect={(versionNumber) => void versions.loadVersion(versionNumber)}
          />
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={close} disabled={versions.isRestoring}>Close</Button>
        </div>
      </Modal>
      <RestoreVersionDialog
        version={restoreTarget}
        isRestoring={versions.isRestoring}
        error={versions.restoreError}
        onClose={() => {
          if (!versions.isRestoring) setRestoreTarget(null);
        }}
        onConfirm={() => void confirmRestore()}
      />
    </>
  );
};
