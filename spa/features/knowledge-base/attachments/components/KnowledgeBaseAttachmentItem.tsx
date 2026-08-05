import { ExternalLink, File, FileImage, FileText, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui';
import type { KnowledgeBaseAttachment } from '../../../../shared/types/knowledge-base';

interface KnowledgeBaseAttachmentItemProps {
  attachment: KnowledgeBaseAttachment;
  canManage: boolean;
  isOpening: boolean;
  isDeleting: boolean;
  onOpen: (attachment: KnowledgeBaseAttachment) => void;
  onRequestDelete: (attachment: KnowledgeBaseAttachment) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeLabel = (mimeType: string): string => {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'text/plain') return 'TXT';
  if (mimeType === 'text/csv') return 'CSV';
  return mimeType.split('/')[1]?.toUpperCase() || 'File';
};

const AttachmentIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5" />;
  if (mimeType.startsWith('text/')) return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

export const KnowledgeBaseAttachmentItem = ({
  attachment,
  canManage,
  isOpening,
  isDeleting,
  onOpen,
  onRequestDelete,
}: KnowledgeBaseAttachmentItemProps) => (
  <li className="flex flex-col gap-3 rounded-lg border kb-border kb-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 shrink-0 kb-accent"><AttachmentIcon mimeType={attachment.mimeType} /></span>
      <div className="min-w-0">
        <p className="break-words text-sm font-medium kb-primary">{attachment.fileName}</p>
        <p className="mt-1 text-xs kb-muted">
          {typeLabel(attachment.mimeType)} · {formatBytes(attachment.sizeBytes)} · Uploaded {new Date(attachment.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
    <div className="flex shrink-0 gap-2 sm:justify-end">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onOpen(attachment)}
        disabled={isOpening}
        aria-label={`Open attachment ${attachment.fileName}`}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        {isOpening ? 'Opening...' : 'Open'}
      </Button>
      {canManage && (
        <Button
          size="sm"
          variant="danger"
          onClick={() => onRequestDelete(attachment)}
          disabled={isDeleting}
          aria-label={`Delete attachment ${attachment.fileName}`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      )}
    </div>
  </li>
);
