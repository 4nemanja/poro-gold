import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { knowledgeBaseService } from '../../../shared/services/knowledgeBaseService';
import type { KnowledgeBaseArticle, KnowledgeBaseCategory } from '../../../shared/types/knowledge-base';

export const useKnowledgeBase = (isOwner: boolean) => {
  const [categories,setCategories]=useState<KnowledgeBaseCategory[]>([]);
  const [articles,setArticles]=useState<KnowledgeBaseArticle[]>([]);
  const [selectedArticleId,setSelectedArticleId]=useState<string | null>(null);
  const [searchQuery,setSearchQuery]=useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [isLoading,setIsLoading]=useState(true);
  const [error,setError]=useState<string | null>(null);
  const loaded=useRef(false);
  const refresh=useCallback(async()=>{ setIsLoading(true); setError(null); try {
    const [nextCategories,nextArticles]=await Promise.all([knowledgeBaseService.getKnowledgeBaseCategories(),isOwner?knowledgeBaseService.getAllKnowledgeBaseArticlesForOwner():knowledgeBaseService.getPublishedKnowledgeBaseArticles()]);
    setCategories(nextCategories); setArticles(nextArticles); setSelectedArticleId((current)=>current&&nextArticles.some((a)=>a.id===current)?current:nextArticles[0]?.id||null);
  } catch(e){setError(e instanceof Error?e.message:'Unable to load the Knowledge Base.');} finally{setIsLoading(false);} },[isOwner]);
  useEffect(()=>{if(loaded.current)return;loaded.current=true;void refresh();},[refresh]);
  const visibleArticles=useMemo(()=>articles.filter((article)=>statusFilter==='all'||article.status===statusFilter),[articles,statusFilter]);
  const query=searchQuery.trim().toLowerCase();
  const filteredArticles=useMemo(()=>visibleArticles.filter((article)=>!query||[article.title,article.excerpt||'',article.content,categories.find((c)=>c.id===article.categoryId)?.name||''].some((value)=>value.toLowerCase().includes(query))),[visibleArticles,query,categories]);
  return {categories,articles:filteredArticles,allArticles:articles,selectedArticle:articles.find((a)=>a.id===selectedArticleId)||null,selectedArticleId,setSelectedArticleId,searchQuery,setSearchQuery,statusFilter,setStatusFilter,isLoading,error,refresh};
};
