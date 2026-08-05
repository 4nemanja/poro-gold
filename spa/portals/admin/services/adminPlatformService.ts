import { supabase } from '../../../shared/supabase/client';
import type { Platform, PlatformCategory } from '../../../types';

interface PlatformCategoryRow {
  id: string;
  platform_id: string;
  category_name: string;
  selling_fee_percent: number | string;
}

interface PlatformRow {
  id: string;
  name: string;
  status: Platform['status'];
  withdrawal_fee_percent: number | string;
  withdrawal_fixed_fee: number | string;
}

const mapCategory = (row: PlatformCategoryRow): PlatformCategory => ({
  id: row.id,
  platformId: row.platform_id,
  categoryName: row.category_name,
  sellingFeePercent: Number(row.selling_fee_percent),
});

const mapPlatform = (row: PlatformRow, categories: PlatformCategoryRow[]): Platform => ({
  id: row.id,
  name: row.name,
  status: row.status,
  withdrawalFeePercent: Number(row.withdrawal_fee_percent),
  withdrawalFixedFee: Number(row.withdrawal_fixed_fee),
  categories: categories.filter((item) => item.platform_id === row.id).map(mapCategory),
});

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const adminPlatformService = {
  async list(): Promise<Platform[]> {
    const [platformResult, categoryResult] = await Promise.all([
      supabase.from('platforms').select('*').order('name'),
      supabase.from('platform_categories').select('*').order('category_name'),
    ]);
    throwIfError(platformResult.error);
    throwIfError(categoryResult.error);
    return (platformResult.data || []).map((row) => mapPlatform(row, categoryResult.data || []));
  },

  async create(platform: Omit<Platform, 'id'>): Promise<void> {
    const { error } = await supabase.from('platforms').insert({
      name: platform.name,
      status: platform.status,
      withdrawal_fee_percent: platform.withdrawalFeePercent,
      withdrawal_fixed_fee: platform.withdrawalFixedFee,
    });
    throwIfError(error);
  },

  async update(id: string, platform: Partial<Platform>): Promise<void> {
    const { error } = await supabase.from('platforms').update({
      ...(platform.name !== undefined && { name: platform.name }),
      ...(platform.status !== undefined && { status: platform.status }),
      ...(platform.withdrawalFeePercent !== undefined && { withdrawal_fee_percent: platform.withdrawalFeePercent }),
      ...(platform.withdrawalFixedFee !== undefined && { withdrawal_fixed_fee: platform.withdrawalFixedFee }),
    }).eq('id', id);
    throwIfError(error);

    if (!platform.categories) return;
    const existing = await supabase.from('platform_categories').select('id').eq('platform_id', id);
    throwIfError(existing.error);
    const retainedIds = platform.categories.map((category) => category.id).filter((categoryId) => /^[0-9a-f-]{36}$/i.test(categoryId));
    const removedIds = (existing.data || []).map((row) => row.id).filter((categoryId) => !retainedIds.includes(categoryId));
    if (removedIds.length) {
      const deleted = await supabase.from('platform_categories').delete().in('id', removedIds);
      throwIfError(deleted.error);
    }
    for (const category of platform.categories) {
      const payload = { platform_id: id, category_name: category.categoryName, selling_fee_percent: category.sellingFeePercent };
      const result = /^[0-9a-f-]{36}$/i.test(category.id)
        ? await supabase.from('platform_categories').update(payload).eq('id', category.id)
        : await supabase.from('platform_categories').insert(payload);
      throwIfError(result.error);
    }
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('platforms').delete().eq('id', id);
    throwIfError(error);
  },
};
