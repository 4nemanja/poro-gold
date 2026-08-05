import { useCallback, useEffect, useRef, useState } from 'react';
import { knowledgeBaseAttachmentService } from '../../../../shared/services/knowledgeBaseAttachmentService';
import type { KnowledgeBaseAttachment } from '../../../../shared/types/knowledge-base';

interface UseKnowledgeBaseAttachmentsOptions {
  articleId: string | null;
  canManage: boolean;
}

export const useKnowledgeBaseAttachments = ({
  articleId,
  canManage,
}: UseKnowledgeBaseAttachmentsOptions) => {
  const [attachments, setAttachments] = useState<KnowledgeBaseAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const articleIdRef = useRef(articleId);
  const uploadLockRef = useRef(false);
  const deleteLockRef = useRef(false);
  const openLockRef = useRef(false);

  articleIdRef.current = articleId;

  const refresh = useCallback(async () => {
    const targetArticleId = articleId;
    if (!targetArticleId || articleIdRef.current !== targetArticleId) return;

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const nextAttachments = await knowledgeBaseAttachmentService.getArticleAttachments(targetArticleId);
      if (requestIdRef.current === requestId && articleIdRef.current === targetArticleId) {
        setAttachments(nextAttachments);
      }
    } catch (loadError) {
      if (requestIdRef.current === requestId && articleIdRef.current === targetArticleId) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load article attachments.');
      }
    } finally {
      if (requestIdRef.current === requestId && articleIdRef.current === targetArticleId) {
        setIsLoading(false);
      }
    }
  }, [articleId]);

  useEffect(() => {
    requestIdRef.current += 1;
    setAttachments([]);
    setError(null);
    setUploadError(null);
    setUploadSuccess(null);
    setDeleteError(null);
    setOpenError(null);
    setIsUploading(false);
    setDeletingAttachmentId(null);
    setOpeningAttachmentId(null);
    uploadLockRef.current = false;
    deleteLockRef.current = false;
    openLockRef.current = false;
    if (articleId) void refresh();
    return () => {
      requestIdRef.current += 1;
    };
  }, [articleId, refresh]);

  const uploadAttachment = useCallback(async (file: File): Promise<boolean> => {
    const targetArticleId = articleIdRef.current;
    if (!targetArticleId || !canManage || uploadLockRef.current) return false;

    uploadLockRef.current = true;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      await knowledgeBaseAttachmentService.uploadArticleAttachment(targetArticleId, file);
      if (articleIdRef.current !== targetArticleId) return false;
      setUploadSuccess(`Uploaded ${file.name}.`);
      await refresh();
      return true;
    } catch (uploadFailure) {
      if (articleIdRef.current === targetArticleId) {
        setUploadError(uploadFailure instanceof Error ? uploadFailure.message : 'Unable to upload the attachment.');
      }
      return false;
    } finally {
      uploadLockRef.current = false;
      if (articleIdRef.current === targetArticleId) setIsUploading(false);
    }
  }, [canManage, refresh]);

  const deleteAttachment = useCallback(async (attachmentId: string): Promise<boolean> => {
    const targetArticleId = articleIdRef.current;
    if (!targetArticleId || !canManage || deleteLockRef.current) return false;

    deleteLockRef.current = true;
    setDeletingAttachmentId(attachmentId);
    setDeleteError(null);
    try {
      await knowledgeBaseAttachmentService.deleteArticleAttachment(attachmentId);
      if (articleIdRef.current !== targetArticleId) return false;
      await refresh();
      return true;
    } catch (deleteFailure) {
      if (articleIdRef.current === targetArticleId) {
        setDeleteError(deleteFailure instanceof Error ? deleteFailure.message : 'Unable to delete the attachment.');
      }
      return false;
    } finally {
      deleteLockRef.current = false;
      if (articleIdRef.current === targetArticleId) setDeletingAttachmentId(null);
    }
  }, [canManage, refresh]);

  const openAttachment = useCallback(async (attachment: KnowledgeBaseAttachment): Promise<void> => {
    const targetArticleId = articleIdRef.current;
    if (!targetArticleId || openLockRef.current) return;

    const openedWindow = window.open('about:blank', '_blank');
    if (openedWindow) openedWindow.opener = null;
    openLockRef.current = true;
    setOpeningAttachmentId(attachment.id);
    setOpenError(null);
    try {
      const signedUrl = await knowledgeBaseAttachmentService.getAttachmentSignedUrl(attachment.id);
      if (articleIdRef.current !== targetArticleId) {
        openedWindow?.close();
        return;
      }
      if (openedWindow) {
        openedWindow.location.replace(signedUrl);
      } else {
        const link = document.createElement('a');
        link.href = signedUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (openFailure) {
      openedWindow?.close();
      if (articleIdRef.current === targetArticleId) {
        setOpenError(openFailure instanceof Error ? openFailure.message : 'Unable to open the attachment.');
      }
    } finally {
      openLockRef.current = false;
      if (articleIdRef.current === targetArticleId) setOpeningAttachmentId(null);
    }
  }, []);

  return {
    attachments,
    isLoading,
    error,
    refresh,
    uploadAttachment,
    isUploading,
    uploadError,
    uploadSuccess,
    deleteAttachment,
    deletingAttachmentId,
    deleteError,
    openAttachment,
    openingAttachmentId,
    openError,
  };
};
