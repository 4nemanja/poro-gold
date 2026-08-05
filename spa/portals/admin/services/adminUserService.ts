import { supabase } from '../../../shared/supabase/client';
import type { SellerOrderMode } from '../../../shared/types/supabase-orders';
import type { AdminUser, Role, User } from '../../../types';

const roles: Record<string, Role> = { admin: 'Admin', seller: 'Seller', supplier: 'Supplier', management: 'Management' };
const roleOrder: Role[] = ['Admin', 'Seller', 'Supplier', 'Management'];
const statuses: Record<string, User['status']> = { active: 'Active', inactive: 'Inactive', suspended: 'Suspended' };

const sellerOrderMode = (value: unknown): SellerOrderMode => {
  if (value === 'catalog' || value === 'manual_marketplace') return value;
  throw new Error('A user profile has an invalid or missing Seller order mode.');
};

export interface CreateAdminUserInput {
  displayName: string;
  email: string;
  password: string;
  role: 'admin' | 'seller' | 'supplier';
  status: 'active' | 'inactive' | 'suspended';
}

export const adminUserService = {
  async create(input: CreateAdminUserInput): Promise<void> {
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: input });
    if (error) {
      const context = error.context as Response | undefined;
      if (context) {
        const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
        if (payload?.error) throw new Error(payload.error);
      }
      throw new Error('Unable to create the user. Confirm the secure user-creation function is deployed.');
    }
    if (!data?.user?.id) throw new Error('User creation returned no result.');
  },
  async list(): Promise<AdminUser[]> {
    const [profilesResult, rolesResult] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    if (profilesResult.error) throw new Error(profilesResult.error.message);
    if (rolesResult.error) throw new Error(rolesResult.error.message);
    return (profilesResult.data || []).map((row) => {
      const assignedRoles = Array.from(new Set(
        (rolesResult.data || [])
          .filter((item) => item.user_id === row.id)
          .map((item) => roles[item.role])
          .filter((role): role is Role => Boolean(role)),
      )).sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b));
      return { id: row.id, name: row.display_name, email: row.email || '', roles: assignedRoles,
        role: assignedRoles[0] || 'Seller', status: statuses[row.status],
        sellerOrderMode: sellerOrderMode(row.seller_order_mode) };
    });
  },
  async update(id: string, user: Partial<User>): Promise<void> {
    const { error } = await supabase.from('profiles').update({
      ...(user.name !== undefined && { display_name: user.name }),
      ...(user.status !== undefined && { status: user.status.toLowerCase() }),
    }).eq('id', id);
    if (error) throw new Error(error.message);
    if (user.roles) {
      const desired = user.roles.map((role) => role.toLowerCase());
      if (desired.length) {
        const { error: roleError } = await supabase.from('user_roles').upsert(desired.map((role) => ({ user_id: id, role })), { onConflict: 'user_id,role' });
        if (roleError) throw new Error(roleError.message);
      }
      const { error: deleteError } = desired.length
        ? await supabase.from('user_roles').delete().eq('user_id', id).not('role', 'in', `(${desired.join(',')})`)
        : await supabase.from('user_roles').delete().eq('user_id', id);
      if (deleteError) throw new Error(deleteError.message);
    }
  },
  async remove(id: string): Promise<void> {
    // Deleting the profile cascades user_roles and nulls the user's order
    // references (orders keep their history). The auth login record is left
    // intact — removing that requires the service-role admin API.
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  async setSellerOrderMode(id: string, mode: SellerOrderMode): Promise<void> {
    const { error } = await supabase.rpc('admin_set_seller_order_mode', {
      p_user_id: id,
      p_mode: mode,
    });
    if (error) throw new Error(error.message);
  },
};
