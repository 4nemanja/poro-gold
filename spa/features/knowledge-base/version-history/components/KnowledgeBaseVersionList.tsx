import { Button } from '../../../../components/ui';
import type { KnowledgeBaseArticleVersion } from '../../../../shared/types/knowledge-base';
import { KnowledgeBaseVersionItem } from './KnowledgeBaseVersionItem';

interface KnowledgeBaseVersionListProps {
  versions: KnowledgeBaseArticleVersion[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
  latestLabel: 'Current' | 'Latest recorded';
  hasLiveDiscrepancy: boolean;
  onRetry: () => void;
  onSelect: (versionNumber: number) => void;
}

export const KnowledgeBaseVersionList = ({
  versions,
  isLoading,
  error,
  success,
  latestLabel,
  hasLiveDiscrepancy,
  onRetry,
  onSelect,
}: KnowledgeBaseVersionListProps) => {
  const latestVersionNumber = versions.reduce((latest, version) => Math.max(latest, version.versionNumber), 0);

  return (
    <div>
      {success && <p role="status" className="mb-3 text-sm text-emerald-600">{success}</p>}
      {hasLiveDiscrepancy && (
        <p role="status" className="mb-3 rounded-lg kb-error-bg p-3 text-sm kb-error-text">
          The live article differs from the latest recorded version. History is shown without attempting an automatic repair.
        </p>
      )}
      {isLoading && versions.length === 0 && <p className="text-sm kb-muted">Loading version history...</p>}
      {error && (
        <div className="rounded-lg kb-error-bg p-3 text-sm">
          <p role="alert" className="kb-error-text">{error}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>Retry</Button>
        </div>
      )}
      {!isLoading && !error && versions.length === 0 && (
        <p className="text-sm kb-muted">No version history is available for this article.</p>
      )}
      {versions.length > 0 && (
        <ul className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          {versions.map((version) => (
            <KnowledgeBaseVersionItem
              key={version.id}
              version={version}
              isCurrent={version.versionNumber === latestVersionNumber}
              latestLabel={latestLabel}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
