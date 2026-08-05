import { useState } from 'react';
import { LayoutDashboard, ListOrdered, PackageCheck } from 'lucide-react';
import { Card } from '../../components/ui';
import { useProfile } from '../../shared/profile/ProfileProvider';
import { FloatingPortalNavbar, type PortalNavItem } from '../../shared/components/layout/FloatingPortalNavbar';
import { DashboardPageContainer } from '../../shared/components/layout/DashboardPageContainer';
import { useI18n } from '../../i18n/I18nProvider';

type SupplierPage = 'dashboard' | 'orders' | 'notifications' | 'settings';

// Scaffold portal so the Supplier workspace is visible alongside the others.
// The real supplier workflow (accepting/fulfilling orders, earnings, ratings)
// is intentionally not wired yet — these are placeholder surfaces.
const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <Card className="p-10 text-center">
    <PackageCheck className="mx-auto h-10 w-10 text-gray-300" />
    <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{description}</p>
    <span className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Coming soon</span>
  </Card>
);

export default function SupplierApp({ onLogout, onSwitchPortal }: { onLogout: () => void; onSwitchPortal?: () => void }) {
  const { profile, loading, error } = useProfile();
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState<SupplierPage>('dashboard');

  if (error) {
    return <div role="alert" className="min-h-screen bg-gray-50 flex items-center justify-center text-red-700">{error}</div>;
  }
  if (!profile || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading POROGOLD...</div>;
  }

  const primaryNavItems: PortalNavItem[] = [
    { id: 'dashboard', label: t('navigation.overview'), icon: LayoutDashboard },
    { id: 'orders', label: t('navigation.orders'), icon: ListOrdered },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 font-sans text-gray-900">
      <FloatingPortalNavbar
        portalLabel="Supplier Portal"
        currentView={currentPage}
        homeView="dashboard"
        primaryItems={primaryNavItems}
        settingsView="settings"
        displayName={profile.displayName}
        email={profile.email}
        avatarUrl={profile.avatarUrl || undefined}
        unreadNotificationCount={0}
        onNavigate={(view) => { setCurrentPage(view as SupplierPage); window.scrollTo(0, 0); }}
        onNotifications={() => setCurrentPage('notifications')}
        onLogout={onLogout}
        onSwitchPortal={onSwitchPortal}
      />

      <main className="min-w-0 overflow-x-hidden px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
        <DashboardPageContainer size="standard">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Supplier Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome, {profile.displayName}. This is where suppliers will see and fulfill orders.</p>
          </div>

          {currentPage === 'dashboard' && (
            <Placeholder title="Supplier overview" description="Order volume, earnings, and ratings will appear here once the supplier workflow is built." />
          )}
          {currentPage === 'orders' && (
            <Placeholder title="Assigned orders" description="Suppliers will view, accept, and fulfill their assigned orders from this page." />
          )}
          {currentPage === 'notifications' && (
            <Placeholder title="Notifications" description="Order updates and alerts for suppliers will show up here." />
          )}
          {currentPage === 'settings' && (
            <Placeholder title="Settings" description="Supplier account and payout settings will live here." />
          )}
        </DashboardPageContainer>
      </main>
    </div>
  );
}
