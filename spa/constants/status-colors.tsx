import React from 'react';
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import type { OrderStatus } from '../types';

export const STATUS_COLORS: Record<OrderStatus, { bg: string, text: string, icon: React.ReactNode }> = {
  submitted: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <Clock className="w-3 h-3 mr-1" /> },
  accepted: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <RefreshCw className="w-3 h-3 mr-1 animate-spin-slow" /> },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
  needs_info: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <AlertCircle className="w-3 h-3 mr-1" /> },
  failed: { bg: 'bg-red-50', text: 'text-red-700', icon: <XCircle className="w-3 h-3 mr-1" /> },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <XCircle className="w-3 h-3 mr-1" /> },
  refunded: { bg: 'bg-purple-50', text: 'text-purple-700', icon: <RefreshCw className="w-3 h-3 mr-1" /> },
  disputed: { bg: 'bg-rose-50', text: 'text-rose-700', icon: <ShieldAlert className="w-3 h-3 mr-1" /> },
};
