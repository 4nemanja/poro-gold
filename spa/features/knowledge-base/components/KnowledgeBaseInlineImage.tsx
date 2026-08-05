import { useEffect, useState } from 'react';
import { ImageOff, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui';
import { knowledgeBaseAttachmentService } from '../../../shared/services/knowledgeBaseAttachmentService';

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const KnowledgeBaseInlineImage = ({ attachmentId, alt, caption }: { attachmentId: string; alt: string; caption?: string | null }) => {
  const [url, setUrl] = useState<string | null>(null); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setUrl(null); setError(false); if (!uuid.test(attachmentId)) { setError(true); return () => { active = false; }; } void (async () => { try { const attachment = await knowledgeBaseAttachmentService.getAttachmentMetadata(attachmentId); if (!IMAGE_MIME_TYPES.has(attachment.mimeType)) throw new Error('Not an image'); const signedUrl = await knowledgeBaseAttachmentService.getAttachmentSignedUrl(attachmentId); if (active) setUrl(signedUrl); } catch { if (active) setError(true); } })(); return () => { active = false; }; }, [attachmentId, retry]);
  if (error) return <figure className="kb-inline-image kb-inline-image-unavailable"><ImageOff className="h-5 w-5" /><span>Image unavailable</span><Button size="sm" variant="secondary" onClick={()=>setRetry((value)=>value+1)}><RefreshCw className="mr-1 h-3.5 w-3.5"/>Retry</Button></figure>;
  if (!url) return <figure className="kb-inline-image kb-inline-image-loading"><LoaderCircle className="h-5 w-5 animate-spin" />Loading image...</figure>;
  return <figure className="kb-inline-image"><img src={url} alt={alt} onError={()=>setRetry((value)=>value+1)} />{caption && <figcaption>{caption}</figcaption>}</figure>;
};
