import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Platform, PlatformCategory } from '../types';
import { Card, Button, Input, Select, Modal } from '../components/ui';

export const PlatformsView = ({ state, actions }: any) => {
  const { platforms } = state;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [formData, setFormData] = useState<Partial<Platform>>({ status: 'Active' });

  // Categories management inside manage modal
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<Partial<PlatformCategory>>({});
  const [platformToDelete, setPlatformToDelete] = useState<Platform | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalPlatforms = platforms.length;
  const activePlatforms = platforms.filter((p: Platform) => p.status === 'Active').length;
  const allCats = platforms.flatMap((p: Platform) => p.categories);
  const avgSelling = allCats.length > 0 ? allCats.reduce((sum: number, c: PlatformCategory) => sum + c.sellingFeePercent, 0) / allCats.length : 0;
  const avgWithdrawal = platforms.length > 0 ? platforms.reduce((sum: number, p: Platform) => sum + p.withdrawalFeePercent, 0) / platforms.length : 0;

  const resetPlatformForm = () => setFormData({ status: 'Active', withdrawalFeePercent: 0, withdrawalFixedFee: 0 });
  const resetCatForm = () => { setCatForm({ sellingFeePercent: 0 }); setEditingCatId(null); setShowCatForm(false); };

  const validatePlatform = () => {
    const percent = Number(formData.withdrawalFeePercent);
    const fixed = Number(formData.withdrawalFixedFee);
    if (!formData.name?.trim()) return 'Platform name is required.';
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return 'Withdrawal fee percentage must be between 0 and 100.';
    if (!Number.isFinite(fixed) || fixed < 0) return 'Fixed withdrawal fee cannot be negative.';
    return null;
  };

  const handleAddPlatform = async () => {
    const validation = validatePlatform(); if (validation) { setFormError(validation); return; }
    const newPlatform: Platform = {
      id: `plat-${Date.now()}`,
      name: formData.name?.trim() || '',
      status: formData.status as any || 'Active',
      withdrawalFeePercent: Number(formData.withdrawalFeePercent) || 0,
      withdrawalFixedFee: Number(formData.withdrawalFixedFee) || 0,
      categories: []
    };
    setIsSaving(true); setFormError(null);
    try { await actions.addPlatform(newPlatform); setShowAddModal(false); resetPlatformForm(); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to create the platform.'); }
    finally { setIsSaving(false); }
  };

  const openManageModal = (p: Platform) => {
    setSelectedPlatform(p);
    setFormData({
      name: p.name,
      status: p.status,
      withdrawalFeePercent: p.withdrawalFeePercent,
      withdrawalFixedFee: p.withdrawalFixedFee
    });
    resetCatForm();
    setShowManageModal(true);
  };

  const handleSavePlatform = async () => {
    if (!selectedPlatform) return;
    const validation = validatePlatform(); if (validation) { setFormError(validation); return; }
    const updatedPlatform = { ...selectedPlatform, ...formData } as Platform;
    setIsSaving(true); setFormError(null);
    try { await actions.updatePlatform(selectedPlatform.id, updatedPlatform); actions.addAuditLog('Platform Updated', `Updated platform settings for ${updatedPlatform.name}`); setShowManageModal(false); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to update the platform.'); }
    finally { setIsSaving(false); }
  };

  const handleToggleStatus = async (p: Platform) => {
    const newStatus = p.status === 'Active' ? 'Inactive' : 'Active';
    try { await actions.updatePlatform(p.id, { ...p, status: newStatus }); actions.addAuditLog(`Platform ${newStatus === 'Active' ? 'Activated' : 'Disabled'}`, `Changed status of ${p.name} to ${newStatus}`); }
    catch { /* Global Admin error banner displays the failure. */ }
  };

  const handleSaveCategory = async () => {
    if (!selectedPlatform) return;
    const fee = Number(catForm.sellingFeePercent);
    if (!catForm.categoryName?.trim()) { setFormError('Category name is required.'); return; }
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) { setFormError('Selling fee percentage must be between 0 and 100.'); return; }
    let newCats = [...selectedPlatform.categories];

    if (editingCatId) {
      newCats = newCats.map(c => c.id === editingCatId ? { ...c, categoryName: catForm.categoryName!, sellingFeePercent: Number(catForm.sellingFeePercent) } : c);
      actions.addAuditLog('Category Updated', `Updated category ${catForm.categoryName} in ${selectedPlatform.name}`);
    } else {
      const newCat = {
        id: `cat-${Date.now()}`,
        categoryName: catForm.categoryName!,
        sellingFeePercent: Number(catForm.sellingFeePercent)
      };
      newCats.push(newCat);
      actions.addAuditLog('Category Added', `Added category ${catForm.categoryName} to ${selectedPlatform.name}`);
    }

    const updatedPlatform = { ...selectedPlatform, categories: newCats };
    setIsSaving(true); setFormError(null);
    try { await actions.updatePlatform(selectedPlatform.id, updatedPlatform); setSelectedPlatform(updatedPlatform); resetCatForm(); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to save the category.'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteCategory = async (cat: PlatformCategory) => {
    if (!selectedPlatform) return;
    const newCats = selectedPlatform.categories.filter(c => c.id !== cat.id);
    const updatedPlatform = { ...selectedPlatform, categories: newCats };
    try { await actions.updatePlatform(selectedPlatform.id, updatedPlatform); setSelectedPlatform(updatedPlatform); actions.addAuditLog('Category Deleted', `Removed category ${cat.categoryName} from ${selectedPlatform.name}`); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to delete the category.'); }
  };

  const handleConfirmDelete = async () => {
    if (!platformToDelete || !actions) return;
    setIsSaving(true); setFormError(null);
    try { await actions.deletePlatform(platformToDelete.id); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to delete the platform.'); setIsSaving(false); return; }
    if (selectedPlatform?.id === platformToDelete.id) {
      setShowManageModal(false);
      setSelectedPlatform(null);
    }
    setPlatformToDelete(null);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platforms</h1>
          <p className="text-sm text-gray-500 mt-1">Manage marketplace fees and selling configurations.</p>
        </div>
        <Button variant="primary" onClick={() => { resetPlatformForm(); setShowAddModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Platform
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Total Platforms</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{totalPlatforms}</dd>
        </Card>
        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Active Platforms</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{activePlatforms}</dd>
        </Card>
        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Average Selling Fee</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{avgSelling.toFixed(1)}%</dd>
        </Card>
        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Average Withdrawal Fee</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{avgWithdrawal.toFixed(1)}%</dd>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Platform Name', 'Withdrawal Fee %', 'Fixed Withdrawal Fee', 'Selling Categories', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {platforms.map((p: Platform) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.withdrawalFeePercent}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.withdrawalFixedFee}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.categories.length} Categories</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${p.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => openManageModal(p)}>Manage</Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleToggleStatus(p)}>{p.status === 'Active' ? 'Disable' : 'Enable'}</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setPlatformToDelete(p)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {platforms.length === 0 && (
                 <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No platforms configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Platform Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create Platform">
        <div className="space-y-4 mt-4">
          <Input label="Platform Name" value={formData.name || ''} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
          <Input label="Withdrawal Fee (%)" type="number" step="0.1" value={formData.withdrawalFeePercent ?? ''} onChange={(e: any) => setFormData({...formData, withdrawalFeePercent: e.target.value})} />
          <Input label="Fixed Withdrawal Fee ($)" type="number" step="0.01" value={formData.withdrawalFixedFee ?? ''} onChange={(e: any) => setFormData({...formData, withdrawalFixedFee: e.target.value})} />
          <Select label="Status" value={formData.status || 'Active'} onChange={(e: any) => setFormData({...formData, status: e.target.value})} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleAddPlatform()} disabled={!formData.name || isSaving}>{isSaving ? 'Creating...' : 'Create Platform'}</Button>
        </div>
      </Modal>

      {/* Manage Platform Modal */}
      <Modal isOpen={showManageModal} onClose={() => setShowManageModal(false)} title={`Manage ${selectedPlatform?.name}`} maxWidth="sm:max-w-2xl">
        {selectedPlatform && (
          <div className="mt-4 flex flex-col gap-6 max-h-[75vh] overflow-y-auto px-1">
            
            {/* Platform Base Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Platform Name" value={formData.name || ''} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
              <Select label="Status" value={formData.status || 'Active'} onChange={(e: any) => setFormData({...formData, status: e.target.value})} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
              <Input label="Withdrawal Fee (%)" type="number" step="0.1" value={formData.withdrawalFeePercent ?? ''} onChange={(e: any) => setFormData({...formData, withdrawalFeePercent: e.target.value})} />
              <Input label="Fixed Withdrawal Fee ($)" type="number" step="0.01" value={formData.withdrawalFixedFee ?? ''} onChange={(e: any) => setFormData({...formData, withdrawalFixedFee: e.target.value})} />
            </div>

            <hr className="border-gray-200" />

            {/* Categories Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Selling Fee Categories</h4>
                {!showCatForm && (
                  <Button variant="secondary" size="sm" onClick={() => setShowCatForm(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Category
                  </Button>
                )}
              </div>

              {showCatForm && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
                   <div className="flex-1">
                     <Input label="Category Name" value={catForm.categoryName || ''} onChange={(e: any) => setCatForm({...catForm, categoryName: e.target.value})} placeholder="e.g. Fortnite V-Bucks" />
                   </div>
                   <div className="sm:w-32">
                     <Input label="Fee (%)" type="number" step="0.1" value={catForm.sellingFeePercent ?? ''} onChange={(e: any) => setCatForm({...catForm, sellingFeePercent: e.target.value})} />
                   </div>
                   <div className="flex gap-2">
                     <Button variant="primary" onClick={() => void handleSaveCategory()} disabled={!catForm.categoryName || isSaving}>Save</Button>
                     <Button variant="ghost" onClick={resetCatForm}>Cancel</Button>
                   </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Selling Fee %</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPlatform.categories.map(cat => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{cat.categoryName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{cat.sellingFeePercent}%</td>
                        <td className="px-4 py-3 text-right text-sm font-medium space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setCatForm({ categoryName: cat.categoryName, sellingFeePercent: cat.sellingFeePercent });
                            setEditingCatId(cat.id);
                            setShowCatForm(true);
                          }}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => void handleDeleteCategory(cat)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {selectedPlatform.categories.length === 0 && !showCatForm && (
                       <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500 text-sm">No selling categories defined.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}

            <div className="mt-4 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setShowManageModal(false)}>Close</Button>
              <Button variant="primary" onClick={() => void handleSavePlatform()} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Platform Changes'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!platformToDelete} onClose={() => setPlatformToDelete(null)} title="Delete Platform">
        <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete this platform?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPlatformToDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => void handleConfirmDelete()} disabled={isSaving}>{isSaving ? 'Deleting...' : 'Confirm'}</Button>
        </div>
      </Modal>

    </div>
  );
};
