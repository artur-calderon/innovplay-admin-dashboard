import { BASE_URL } from '@/lib/api';

/**
 * Cache de blob URLs para evitar recarregar a mesma imagem múltiplas vezes
 */
const blobCache = new Map<string, string>();

/**
 * Obtém o token JWT do localStorage
 */
export function getAccessToken(): string {
  return localStorage.getItem('token') || '';
}

/**
 * Obtém o ID da cidade do localStorage (para contexto)
 */
export function getCityId(): string | undefined {
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson) as { tenant_id?: string };
      return user.tenant_id;
    }
  } catch {
    // Ignora erro de parse
  }
  return undefined;
}

/**
 * Carrega imagem via fetch com blob (seguro, token no header)
 * Para certificados: converte paths relativos da API em blob URLs
 * @param imageUrl - URL da imagem (relativa da API, externa, ou data URL)
 * @param token - Token JWT do usuário
 * @param cityId - ID da cidade para contexto (opcional)
 * @returns URL blob ou URL original (para externos/base64)
 */
export async function loadCertificateImage(
  imageUrl: string | undefined,
  token: string,
  cityId?: string
): Promise<string | undefined> {
  if (!imageUrl) return undefined;

  // Se for URL externa (https://, http://), retornar como está
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Se for data URL (base64), retornar como está
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // Se for path relativo da API (/certificates/template/...), fazer fetch com blob
  if (imageUrl.startsWith('/certificates/')) {
    // Verificar cache primeiro
    const cacheKey = `${imageUrl}_${token}`;
    if (blobCache.has(cacheKey)) {
      return blobCache.get(cacheKey);
    }

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      if (cityId) {
        headers['X-City-ID'] = cityId;
      }

      const response = await fetch(`${BASE_URL}${imageUrl}`, { headers });

      if (!response.ok) {
        console.error(`Erro ao carregar imagem: ${response.status}`);
        return undefined;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Armazenar no cache
      blobCache.set(cacheKey, blobUrl);
      
      return blobUrl;
    } catch (error) {
      console.error('Erro ao carregar imagem do certificado:', error);
      return undefined;
    }
  }

  // Fallback: retornar como está
  return imageUrl;
}

/**
 * Limpa blob URLs do cache para liberar memória
 * Deve ser chamado quando o componente for desmontado
 */
export function revokeCertificateImageBlobs(): void {
  for (const blobUrl of blobCache.values()) {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  }
  blobCache.clear();
}

/**
 * Limpa um blob URL específico do cache
 * @param imageUrl - URL original da imagem
 * @param token - Token usado para criar o blob
 */
export function revokeCertificateImageBlob(imageUrl: string, token: string): void {
  const cacheKey = `${imageUrl}_${token}`;
  const blobUrl = blobCache.get(cacheKey);
  
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
    blobCache.delete(cacheKey);
  }
}
