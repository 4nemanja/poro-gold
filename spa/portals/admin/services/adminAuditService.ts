import { supabase } from '../../../shared/supabase/client';
import type { AuditLog } from '../../../types';

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: unknown;
  created_at: string;
}

const formatDetails = (details: unknown): string => {
  if (!details || typeof details !== 'object') return '';
  return Object.entries(details as Record<string, unknown>)
    .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`)
    .join(' · ');
};

export const adminAuditService = {
  async list(actorNames: Map<string, string>): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, actor_id, action, entity_type, entity_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw new Error('Unable to load the audit log.');
    return ([...((data || []) as AuditLogRow[])].reverse()).map((row) => ({
      id: row.id,
      timestamp: row.created_at,
      actor: row.actor_id ? actorNames.get(row.actor_id) || 'Former user' : 'System',
      action: row.action,
      entity: row.entity_type || 'System',
      details: formatDetails(row.details) || (row.entity_id ? `entity: ${row.entity_id}` : ''),
    }));
  },
};
