import { Search, Filter } from 'lucide-react';
import type { AuditLog } from '../types';
import { Card, Button } from '../components/ui';
import { formatDate } from '../utils/formatters';

interface AuditLogViewProps {
  state: { auditLogs: AuditLog[] };
}

export const AuditLogView = ({ state }: AuditLogViewProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable record of sensitive system actions.</p>
      </div>

      <Card>
         <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input type="text" placeholder="Search logs..." className="block w-64 rounded-lg border-gray-300 pl-10 focus:border-gray-900 focus:ring-gray-900 sm:text-sm px-3 py-2 border" />
            </div>
            <Button variant="secondary" size="sm"><Filter className="w-4 h-4 mr-2"/> Filters</Button>
         </div>
         <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
              <tr>
                {['Timestamp', 'Actor', 'Action', 'Details'].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.auditLogs.slice().reverse().map((log: AuditLog) => (
                 <tr key={log.id} className="hover:bg-gray-50 text-sm">
                   <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDate(log.timestamp)}</td>
                   <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{log.actor}</td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{log.action}</span>
                   </td>
                   <td className="px-6 py-4 text-gray-600">{log.details}</td>
                 </tr>
              ))}
              {state.auditLogs.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No audit events recorded yet.</td></tr>
              )}
            </tbody>
          </table>
         </div>
      </Card>
    </div>
  );
};
