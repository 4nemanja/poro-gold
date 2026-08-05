import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Copy, ExternalLink, Gift, Link2Off, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button, Card, Input, Modal, Select } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import { giftService } from './giftService';
import { GIFT_STATUSES, giftStatusLabel, type GiftOrder, type GiftOrderInput, type GiftStatus } from './types';

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): GiftOrderInput => ({
  date: today(), customer: '', purchasedVbucks: 0, status: 'waiting_for_selection',
  soldFor: 0, epicUsername: '',
});

const statusStyles: Record<GiftStatus, string> = {
  waiting_for_selection: 'bg-amber-50 text-amber-700',
  selection_submitted: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-emerald-50 text-emerald-700',
  refunded: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-700',
};

const toForm = (order: GiftOrder): GiftOrderInput => ({
  date: order.date, customer: order.customer, purchasedVbucks: order.purchasedVbucks,
  status: order.status, soldFor: order.soldFor, epicUsername: order.epicUsername || '',
});

const validate = (form: GiftOrderInput) => {
  if (!form.date) return 'Date is required.';
  if (!form.customer.trim() || form.customer.trim().length > 120) return 'Customer must be between 1 and 120 characters.';
  if (!Number.isInteger(form.purchasedVbucks) || form.purchasedVbucks <= 0 || form.purchasedVbucks > 1_000_000) return 'V-Bucks amount must be a whole number between 1 and 1,000,000.';
  if (!Number.isFinite(form.soldFor) || form.soldFor < 0) return 'Sold For must be zero or greater.';
  if (!GIFT_STATUSES.some(({ value }) => value === form.status)) return 'Gift status is invalid.';
  return null;
};

const GiftForm = ({ form, setForm, selected, saving, error, onSubmit, onCancel }: {
  form: GiftOrderInput;
  setForm: (next: GiftOrderInput) => void;
  selected: GiftOrder | null;
  saving: boolean;
  error: string | null;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) => {
  const text = (field: keyof GiftOrderInput) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: event.target.value });
  const number = (field: keyof GiftOrderInput) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: Number(event.target.value) });
  return <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Date" type="date" value={form.date} onChange={text('date')} required />
      <Input label="Customer" value={form.customer} onChange={text('customer')} maxLength={120} required />
      <Input label="V-Bucks Amount" type="number" min="1" max="1000000" step="1" value={form.purchasedVbucks || ''} onChange={number('purchasedVbucks')} disabled={Boolean(selected?.selectedOfferId)} required />
      <Select label="Status" value={form.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, status: event.target.value as GiftStatus })} options={GIFT_STATUSES} />
      <Input label="Sold For (USD)" type="number" min="0" step="0.01" value={form.soldFor} onChange={number('soldFor')} required />
      <Input label="Epic Username (optional)" value={form.epicUsername} onChange={text('epicUsername')} maxLength={100} />
    </div>
    {selected?.selectedOfferId && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">V-Bucks amount is locked because the customer already selected an item.</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : selected ? 'Save Changes' : 'Add Gift'}</Button>
    </div>
  </form>;
};

export function GiftServicePage({ canDeleteOrders }: { canDeleteOrders: boolean }) {
  const [orders, setOrders] = useState<GiftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<GiftOrderInput>(emptyForm);
  const [editing, setEditing] = useState<GiftOrder | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<GiftOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [magicUrl, setMagicUrl] = useState<string | null>(null);
  const [magicUrls, setMagicUrls] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setOrders(await giftService.list()); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to load gift orders.'); }
    finally { setLoading(false); }
  }, []);

  // The initial request synchronizes this view with Supabase.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  const summary = useMemo(() => {
    const active = orders.filter((order) => !['completed', 'refunded', 'cancelled'].includes(order.status));
    return {
      invested: orders.reduce((sum, order) => sum + order.cost, 0),
      available: active.reduce((sum, order) => sum + order.remainingVbucks, 0),
      inUse: active.length,
      revenue: orders.reduce((sum, order) => sum + order.soldFor, 0),
    };
  }, [orders]);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setFormError(null); setFormOpen(true); };
  const openEdit = (order: GiftOrder) => { setEditing(order); setForm(toForm(order)); setFormError(null); setFormOpen(true); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate(form);
    if (validationError) { setFormError(validationError); return; }
    setSaving(true); setFormError(null); setNotice(null);
    try {
      if (editing) {
        await giftService.update(editing.id, form, editing.selectedOfferId);
        setNotice('Gift order updated successfully.');
        setFormOpen(false);
      } else {
        const result = await giftService.create(form);
        const created = result.order as { id?: string };
        if (created?.id) setMagicUrls((current) => ({ ...current, [created.id!]: result.magicUrl }));
        setNotice('Gift created successfully.');
        setMagicUrl(result.magicUrl);
        setFormOpen(false);
      }
      await refresh();
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : 'Unable to save the gift order.');
    } finally { setSaving(false); }
  };

  const copyUrl = async (order: GiftOrder) => {
    const url = magicUrls[order.id];
    if (!url) { setNotice('For hash-only security, regenerate the link to obtain a new copyable URL.'); return; }
    await navigator.clipboard.writeText(url);
    setNotice('Magic link copied to clipboard.');
  };

  const regenerate = async (order: GiftOrder) => {
    if (!window.confirm('Regenerate this link? The previous link will stop working immediately.')) return;
    setError(null);
    try {
      const result = await giftService.regenerate(order.id);
      setMagicUrls((current) => ({ ...current, [order.id]: result.magicUrl }));
      setMagicUrl(result.magicUrl);
      await refresh();
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to regenerate the link.'); }
  };

  const revoke = async (order: GiftOrder) => {
    if (!window.confirm('Revoke this customer link?')) return;
    try { await giftService.revoke(order.id); setNotice('Magic link revoked.'); await refresh(); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to revoke the link.'); }
  };

  const remove = async (order: GiftOrder) => {
    if (!window.confirm(`Permanently delete the gift order for ${order.customer}?`)) return;
    try { await giftService.remove(order.id); setNotice('Gift order permanently deleted.'); await refresh(); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to delete the gift order.'); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h1 className="text-2xl font-bold text-gray-900">Gift Service</h1><p className="mt-1 text-sm text-gray-500">Create secure gift links and manage customer selections.</p></div>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Gift</Button></div>
    </div>

    {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" aria-live="polite" className="fixed inset-x-4 top-4 z-[60] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xl sm:left-auto sm:right-6 sm:w-full sm:max-w-sm">{notice}</div>}

    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Invested', formatCurrency(summary.invested), 'Recorded gift costs'],
        ['Available Balance', `${summary.available.toLocaleString()} V-Bucks`, 'Across active gifts'],
        ['In Use', summary.inUse.toLocaleString(), 'Active gift orders'],
        ['Revenue', formatCurrency(summary.revenue), 'Gross sold-for value'],
      ].map(([label, value, hint]) => <Card key={label} className="p-6"><dt className="text-sm font-medium text-gray-500">{label}</dt><dd className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{value}</dd><p className="mt-1 text-xs text-gray-500">{hint}</p></Card>)}
    </dl>

    <Card>
      <div className="border-b border-gray-200 bg-gray-50/50 px-5 py-4"><h2 className="font-semibold text-gray-900">Gift orders</h2></div>
      <div className="overflow-x-auto">
        {loading && <div className="p-10 text-center text-sm text-gray-500">Loading gift orders...</div>}
        {!loading && !orders.length && <div className="p-10 text-center"><Gift className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-3 text-sm text-gray-500">No gift orders yet.</p></div>}
        {!loading && orders.length > 0 && <table className="min-w-[1280px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>{['Date','Customer','V-Bucks Amount','Status','Source','Sold For','Cost','Fee %','Magic Link','Actions'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-200 bg-white">{orders.map((order) => {
            const activeLink = order.links.find((link) => !link.revokedAt);
            const knownUrl = magicUrls[order.id];
            const linkState = !activeLink ? 'Revoked' : new Date(activeLink.expiresAt) <= new Date() ? 'Expired' : activeLink.consumedAt ? 'Consumed' : activeLink.openedAt ? 'Opened' : 'Active';
            return <tr key={order.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{new Date(`${order.date}T00:00:00`).toLocaleDateString()}</td>
              <td className="px-4 py-4"><p className="font-medium text-gray-900">{order.customer}</p>{order.epicUsername && <p className="text-xs text-gray-500">Epic: {order.epicUsername}</p>}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{order.purchasedVbucks.toLocaleString()}</td>
              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[order.status]}`}>{giftStatusLabel(order.status)}</span></td>
              <td className="px-4 py-4 text-sm text-gray-500">{order.source || '—'}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{formatCurrency(order.soldFor)}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{formatCurrency(order.cost)}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{order.feePercent}%</td>
              <td className="px-4 py-4"><span className="text-xs font-medium text-gray-700">{linkState}</span><p className="mt-0.5 text-xs text-gray-500">{activeLink ? `Expires ${new Date(activeLink.expiresAt).toLocaleDateString()}` : 'No active link'}</p></td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-1">
                <Button size="icon" variant="ghost" title="Open details" onClick={() => setDetail(order)}><ExternalLink className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(order)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" title={knownUrl ? 'Copy Magic Link' : 'Regenerate to obtain a copyable hash-only link'} onClick={() => void copyUrl(order)}><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" title="Revoke Link" onClick={() => void revoke(order)} disabled={!activeLink}><Link2Off className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" title="Regenerate Link" onClick={() => void regenerate(order)}><RefreshCw className="h-4 w-4" /></Button>
                {canDeleteOrders && <Button size="icon" variant="ghost" className="text-red-600" title="Delete" onClick={() => void remove(order)}><Trash2 className="h-4 w-4" /></Button>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>}
      </div>
    </Card>

    <Modal isOpen={formOpen} onClose={() => { if (!saving) setFormOpen(false); }} title={editing ? 'Edit Gift' : 'Add Gift'} maxWidth="sm:max-w-xl">
      <GiftForm form={form} setForm={setForm} selected={editing} saving={saving} error={formError} onSubmit={(event) => void save(event)} onCancel={() => setFormOpen(false)} />
    </Modal>

    <Modal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title="Gift order details" maxWidth="sm:max-w-xl">
      {detail && <div className="space-y-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">{[
          ['Public ID', detail.publicId], ['Customer', detail.customer], ['Epic Username', detail.epicUsername || '—'],
          ['External Order ID', detail.externalOrderId || '—'], ['Selected item', detail.selectedItemName || 'Not selected'],
          ['Remaining', `${detail.remainingVbucks.toLocaleString()} V-Bucks`], ['Created', new Date(detail.createdAt).toLocaleString()], ['Updated', new Date(detail.updatedAt).toLocaleString()],
        ].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase text-gray-500">{label}</dt><dd className="mt-1 break-words text-gray-900">{value}</dd></div>)}</dl>
        {detail.notes && <div><p className="text-xs font-medium uppercase text-gray-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-gray-900">{detail.notes}</p></div>}
        <div className="flex justify-end"><Button variant="secondary" onClick={() => setDetail(null)}>Close</Button></div>
      </div>}
    </Modal>

    <Modal isOpen={Boolean(magicUrl)} onClose={() => setMagicUrl(null)} title="Gift link ready" maxWidth="sm:max-w-xl">
      {magicUrl && <div className="space-y-4"><p className="text-sm text-gray-600">This is the only time the complete token can be recovered unless you regenerate it. Copy it now.</p><div className="break-all rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">{magicUrl}</div><div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setMagicUrl(null)}>Close</Button><Button onClick={async () => { await navigator.clipboard.writeText(magicUrl); setNotice('Magic link copied to clipboard.'); }}><Copy className="mr-2 h-4 w-4" />Copy Link</Button></div></div>}
    </Modal>
  </div>;
}
