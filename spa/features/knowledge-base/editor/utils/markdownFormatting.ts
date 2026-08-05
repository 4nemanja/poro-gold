export type MarkdownFormat = 'paragraph' | 'h2' | 'h3' | 'bold' | 'italic' | 'bullet' | 'numbered' | 'quote' | 'inlineCode' | 'codeBlock' | 'link' | 'rule' | 'info' | 'warning' | 'success';
export type SafeColor = 'purple' | 'blue' | 'green' | 'yellow' | 'red';
export interface FormattingResult { value: string; selectionStart: number; selectionEnd: number; }

const placeholder = 'text';
const splitTrailingNewlines = (selected: string) => {
  const match = /\n+$/.exec(selected);
  return { inline: match ? selected.slice(0, -match[0].length) || placeholder : selected || placeholder, trailing: match?.[0] || '' };
};
const linePrefix = (value: string, start: number, prefix: string): FormattingResult => {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', start);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, end) || placeholder;
  const next = `${value.slice(0, lineStart)}${prefix}${line}${value.slice(end)}`;
  return { value: next, selectionStart: lineStart + prefix.length, selectionEnd: lineStart + prefix.length + line.length };
};

export const applyMarkdownFormat = (value: string, start: number, end: number, format: MarkdownFormat): FormattingResult => {
  const selected = value.slice(start, end) || placeholder;
  const wrap = (before: string, after = before): FormattingResult => { const parts = splitTrailingNewlines(selected); return { value: `${value.slice(0, start)}${before}${parts.inline}${after}${parts.trailing}${value.slice(end)}`, selectionStart: start + before.length, selectionEnd: start + before.length + parts.inline.length }; };
  if (format === 'bold') return wrap('**');
  if (format === 'italic') return wrap('*');
  if (format === 'inlineCode') return wrap('`');
  if (format === 'link') return { value: `${value.slice(0, start)}[${selected}](https://example.com)${value.slice(end)}`, selectionStart: start + selected.length + 3, selectionEnd: start + selected.length + 22 };
  if (format === 'h2') return linePrefix(value, start, '## ');
  if (format === 'h3') return linePrefix(value, start, '### ');
  if (format === 'bullet') return linePrefix(value, start, '- ');
  if (format === 'numbered') return linePrefix(value, start, '1. ');
  if (format === 'quote') return linePrefix(value, start, '> ');
  if (format === 'codeBlock') return wrap('```\n', '\n```');
  if (format === 'rule') return { value: `${value.slice(0, start)}\n\n---\n\n${value.slice(end)}`, selectionStart: start + 7, selectionEnd: start + 7 };
  if (format === 'paragraph') return { value, selectionStart: start, selectionEnd: end };
  return { value: `${value.slice(0, start)}\n\n:::${format}\n${selected}\n:::\n\n${value.slice(end)}`, selectionStart: start + format.length + 6, selectionEnd: start + format.length + 6 + selected.length };
};

export const applySafeColor = (value: string, start: number, end: number, color: SafeColor): FormattingResult => {
  const parts = splitTrailingNewlines(value.slice(start, end));
  const prefix = `:${color}[`;
  return { value: `${value.slice(0, start)}${prefix}${parts.inline}]${parts.trailing}${value.slice(end)}`, selectionStart: start + prefix.length, selectionEnd: start + prefix.length + parts.inline.length };
};

const escapeImageText = (value: string) => value.replace(/[[\]"\\\r\n]+/g, ' ').trim();
export const insertAttachmentImage = (value: string, position: number, attachmentId: string, alt: string, caption: string): FormattingResult => {
  const title = escapeImageText(caption);
  const markdown = `![${escapeImageText(alt)}](kb-attachment:${attachmentId}${title ? ` "${title}"` : ''})`;
  const block = `${position > 0 && !value.slice(0, position).endsWith('\n\n') ? '\n\n' : ''}${markdown}\n\n`;
  const next = `${value.slice(0, position)}${block}${value.slice(position)}`;
  const cursor = position + block.length;
  return { value: next, selectionStart: cursor, selectionEnd: cursor };
};
