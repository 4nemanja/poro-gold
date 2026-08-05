import { supabase } from '../supabase/client';
import type {
  CreateKnowledgeBaseAttachmentInput,
  KnowledgeBaseAttachment,
  KnowledgeBaseAttachmentMimeType,
} from '../types/knowledge-base';
import { normalizeKnowledgeBaseServiceError } from './knowledgeBaseServiceError';

const BUCKET = 'knowledge-base';
export const KNOWLEDGE_BASE_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
const SIGNED_URL_LIFETIME_SECONDS = 10 * 60;
export const KNOWLEDGE_BASE_ATTACHMENT_MIME_TYPES: readonly KnowledgeBaseAttachmentMimeType[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
];

type Row = Record<string, unknown>;

const record = (value: unknown): Row =>
  typeof value === 'object' && value !== null ? value as Row : {};
const text = (row: Row, key: string): string =>
  typeof row[key] === 'string' ? row[key] as string : '';
const nullableText = (row: Row, key: string): string | null =>
  typeof row[key] === 'string' ? row[key] as string : null;
const number = (row: Row, key: string): number =>
  typeof row[key] === 'number' ? row[key] as number : Number(row[key] || 0);
const firstRow = (data: unknown): Row => record(Array.isArray(data) ? data[0] : data);

const isAllowedMimeType = (value: string): value is KnowledgeBaseAttachmentMimeType =>
  KNOWLEDGE_BASE_ATTACHMENT_MIME_TYPES.some((mimeType) => mimeType === value);

const mapAttachment = (value: unknown): KnowledgeBaseAttachment => {
  const row = record(value);
  return {
    id: text(row, 'id'),
    articleId: text(row, 'article_id'),
    storagePath: text(row, 'storage_path'),
    fileName: text(row, 'file_name'),
    mimeType: text(row, 'mime_type') as KnowledgeBaseAttachmentMimeType,
    sizeBytes: number(row, 'size_bytes'),
    uploadedBy: nullableText(row, 'uploaded_by'),
    createdAt: text(row, 'created_at'),
  };
};

const sanitizeStorageFileName = (fileName: string): string => {
  const asciiName = fileName
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[._-]+/, '')
    .slice(0, 200);
  return asciiName || 'attachment';
};

const validateFile = (file: File): KnowledgeBaseAttachmentMimeType => {
  if (!isAllowedMimeType(file.type)) throw new Error('This attachment file type is not allowed.');
  if (file.size < 1 || file.size > KNOWLEDGE_BASE_ATTACHMENT_MAX_SIZE) {
    throw new Error('Attachments must be between 1 byte and 10 MB.');
  }
  if (!file.name.trim() || file.name.trim().length > 255) {
    throw new Error('The attachment file name must be between 1 and 255 characters.');
  }
  return file.type;
};

const createAttachmentRecord = async (
  input: CreateKnowledgeBaseAttachmentInput,
): Promise<KnowledgeBaseAttachment> => {
  const { data, error } = await supabase.rpc('kb_create_attachment_record', {
    p_attachment_id: input.id,
    p_article_id: input.articleId,
    p_storage_path: input.storagePath,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType,
    p_size_bytes: input.sizeBytes,
  });
  if (error) throw normalizeKnowledgeBaseServiceError(error, 'Unable to save attachment metadata.');
  return mapAttachment(firstRow(data));
};

const getAttachment = async (attachmentId: string): Promise<KnowledgeBaseAttachment> => {
  const { data, error } = await supabase.rpc('get_kb_attachment', {
    p_attachment_id: attachmentId,
  });
  if (error) throw normalizeKnowledgeBaseServiceError(error, 'Unable to load the attachment.');
  return mapAttachment(firstRow(data));
};

export const knowledgeBaseAttachmentService = {
  async getAttachmentMetadata(attachmentId: string): Promise<KnowledgeBaseAttachment> {
    return getAttachment(attachmentId);
  },
  async getArticleAttachments(articleId: string): Promise<KnowledgeBaseAttachment[]> {
    const { data, error } = await supabase.rpc('get_kb_article_attachments', {
      p_article_id: articleId,
    });
    if (error) throw normalizeKnowledgeBaseServiceError(error, 'Unable to load article attachments.');
    return (Array.isArray(data) ? data : []).map(mapAttachment);
  },

  async uploadArticleAttachment(
    articleId: string,
    file: File,
  ): Promise<KnowledgeBaseAttachment> {
    const mimeType = validateFile(file);
    const attachmentId = crypto.randomUUID();
    const storagePath = `${articleId}/${attachmentId}/${sanitizeStorageFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError) {
      throw normalizeKnowledgeBaseServiceError(uploadError, 'Unable to upload the attachment.');
    }

    try {
      return await createAttachmentRecord({
        id: attachmentId,
        articleId,
        storagePath,
        fileName: file.name.trim(),
        mimeType,
        sizeBytes: file.size,
      });
    } catch (metadataError) {
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([storagePath]);
      if (cleanupError) {
        throw new Error(
          'Attachment metadata failed and the uploaded file could not be cleaned up. Manual Storage cleanup is required.',
          { cause: metadataError },
        );
      }
      throw metadataError;
    }
  },

  async deleteArticleAttachment(attachmentId: string): Promise<void> {
    const attachment = await getAttachment(attachmentId);
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.storagePath]);
    if (storageError) {
      throw new Error('The attachment file could not be deleted. Metadata was preserved; please retry.');
    }

    const { error: metadataError } = await supabase.rpc('kb_delete_attachment', {
      p_attachment_id: attachmentId,
    });
    if (metadataError) {
      throw new Error('The file was deleted, but its metadata could not be removed. Retry the deletion to finish cleanup.');
    }
  },

  async getAttachmentSignedUrl(attachmentId: string): Promise<string> {
    const attachment = await getAttachment(attachmentId);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storagePath, SIGNED_URL_LIFETIME_SECONDS);
    if (error) throw normalizeKnowledgeBaseServiceError(error, 'Unable to create the attachment download link.');
    if (!data.signedUrl) throw new Error('The attachment download link was not returned.');
    return data.signedUrl;
  },
};
