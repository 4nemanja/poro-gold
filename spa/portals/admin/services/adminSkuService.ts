import { supabase } from '../../../shared/supabase/client';
import type { SKU } from '../../../types';

interface SkuRow {
  id: string;
  platform_id?: string;
  category_id?: string;
  supplier_id?: string;
  platforms?: { name?: string } | null;
  platform_categories?: { category_name?: string } | null;
  product_name: string;
  package_label: string;
  amount: number | string | null;
  supplier_cost: number | string;
  profiles?: { display_name?: string } | null;
  status: SKU['status'];
}

const mapSku = (row: SkuRow): SKU => ({
  id: row.id,
  platformId: row.platform_id,
  categoryId: row.category_id,
  supplierId: row.supplier_id,
  platformName: row.platforms?.name || '',
  category: row.platform_categories?.category_name || '',
  product: row.product_name,
  package: row.package_label,
  amount: Number(row.amount || 0),
  supplierCost: Number(row.supplier_cost),
  supplierName: row.profiles?.display_name || '',
  status: row.status,
});

const select = '*, platforms(name), platform_categories(category_name), profiles!skus_supplier_id_fkey(display_name)';

export const adminSkuService = {
  async list(): Promise<SKU[]> {
    const { data, error } = await supabase.from('skus').select(select).order('product_name');
    if (error) throw new Error(error.message);
    return (data || []).map(mapSku);
  },
  async create(sku: Omit<SKU, 'id'>): Promise<void> {
    const { error } = await supabase.from('skus').insert({ platform_id: sku.platformId, category_id: sku.categoryId,
      supplier_id: sku.supplierId, product_name: sku.product, package_label: sku.package, amount: sku.amount,
      supplier_cost: sku.supplierCost, status: sku.status });
    if (error) throw new Error(error.message);
  },
  async update(id: string, sku: Partial<SKU>): Promise<void> {
    const { error } = await supabase.from('skus').update({ platform_id: sku.platformId, category_id: sku.categoryId,
      supplier_id: sku.supplierId, product_name: sku.product, package_label: sku.package, amount: sku.amount,
      supplier_cost: sku.supplierCost, status: sku.status }).eq('id', id);
    if (error) throw new Error(error.message);
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('skus').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
