import { useState, type ChangeEvent } from 'react';
import {
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge, Button, Card, Input, Modal, Select } from '../components/ui';
import { STATUS_COLORS } from '../constants/status-colors';
import type { Order, OrderRefundType, OrderStatus, RefundOrderInput, ReverseOrderRefundInput, SKU, UpdateOrderRefundDetailsInput, User } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getOrderBuyerLabel, getOrderDisplayDate, getOrderProductLabel, isManualMarketplaceOrder } from '../shared/utils/orderDisplay';
import { OrderChat } from '../features/order-chat/components/OrderChat';
import { useI18n } from '../i18n/I18nProvider';
import { getOrderStatusLabel } from '../i18n/statusLabels';

const OVERRIDE_STATUS_VALUES: OrderStatus[] = ['submitted', 'in_progress', 'needs_info', 'completed', 'refunded'];
type RefundConfirmationPayload = { orderId: string; type: OrderRefundType; reason: string; partialAmount?: number; displayAmount: number; mode: 'new' | 'edit' };

export interface OrderDetailsState {
  orders: Order[];
  users: User[];
  skus: SKU[];
  canPermanentlyDeleteOrders: boolean;
  isLoadingOrders: boolean;
  ordersError: string | null;
  refreshOrders: () => Promise<void>;
}

export interface OrderDetailsActions {
  recordCredentialAccess: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  refundOrder: (input: RefundOrderInput) => Promise<void>;
  updateOrderRefundDetails: (input: UpdateOrderRefundDetailsInput) => Promise<void>;
  reverseOrderRefund: (input: ReverseOrderRefundInput) => Promise<void>;
  updateOrderSupplier: (orderId: string, supplierId: string) => Promise<void>;
  deleteOrder: (order: Order) => Promise<void>;
}

export interface OrderDetailsViewProps {
  orderId: string | null;
  state: OrderDetailsState;
  actions: OrderDetailsActions;
  navigate: (view: string, orderId?: string) => void;
}

export const OrderDetailsView = ({ orderId, state, actions, navigate }: OrderDetailsViewProps) => {
  const { language, t, format } = useI18n();
  const overrideStatusOptions = OVERRIDE_STATUS_VALUES.map((value) => ({ value, label: getOrderStatusLabel(value, language) }));
  const orders = state?.orders || [];
  const users = state?.users || [];
  const skus = state?.skus || [];

  const order = orders.find((o: Order) => (o.databaseId || o.id) === orderId);
  const orderLabel = order?.orderNumber || order?.id || orderId;
  const seller = users.find((u: User) => u.id === order?.sellerId);
  const supplier = users.find((u: User) => u.id === order?.supplierId);
  const sku = skus.find((s: SKU) => s.id === order?.skuId);

  const [isCredsRevealed, setIsCredsRevealed] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newStatus, setNewStatus] = useState(order?.status || 'submitted');
  const [selectedSupplierId, setSelectedSupplierId] = useState(order?.supplierId || '');
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigningSupplier, setIsAssigningSupplier] = useState(false);
  const [isRecordingCredentialAccess, setIsRecordingCredentialAccess] = useState(false);
  const [credentialAccessError, setCredentialAccessError] = useState<string | null>(null);
  const [refundType,setRefundType]=useState<OrderRefundType>('full'); const [refundReason,setRefundReason]=useState(''); const [refundAmount,setRefundAmount]=useState(''); const [refundConfirmation,setRefundConfirmation]=useState<RefundConfirmationPayload|null>(null); const [refundMode,setRefundMode]=useState<'new'|'edit'>('new'); const [showReverseModal,setShowReverseModal]=useState(false); const [reverseStatus,setReverseStatus]=useState<Exclude<OrderStatus,'refunded'>>('submitted');

  if (state.isLoadingOrders) return <div className="p-8 text-center text-gray-500">{t('orders.loadingOrders')}</div>;
  if (state.ordersError) return <div className="p-8 text-center"><p role="alert" className="text-red-700">{state.ordersError}</p><Button variant="secondary" className="mt-4" onClick={() => void state.refreshOrders()}>{t('common.retry')}</Button></div>;
  if (!order) return <div className="p-8 text-center text-gray-500"><p>{t('common.noResults')}</p><Button variant="secondary" className="mt-4" onClick={() => navigate('orders')}>{t('navigation.orders')}</Button></div>;

  const handleRevealConfirm = async () => {
    setCredentialAccessError(null);
    setIsRecordingCredentialAccess(true);
    try {
      await actions.recordCredentialAccess(order.databaseId || order.id);
      setIsCredsRevealed(true);
      setShowRevealModal(false);
    } catch (error) {
      setCredentialAccessError(error instanceof Error ? error.message : 'Unable to record credential access.');
    } finally {
      setIsRecordingCredentialAccess(false);
    }
  };

  const handleStatusChange = async () => {
    if (newStatus === 'refunded') { const error=validateRefund(); if(error){setMutationError(error);return;} setMutationError(null); setRefundConfirmation({orderId:order.databaseId||order.id,type:refundType,reason:refundReason.trim(),partialAmount:refundType==='partial'?refundValue:undefined,displayAmount:refundValue,mode:refundMode}); return; }
    setMutationError(null);
    setIsUpdatingStatus(true);
    try {
      await actions.updateOrderStatus(order.databaseId || order.id, newStatus);
      setShowStatusModal(false);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to update order status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  const refundValue=refundType==='full' ? (order.salePrice ?? order.value ?? 0) : Number(refundAmount);
  const validateRefund=()=>{const refundableAmount=order.salePrice ?? order.value ?? 0;if(!refundReason.trim()) return 'Refund reason is required.';if(refundType==='partial'&&(!Number.isFinite(refundValue)||refundValue<=0||refundValue>=refundableAmount))return `Partial refund must be greater than $0.00 and less than ${formatCurrency(refundableAmount)}.`;return null;};
  const submitRefund=async()=>{if(!refundConfirmation)return;setMutationError(null);setIsUpdatingStatus(true);try{const input={orderId:refundConfirmation.orderId,type:refundConfirmation.type,reason:refundConfirmation.reason,amount:refundConfirmation.partialAmount};if(refundConfirmation.mode==='edit')await actions.updateOrderRefundDetails(input);else await actions.refundOrder(input);setRefundConfirmation(null);setShowStatusModal(false);setRefundReason('');setRefundAmount('');}catch(error){setMutationError(error instanceof Error?error.message:'Unable to save refund details.');}finally{setIsUpdatingStatus(false);}};
  const submitReverse=async()=>{setMutationError(null);setIsUpdatingStatus(true);try{await actions.reverseOrderRefund({orderId:order.databaseId||order.id,status:reverseStatus});setShowReverseModal(false);}catch(error){setMutationError(error instanceof Error?error.message:'Unable to reverse refunded status.');}finally{setIsUpdatingStatus(false);}};

  const handleSupplierAssign = async () => {
    setMutationError(null);
    setIsAssigningSupplier(true);
    try {
      await actions.updateOrderSupplier(order.databaseId || order.id, selectedSupplierId);
      setShowSupplierModal(false);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to assign the supplier.');
    } finally {
      setIsAssigningSupplier(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await actions.deleteOrder(order);
      setShowDeleteModal(false);
      navigate('orders');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to permanently delete this order.');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (text) navigator.clipboard.writeText(text);
  };

  const orderHistory = order.history || [];
  const historyLabel = (event: { status: OrderStatus; note?: string }) => {
    if (event.note?.startsWith('Refund recorded:')) return t('history.orderRefunded');
    if (event.note?.startsWith('Refund details corrected:')) return t('history.refundUpdated');
    if (event.note?.startsWith('Refund status reversed;')) return t('history.refundReversed');
    return getOrderStatusLabel(event.status, language);
  };
  const isManualOrder = isManualMarketplaceOrder(order);
  const packageLabel = getOrderProductLabel(order, sku ? `${sku.product} - ${sku.package} (${sku.amount})` : undefined);
  const activeSuppliers = users.filter((u: User) => (u.roles || [u.role]).includes('Supplier') && u.status === 'Active');
  const platformLabel = order.platformName || sku?.platformName || 'Unknown';
  const categoryLabel = order.categoryName || sku?.category || 'Category not available';
  const customerLabel = order.customer || order.credentials?.gamertag || '';
  const loginLabel = order.loginEmail || order.credentials?.username || 'Not provided';
  const twoFactorNotes = order.twoFactorNotes || order.credentials?.twoFactor || '';
  const sellerNotes = order.sellerNotes || '';
  const salePrice = order.salePrice ?? order.value ?? 0;
  const maskedPassword = order.credentials?.password ? '*'.repeat(Math.max(order.credentials.password.length, 8)) : 'Not provided';
  const sellerLabel = seller?.name ? `${seller.name} (${order.sellerId})` : order.sellerId || 'Unknown';
  const supplierLabel = supplier?.name || (order.supplierId ? order.supplierId : 'Unassigned');
  const hasLogin = Boolean(order.loginEmail || order.credentials?.username);
  const hasPassword = Boolean(order.credentials?.password);
  const hasCredentials = hasLogin || hasPassword;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('orders')}>
          <ChevronRight className="w-5 h-5 rotate-180" />
        </Button>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 break-all text-xl font-bold text-gray-900 sm:gap-3 sm:text-2xl">
            {order.orderNumber || order.id}
            <Badge status={order.status} />
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('orders.created')} {format.formatLocalizedDate(order.createdAt, language)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          
          <Card>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-base font-semibold leading-6 text-gray-900">{t('orders.orderDetails')}</h3>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 p-4 min-[390px]:grid-cols-2 sm:grid-cols-3 sm:p-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('orders.platform')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{platformLabel}</dd>
              </div>
              {isManualOrder && <div>
                <dt className="text-sm font-medium text-gray-500">Order Type</dt>
                <dd className="mt-1 text-sm text-gray-900">Manual Marketplace</dd>
              </div>}
              {!isManualOrder && <div>
                <dt className="text-sm font-medium text-gray-500">{t('orders.category')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{categoryLabel}</dd>
              </div>}
              <div>
                <dt className="text-sm font-medium text-gray-500">{isManualOrder ? 'Product Name' : 'Product / Package'}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {packageLabel}
                </dd>
              </div>
              {isManualOrder && <div>
                <dt className="text-sm font-medium text-gray-500">Buyer Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{getOrderBuyerLabel(order)}</dd>
              </div>}
              {!isManualOrder && order.deliveryMethod && <div>
                <dt className="text-sm font-medium text-gray-500">Delivery Method</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.deliveryMethod}</dd>
              </div>}
              {!isManualOrder && customerLabel && <div>
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 text-sm text-gray-900">{customerLabel}</dd>
              </div>}
              <div>
                <dt className="text-sm font-medium text-gray-500">Sale Price</dt>
                <dd className="mt-1 text-sm text-gray-900 font-medium">{formatCurrency(salePrice)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('orders.seller')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{isManualOrder ? seller?.name || 'Not available' : sellerLabel}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('orders.supplier')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{supplierLabel}</dd>
              </div>
              {isManualOrder && <div>
                <dt className="text-sm font-medium text-gray-500">Order Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(getOrderDisplayDate(order))}</dd>
              </div>}
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('orders.created')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1"><Badge status={order.status} /></dd>
              </div>
            </div>
            {!isManualOrder && <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Platform Margin</span>
              <span className="text-sm font-bold text-emerald-600">{formatCurrency((order.value || 0) - (order.cost || sku?.supplierCost || 0))}</span>
            </div>}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                Account Credentials
              </h3>
              {!isCredsRevealed && (!isManualOrder || hasCredentials) && (
                <Button variant="secondary" size="sm" onClick={() => setShowRevealModal(true)}>
                  <Eye className="w-4 h-4 mr-2" /> Reveal Info
                </Button>
              )}
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <div className="space-y-4">
                {(!isManualOrder || hasLogin) && <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4">
                  <span className="text-sm font-medium text-gray-500 sm:text-right">Login / Email</span>
                  <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                    <code className="min-w-0 flex-1 break-all rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-900">{loginLabel}</code>
                    {loginLabel !== 'Not provided' && <Button variant="ghost" size="icon" onClick={() => copyToClipboard(loginLabel)}><Copy className="w-4 h-4" /></Button>}
                  </div>
                </div>}
                {(!isManualOrder || hasPassword) && <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4">
                  <span className="text-sm font-medium text-gray-500 sm:text-right">Password</span>
                  <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                    <code className="min-w-0 flex-1 break-all rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-900">
                      {isCredsRevealed ? order.credentials?.password || 'Not provided' : maskedPassword}
                    </code>
                    {isCredsRevealed && order.credentials?.password && <Button variant="ghost" size="icon" onClick={() => copyToClipboard(order.credentials.password)}><Copy className="w-4 h-4" /></Button>}
                  </div>
                </div>}
                {!isManualOrder && twoFactorNotes && <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                  <span className="mt-1.5 text-sm font-medium text-gray-500 sm:text-right">2FA Notes</span>
                  <div className="flex min-w-0 items-start gap-2 sm:col-span-2">
                    <code className="min-w-0 flex-1 whitespace-pre-wrap break-words rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-900">{twoFactorNotes || 'Not provided'}</code>
                    {twoFactorNotes && <Button variant="ghost" size="icon" onClick={() => copyToClipboard(twoFactorNotes)}><Copy className="w-4 h-4" /></Button>}
                  </div>
                </div>}
                {!isManualOrder && customerLabel && <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4">
                  <span className="text-sm font-medium text-gray-500 sm:text-right">Gamertag</span>
                  <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                    <code className="min-w-0 flex-1 break-all rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-900">{customerLabel}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(customerLabel)}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>}
                {isManualOrder && !hasCredentials && <p className="text-sm text-gray-500">No account credentials provided.</p>}
                {(!isManualOrder || hasCredentials) && <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  {isCredsRevealed ? (
                    <Button variant="ghost" size="sm" onClick={() => setIsCredsRevealed(false)}>
                      <EyeOff className="w-4 h-4 mr-2" /> Hide Password
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setShowRevealModal(true)}>
                      <Eye className="w-4 h-4 mr-2" /> Reveal Password
                    </Button>
                  )}
                </div>}
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Seller Notes</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{sellerNotes || 'No seller notes provided.'}</p>
            </div>
          </Card>

          {order.status==='refunded' && <Card><div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50"><h3 className="text-base font-semibold text-gray-900">{t('refund.details')}</h3></div><div className="space-y-3 p-6">{order.refundDetails?<><p className="text-sm text-gray-700"><strong>{t('refund.type')}:</strong> {order.refundDetails.type==='full'?t('refund.full'):t('refund.partial')}</p><p className="text-sm text-gray-700"><strong>{t('refund.amount')}:</strong> {format.formatLocalizedCurrency(order.refundDetails.amount, 'USD', language)}</p><p className="text-sm text-gray-700 whitespace-pre-wrap"><strong>{t('refund.reason')}:</strong> {order.refundDetails.reason}</p><p className="text-sm text-gray-500">{format.formatLocalizedDateTime(order.refundDetails.refundedAt, language)} · {order.refundDetails.refundedBy?t('history.changedBy'):t('refund.unknownUser')}</p><Button size="sm" variant="secondary" onClick={()=>{setRefundMode('edit');setRefundType(order.refundDetails!.type);setRefundReason(order.refundDetails!.reason);setRefundAmount(String(order.refundDetails!.amount));setNewStatus('refunded');setShowStatusModal(true);}}>{t('refund.editDetails')}</Button></>:<><p className="font-medium text-sm text-gray-900">{t('refund.legacy')}</p><p className="text-sm text-gray-500">{t('refund.legacyHelp')}</p><Button size="sm" variant="secondary" onClick={()=>{setRefundMode('edit');setRefundType('full');setRefundReason('');setRefundAmount('');setNewStatus('refunded');setShowStatusModal(true);}}>{t('refund.addDetails')}</Button></>}<Button size="sm" variant="ghost" className="text-red-600" onClick={()=>setShowReverseModal(true)}>{t('refund.reverse')}</Button></div></Card>}

        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start min-w-0">
          
          <Card>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Admin Actions</h3>
            </div>
            <div className="p-6 space-y-4">
              <Button variant="secondary" className="w-full justify-between gap-3" onClick={() => setShowStatusModal(true)}>
                Override Status <Edit2 className="w-4 h-4 text-gray-400" />
              </Button>
              <Button variant="secondary" className="w-full justify-between gap-3" onClick={() => {
                setSelectedSupplierId(order.supplierId || '');
                setShowSupplierModal(true);
              }}>
                Reassign Supplier <Users className="w-4 h-4 text-gray-400" />
              </Button>
              {state.canPermanentlyDeleteOrders && (
                <>
                  <hr className="border-gray-200" />
                  <Button variant="ghost" className="w-full justify-between gap-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
                    setDeleteConfirmation('');
                    setDeleteError(null);
                    setShowDeleteModal(true);
                  }}>
                    Permanently Delete <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </Card>

          {order.databaseId ? (
            <OrderChat orderId={order.databaseId} />
          ) : (
            <Card className="p-5 text-sm text-red-700">Order chat requires a database-backed order.</Card>
          )}

          <Card>
             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-base font-semibold leading-6 text-gray-900">{t('history.title')}</h3>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {orderHistory.slice().reverse().map((event, eventIdx) => (
                    <li key={eventIdx}>
                      <div className="relative pb-8">
                        {eventIdx !== orderHistory.length - 1 ? (
                          <span className="absolute left-4 top-8 bottom-0 w-px -translate-x-1/2 bg-gray-200" aria-hidden="true"></span>
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div className="shrink-0">
                            <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-current/40 ${STATUS_COLORS[event.status as OrderStatus]?.bg || 'bg-gray-100'} ${STATUS_COLORS[event.status as OrderStatus]?.text || 'text-gray-700'}`}>
                              {STATUS_COLORS[event.status as OrderStatus] ? <div className="flex h-4 w-4 items-center justify-center [&>svg]:m-0 [&>svg]:h-4 [&>svg]:w-4">{STATUS_COLORS[event.status as OrderStatus].icon}</div> : <Clock className="h-4 w-4 text-gray-500" />}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-gray-500"><span className="font-medium text-gray-900 capitalize">{historyLabel(event)}</span></p>
                              {event.note && <p className="mt-1 text-sm text-gray-500 italic">"{event.note}"</p>}
                              {event.changedBy && <p className="mt-1 text-xs text-gray-500">{t('history.changedBy')} {users.find((user)=>user.id===event.changedBy)?.name || t('refund.unknownUser')}</p>}
                            </div>
                            <div className="whitespace-nowrap text-right text-xs text-gray-500">
                              {event.timestamp ? format.formatLocalizedDateTime(event.timestamp, language) : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={showRevealModal} onClose={() => { if (!isRecordingCredentialAccess) setShowRevealModal(false); }} title="Confirm Credential Access">
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            You are about to view sensitive user credentials. This action will be permanently recorded in the system audit log.
          </p>
          {credentialAccessError && <p role="alert" className="mt-3 text-sm text-red-700">{credentialAccessError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowRevealModal(false)} disabled={isRecordingCredentialAccess}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleRevealConfirm()} disabled={isRecordingCredentialAccess}>
            {isRecordingCredentialAccess ? 'Recording...' : 'Reveal Credentials'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Override Order Status">
        <div className="mt-4">
           <Select 
            label="New Status"
            value={newStatus}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewStatus(e.target.value as OrderStatus)}
            options={overrideStatusOptions}
          />
          {newStatus==='refunded'&&<div className="mt-4 space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-4"><p className="font-medium text-sm text-gray-900">Refund Details</p><div className="flex gap-4 text-sm"><label><input type="radio" checked={refundType==='full'} onChange={()=>setRefundType('full')}/> Full refund</label><label><input type="radio" checked={refundType==='partial'} onChange={()=>setRefundType('partial')}/> Partial refund</label></div><textarea value={refundReason} onChange={(event)=>setRefundReason(event.target.value)} maxLength={1000} placeholder="Explain why this Order was refunded" className="w-full rounded border p-2 text-sm" rows={3}/><p className="text-xs text-gray-500">{refundReason.length}/1000</p>{refundType==='full'?<div className="rounded bg-white p-2 text-sm text-gray-700">Refunded Amount: <strong>{formatCurrency(salePrice)} USD</strong><p className="mt-1 text-xs text-gray-500">The full Order sale amount will be recorded automatically.</p></div>:<><Input label="Refunded Amount (USD)" type="number" min="0" step="0.01" value={refundAmount} onChange={(event: ChangeEvent<HTMLInputElement>)=>setRefundAmount(event.target.value)}/><p className="text-xs text-gray-500">Maximum partial refund: less than {formatCurrency(salePrice)}</p></>}</div>}
          {mutationError && <p role="alert" className="text-sm text-red-700">{mutationError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleStatusChange()} disabled={newStatus === order.status || isUpdatingStatus}>{isUpdatingStatus ? 'Updating...' : 'Confirm Update'}</Button>
        </div>
      </Modal>

      <Modal isOpen={refundConfirmation!==null} onClose={() => {if(!isUpdatingStatus)setRefundConfirmation(null);}} title={t('refund.confirm')}>{refundConfirmation&&<><div className="space-y-3 text-sm text-gray-700"><p><strong>{t('navigation.orders')}:</strong> {order.orderNumber||order.id}</p><p><strong>{t('refund.type')}:</strong> {refundConfirmation.type==='full'?t('refund.full'):t('refund.partial')} · {format.formatLocalizedCurrency(refundConfirmation.displayAmount, 'USD', language)}</p><p className="whitespace-pre-wrap"><strong>{t('refund.reason')}:</strong> {refundConfirmation.reason}</p><p className="rounded bg-amber-50 p-3 text-amber-800">{t('refund.recordedHelp')}</p>{mutationError&&<p role="alert" className="text-red-700">{mutationError}</p>}</div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={()=>setRefundConfirmation(null)} disabled={isUpdatingStatus}>{t('common.cancel')}</Button><Button onClick={()=>void submitRefund()} disabled={isUpdatingStatus}>{isUpdatingStatus?t('refund.processing'):t('refund.confirm')}</Button></div></>}</Modal>
      <Modal isOpen={showReverseModal} onClose={()=>{if(!isUpdatingStatus)setShowReverseModal(false);}} title={t('refund.reverse')}><div className="space-y-4"><p className="text-sm text-gray-700">{t('refund.reverseHelp')}</p><Select label={t('orders.status')} value={reverseStatus} onChange={(event: ChangeEvent<HTMLSelectElement>)=>setReverseStatus(event.target.value as Exclude<OrderStatus,'refunded'>)} options={overrideStatusOptions.filter((option)=>option.value!=='refunded')}/>{mutationError&&<p role="alert" className="text-sm text-red-700">{mutationError}</p>}</div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={()=>setShowReverseModal(false)} disabled={isUpdatingStatus}>{t('common.cancel')}</Button><Button variant="danger" onClick={()=>void submitReverse()} disabled={isUpdatingStatus}>{isUpdatingStatus?t('refund.reversing'):t('refund.confirmReversal')}</Button></div></Modal>

      <Modal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} title={t('supplierAssignment.assign')}>
        <div className="mt-4 space-y-4">
          <Select
            label={t('orders.supplier')}
            value={selectedSupplierId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedSupplierId(e.target.value)}
            options={[
              { value: '', label: t('supplierAssignment.select') },
              ...activeSuppliers.map((u: User) => ({ value: u.id, label: `${u.name} (${u.email})` })),
            ]}
          />
          {activeSuppliers.length === 0 && (
            <p className="text-sm text-gray-500">{t('supplierAssignment.noSupplier')}</p>
          )}
          {mutationError && <p role="alert" className="text-sm text-red-700">{mutationError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowSupplierModal(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={() => void handleSupplierAssign()} disabled={!selectedSupplierId || isAssigningSupplier}>{isAssigningSupplier ? t('supplierAssignment.saving') : t('common.save')}</Button>
        </div>
      </Modal>

      {state.canPermanentlyDeleteOrders && (
        <Modal isOpen={showDeleteModal} onClose={() => { if (!isDeleting) setShowDeleteModal(false); }} title="Permanently Delete Order">
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Delete order {orderLabel}?</p>
              <p className="mt-1">This deletion is permanent. Related order history may also be removed.</p>
            </div>
            <Input
              label="Type DELETE to confirm"
              value={deleteConfirmation}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmation(event.target.value)}
              disabled={isDeleting}
              autoComplete="off"
            />
            {deleteError && <p role="alert" className="text-sm text-red-700">{deleteError}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handlePermanentDelete} disabled={deleteConfirmation !== 'DELETE' || isDeleting}>
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
