export interface MarkdownHeading { id: string; text: string; level: 2 | 3 | 4; }
const colorDirective = /:(?:purple|blue|green|yellow|red)\[([^\]\r\n]+)\]/g;
const link = /!?\[([^\]]*)\]\([^)]*\)/g;

export const getHeadingPlainText = (value: string): string => value
  .replace(colorDirective, '$1')
  .replace(link, '$1')
  .replace(/`([^`]*)`/g, '$1')
  .replace(/(\*\*|__)(.*?)\1/g, '$2')
  .replace(/(\*|_)(.*?)\1/g, '$2')
  .replace(/~~(.*?)~~/g, '$1')
  .replace(/<[^>]*>/g, '')
  .replace(/\\([\\`*_[\]{}()#+.!-])/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

export const slugify = (value: string) => getHeadingPlainText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');
export const extractHeadings = (content: string): MarkdownHeading[] => {
  const counts = new Map<string, number>();
  return content.split('\n').flatMap((line) => {
    const match = /^(#{2,4})\s+(.+?)\s*#*$/.exec(line.trim());
    if (!match) return [];
    const text = getHeadingPlainText(match[2]);
    const base = slugify(text) || 'section';
    const count = counts.get(base) || 0; counts.set(base, count + 1);
    return [{ id: count ? `${base}-${count + 1}` : base, text, level: match[1].length as 2 | 3 | 4 }];
  });
};
