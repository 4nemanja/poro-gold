import { useEffect, useState } from 'react';
import { BookOpen, LayoutDashboard, ListOrdered, MessageSquare, PlusCircle } from 'lucide-react';
import { useSellerState } from './hooks/useSellerState';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { OrdersPage } from './pages/OrdersPage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { WalletPage } from './pages/WalletPage';
import type { CreateOrderInput, Page, User } from './types';
import type { CreateManualMarketplaceOrderInput } from '../../shared/types/supabase-orders';
import { useProfile } from '../../shared/profile/ProfileProvider';
import { KnowledgeBasePage } from '../../features/knowledge-base/pages/KnowledgeBasePage';
import { useNotifications } from '../../features/notifications/hooks/useNotifications';
import { NotificationsPage } from '../../features/notifications/pages/NotificationsPage';
import { sellerService } from './services/sellerService';
import { FloatingPortalNavbar, type PortalNavItem } from '../../shared/components/layout/FloatingPortalNavbar';
import { DashboardPageContainer, type DashboardPageSize } from '../../shared/components/layout/DashboardPageContainer';
import { useI18n } from '../../i18n/I18nProvider';

export default function SellerApp({ onLogout, onSwitchPortal }: { onLogout: () => void; onSwitchPortal?: () => void }) {
  const { profile, loading: profileLoading, error: userError } = useProfile();
  const { t } = useI18n();
  const notificationState = useNotifications({ currentUserId: profile?.id, pageSize: 20 });
  const refreshNotifications = notificationState.refresh;
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const { orders, isLoadingOrders, ordersError, addOrder, addManualMarketplaceOrder, refreshOrders } = useSellerState(profile?.id);

  const user: User | null = profile ? { id: profile.id, name: profile.displayName, email: profile.email, avatar: profile.avatarUrl || '' } : null;

  const handleNavigate = (page: Page, orderId?: string) => {
    if (page === 'create-order') setOrderSuccess(null);
    setCurrentPage(page);
    if (orderId) setSelectedOrderId(orderId);
    window.scrollTo(0, 0);
  };

  const handleOrderCreated = async (orderData: CreateOrderInput) => {
    const createdOrder = await addOrder(orderData);
    setOrderSuccess(`Order ${createdOrder.orderNumber || createdOrder.id} was submitted successfully.`);
    handleNavigate('order-details', createdOrder.databaseId || createdOrder.id);
  };

  const handleManualMarketplaceOrderCreated = async (orderData: CreateManualMarketplaceOrderInput) => {
    const createdOrder = await addManualMarketplaceOrder(orderData);
    setOrderSuccess(`Order ${createdOrder.orderNumber || createdOrder.id} was submitted successfully.`);
    handleNavigate('order-details', createdOrder.databaseId || createdOrder.id);
  };

  useEffect(() => {
    if (currentPage === 'notifications') void refreshNotifications();
  }, [currentPage, refreshNotifications]);

  const openNotificationOrder = async (databaseId: string): Promise<boolean> => {
    try {
      if (!orders.some((order) => order.databaseId === databaseId)) {
        await sellerService.getCurrentSellerOrderById(databaseId);
        await refreshOrders();
      }
      handleNavigate('order-details', databaseId);
      return true;
    } catch {
      return false;
    }
  };

  if (userError) {
    return <div role="alert" className="min-h-screen bg-gray-50 flex items-center justify-center text-red-700">{userError}</div>;
  }

  if (!user || profileLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading POROGOLD...</div>;
  }

  const isOrderReadPage = currentPage === 'dashboard' || currentPage === 'my-orders' || currentPage === 'order-details' || currentPage === 'wallet';
  const primaryNavItems: PortalNavItem[] = [
    { id: 'dashboard', label: t('navigation.overview'), icon: LayoutDashboard },
    { id: 'create-order', label: t('navigation.createOrder'), icon: PlusCircle, emphasized: true },
    { id: 'my-orders', label: t('navigation.myOrders'), icon: ListOrdered, activeFor: ['order-details'] },
    { id: 'templates', label: t('navigation.templates'), icon: MessageSquare, compact: true },
    { id: 'knowledge-base', label: t('navigation.knowledgeBase'), icon: BookOpen, compact: true },
  ];
  const pageSize: DashboardPageSize = currentPage === 'settings' || currentPage === 'create-order'
    ? 'narrow'
    : currentPage === 'my-orders' || currentPage === 'order-details'
      ? 'wide'
      : 'standard';

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 font-sans text-gray-900">
      <FloatingPortalNavbar
        portalLabel={t('navigation.sellerPortal')}
        currentView={currentPage}
        homeView="dashboard"
        primaryItems={primaryNavItems}
        settingsView="settings"
        displayName={user.name}
        email={user.email}
        avatarUrl={user.avatar || undefined}
        unreadNotificationCount={notificationState.unreadCount}
        onNavigate={(view) => handleNavigate(view as Page)}
        onNotifications={() => handleNavigate('notifications')}
        onLogout={onLogout}
        onSwitchPortal={onSwitchPortal}
      />

      <main className="min-w-0 overflow-x-hidden px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
          <DashboardPageContainer size={pageSize}>
            {orderSuccess && <div role="status" className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{orderSuccess}</div>}
            {isOrderReadPage && isLoadingOrders && <div className="py-16 text-center text-sm text-gray-500">Loading orders...</div>}
            {isOrderReadPage && !isLoadingOrders && ordersError && (
              <div className="py-16 text-center">
                <p role="alert" className="text-sm text-red-700">{ordersError}</p>
                <button type="button" onClick={() => void refreshOrders()} className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Retry</button>
              </div>
            )}
            {currentPage === 'dashboard' && !isLoadingOrders && !ordersError && <DashboardPage orders={orders} onNavigate={handleNavigate} />}
            {currentPage === 'create-order' && (
              <CreateOrderPage
                onSubmitSuccess={handleOrderCreated}
                onManualSubmitSuccess={handleManualMarketplaceOrderCreated}
                onCancel={() => handleNavigate('dashboard')}
              />
            )}
            {currentPage === 'my-orders' && !isLoadingOrders && !ordersError && <OrdersPage orders={orders} onNavigate={handleNavigate} />}
            {currentPage === 'order-details' && !isLoadingOrders && !ordersError && selectedOrderId && (
              <OrderDetailsPage
                order={orders.find((order) => order.databaseId === selectedOrderId)}
                onBack={() => handleNavigate('my-orders')}
              />
            )}
            {currentPage === 'wallet' && !isLoadingOrders && !ordersError && <WalletPage orders={orders} />}
            {currentPage === 'notifications' && <NotificationsPage state={notificationState} onOpenOrder={openNotificationOrder} />}
            {currentPage === 'templates' && <TemplatesPage />}
            {currentPage === 'knowledge-base' && <KnowledgeBasePage />}
            {currentPage === 'settings' && <SettingsPage />}
          </DashboardPageContainer>
      </main>
    </div>
  );
}
