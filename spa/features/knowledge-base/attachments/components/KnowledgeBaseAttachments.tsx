import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button, Modal } from '../../../../components/ui';
import type { KnowledgeBaseAttachment } from '../../../../shared/types/knowledge-base';
import { useKnowledgeBaseAttachments } from '../hooks/useKnowledgeBaseAttachments';
import { KnowledgeBaseAttachmentItem } from './KnowledgeBaseAttachmentItem';
import { KnowledgeBaseAttachmentUpload } from './KnowledgeBaseAttachmentUpload';

interface KnowledgeBaseAttachmentsProps {
  articleId: string;
  canManage: boolean;
  articleContent?: string;
}

export const KnowledgeBaseAttachments = ({
  articleId,
  canManage,
  articleContent = '',
}: KnowledgeBaseAttachmentsProps) => {
  const attachmentState = useKnowledgeBaseAttachments({ articleId, canManage });
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBaseAttachment | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (articleContent.includes(`kb-attachment:${deleteTarget.id}`)) return;
    if (await attachmentState.deleteAttachment(deleteTarget.id)) setDeleteTarget(null);
  };

  const hasVisibleReaderState = attachmentState.isLoading
    || Boolean(attachmentState.error)
    || attachmentState.attachments.length > 0;
  if (!canManage && !hasVisibleReaderState) return null;

  return (
    <section className="mt-10 border-t kb-border pt-6" aria-labelledby="knowledge-base-attachments-heading">
      <div className="flex items-center gap-2">
        <Paperclip className="h-5 w-5 kb-accent" />
        <h3 id="knowledge-base-attachments-heading" className="text-lg font-semibold kb-primary">Attachments</h3>
      </div>

      {canManage && (
        <div className="mt-4">
          <KnowledgeBaseAttachmentUpload
            isUploading={attachmentState.isUploading}
            uploadError={attachmentState.uploadError}
            uploadSuccess={attachmentState.uploadSuccess}
            onUpload={attachmentState.uploadAttachment}
          />
          <p className="mt-2 text-xs kb-muted">
            Article version restore affects text and article settings only. Attachments are not restored or changed.
          </p>
        </div>
      )}

      {attachmentState.isLoading && attachmentState.attachments.length === 0 && (
        <p className="mt-4 text-sm kb-muted">Loading attachments...</p>
      )}
      {attachmentState.error && (
        <div className="mt-4 rounded-lg kb-error-bg p-3 text-sm">
          <p role="alert" className="kb-error-text">{attachmentState.error}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void attachmentState.refresh()}>Retry</Button>
        </div>
      )}
      {attachmentState.openError && <p role="alert" className="mt-3 text-sm kb-error-text">{attachmentState.openError}</p>}
      {attachmentState.deleteError && <p role="alert" className="mt-3 text-sm kb-error-text">{attachmentState.deleteError}</p>}

      {!attachmentState.error && attachmentState.attachments.length === 0 && !attachmentState.isLoading && canManage && (
        <p className="mt-4 text-sm kb-muted">No attachments added yet.</p>
      )}
      {attachmentState.attachments.length > 0 && (
        <ul className="mt-4 space-y-3">
          {attachmentState.attachments.map((attachment) => (
            <KnowledgeBaseAttachmentItem
              key={attachment.id}
              attachment={attachment}
              canManage={canManage}
              isOpening={attachmentState.openingAttachmentId === attachment.id}
              isDeleting={attachmentState.deletingAttachmentId === attachment.id}
              onOpen={(item) => void attachmentState.openAttachment(item)}
              onRequestDelete={setDeleteTarget}
            />
          ))}
        </ul>
      )}

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!attachmentState.deletingAttachmentId) setDeleteTarget(null);
        }}
        title="Delete attachment"
      >
        <p className="text-sm kb-primary">
          Delete attachment <strong className="break-all">&quot;{deleteTarget?.fileName}&quot;</strong>?
        </p>
        {articleContent.includes(`kb-attachment:${deleteTarget?.id}`) ? <p className="mt-2 text-sm kb-error-text">This image is currently used inside the article. Remove it from the article content before deleting the attachment.</p> : <p className="mt-2 text-sm kb-muted">
          This removes the file from the Knowledge Base article and cannot be undone.
        </p>}
        {attachmentState.deleteError && <p role="alert" className="mt-3 text-sm kb-error-text">{attachmentState.deleteError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={Boolean(attachmentState.deletingAttachmentId)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={Boolean(attachmentState.deletingAttachmentId) || articleContent.includes(`kb-attachment:${deleteTarget?.id}`)}>
            {attachmentState.deletingAttachmentId ? 'Deleting...' : 'Delete attachment'}
          </Button>
        </div>
      </Modal>
    </section>
  );
};
