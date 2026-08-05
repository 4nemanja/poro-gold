import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, Card, Input, Select } from '../../components/ui';
import { useProfile } from '../profile/ProfileProvider';
import { profileService } from '../services/profileService';
import { ProfileAvatar } from '../components/profile/ProfileAvatar';
import { useTheme, type ThemeMode } from '../theme/ThemeProvider';
import { useI18n } from '../../i18n/I18nProvider';

const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const maxBytes = 2 * 1024 * 1024;

export const ProfileSettingsPage = () => {
  const { profile, loading, error: profileError, refreshProfile } = useProfile();
  const { mode, setMode } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [languageBusy, setLanguageBusy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setDisplayName(profile?.displayName || ''), [profile?.displayName]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  if (loading) return <div className="mx-auto w-full max-w-3xl text-sm text-gray-500">Loading profile settings...</div>;
  if (!profile) return <div role="alert" className="mx-auto w-full max-w-3xl rounded-lg bg-red-50 p-4 text-red-700">{profileError || 'Profile unavailable.'}</div>;

  const saveProfile = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) { setFeedback({ type: 'error', message: 'Display name must be between 2 and 50 characters.' }); return; }
    if (trimmed === profile.displayName) return;
    setProfileBusy(true); setFeedback(null);
    try { await profileService.updateCurrentProfile({ displayName: trimmed }); await refreshProfile(); setFeedback({ type: 'success', message: 'Profile updated.' }); }
    catch (saveError) { setFeedback({ type: 'error', message: saveError instanceof Error ? saveError.message : 'Unable to update profile.' }); }
    finally { setProfileBusy(false); }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!allowedTypes.has(file.type)) { setFeedback({ type: 'error', message: 'Choose a PNG, JPEG, or WebP image.' }); return; }
    if (file.size > maxBytes) { setFeedback({ type: 'error', message: 'Avatar images must be 2 MB or smaller.' }); return; }
    const localUrl = URL.createObjectURL(file); setPreviewUrl(localUrl); setAvatarBusy(true); setFeedback(null);
    try { await profileService.uploadCurrentUserAvatar(file); await refreshProfile(); setFeedback({ type: 'success', message: 'Avatar updated.' }); }
    catch (uploadError) { setFeedback({ type: 'error', message: uploadError instanceof Error ? uploadError.message : 'Unable to upload avatar.' }); }
    finally { URL.revokeObjectURL(localUrl); setPreviewUrl(null); setAvatarBusy(false); }
  };

  const removeAvatar = async () => {
    if (!profile.avatarPath || !window.confirm('Remove your current avatar?')) return;
    setAvatarBusy(true); setFeedback(null);
    try { await profileService.removeCurrentUserAvatar(); await refreshProfile(); setFeedback({ type: 'success', message: 'Avatar removed.' }); }
    catch (removeError) { setFeedback({ type: 'error', message: removeError instanceof Error ? removeError.message : 'Unable to remove avatar.' }); }
    finally { await refreshProfile(); setAvatarBusy(false); }
  };

  const updatePassword = async () => {
    if (password.length < 6) { setFeedback({ type: 'error', message: 'Password must contain at least 6 characters.' }); return; }
    if (password !== confirmation) { setFeedback({ type: 'error', message: 'Passwords do not match.' }); return; }
    setPasswordBusy(true); setFeedback(null);
    try { await profileService.updateCurrentUserPassword(password); setPassword(''); setConfirmation(''); setFeedback({ type: 'success', message: 'Password updated.' }); }
    catch (passwordError) { setFeedback({ type: 'error', message: passwordError instanceof Error ? passwordError.message : 'Unable to update password.' }); }
    finally { setPasswordBusy(false); }
  };
  const updateLanguage = async (next: 'en' | 'sr') => { if (next === language) return; setLanguageBusy(true); setFeedback(null); try { await setLanguage(next); setFeedback({ type: 'success', message: next === 'sr' ? 'Jezik interfejsa je ažuriran.' : 'Interface language updated.' }); } catch { setFeedback({ type: 'error', message: language === 'sr' ? 'Promena jezika nije uspela.' : 'Unable to change interface language.' }); } finally { setLanguageBusy(false); } };

  return <div className="mx-auto w-full max-w-3xl space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="mt-1 text-sm text-gray-500">Manage your personal POROGOLD account information.</p></div>
    {feedback && <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{feedback.message}</div>}
    <Card className="space-y-6 p-4 sm:p-6">
      <div><h2 className="text-lg font-semibold text-gray-900">Profile</h2><p className="text-sm text-gray-500">Your shared account identity.</p></div>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center"><ProfileAvatar name={displayName || profile.displayName} email={profile.email} url={previewUrl || profile.avatarUrl} className="w-20 h-20" /><div className="min-w-0 space-y-2"><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadAvatar} /><div className="flex flex-wrap gap-2"><Button onClick={() => fileInput.current?.click()} disabled={avatarBusy}>{avatarBusy ? 'Uploading...' : 'Upload Avatar'}</Button><Button variant="secondary" onClick={removeAvatar} disabled={avatarBusy || !profile.avatarPath}>Remove Avatar</Button></div><p className="text-xs text-gray-500">PNG, JPEG, or WebP. Maximum 2 MB.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Display Name" value={displayName} maxLength={50} onChange={(event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)} /><Input label="Email" value={profile.email} disabled /></div>
      <div><span className="block text-sm font-medium text-gray-700 mb-2">Roles</span><div className="flex flex-wrap gap-2">{profile.roles.map((role) => <span key={role} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 capitalize">{role}</span>)}</div></div>
      <div className="flex justify-end"><Button onClick={saveProfile} disabled={profileBusy || displayName.trim() === profile.displayName}>{profileBusy ? 'Saving...' : 'Save Changes'}</Button></div>
    </Card>
    <Card className="p-6"><h2 className="text-lg font-semibold text-gray-900">Appearance</h2><div className="mt-4 flex flex-wrap gap-2">{(['light', 'dark', 'system'] as ThemeMode[]).map((choice) => <Button key={choice} variant={mode === choice ? 'primary' : 'secondary'} onClick={() => setMode(choice)} className="capitalize">{choice}</Button>)}</div></Card>
    <Card className="p-6"><h2 className="text-lg font-semibold text-gray-900">{t('profile.interfaceLanguage')}</h2><p className="mt-1 text-sm text-gray-500">{t('profile.languageHelp')}</p><div className="mt-4 max-w-sm"><Select value={language} disabled={languageBusy} onChange={(event: ChangeEvent<HTMLSelectElement>)=>void updateLanguage(event.target.value as 'en'|'sr')} options={[{value:'en',label:'English (ENG)'},{value:'sr',label:'Srpski (SRB)'}]}/></div></Card>
    <Card className="p-6 space-y-4"><div><h2 className="text-lg font-semibold text-gray-900">Security</h2><p className="text-sm text-gray-500">Update your Supabase Auth password.</p></div><div className="grid gap-4 sm:grid-cols-2"><Input label="New Password" type="password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} /><Input label="Confirm New Password" type="password" value={confirmation} onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmation(event.target.value)} /></div><div className="flex justify-end"><Button onClick={updatePassword} disabled={passwordBusy || !password || !confirmation}>{passwordBusy ? 'Updating...' : 'Update Password'}</Button></div></Card>
  </div>;
};
