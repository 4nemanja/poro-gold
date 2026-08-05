import { Button, Modal } from '../../../../components/ui';
import type { KnowledgeBaseArticleVersion } from '../../../../shared/types/knowledge-base';

interface RestoreVersionDialogProps {
  version: KnowledgeBaseArticleVersion | null;
  isRestoring: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const RestoreVersionDialog = ({
  version,
  isRestoring,
  error,
  onClose,
  onConfirm,
}: RestoreVersionDialogProps) => (
  <Modal
    isOpen={Boolean(version)}
    onClose={() => {
      if (!isRestoring) onClose();
    }}
    title={`Restore Version ${version?.versionNumber ?? ''}?`}
  >
    <p className="text-sm kb-primary">
      The article text and settings will be replaced with this historical snapshot. The current article will remain preserved as part of version history. Attachments will not be changed.
    </p>
    {error && <p role="alert" className="mt-3 text-sm kb-error-text">{error}</p>}
    <div className="mt-6 flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose} disabled={isRestoring}>Cancel</Button>
      <Button onClick={onConfirm} disabled={isRestoring}>{isRestoring ? 'Restoring...' : 'Restore this version'}</Button>
    </div>
  </Modal>
);
