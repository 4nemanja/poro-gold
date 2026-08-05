import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../supabase/client';
import { profileService, type CurrentProfile } from '../services/profileService';
import type { DashboardLanguage } from '../../i18n/types';

interface ProfileContextValue {
  profile: CurrentProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  setPreferredLanguage: (language: DashboardLanguage) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setError(null);
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setProfile(null); setLoading(false); return; }
    try { setProfile(await profileService.getCurrentProfile()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load profile.'); }
    finally { setLoading(false); }
  }, []);
  const setPreferredLanguage = useCallback(async (language: DashboardLanguage) => { await profileService.setMyDashboardLanguage(language); await refreshProfile(); }, [refreshProfile]);

  useEffect(() => {
    void refreshProfile();
    const { data } = supabase.auth.onAuthStateChange(() => { void refreshProfile(); });
    return () => data.subscription.unsubscribe();
  }, [refreshProfile]);

  const value = useMemo(() => ({ profile, loading, error, refreshProfile, setPreferredLanguage }), [profile, loading, error, refreshProfile, setPreferredLanguage]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
};
