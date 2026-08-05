import type { KnowledgeBaseArticleVersion } from '../../../../shared/types/knowledge-base';

interface KnowledgeBaseVersionItemProps {
  version: KnowledgeBaseArticleVersion;
  isCurrent: boolean;
  latestLabel: 'Current' | 'Latest recorded';
  onSelect: (versionNumber: number) => void;
}

export const versionActionLabel = (action: KnowledgeBaseArticleVersion['sourceAction']): string => ({
  migrated: 'Migrated',
  created: 'Created',
  updated: 'Updated',
  published: 'Published',
  archived: 'Archived',
  restored: 'Restored',
})[action];

export const statusLabel = (status: KnowledgeBaseArticleVersion['status']): string =>
  status[0].toUpperCase() + status.slice(1);

export const KnowledgeBaseVersionItem = ({
  version,
  isCurrent,
  latestLabel,
  onSelect,
}: KnowledgeBaseVersionItemProps) => (
  <li>
    <button
      type="button"
      onClick={() => onSelect(version.versionNumber)}
      className="w-full rounded-lg border kb-border kb-subtle p-4 text-left transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Preview version ${version.versionNumber}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold kb-primary">Version {version.versionNumber}</span>
          {isCurrent && <span className="rounded-full kb-selected-bg px-2 py-0.5 text-xs font-medium kb-accent">{latestLabel}</span>}
        </div>
        <time className="text-xs kb-muted" dateTime={version.createdAt}>{new Date(version.createdAt).toLocaleString()}</time>
      </div>
      <p className="mt-2 break-words text-sm font-medium kb-primary">{version.title}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs kb-muted">
        <span>Action: {versionActionLabel(version.sourceAction)}</span>
        <span aria-hidden="true">·</span>
        <span>Article status: {statusLabel(version.status)}</span>
      </div>
    </button>
  </li>
);
