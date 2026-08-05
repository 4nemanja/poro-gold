import { supabase } from '../supabase/client';
import type { DashboardLanguage } from '../../i18n/types';

export type ProfileRole = 'admin' | 'seller' | 'supplier';

export interface CurrentProfile {
  id: string;
  displayName: string;
  email: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  status: string;
  roles: ProfileRole[];
  preferredLanguage: DashboardLanguage;
}

interface ProfileRow {
  id: string;
  display_name: string;
  email: string | null;
  avatar_path: string | null;
  status: string;
  updated_at: string;
  preferred_language?: string | null;
}

const requireUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message || 'No authenticated user.');
  return data.user;
};

const avatarUrl = (path: string | null, updatedAt: string) => path
  ? `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${encodeURIComponent(updatedAt)}`
  : null;

export const profileService = {
  async getCurrentProfile(): Promise<CurrentProfile> {
    const user = await requireUser();
    const rolesPromise = supabase.from('user_roles').select('role').eq('user_id', user.id);
    const profileResult = await supabase.from('profiles')
      .select('id, display_name, email, avatar_path, status, updated_at, preferred_language')
      .eq('id', user.id)
      .single();

    let row: ProfileRow;
    if (profileResult.error) {
      if (!profileResult.error.message.toLowerCase().includes('avatar_path')) {
        throw new Error(profileResult.error.message);
      }
      const legacyResult = await supabase.from('profiles')
        .select('id, display_name, email, status, updated_at, preferred_language')
        .eq('id', user.id)
        .single();
      if (legacyResult.error) throw new Error(legacyResult.error.message);
      row = { ...legacyResult.data, avatar_path: null };
    } else {
      row = profileResult.data;
    }

    const rolesResult = await rolesPromise;
    if (rolesResult.error) throw new Error(rolesResult.error.message);
    const roles = (rolesResult.data || []).map((item) => item.role).filter(
      (role): role is ProfileRole => role === 'admin' || role === 'seller' || role === 'supplier',
    );
    return { id: row.id, displayName: row.display_name, email: row.email || user.email || '',
      avatarPath: row.avatar_path, avatarUrl: avatarUrl(row.avatar_path, row.updated_at), status: row.status, roles, preferredLanguage: row.preferred_language === 'sr' ? 'sr' : 'en' };
  },

  async updateCurrentProfile(input: { displayName: string; avatarPath?: string | null }): Promise<void> {
    const user = await requireUser();
    const updates: { display_name: string; avatar_path?: string | null } = { display_name: input.displayName };
    if (input.avatarPath !== undefined) updates.avatar_path = input.avatarPath;
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) throw new Error(error.message);
  },

  async uploadCurrentUserAvatar(file: File): Promise<void> {
    const user = await requireUser();
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/avatar.${extension}`;
    const current = await this.getCurrentProfile();
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(error.message);
    try {
      await this.updateCurrentProfile({ displayName: current.displayName, avatarPath: path });
      if (current.avatarPath && current.avatarPath !== path) await supabase.storage.from('avatars').remove([current.avatarPath]);
    } catch (error) {
      await supabase.storage.from('avatars').remove([path]);
      throw error;
    }
  },

  async removeCurrentUserAvatar(): Promise<void> {
    const current = await this.getCurrentProfile();
    await this.updateCurrentProfile({ displayName: current.displayName, avatarPath: null });
    if (current.avatarPath) {
      const { error } = await supabase.storage.from('avatars').remove([current.avatarPath]);
      if (error) throw new Error(error.message);
    }
  },

  async updateCurrentUserPassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },
  async setMyDashboardLanguage(language: DashboardLanguage): Promise<DashboardLanguage> { const { data, error } = await supabase.rpc('set_my_preferred_language', { p_language: language }); if (error) throw new Error(error.message); return data === 'sr' ? 'sr' : 'en'; },
};
