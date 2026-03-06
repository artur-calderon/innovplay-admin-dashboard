import { api } from '@/lib/api';
import type {
  StoreItem,
  StoreItemsResponse,
  StorePurchaseResponse,
  StudentPurchase,
  MyPurchasesResponse,
} from '@/types/store';

/** Garante que icon e icon_color venham da resposta (API pode enviar snake_case ou omitir). */
function normalizeStoreItem(raw: Record<string, unknown>): StoreItem {
  const item = raw as StoreItem;
  return {
    ...item,
    icon: (item.icon ?? (raw as { icon?: string }).icon ?? null)?.trim() || null,
    icon_color: (item.icon_color ?? (raw as { icon_color?: string }).icon_color ?? null)?.trim() || null,
  };
}

export const storeApi = {
  getItems(params?: {
    category?: string;
    physical_only?: boolean;
    student_id?: string;
  }) {
    const query: Record<string, string> = {};
    if (params?.category) query.category = params.category;
    if (params?.physical_only !== undefined)
      query.physical_only = String(params.physical_only);
    if (params?.student_id) query.student_id = params.student_id;
    return api.get<StoreItemsResponse>('/store/items', { params: query }).then((res) => ({
      ...res,
      data: {
        ...res.data,
        items: (res.data?.items ?? []).map((i) => normalizeStoreItem(i as Record<string, unknown>)),
      },
    }));
  },

  purchase(storeItemId: string) {
    return api.post<StorePurchaseResponse>('/store/purchase', {
      store_item_id: storeItemId,
    });
  },

  getMyPurchases(params?: { limit?: number; offset?: number }) {
    return api.get<MyPurchasesResponse>('/store/my-purchases', {
      params: params ?? {},
    });
  },
};

export type { StoreItem, StorePurchaseResponse, StudentPurchase };
