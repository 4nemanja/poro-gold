import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { SKU, Platform, PlatformCategory, User } from '../types';
import { Card, Button, Input, Select, Modal } from '../components/ui';
import { formatCurrency } from '../utils/formatters';

export const PricingView = ({ state, actions }: any) => {
  const skus = state?.skus || [];
  const platforms = state?.platforms || [];
  const suppliers = state?.users?.filter((u: User) => (u.roles || [u.role]).includes('Supplier') && u.status === 'Active') || [];

  const [showModal, setShowModal] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [formData, setFormData] = useState<Partial<SKU>>({ status: 'Active' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedPlatform = platforms.find((platform: Platform) => platform.id === formData.platformId);

  const activeSkus = skus.filter((s: SKU) => s.status === 'Active').length;
  const avgCost = skus.length > 0 
    ? skus.reduce((acc: number, sku: SKU) => acc + (sku.supplierCost || 0), 0) / skus.length 
    : 0;

  const openAddModal = () => {
    setEditingSku(null);
    setFormData({ 
      status: 'Active', 
      platformId: '', categoryId: '', supplierId: '',
      category: '', platformName: '', supplierName: '',
      amount: '' as any, 
      supplierCost: '' as any, 
      product: '',
      package: '' 
    });
    setShowModal(true);
  };

  const openEditModal = (sku: SKU) => {
    setEditingSku(sku);
    setFormData(sku);
    setShowModal(true);
  };

  const isValid = 
    formData.platformId && formData.categoryId && formData.supplierId &&
    formData.product && formData.product.trim() !== '' &&
    formData.package && formData.package.trim() !== '' &&
    Number(formData.amount) > 0 &&
    Number(formData.supplierCost) >= 0 &&
    suppliers.length > 0;

  const handleSave = async () => {
    if (!suppliers.length) { setFormError('Add an active Supplier first.'); return; }
    if (!isValid) { setFormError('Choose a platform, category, and supplier and enter valid positive SKU values.'); return; }
    
    const skuData = {
      platformId: formData.platformId,
      categoryId: formData.categoryId,
      supplierId: formData.supplierId,
      platformName: selectedPlatform?.name || formData.platformName || '',
      category: selectedPlatform?.categories.find((category: PlatformCategory) => category.id === formData.categoryId)?.categoryName || '',
      product: formData.product,
      package: formData.package,
      amount: Number(formData.amount),
      supplierCost: Number(formData.supplierCost),
      supplierName: suppliers.find((supplier: User) => supplier.id === formData.supplierId)?.name || '',
      status: formData.status as any
    };

    setIsSaving(true); setFormError(null);
    try {
      if (editingSku) await actions.updateSku(editingSku.id, skuData);
      else await actions.addSku(skuData);
      setShowModal(false);
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to save the SKU.'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing & SKUs</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform products, packages, and supplier costs.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Active SKUs</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{activeSkus}</dd>
        </Card>
        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Average Supplier Cost</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            {formatCurrency(avgCost)}
          </dd>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Package Catalog</h3>
          <Button size="sm" onClick={openAddModal}><Plus className="w-4 h-4 mr-1" /> Add SKU</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Platform', 'Category', 'Product', 'Package', 'Amount', 'Supplier', 'Supplier Cost', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {skus.map((sku: SKU) => (
                <tr key={sku.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sku.platformName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sku.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sku.product}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sku.package}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sku.amount?.toLocaleString() || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sku.supplierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sku.supplierCost || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${sku.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {sku.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(sku)}>Edit</Button>
                  </td>
                </tr>
              ))}
              {skus.length === 0 && (
                 <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No SKUs configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSku ? "Edit SKU" : "Add New SKU"}>
        <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto px-1 py-1">
          <Select 
            label="Platform" 
            value={formData.platformId || ''} 
            onChange={(e: any) => setFormData({...formData, platformId: e.target.value, categoryId: '', platformName: platforms.find((p: Platform) => p.id === e.target.value)?.name || '', category: ''})} 
            options={[{ value: '', label: 'Select platform' }, ...platforms.map((p: Platform) => ({ value: p.id, label: p.name }))]} 
          />
          <Select 
            label="Category" 
            value={formData.categoryId || ''} 
            disabled={!formData.platformId}
            onChange={(e: any) => setFormData({...formData, categoryId: e.target.value, category: selectedPlatform?.categories.find((category: PlatformCategory) => category.id === e.target.value)?.categoryName || ''})} 
            options={[{ value: '', label: selectedPlatform?.categories.length ? 'Select category' : 'No categories available' }, ...(selectedPlatform?.categories || []).map((category: PlatformCategory) => ({ value: category.id, label: category.categoryName }))]} 
          />
          <Input 
            label="Product Name" 
            value={formData.product || ''} 
            onChange={(e: any) => setFormData({...formData, product: e.target.value})} 
            placeholder="e.g. Fortnite V-Bucks" 
          />
          <Input 
            label="Package Label" 
            value={formData.package || ''} 
            onChange={(e: any) => setFormData({...formData, package: e.target.value})} 
            placeholder="e.g. 1,000 V-Bucks" 
          />
          <Input 
            label="Amount (Units/Value)" 
            type="number" 
            value={formData.amount || ''} 
            onChange={(e: any) => setFormData({...formData, amount: e.target.value})} 
            placeholder="1000"
          />
          <Select 
            label="Default Supplier" 
            value={formData.supplierId || ''} 
            onChange={(e: any) => setFormData({...formData, supplierId: e.target.value, supplierName: suppliers.find((u: User) => u.id === e.target.value)?.name || ''})} 
            options={[{ value: '', label: suppliers.length ? 'Select supplier' : 'Add an active Supplier first.' }, ...suppliers.map((u: User) => ({ value: u.id, label: u.name }))]} 
          />
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <Input 
            label="Supplier Cost ($)" 
            type="number" 
            step="0.01" 
            value={formData.supplierCost || ''} 
            onChange={(e: any) => setFormData({...formData, supplierCost: e.target.value})} 
          />
          <Select 
            label="Status" 
            value={formData.status || 'Active'} 
            onChange={(e: any) => setFormData({...formData, status: e.target.value})} 
            options={[
              { value: 'Active', label: 'Active' }, 
              { value: 'Inactive', label: 'Inactive' }
            ]} 
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={!isValid || isSaving}>
            {isSaving ? 'Saving...' : editingSku ? "Save Changes" : "Create SKU"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
