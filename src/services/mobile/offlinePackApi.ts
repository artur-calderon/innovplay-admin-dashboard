import { api } from '@/lib/api';

export type OfflinePackScopePayload =
  | { type: 'municipality' }
  | {
      type: 'custom';
      school_ids: string[];
      test_ids: string[];
      class_ids: string[];
      student_ids: string[];
    };

export interface RegisterOfflinePackRequest {
  scope: OfflinePackScopePayload;
  ttl_hours: number;
  max_redemptions: number;
}

export interface RegisterOfflinePackResponse {
  code: string;
  offline_pack_id: string;
  expires_at: string;
  max_redemptions: number;
  scope: { type: string };
}

/**
 * Registra pacote offline. O header `X-City-ID` só deve ser enviado para **admin**
 * operando em um município escolhido (igual às demais rotas tenant); demais perfis
 * usam o tenant do token e não precisam desse header neste endpoint.
 */
export async function registerOfflinePack(
  body: RegisterOfflinePackRequest,
  /** Obrigatório só quando `user.role === 'admin'`: UUID do município (tenant) ativo. */
  cityIdForAdmin?: string
): Promise<RegisterOfflinePackResponse> {
  const config = cityIdForAdmin ? { meta: { cityId: cityIdForAdmin } } : {};
  const { data } = await api.post<RegisterOfflinePackResponse>(
    '/mobile/v1/offline-pack/register',
    body,
    config
  );
  return data;
}
