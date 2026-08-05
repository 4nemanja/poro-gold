import type { ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { KnowledgeBaseInlineImage } from './KnowledgeBaseInlineImage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { KnowledgeBaseArticle } from '../../../shared/types/knowledge-base';
import { extractHeadings } from '../utils/markdown';

type CalloutType='info'|'warning'|'success';
const colorDirective=/:(purple|blue|green|yellow|red)\[([^\]\r\n]+)\]/g;
const colorize=(content:string)=>content.replace(colorDirective,(_match,color:string,text:string)=>`[${text}](https://porogold.local/color/${color})`);
const splitCallouts=(content:string)=>content.split(/(^:::(?:info|warning|success)\s*$[\s\S]*?^:::\s*$)/m).filter(Boolean).map((part)=>{const match=/^:::(info|warning|success)\s*\n([\s\S]*?)\n?:::\s*$/.exec(part);return match?{type:match[1] as CalloutType,content:match[2]}:{type:null,content:part};});
export const ArticleContent=({article}:{article:KnowledgeBaseArticle})=>{
  const headings=extractHeadings(article.content); let headingIndex=0;
  const heading=(level:2|3|4)=>(props:{children?:ReactNode})=>{const item=headings[headingIndex++]; const Tag=`h${level}` as const; return <Tag id={item?.id} className={`kb-heading kb-heading-${level} scroll-mt-24`}>{props.children}</Tag>;};
  const markdown=(content:string)=><ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={(url)=>url.startsWith('kb-attachment:')?url:/^(https?:|mailto:|\/|#)/.test(url)?url:''} components={{h2:heading(2),h3:heading(3),h4:heading(4),img:({src,alt,title})=>{const id=/^kb-attachment:([0-9a-f-]{36})$/i.exec(src||'')?.[1];return id?<KnowledgeBaseInlineImage attachmentId={id} alt={alt||'Knowledge Base image'} caption={title}/>:null;},a:({href,children})=>{const color=/^https:\/\/porogold\.local\/color\/(purple|blue|green|yellow|red)$/.exec(href||'');if(color)return <span className={`kb-text-${color[1]}`}>{children}</span>;const external=/^https?:\/\//.test(href||'');const safe=external||href?.startsWith('/')||href?.startsWith('#')||href?.startsWith('mailto:');return safe?<a href={href} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined}>{children}</a>:<>{children}</>;},code:({children,className})=><code className={className||''}>{children}</code>,pre:({children})=><pre>{children}</pre>,blockquote:({children})=><blockquote>{children}</blockquote>,table:({children})=><div className="kb-table-wrap"><table>{children}</table></div>,th:({children})=><th>{children}</th>,td:({children})=><td>{children}</td>,p:({children})=><p>{children}</p>,ul:({children})=><ul>{children}</ul>,ol:({children})=><ol>{children}</ol>,hr:()=> <hr/>}}>{colorize(content)}</ReactMarkdown>;
  return <article className="kb-article max-w-3xl leading-7">
    {splitCallouts(article.content).map((block,index)=>{if(!block.type)return <div key={index}>{markdown(block.content)}</div>;const Icon=block.type==='info'?Info:block.type==='warning'?TriangleAlert:CheckCircle2;const label=block.type[0].toUpperCase()+block.type.slice(1);return <section key={index} className={`kb-callout kb-callout-${block.type}`}><div className="kb-callout-title"><Icon className="h-4 w-4"/>{label}</div>{markdown(block.content)}</section>;})}
  </article>;
};
export const OnThisPage=({content}:{content:string})=>{const headings=extractHeadings(content);if(!headings.length)return null;return <aside className="kb-toc hidden xl:block w-56 shrink-0"><div className="sticky top-24"><h3 className="text-xs font-semibold uppercase tracking-wider">On this page</h3><nav className="mt-3 space-y-2">{headings.map((h)=><button key={h.id} type="button" onClick={()=>document.getElementById(h.id)?.scrollIntoView({behavior:'smooth',block:'start'})} className={`block text-left text-sm ${h.level===3?'pl-3':h.level===4?'pl-6':''}`}>{h.text}</button>)}</nav></div></aside>;};
