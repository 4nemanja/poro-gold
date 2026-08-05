import { useState, type ReactNode } from 'react';
import { Boxes, CheckCircle2, Database, Radio, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Button, Card, Input } from '../../components/ui';
import { fnShopService } from './fnShopService';
import type {
  FnShopAccount,
  FnShopAction,
  FnShopCategory,
  FnShopConnection,
  FnShopInventoryRow,
} from './types';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const showNumber = (value: number | null) => value === null ? 'Not supplied' : number.format(value);
const showDateTime = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not checked';

const SectionHeading = ({ icon, title, description, actions }: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) => <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
  <div className="flex min-w-0 items-start gap-3">
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">{icon}</span>
    <div><h2 className="font-semibold text-gray-900">{title}</h2><p className="mt-0.5 text-sm text-gray-500">{description}</p></div>
  </div>
  {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
</div>;

const EmptyRow = ({ columns, children }: { columns: number; children: ReactNode }) =>
  <tr><td colSpan={columns} className="px-6 py-8 text-center text-sm text-gray-500">{children}</td></tr>;

const AccountsTable = ({ accounts }: { accounts: FnShopAccount[] }) => <div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50"><tr>
      {['Account', 'FN Shop ID', 'Category', 'V-Bucks', 'Gifts', 'Free Slots', 'Status'].map((label) =>
        <th key={label} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{label}</th>)}
    </tr></thead>
    <tbody className="divide-y divide-gray-200 bg-white">
      {accounts.map((account, index) => <tr key={account.id || `${account.displayName}-${index}`}>
        <td className="px-5 py-4 text-sm font-medium text-gray-900">{account.displayName}</td>
        <td className="max-w-64 truncate px-5 py-4 font-mono text-xs text-gray-500" title={account.id || undefined}>{account.id || 'Not supplied'}</td>
        <td className="px-5 py-4 text-sm text-gray-600">{account.category || 'Default'}</td>
        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-900">{showNumber(account.vbucks)}</td>
        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
          {showNumber(account.giftsUsed)}{account.giftLimit !== null ? ` / ${number.format(account.giftLimit)}` : ''}
        </td>
        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{showNumber(account.freeGiftSlots)}</td>
        <td className="px-5 py-4 text-sm text-gray-600">{account.status || 'Not supplied'}</td>
      </tr>)}
      {!accounts.length && <EmptyRow columns={7}>No account data loaded.</EmptyRow>}
    </tbody>
  </table>
</div>;

export function FnShopPage() {
  const [connection, setConnection] = useState<FnShopConnection | null>(null);
  const [lastSuccessfulCheck, setLastSuccessfulCheck] = useState<string | null>(null);
  const [categories, setCategories] = useState<FnShopCategory[]>([]);
  const [inventory, setInventory] = useState<FnShopInventoryRow[]>([]);
  const [accounts, setAccounts] = useState<FnShopAccount[]>([]);
  const [statusAccounts, setStatusAccounts] = useState<FnShopAccount[]>([]);
  const [accountCategory, setAccountCategory] = useState('');
  const [statusMode, setStatusMode] = useState<'cached' | 'live' | null>(null);
  const [busyAction, setBusyAction] = useState<FnShopAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: FnShopAction, request: () => Promise<void>) => {
    if (busyAction) return;
    setBusyAction(action);
    setError(null);
    try { await request(); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to complete the FN Shop request.'); }
    finally { setBusyAction(null); }
  };

  const verify = () => run('verify-license', async () => {
    const response = await fnShopService.verifyLicense();
    setConnection(response.connection);
    setLastSuccessfulCheck(response.checkedAt);
  });
  const loadCategories = () => run('category-list', async () => {
    const response = await fnShopService.listCategories();
    setCategories(response.categories);
  });
  const loadInventory = () => run('inventory', async () => {
    const response = await fnShopService.getInventory();
    setInventory(response.inventory);
  });
  const loadAccounts = () => run('accounts-list', async () => {
    const response = await fnShopService.listAccounts(accountCategory.trim().toLowerCase() || undefined);
    setAccounts(response.accounts);
  });
  const refreshAccountData = () => run('accounts-data', async () => {
    const response = await fnShopService.refreshAccountData();
    setAccounts(response.accounts);
  });
  const loadStatus = (live: boolean) => run('groups-status', async () => {
    const response = await fnShopService.getGroupsStatus(live);
    setStatusAccounts(response.accounts);
    setStatusMode(live ? 'live' : 'cached');
  });

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">FN Shop</h1>
      <p className="mt-1 text-sm text-gray-500">Admin-only, read-only diagnostics for gifting accounts and inventory.</p>
    </div>

    {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    <Card>
      <SectionHeading icon={<ShieldCheck className="h-5 w-5" />} title="Connection" description="Verify the server-side FN Shop license manually. No request runs automatically." actions={
        <Button onClick={() => void verify()} disabled={busyAction !== null}>
          <RefreshCw className={`mr-2 h-4 w-4 ${busyAction === 'verify-license' ? 'animate-spin' : ''}`} />
          {busyAction === 'verify-license' ? 'Verifying...' : 'Verify Connection'}
        </Button>
      } />
      <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</dt><dd className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">{connection ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" />Connected</> : 'Not verified'}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Plan</dt><dd className="mt-2 text-sm font-semibold text-gray-900">{connection?.plan || 'Not supplied'}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Owner ID</dt><dd className="mt-2 truncate font-mono text-xs text-gray-700" title={connection?.userId || undefined}>{connection?.userId || 'Not supplied'}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Last successful check</dt><dd className="mt-2 text-sm text-gray-700">{showDateTime(lastSuccessfulCheck)}</dd></div>
      </dl>
    </Card>

    <Card>
      <SectionHeading icon={<Database className="h-5 w-5" />} title="Categories" description="Configured FN Shop account groups." actions={<Button variant="secondary" onClick={() => void loadCategories()} disabled={busyAction !== null || !connection}>{busyAction === 'category-list' ? 'Loading...' : 'Load Categories'}</Button>} />
      <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50"><tr>{['Name', 'Slug', 'Accounts', 'Default'].map((label) => <th key={label} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {categories.map((category, index) => <tr key={category.slug || `${category.name}-${index}`}><td className="px-5 py-4 text-sm font-medium text-gray-900">{category.name}</td><td className="px-5 py-4 font-mono text-xs text-gray-600">{category.slug || 'Not supplied'}</td><td className="px-5 py-4 text-sm text-gray-700">{number.format(category.accountCount)}</td><td className="px-5 py-4 text-sm text-gray-700">{category.isDefault ? 'Yes' : 'No'}</td></tr>)}
          {!categories.length && <EmptyRow columns={4}>No categories loaded.</EmptyRow>}
        </tbody>
      </table></div>
    </Card>

    <Card>
      <SectionHeading icon={<Boxes className="h-5 w-5" />} title="Inventory" description="Cached category totals without account identifiers." actions={<Button variant="secondary" onClick={() => void loadInventory()} disabled={busyAction !== null || !connection}>{busyAction === 'inventory' ? 'Loading...' : 'Load Inventory'}</Button>} />
      <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50"><tr>{['Category', 'Accounts', 'Total V-Bucks', 'Free Gift Slots'].map((label) => <th key={label} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {inventory.map((row, index) => <tr key={`${row.category}-${index}`}><td className="px-5 py-4 text-sm font-medium text-gray-900">{row.category}</td><td className="px-5 py-4 text-sm text-gray-700">{number.format(row.accountCount)}</td><td className="px-5 py-4 text-sm text-gray-900">{number.format(row.totalVbucks)}</td><td className="px-5 py-4 text-sm text-gray-700">{number.format(row.freeGiftSlots)}</td></tr>)}
          {!inventory.length && <EmptyRow columns={4}>No inventory loaded.</EmptyRow>}
        </tbody>
      </table></div>
    </Card>

    <Card>
      <SectionHeading icon={<Users className="h-5 w-5" />} title="Accounts" description="Cached account information. Live account data is manually triggered and more heavily rate-limited." actions={
        <Button variant="secondary" onClick={() => void refreshAccountData()} disabled={busyAction !== null || !connection}>{busyAction === 'accounts-data' ? 'Refreshing...' : 'Refresh Account Data'}</Button>
      } />
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-end sm:p-6">
        <Input label="Category slug (optional)" value={accountCategory} onChange={(event) => setAccountCategory(event.target.value)} maxLength={40} placeholder="main" className="w-full sm:max-w-xs" />
        <Button onClick={() => void loadAccounts()} disabled={busyAction !== null || !connection}>{busyAction === 'accounts-list' ? 'Loading...' : 'Load Accounts'}</Button>
      </div>
      <AccountsTable accounts={accounts} />
    </Card>

    <Card>
      <SectionHeading icon={<Radio className="h-5 w-5" />} title="Account Group Status" description="Cached status is preferred. Live refresh queries Epic accounts and may be slower." actions={<>
        <Button variant="secondary" onClick={() => void loadStatus(false)} disabled={busyAction !== null || !connection}>{busyAction === 'groups-status' ? 'Loading...' : 'Load Cached Status'}</Button>
        <Button onClick={() => void loadStatus(true)} disabled={busyAction !== null || !connection}>{busyAction === 'groups-status' ? 'Refreshing...' : 'Live Refresh'}</Button>
      </>} />
      {statusMode && <div className="border-b border-gray-200 bg-gray-50 px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Showing {statusMode} status</div>}
      <AccountsTable accounts={statusAccounts} />
    </Card>
  </div>;
}
