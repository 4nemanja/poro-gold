import { useMemo, useState } from 'react';
import { ProfileAvatar } from '../../../../shared/components/profile/ProfileAvatar';
import type { KnowledgeBaseEligibleViewer } from '../../../../shared/types/knowledge-base';

interface Props { viewers: KnowledgeBaseEligibleViewer[]; selectedIds: string[]; onChange: (ids: string[]) => void; disabled?: boolean; }

export const KnowledgeBaseViewerSelector = ({ viewers, selectedIds, onChange, disabled = false }: Props) => {
  const [query, setQuery] = useState('');
  const selected = new Set(selectedIds);
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return viewers.filter((viewer) => !term || `${viewer.displayName ?? ''} ${viewer.email ?? ''}`.toLowerCase().includes(term)); }, [query, viewers]);
  const update = (id: string) => onChange(selected.has(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((viewer) => selected.has(viewer.id));
  return <div className="rounded-lg border kb-border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-medium kb-primary">Selected users: {selectedIds.length}</label><div className="flex gap-2 text-xs"><button type="button" className="kb-accent disabled:opacity-50" disabled={disabled || !filtered.length} onClick={() => onChange(allVisibleSelected ? selectedIds.filter((id) => !filtered.some((viewer) => viewer.id === id)) : [...new Set([...selectedIds, ...filtered.map((viewer) => viewer.id)])])}>{allVisibleSelected ? 'Clear visible' : 'Select all visible'}</button><button type="button" className="kb-accent disabled:opacity-50" disabled={disabled || !selectedIds.length} onClick={() => onChange([])}>Clear selection</button></div></div>
    <input value={query} disabled={disabled} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email..." className="kb-search mt-3 w-full rounded-lg border px-3 py-2 text-sm" />
    <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">{!viewers.length ? <p className="py-3 text-sm kb-muted">No eligible users are available.</p> : filtered.map((viewer) => { const name = viewer.displayName || viewer.email || 'Unnamed user'; return <label key={viewer.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:kb-subtle"><input type="checkbox" checked={selected.has(viewer.id)} disabled={disabled} onChange={() => update(viewer.id)} /><ProfileAvatar name={name} email={viewer.email || ''} url={viewer.avatarPath} className="h-8 w-8" /><span className="min-w-0 flex-1"><span className="block truncate text-sm kb-primary">{name}</span>{viewer.email && <span className="block truncate text-xs kb-muted">{viewer.email}</span>}</span><span className="flex gap-1">{viewer.roles.map((role) => <span key={role} className="rounded-full kb-subtle px-2 py-0.5 text-[10px] uppercase kb-primary">{role}</span>)}</span></label>; })}{viewers.length > 0 && !filtered.length && <p className="py-3 text-sm kb-muted">No eligible users match your search.</p>}</div>
  </div>;
};
