import { Bell } from 'lucide-react';

export const NotificationEmptyState = () => (
  <div className="px-6 py-14 text-center">
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500">
      <Bell className="h-5 w-5" />
    </div>
    <p className="mt-3 text-sm font-medium text-gray-900">No notifications yet.</p>
    <p className="mt-1 text-xs text-gray-500">New order chat messages will appear here.</p>
  </div>
);
