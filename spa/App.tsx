import { useState, useEffect } from 'react';
import { RefreshCw, Shield, Store, Truck, LineChart, type LucideIcon } from 'lucide-react';
import { Card, Button, Input } from './components/ui';
import { AdminApp } from './portals/admin/AdminApp';
import SellerApp from './portals/seller/SellerApp';
import SupplierApp from './portals/supplier/SupplierApp';
import { supabase } from './shared/supabase/client';
import { ThemeToggle } from './shared/theme/ThemeToggle';
import { canPermanentlyDeleteOrders } from './shared/auth/permissions';
import { useProfile } from './shared/profile/ProfileProvider';

// Render portals live inside this app; 'management' is an external portal that
// opens the separately-deployed financial dashboard in a new tab.
type PortalRole = 'admin' | 'seller' | 'supplier';
type AccessRole = PortalRole | 'management';
const isPortalRole = (role: AccessRole): role is PortalRole =>
  role === 'admin' || role === 'seller' || role === 'supplier';
const MANAGEMENT_URL = '/management';
const openManagement = () => window.open(MANAGEMENT_URL, '_blank', 'noopener,noreferrer');

const SESSION_STORAGE_KEY = 'vbucks_relay_session';
const SELECTED_PORTAL_KEY = 'vbucks_relay_selected_portal';

const clearLegacySession = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Authentication no longer depends on localStorage.
  }
};

const loadRolesForUser = async (userId: string): Promise<AccessRole[]> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load your profile. Check your connection and try again.');
  }

  if (!profile) {
    throw new Error('No application profile exists for this account.');
  }

  if (profile.status !== 'active') {
    throw new Error('This account is inactive or suspended.');
  }

  const { data: roles, error: rolesError } = await supabase.rpc('user_roles_list');
  if (rolesError) {
    throw new Error('Unable to load account roles. Check your connection and try again.');
  }

  const validRoles = (roles || []).filter((role: string): role is AccessRole =>
    role === 'admin' || role === 'seller' || role === 'supplier' || role === 'management');
  if (!validRoles.length) throw new Error('No portal roles are assigned to this account.');
  return validRoles;
};

// Which selectable tiles a set of access roles produces. Admins oversee every
// workspace, so they always see all four portals; other users see only the
// portals their explicit roles grant (plus Management if given that role).
const derivePortalChoices = (roles: AccessRole[]) => {
  const isAdmin = roles.includes('admin');
  const portals: PortalRole[] = isAdmin ? ['admin', 'seller', 'supplier'] : roles.filter(isPortalRole);
  const canManagement = isAdmin || roles.includes('management');
  const soloPortal = portals.length === 1 && !canManagement ? portals[0] : null;
  return { portals, canManagement, choiceCount: portals.length + (canManagement ? 1 : 0), soloPortal };
};

const readSelectedPortal = (roles: PortalRole[]): PortalRole | null => {
  try {
    const selected = sessionStorage.getItem(SELECTED_PORTAL_KEY) as PortalRole | null;
    return selected && roles.includes(selected) ? selected : null;
  } catch { return null; }
};

const PORTAL_META: Record<PortalRole, { label: string; icon: LucideIcon }> = {
  admin: { label: 'Admin', icon: Shield },
  seller: { label: 'Seller', icon: Store },
  supplier: { label: 'Supplier', icon: Truck },
};

const PortalTile = ({ icon: Icon, label, hint, onClick }: { icon: LucideIcon; label: string; hint?: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-gray-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white transition group-hover:scale-105">
      <Icon className="h-6 w-6" />
    </span>
    <span className="text-sm font-semibold text-gray-900">{label}</span>
    {hint && <span className="text-[11px] leading-tight text-gray-400">{hint}</span>}
  </button>
);

const PortalChooser = ({ portals, canManagement, onSelect }: { portals: PortalRole[]; canManagement: boolean; onSelect: (role: PortalRole) => void }) => {
  const { profile } = useProfile();
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><ThemeToggle className="fixed right-5 top-5" /><Card className="w-full max-w-3xl p-8">
    <h1 className="text-2xl font-semibold text-gray-900">Choose Portal</h1>
    <p className="mt-2 text-sm text-gray-500">{profile ? `${profile.displayName}, select the workspace you want to open.` : 'Select the workspace you want to open.'}</p>
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {portals.map((role) => (
        <PortalTile key={role} icon={PORTAL_META[role].icon} label={PORTAL_META[role].label} onClick={() => onSelect(role)} />
      ))}
      {canManagement && (
        <PortalTile icon={LineChart} label="Management" hint="opens in new tab" onClick={openManagement} />
      )}
    </div>
  </Card></div>;
};

const RoleLoginView = ({
  onLogin,
  initialError,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  initialError?: string | null;
}) => {
  const [email, setEmail] = useState('admin@porogold.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <ThemeToggle className="fixed right-5 top-5" />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
            <RefreshCw className="text-white w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          POROGOLD
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Select a portal to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input label="Email address" type="email" value={email} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} required />
            {error && (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [portal, setPortal] = useState<PortalRole | null>(null);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw new Error('Unable to connect to authentication. Please try again.');
        }

        if (!data.session) return;

        const restoredRoles = await loadRolesForUser(data.session.user.id);
        if (isMounted) {
          const { portals, soloPortal } = derivePortalChoices(restoredRoles);
          setRoles(restoredRoles);
          setAuthenticatedEmail(data.session.user.email ?? null);
          setPortal(soloPortal ?? readSelectedPortal(portals));
        }
      } catch (error) {
        await supabase.auth.signOut();
        if (isMounted) {
          setAuthError(error instanceof Error ? error.message : 'Unable to restore your session.');
        }
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    };

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Invalid email or password.');
      }
      throw new Error('Unable to connect to authentication. Please try again.');
    }

    try {
      const nextRoles = await loadRolesForUser(data.user.id);
      clearLegacySession();
      setRoles(nextRoles);
      setAuthenticatedEmail(data.user.email ?? null);
      setPortal(derivePortalChoices(nextRoles).soloPortal);
    } catch (profileError) {
      await supabase.auth.signOut();
      throw profileError;
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearLegacySession();
      sessionStorage.removeItem(SELECTED_PORTAL_KEY);
      setPortal(null);
      setRoles([]);
      setAuthenticatedEmail(null);
      setAuthError(null);
    }
  };

  if (isCheckingSession) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading POROGOLD...</div>;
  }

  const { portals, canManagement, choiceCount } = derivePortalChoices(roles);

  if (!portal) {
    if (roles.length) {
      return <PortalChooser portals={portals} canManagement={canManagement} onSelect={(role) => {
        sessionStorage.setItem(SELECTED_PORTAL_KEY, role);
        setPortal(role);
      }} />;
    }
    return <RoleLoginView onLogin={handleLogin} initialError={authError} />;
  }

  const switchPortal = choiceCount > 1 ? () => {
    sessionStorage.removeItem(SELECTED_PORTAL_KEY);
    setPortal(null);
  } : undefined;

  if (portal === 'supplier') {
    return <SupplierApp onLogout={handleLogout} onSwitchPortal={switchPortal} />;
  }

  return (
    portal === 'admin' ? <AdminApp onLogout={handleLogout} onSwitchPortal={switchPortal} canDeleteOrders={canPermanentlyDeleteOrders(authenticatedEmail)} /> : <SellerApp onLogout={handleLogout} onSwitchPortal={switchPortal} />
  );
}
