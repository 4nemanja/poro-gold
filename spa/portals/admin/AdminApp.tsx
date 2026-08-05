import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Cable,
  FilePlus2,
  Gift,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tags,
  Users,
} from 'lucide-react';
import type {
  AdminUser,
  AuditLog,
  Order,
  OrderStatus,
  Platform,
  SKU,
  Template,
  TemplateInput,
  User,
} from '../../types';
import type { SellerOrderMode } from '../../shared/types/supabase-orders';
import { AuditLogView } from '../../views/AuditLogView';
import { OrderDetailsView } from '../../views/OrderDetailsView';
import { OrdersView } from '../../views/OrdersView';
import { OverviewView } from '../../views/OverviewView';
import { PlatformsView } from '../../views/PlatformsView';
import { PricingView } from '../../views/PricingView';
import { TemplatesView } from '../../views/TemplatesView';
import { UsersView } from '../../views/UsersView';
import { KnowledgeBasePage } from '../../features/knowledge-base/pages/KnowledgeBasePage';
import { useNotifications } from '../../features/notifications/hooks/useNotifications';
import { NotificationsPage } from '../../features/notifications/pages/NotificationsPage';
import { FloatingPortalNavbar, type PortalNavItem } from '../../shared/components/layout/FloatingPortalNavbar';
import { DashboardPageContainer, type DashboardPageSize } from '../../shared/components/layout/DashboardPageContainer';
import { ProfileSettingsPage } from '../../shared/pages/ProfileSettingsPage';
import { useProfile } from '../../shared/profile/ProfileProvider';
import { useOrderRealtime } from '../../shared/realtime/useOrderRealtime';
import { adminOrderService } from './services/adminOrderService';
import { adminAuditService } from './services/adminAuditService';
import { adminPlatformService } from './services/adminPlatformService';
import { adminSkuService } from './services/adminSkuService';
import { adminTemplateService } from './services/adminTemplateService';
import { adminUserService, type CreateAdminUserInput } from './services/adminUserService';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { useI18n } from '../../i18n/I18nProvider';
import { GiftServicePage } from '../../features/gift-service/GiftServicePage';
import { FnShopPage } from '../../features/fn-shop/FnShopPage';

export interface AdminAppProps {
  onLogout: () => void | Promise<void>;
  onSwitchPortal?: () => void;
  canDeleteOrders: boolean;
}

export function AdminApp({ onLogout, onSwitchPortal, canDeleteOrders }: AdminAppProps) {
  const { profile } = useProfile();
  const { t } = useI18n();
  const notificationState = useNotifications({ currentUserId: profile?.id, pageSize: 20 });
  const refreshNotifications = notificationState.refresh;
  const [currentView, setCurrentView] = useState('overview');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [resourceSuccess, setResourceSuccess] = useState<string | null>(null);
  const didInitializeAdminData = useRef(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const refreshOrders = async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      setOrders(await adminOrderService.getAdminOrders());
    } catch {
      setOrders([]);
      setOrdersError('Unable to load orders from Supabase. Confirm migration 005 is applied and try again.');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const refreshOrdersFromRealtime = async () => {
    try {
      const nextOrders = await adminOrderService.getAdminOrders();
      setOrders(nextOrders);
      setOrdersError(null);
    } catch {
      // Realtime recovery is best-effort; existing data and manual refresh stay usable.
    }
  };

  useOrderRealtime({
    audience: 'admin',
    currentUserId: profile?.id,
    refreshOrders: refreshOrdersFromRealtime,
  });

  const refreshResources = async (): Promise<boolean> => {
    setResourceError(null);
    try {
      const [nextPlatforms, nextSkus, nextTemplates, nextUsers] = await Promise.all([
        adminPlatformService.list(), adminSkuService.list(), adminTemplateService.list(), adminUserService.list(),
      ]);
      const actorNames = new Map(nextUsers.map((user) => [user.id, user.name]));
      const nextAuditLogs = await adminAuditService.list(actorNames);
      setPlatforms(nextPlatforms);
      setSkus(nextSkus);
      setTemplates(nextTemplates);
      setUsers(nextUsers);
      setAuditLogs(nextAuditLogs);
      return true;
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : 'Unable to load Admin data.');
      return false;
    } finally {
      setResourceLoading(false);
    }
  };

  useEffect(() => {
    if (didInitializeAdminData.current) return;
    didInitializeAdminData.current = true;
    void refreshResources();
    void refreshOrders();
  }, []);

  useEffect(() => {
    if (currentView === 'notifications') void refreshNotifications();
  }, [currentView, refreshNotifications]);

  const runResourceAction = async (action: () => Promise<void>) => {
    setResourceError(null);
    setResourceSuccess(null);
    try {
      await action();
      await refreshResources();
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : 'The operation failed.');
      throw error;
    }
  };

  const addUser = async (input: CreateAdminUserInput) => {
    await runResourceAction(() => adminUserService.create(input));
    setResourceSuccess(`${input.displayName} was created successfully.`);
  };

  const updateUser = async (
    userId: string,
    updatedData: Partial<User>,
    updatedSellerOrderMode?: SellerOrderMode,
  ) => {
    setResourceError(null);
    setResourceSuccess(null);
    const hasProfileChanges = Object.keys(updatedData).length > 0;
    let profileChangesSaved = false;
    let modeChangeSaved = false;
    let refreshAttempted = false;

    try {
      if (hasProfileChanges) {
        await adminUserService.update(userId, updatedData);
        profileChangesSaved = true;
      }
      if (updatedSellerOrderMode !== undefined) {
        await adminUserService.setSellerOrderMode(userId, updatedSellerOrderMode);
        modeChangeSaved = true;
      }
      refreshAttempted = true;
      if (!await refreshResources()) {
        throw new Error('Changes were saved, but the canonical Users list could not be refreshed.');
      }
      setResourceSuccess('User updated successfully.');
    } catch (error) {
      if (!refreshAttempted) await refreshResources();
      const detail = error instanceof Error ? error.message : 'Unable to update the user.';
      const partialSave = profileChangesSaved || modeChangeSaved;
      const managedError = new Error(partialSave
        ? `Some changes were saved, but the complete update failed: ${detail}`
        : detail);
      setResourceError(managedError.message);
      throw managedError;
    }
  };

  const deleteUser = async (userId: string) => {
    await runResourceAction(() => adminUserService.remove(userId));
    setResourceSuccess('User deleted successfully.');
  };

  const addPlatform = async (newPlatform: Platform) => {
    await runResourceAction(() => adminPlatformService.create(newPlatform));
    setResourceSuccess(`Platform ${newPlatform.name} created successfully.`);
  };

  const updatePlatform = async (platformId: string, updatedData: Partial<Platform>) => {
    await runResourceAction(() => adminPlatformService.update(platformId, updatedData));
    setResourceSuccess('Platform updated successfully.');
  };

  const deletePlatform = async (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    await runResourceAction(() => adminPlatformService.remove(platformId));
    setResourceSuccess(`Platform ${platform?.name || platformId} deleted.`);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setResourceError(null);
    setResourceSuccess(null);
    await adminOrderService.updateAdminOrderStatus(orderId, newStatus);
    await refreshOrders();
    setResourceSuccess(`Order status updated to ${newStatus.replace('_', ' ')}.`);
  };
  const refundOrder = async (input: import('../../types').RefundOrderInput) => { setResourceError(null); setResourceSuccess(null); await adminOrderService.refundOrder(input); await refreshOrders(); setResourceSuccess('Order marked as refunded.'); };
  const updateOrderRefundDetails = async (input: import('../../types').UpdateOrderRefundDetailsInput) => { setResourceError(null); setResourceSuccess(null); await adminOrderService.updateOrderRefundDetails(input); await refreshOrders(); setResourceSuccess('Refund details updated.'); };
  const reverseOrderRefund = async (input: import('../../types').ReverseOrderRefundInput) => { setResourceError(null); setResourceSuccess(null); await adminOrderService.reverseOrderRefund(input); await refreshOrders(); setResourceSuccess('Refunded status reversed.'); };

  const updateOrderSupplier = async (orderId: string, supplierId: string) => {
    const supplier = users.find(u => u.id === supplierId);
    setResourceError(null);
    setResourceSuccess(null);
    await adminOrderService.assignSupplier(orderId, supplierId);
    await refreshOrders();
    setResourceSuccess(`Supplier ${supplier?.name || supplierId} assigned.`);
  };

  const addTemplate = async (newTemplate: TemplateInput) => {
    await runResourceAction(() => adminTemplateService.create(newTemplate));
    setResourceSuccess(`Template ${newTemplate.title} created successfully.`);
  };

  const updateTemplate = async (templateId: string, updates: TemplateInput) => {
    await runResourceAction(() => adminTemplateService.update(templateId, updates));
    setResourceSuccess('Template updated successfully.');
  };

  const deleteTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    await runResourceAction(() => adminTemplateService.remove(templateId));
    setResourceSuccess(`Template ${template?.title || templateId} deleted.`);
  };

  const addSku = async (newSku: Omit<SKU, 'id'>) => {
    await runResourceAction(() => adminSkuService.create(newSku));
    setResourceSuccess(`SKU ${newSku.package} created successfully.`);
  };

  const updateSku = async (skuId: string, updates: Partial<SKU>) => {
    await runResourceAction(() => adminSkuService.update(skuId, updates));
    setResourceSuccess('SKU updated successfully.');
  };

  const deleteSku = async (skuId: string) => {
    await runResourceAction(() => adminSkuService.remove(skuId));
    setResourceSuccess(`SKU ${skuId} deleted.`);
  };

  const deleteOrder = async (order: Order) => {
    if (!canDeleteOrders) throw new Error('Only admin@porogold.com may permanently delete orders.');
    setResourceError(null);
    setResourceSuccess(null);
    if (!order.databaseId) throw new Error('This order does not have a database UUID.');
    const deleted = await adminOrderService.deleteOrderAsOwner(order.databaseId);
    await refreshOrders();
    setResourceSuccess(`Order ${deleted.orderNumber} was permanently deleted.`);
  };

  const navigate = (view: string, orderId?: string) => {
    setCurrentView(view);
    if (orderId) setCurrentOrderId(orderId);
    window.scrollTo(0, 0);
  };

  const handleAdminOrderCreated = async (order: Order) => {
    await refreshOrders();
    setResourceSuccess(`Order ${order.orderNumber || order.id} was created successfully.`);
    navigate('order_details', order.databaseId || order.id);
  };

  const openNotificationOrder = async (databaseId: string): Promise<boolean> => {
    try {
      let targetOrder = orders.find((order) => order.databaseId === databaseId);
      if (!targetOrder) {
        targetOrder = await adminOrderService.getAdminOrderById(databaseId);
        setOrders((current) => [targetOrder as Order, ...current.filter((order) => order.databaseId !== databaseId)]);
      }
      navigate('order_details', databaseId);
      return true;
    } catch {
      return false;
    }
  };

  const globalState = { orders, users, skus, platforms, templates, auditLogs, canPermanentlyDeleteOrders: canDeleteOrders, canManageTemplates: canDeleteOrders, isLoadingOrders, ordersError, refreshOrders };
  const actions = { recordCredentialAccess: adminOrderService.recordCredentialAccess, addUser, deleteUser, updateOrderStatus, refundOrder, updateOrderRefundDetails, reverseOrderRefund, updateOrderSupplier, updateUser, addPlatform, updatePlatform, deletePlatform, addTemplate, updateTemplate, deleteTemplate, addSku, updateSku, deleteSku, deleteOrder };

  const primaryNavItems: PortalNavItem[] = [
    { id: 'overview', label: t('navigation.overview'), icon: LayoutDashboard },
    { id: 'orders', label: t('navigation.orders'), icon: ShoppingCart, activeFor: ['order_details'] },
    { id: 'create_order', label: t('navigation.createOrder'), icon: FilePlus2, emphasized: true },
    { id: 'gift_service', label: t('navigation.giftService'), icon: Gift, compact: true },
    { id: 'pricing', label: t('navigation.pricing'), icon: Tags, compact: true },
  ];

  const moreNavItems: PortalNavItem[] = [
    { id: 'platforms', label: t('navigation.platforms'), icon: Layers },
    { id: 'templates', label: t('navigation.templates'), icon: MessageSquare },
    { id: 'knowledge_base', label: t('navigation.knowledgeBase'), icon: BookOpen },
    { id: 'users', label: t('navigation.users'), icon: Users },
    { id: 'audit', label: t('navigation.auditLog'), icon: ShieldAlert },
    { id: 'fn_shop', label: t('navigation.fnShop'), icon: Cable },
    { id: 'settings', label: t('navigation.settings'), icon: Settings },
  ];

  const pageSize: DashboardPageSize = currentView === 'settings' || currentView === 'create_order'
    ? 'narrow'
    : ['overview', 'templates', 'knowledge_base', 'notifications'].includes(currentView)
      ? 'standard'
      : 'wide';

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <FloatingPortalNavbar
        portalLabel={t('navigation.adminPortal')}
        currentView={currentView}
        homeView="overview"
        primaryItems={primaryNavItems}
        moreItems={moreNavItems}
        settingsView="settings"
        displayName={profile?.displayName || 'POROGOLD Admin'}
        email={profile?.email || ''}
        avatarUrl={profile?.avatarUrl || undefined}
        unreadNotificationCount={notificationState.unreadCount}
        onNavigate={navigate}
        onNotifications={() => navigate('notifications')}
        onLogout={onLogout}
        onSwitchPortal={onSwitchPortal}
      />

      <main className="min-w-0 overflow-x-hidden px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
        <DashboardPageContainer size={pageSize}>
          {resourceError && <div role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{resourceError}</div>}
          {resourceSuccess && <div role="status" className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{resourceSuccess}</div>}
          {resourceLoading && <div className="mb-6 text-sm text-gray-500">Loading Admin data...</div>}
          {currentView === 'overview' && <OverviewView state={globalState} navigate={navigate} refreshOrders={refreshOrders} />}
          {currentView === 'orders' && <OrdersView state={globalState} navigate={navigate} refreshOrders={refreshOrders} />}
          {currentView === 'create_order' && <CreateOrderPage onOrderCreated={handleAdminOrderCreated} onCancel={() => navigate('orders')} />}
          {currentView === 'gift_service' && <GiftServicePage canDeleteOrders={canDeleteOrders} />}
          {currentView === 'order_details' && <OrderDetailsView orderId={currentOrderId} state={globalState} actions={actions} navigate={navigate} />}
          {currentView === 'pricing' && <PricingView state={globalState} actions={actions} />}
          {currentView === 'platforms' && <PlatformsView state={globalState} actions={actions} />}
          {currentView === 'templates' && <TemplatesView state={globalState} actions={actions} />}
          {currentView === 'knowledge_base' && <KnowledgeBasePage />}
          {currentView === 'notifications' && <NotificationsPage state={notificationState} onOpenOrder={openNotificationOrder} />}
          {currentView === 'users' && <UsersView state={globalState} actions={actions} />}
          {currentView === 'audit' && <AuditLogView state={globalState} />}
          {currentView === 'fn_shop' && <FnShopPage />}
          {currentView === 'settings' && <ProfileSettingsPage />}
        </DashboardPageContainer>
      </main>
    </div>
  );
}
