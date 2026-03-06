export type StoreCategory = 'frame' | 'stamp' | 'sidebar_theme' | 'physical';

export interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: StoreCategory;
  reward_type: string;
  reward_data: string | null;
  is_physical: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  already_purchased?: boolean;
  /** Nome do ícone (ex.: Lucide) para exibir na loja */
  icon?: string | null;
  /** Cor de destaque (chave: amber, blue, violet... ou hex) */
  icon_color?: string | null;
}

export interface StorePurchaseResponse {
  message: string;
  purchase: {
    id: string;
    student_id: string;
    store_item_id: string;
    price_paid: number;
    created_at: string;
  };
  new_balance: number;
  reward_type: string;
  reward_data: string | null;
}

export interface StudentPurchase {
  id: string;
  student_id: string;
  store_item_id: string;
  price_paid: number;
  created_at: string;
  item_name: string | null;
  reward_type: string | null;
  reward_data: string | null;
}

export interface StoreItemsResponse {
  items: StoreItem[];
}

export interface MyPurchasesResponse {
  purchases: StudentPurchase[];
  limit: number;
  offset: number;
}

// --- Admin / gestão da loja ---

export type StoreScopeType = 'system' | 'city' | 'school' | 'class';

export interface StoreScopeFilter {
  city_ids?: string[];
  school_ids?: string[];
  class_ids?: string[];
}

export interface StoreItemAdmin {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  reward_type: string;
  reward_data: string | null;
  is_physical: boolean;
  scope_type: string;
  scope_filter: StoreScopeFilter | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  icon?: string | null;
  icon_color?: string | null;
}

export interface StoreItemCreatePayload {
  name: string;
  description?: string | null;
  price: number;
  category: string;
  reward_type?: string;
  reward_data?: string | null;
  is_physical?: boolean;
  scope_type: StoreScopeType;
  scope_filter?: StoreScopeFilter | null;
  is_active?: boolean;
  sort_order?: number;
  icon?: string | null;
  icon_color?: string | null;
}

export interface StoreAdminItemsResponse {
  items: StoreItemAdmin[];
}

export interface StoreAllowedScopesResponse {
  allowed_scopes: string[];
}
