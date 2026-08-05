import { useCallback, useEffect, useRef, useState } from 'react';
import { knowledgeBaseVersionService } from '../../../../shared/services/knowledgeBaseVersionService';
import type { KnowledgeBaseArticleVersion } from '../../../../shared/types/knowledge-base';

interface UseKnowledgeBaseVersionsOptions {
  articleId: string | null;
  canManage: boolean;
  isOpen: boolean;
  onRestored: (articleId: string) => Promise<void>;
}

export const useKnowledgeBaseVersions = ({
  articleId,
  canManage,
  isOpen,
  onRestored,
}: UseKnowledgeBaseVersionsOptions) => {
  const [versions, setVersions] = useState<KnowledgeBaseArticleVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<KnowledgeBaseArticleVersion | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const articleIdRef = useRef(articleId);
  const activeRef = useRef(false);
  const listRequestRef = useRef(0);
  const versionRequestRef = useRef(0);
  const restoreLockRef = useRef(false);

  articleIdRef.current = articleId;

  const refresh = useCallback(async () => {
    const targetArticleId = articleId;
    if (!targetArticleId || !canManage || !isOpen || !activeRef.current || articleIdRef.current !== targetArticleId) return;

    const requestId = ++listRequestRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const nextVersions = await knowledgeBaseVersionService.getArticleVersions(targetArticleId);
      if (activeRef.current && listRequestRef.current === requestId && articleIdRef.current === targetArticleId) {
        setVersions([...nextVersions].sort((left, right) => right.versionNumber - left.versionNumber));
      }
    } catch (loadError) {
      if (activeRef.current && listRequestRef.current === requestId && articleIdRef.current === targetArticleId) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load article versions.');
      }
    } finally {
      if (activeRef.current && listRequestRef.current === requestId && articleIdRef.current === targetArticleId) {
        setIsLoading(false);
      }
    }
  }, [articleId, canManage, isOpen]);

  useEffect(() => {
    activeRef.current = Boolean(articleId && canManage && isOpen);
    listRequestRef.current += 1;
    versionRequestRef.current += 1;
    setVersions([]);
    setSelectedVersion(null);
    setError(null);
    setVersionError(null);
    setRestoreError(null);
    setRestoreSuccess(null);
    setIsLoading(false);
    setIsLoadingVersion(false);
    setIsRestoring(false);
    restoreLockRef.current = false;
    if (articleId && canManage && isOpen) void refresh();
    return () => {
      activeRef.current = false;
      listRequestRef.current += 1;
      versionRequestRef.current += 1;
    };
  }, [articleId, canManage, isOpen, refresh]);

  const loadVersion = useCallback(async (versionNumber: number) => {
    const targetArticleId = articleIdRef.current;
    if (!targetArticleId || !canManage || !isOpen || !activeRef.current) return;

    const requestId = ++versionRequestRef.current;
    setIsLoadingVersion(true);
    setVersionError(null);
    setRestoreError(null);
    try {
      const version = await knowledgeBaseVersionService.getArticleVersion(targetArticleId, versionNumber);
      if (activeRef.current && versionRequestRef.current === requestId && articleIdRef.current === targetArticleId) {
        setSelectedVersion(version);
      }
    } catch (loadError) {
      if (activeRef.current && versionRequestRef.current === requestId && articleIdRef.current === targetArticleId) {
        setVersionError(loadError instanceof Error ? loadError.message : 'Unable to load this article version.');
      }
    } finally {
      if (activeRef.current && versionRequestRef.current === requestId && articleIdRef.current === targetArticleId) {
        setIsLoadingVersion(false);
      }
    }
  }, [canManage, isOpen]);

  const clearSelectedVersion = useCallback(() => {
    versionRequestRef.current += 1;
    setSelectedVersion(null);
    setVersionError(null);
    setRestoreError(null);
  }, []);

  const restoreVersion = useCallback(async (versionNumber: number): Promise<boolean> => {
    const targetArticleId = articleIdRef.current;
    if (!targetArticleId || !canManage || !activeRef.current || restoreLockRef.current) return false;

    restoreLockRef.current = true;
    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);
    try {
      await knowledgeBaseVersionService.restoreArticleVersion({
        articleId: targetArticleId,
        versionNumber,
      });
      if (!activeRef.current || articleIdRef.current !== targetArticleId) return false;
      await onRestored(targetArticleId);
      if (!activeRef.current || articleIdRef.current !== targetArticleId) return false;
      await refresh();
      setSelectedVersion(null);
      setRestoreSuccess(`Version ${versionNumber} was restored successfully.`);
      return true;
    } catch (restoreFailure) {
      if (activeRef.current && articleIdRef.current === targetArticleId) {
        setRestoreError(restoreFailure instanceof Error ? restoreFailure.message : 'Unable to restore this article version.');
      }
      return false;
    } finally {
      restoreLockRef.current = false;
      if (activeRef.current && articleIdRef.current === targetArticleId) setIsRestoring(false);
    }
  }, [canManage, onRestored, refresh]);

  return {
    versions,
    isLoading,
    error,
    refresh,
    selectedVersion,
    isLoadingVersion,
    versionError,
    loadVersion,
    restoreVersion,
    isRestoring,
    restoreError,
    restoreSuccess,
    clearSelectedVersion,
  };
};
