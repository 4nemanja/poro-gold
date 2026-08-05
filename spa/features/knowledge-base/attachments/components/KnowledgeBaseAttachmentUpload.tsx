import { useRef, useState, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../../../../components/ui';
import {
  KNOWLEDGE_BASE_ATTACHMENT_MAX_SIZE,
  KNOWLEDGE_BASE_ATTACHMENT_MIME_TYPES,
} from '../../../../shared/services/knowledgeBaseAttachmentService';

interface KnowledgeBaseAttachmentUploadProps {
  isUploading: boolean;
  uploadError: string | null;
  uploadSuccess: string | null;
  onUpload: (file: File) => Promise<boolean>;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const KnowledgeBaseAttachmentUpload = ({
  isUploading,
  uploadError,
  uploadSuccess,
  onUpload,
}: KnowledgeBaseAttachmentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File | null): string | null => {
    if (!file) return 'Select a file to upload.';
    if (!file.name.trim()) return 'The display filename cannot be empty.';
    if (file.size < 1) return 'The selected file is empty.';
    if (file.size > KNOWLEDGE_BASE_ATTACHMENT_MAX_SIZE) return 'The maximum file size is 10 MB.';
    if (!KNOWLEDGE_BASE_ATTACHMENT_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
      return 'This file type is not supported.';
    }
    return null;
  };

  const handleSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationError(validate(file));
  };

  const handleUpload = async () => {
    const nextValidationError = validate(selectedFile);
    setValidationError(nextValidationError);
    if (nextValidationError || !selectedFile) return;

    if (await onUpload(selectedFile)) {
      setSelectedFile(null);
      setValidationError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border kb-border kb-subtle p-4">
      <label htmlFor="knowledge-base-attachment-file" className="block text-sm font-medium kb-primary">
        Add attachment
      </label>
      <input
        ref={fileInputRef}
        id="knowledge-base-attachment-file"
        type="file"
        accept={KNOWLEDGE_BASE_ATTACHMENT_MIME_TYPES.join(',')}
        onChange={handleSelection}
        disabled={isUploading}
        className="mt-2 block w-full min-w-0 text-sm kb-muted file:mr-3 file:rounded-md file:border file:border-solid file:border-[var(--kb-border)] file:bg-[var(--kb-surface)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--kb-primary)] hover:file:bg-[var(--kb-surface-raised)]"
      />
      {selectedFile && (
        <p className="mt-2 break-all text-xs kb-muted">
          {selectedFile.name} · {formatBytes(selectedFile.size)}
        </p>
      )}
      <p className="mt-2 text-xs kb-muted">PNG, JPEG, WebP, GIF, PDF, TXT, or CSV. Maximum 10 MB.</p>
      {validationError && <p role="alert" className="mt-2 text-sm kb-error-text">{validationError}</p>}
      {uploadError && <p role="alert" className="mt-2 text-sm kb-error-text">{uploadError}</p>}
      {uploadSuccess && <p role="status" className="mt-2 text-sm text-emerald-600">{uploadSuccess}</p>}
      <Button className="mt-3" size="sm" onClick={() => void handleUpload()} disabled={isUploading}>
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
};
