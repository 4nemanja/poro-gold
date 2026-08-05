import { useState, type ChangeEvent } from 'react';
import { Plus } from 'lucide-react';
import type { AdminUser, Role, User } from '../types';
import type { SellerOrderMode } from '../shared/types/supabase-orders';
import type { CreateAdminUserInput } from '../portals/admin/services/adminUserService';
import { Card, Button, Input, Select, Modal } from '../components/ui';

// Every dashboard role that can actually be granted (has a live backend role).
const ALL_ROLES: Role[] = ['Admin', 'Seller', 'Supplier', 'Management'];

interface UsersViewProps {
  state: { users: AdminUser[] };
  actions: {
    addUser: (input: CreateAdminUserInput) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>, sellerOrderMode?: SellerOrderMode) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
  };
}

interface ManageUserFormData {
  name: string;
  status: User['status'];
  sellerOrderMode: SellerOrderMode;
  roles: Role[];
}

// Every dashboard a user can be granted access to. `role` links a dashboard to a
// real Supabase role that persists via user_roles; `available: false` marks a
// dashboard that has no backend role/portal yet (its toggle is shown but locked).
interface DashboardAccess {
  key: string;
  label: string;
  role?: Role;
  available: boolean;
  badge: string;
}

const DASHBOARDS: DashboardAccess[] = [
  { key: 'admin', label: 'Admin Dashboard', role: 'Admin', available: true, badge: 'bg-purple-100 text-purple-800' },
  { key: 'seller', label: 'Seller Dashboard', role: 'Seller', available: true, badge: 'bg-blue-100 text-blue-800' },
  { key: 'supplier', label: 'Supplier Dashboard', role: 'Supplier', available: true, badge: 'bg-amber-100 text-amber-800' },
  { key: 'management', label: 'Management Dashboard', role: 'Management', available: true, badge: 'bg-emerald-100 text-emerald-800' },
];

const rolesOf = (user: AdminUser): Role[] => user.roles || [user.role];

const sameRoles = (a: Role[], b: Role[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export const UsersView = ({ state, actions }: UsersViewProps) => {
  // Modal states
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ status: 'Active', verificationStatus: 'Pending', rating: 5.0 });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [manageFormData, setManageFormData] = useState<ManageUserFormData>({
    name: '',
    status: 'Active',
    sellerOrderMode: 'catalog',
    roles: [],
  });
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => { setFormData({ status: 'Active', verificationStatus: 'Pending', rating: 5.0 }); setPassword(''); setFormError(null); };

  const openManageModal = (user: AdminUser) => {
    setSelectedUser(user);
    setManageFormData({
      name: user.name,
      status: user.status,
      sellerOrderMode: user.sellerOrderMode,
      roles: rolesOf(user),
    });
    setFormError(null);
    setConfirmDelete(false);
    setShowManageModal(true);
  };

  const toggleRole = (role: Role) => {
    setManageFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((existing) => existing !== role)
        : [...prev.roles, role],
    }));
  };

  const grantFullAccess = () => setManageFormData((prev) => ({ ...prev, roles: [...ALL_ROLES] }));

  const saveManagedUser = async (statusOverride?: User['status']) => {
    if (!selectedUser || isSaving) return;
    const name = manageFormData.name.trim();
    if (name.length < 2 || name.length > 50) {
      setFormError('Name must be between 2 and 50 characters.');
      return;
    }
    if (manageFormData.roles.length === 0) {
      setFormError('Grant access to at least one dashboard, or delete the user instead.');
      return;
    }

    const nextStatus = statusOverride ?? manageFormData.status;
    const profileUpdates: Partial<User> = {};
    if (name !== selectedUser.name) profileUpdates.name = name;
    if (nextStatus !== selectedUser.status) profileUpdates.status = nextStatus;
    if (!sameRoles(manageFormData.roles, rolesOf(selectedUser))) profileUpdates.roles = manageFormData.roles;

    const grantsSeller = manageFormData.roles.includes('Seller');
    const modeUpdate = grantsSeller && manageFormData.sellerOrderMode !== selectedUser.sellerOrderMode
      ? manageFormData.sellerOrderMode
      : undefined;

    if (Object.keys(profileUpdates).length === 0 && modeUpdate === undefined) {
      setShowManageModal(false);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await actions.updateUser(selectedUser.id, profileUpdates, modeUpdate);
      setShowManageModal(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update the user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManage = () => saveManagedUser();

  const handleDeleteUser = async () => {
    if (!selectedUser || isDeleting) return;
    setIsDeleting(true);
    setFormError(null);
    try {
      await actions.deleteUser(selectedUser.id);
      setShowManageModal(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete the user.');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleAddUser = async (role: Role) => {
    const name = formData.name?.trim() || '';
    const email = formData.email?.trim().toLowerCase() || '';
    if (name.length < 2 || name.length > 50) { setFormError('Name must be between 2 and 50 characters.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Enter a valid email address.'); return; }
    if (password.length < 8) { setFormError('Temporary password must contain at least 8 characters.'); return; }
    setIsSaving(true); setFormError(null);
    try {
      await actions.addUser({
        displayName: name,
        email,
        password,
        role: role === 'Admin' ? 'admin' : role === 'Supplier' ? 'supplier' : 'seller',
        status: formData.status === 'Inactive' ? 'inactive' : formData.status === 'Suspended' ? 'suspended' : 'active',
      });
      setShowSellerModal(false); setShowSupplierModal(false); setShowAdminModal(false); resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create the user.');
    } finally { setIsSaving(false); }
  };

  const manageRoles = manageFormData.roles;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Every account in one place — open Manage to grant or revoke dashboard access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => { resetForm(); setShowSellerModal(true); }}><Plus className="w-4 h-4 mr-1" /> Add Seller</Button>
          <Button variant="secondary" size="sm" onClick={() => { resetForm(); setShowSupplierModal(true); }}><Plus className="w-4 h-4 mr-1" /> Add Supplier</Button>
          <Button variant="secondary" size="sm" onClick={() => { resetForm(); setShowAdminModal(true); }}><Plus className="w-4 h-4 mr-1" /> Add Admin</Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">All Users</h2>
          <span className="text-xs text-gray-500">{state.users.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access</th>
                <th className="px-6 py-3 relative"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.users.map((user: AdminUser) => {
                const userRoles = rolesOf(user);
                return (
                 <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {DASHBOARDS.filter((dashboard) => dashboard.role && userRoles.includes(dashboard.role)).map((dashboard) => (
                          <span key={dashboard.key} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${dashboard.badge}`}>
                            {dashboard.label.replace(' Dashboard', '')}
                          </span>
                        ))}
                        {userRoles.length === 0 && <span className="text-xs text-gray-400">No access</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" onClick={() => openManageModal(user)}>Manage</Button>
                    </td>
                 </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manage User Modal */}
      <Modal isOpen={showManageModal} onClose={() => setShowManageModal(false)} title="Manage User" maxWidth="sm:max-w-2xl">
        {selectedUser && (
          <>
            <div className="space-y-5 mt-4 max-h-[70vh] overflow-y-auto px-1 py-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Name" value={manageFormData.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setManageFormData({ ...manageFormData, name: event.target.value })} />
                <Input label="Email (managed by Supabase Auth)" type="email" value={selectedUser.email} disabled />
                <Select label="Status" value={manageFormData.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setManageFormData({ ...manageFormData, status: event.target.value as User['status'] })} options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                  { value: 'Suspended', label: 'Suspended' }
                ]} />
              </div>

              {/* Dashboard access */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">Dashboard Access</h4>
                  <Button variant="secondary" size="sm" onClick={grantFullAccess} disabled={sameRoles(manageRoles, ALL_ROLES)}>Full Access</Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Choose which dashboards this user can open. Changes take effect the next time they sign in.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DASHBOARDS.map((dashboard) => {
                    const checked = dashboard.role ? manageRoles.includes(dashboard.role) : false;
                    const disabled = !dashboard.available || !dashboard.role;
                    return (
                      <label
                        key={dashboard.key}
                        className={`flex items-start gap-3 rounded-lg border p-3 ${disabled ? 'cursor-not-allowed border-gray-100 bg-gray-50' : 'cursor-pointer border-gray-200 hover:border-gray-300'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => dashboard.role && toggleRole(dashboard.role)}
                        />
                        <span>
                          <span className={`block text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>{dashboard.label}</span>
                          {!dashboard.available && <span className="block text-xs text-gray-400">Coming soon — not yet available.</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {manageRoles.includes('Seller') && (
                <div className="space-y-2">
                  <Select
                    label="Order Entry Mode"
                    value={manageFormData.sellerOrderMode}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      const mode = event.target.value;
                      if (mode === 'catalog' || mode === 'manual_marketplace') {
                        setManageFormData({ ...manageFormData, sellerOrderMode: mode });
                      }
                    }}
                    options={[
                      { value: 'catalog', label: 'Catalog' },
                      { value: 'manual_marketplace', label: 'Manual Marketplace' },
                    ]}
                  />
                  <p className="text-xs text-gray-500">
                    {manageFormData.sellerOrderMode === 'catalog'
                      ? 'Uses Platform, Category, and SKU selection.'
                      : 'Uses KupujemProdajem or HaloOglasi with manual product and buyer details.'}
                  </p>
                </div>
              )}

              {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-700">Delete permanently?</span>
                  <Button variant="danger" onClick={() => void handleDeleteUser()} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Yes, delete'}</Button>
                  <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>No</Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={isSaving || isDeleting}>Delete User</Button>
              )}
              <div className="flex justify-end gap-3 w-full sm:w-auto">
                <Button variant="secondary" onClick={() => setShowManageModal(false)} disabled={isSaving || isDeleting}>Cancel</Button>
                <Button variant="primary" onClick={() => void handleSaveManage()} disabled={!manageFormData.name.trim() || isSaving || isDeleting}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Add Seller Modal */}
      <Modal isOpen={showSellerModal} onClose={() => setShowSellerModal(false)} title="Add New Seller">
        <div className="space-y-4 mt-4">
          <Input label="Name" value={formData.name || ''} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: event.target.value })} />
          <Input label="Email" type="email" value={formData.email || ''} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: event.target.value })} />
          <Input label="Temporary Password" type="password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} />
          <Input label="Initial Wallet Balance (not available)" type="number" value="0" disabled />
          <Select label="Status" value={formData.status || 'Active'} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: event.target.value as User['status'] })} options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Suspended', label: 'Suspended' }
          ]} />
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowSellerModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleAddUser('Seller')} disabled={!formData.name || !formData.email || !password || isSaving}>{isSaving ? 'Creating...' : 'Add Seller'}</Button>
        </div>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Add New Supplier">
        <div className="space-y-4 mt-4">
          <Input label="Name" value={formData.name || ''} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: event.target.value })} />
          <Input label="Email" type="email" value={formData.email || ''} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: event.target.value })} />
          <Input label="Temporary Password" type="password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} />
          <Input label="Initial Earnings (not available)" type="number" value="0" disabled />
          <Input label="Rating (not available)" type="number" value="" disabled />
          <Select label="Verification Status (not available)" value="Pending" disabled options={[
            { value: 'Verified', label: 'Verified' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Unverified', label: 'Unverified' }
          ]} />
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <Select label="Status" value={formData.status || 'Active'} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: event.target.value as User['status'] })} options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Suspended', label: 'Suspended' }
          ]} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowSupplierModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleAddUser('Supplier')} disabled={!formData.name || !formData.email || !password || isSaving}>{isSaving ? 'Creating...' : 'Add Supplier'}</Button>
        </div>
      </Modal>

      {/* Add Admin Modal */}
      <Modal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} title="Add New Administrator">
        <div className="space-y-4 mt-4">
          <Input label="Name" value={formData.name || ''} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: event.target.value })} />
          <Input label="Email" type="email" value={formData.email || ''} onChange={(event: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: event.target.value })} />
          <Input label="Temporary Password" type="password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} />
          <Input label="Role" value="Administrator" disabled />
          <Select label="Status" value={formData.status || 'Active'} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: event.target.value as User['status'] })} options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Suspended', label: 'Suspended' }
          ]} />
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowAdminModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleAddUser('Admin')} disabled={!formData.name || !formData.email || !password || isSaving}>{isSaving ? 'Creating...' : 'Add Admin'}</Button>
        </div>
      </Modal>
    </div>
  );
};
