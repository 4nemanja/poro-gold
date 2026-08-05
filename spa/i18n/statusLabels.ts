import type { DashboardLanguage } from './types';
import type { OrderStatus } from '../types';

const orderStatusLabels: Record<DashboardLanguage, Record<OrderStatus, string>> = {
  en: { submitted: 'Submitted', accepted: 'Accepted', in_progress: 'In Progress', completed: 'Completed', needs_info: 'Need Info', failed: 'Failed', cancelled: 'Cancelled', refunded: 'Refunded', disputed: 'Disputed' },
  sr: { submitted: 'Poslato', accepted: 'Prihvaćeno', in_progress: 'U toku', completed: 'Završeno', needs_info: 'Potrebne informacije', failed: 'Neuspešno', cancelled: 'Otkazano', refunded: 'Refundirano', disputed: 'Sporno' },
};

export const getOrderStatusLabel = (status: OrderStatus, language: DashboardLanguage) => orderStatusLabels[language][status];
