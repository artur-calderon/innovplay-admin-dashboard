# Integração com Rotas Proxy de Imagens do Backend (Fetch + Blob)

## Resumo das Alterações

Este documento descreve a integração do frontend com as novas rotas proxy de imagens implementadas no backend para certificados, utilizando **fetch + blob URLs** para máxima segurança.

## Mudanças no Backend

### Rotas Proxy Autenticadas

Duas novas rotas foram criadas para servir imagens de forma segura:

- `GET /certificates/template/<evaluation_id>/logo`
- `GET /certificates/template/<evaluation_id>/signature`

**Características:**
- Respondem com binário da imagem do MinIO privado
- Content-Type adequado e Cache-Control ~1h (max_age=3600)
- Requerem autenticação JWT via `Authorization: Bearer <token>` header
- Requerem contexto de cidade (X-City-ID/X-City-Slug)

### Autenticação JWT via Header

As rotas aceitam JWT exclusivamente via header:
- Header: `Authorization: Bearer <token>` ✅

**Por quê fetch + blob?** 
- Token fica no header (seguro, não vaza em logs/referer)
- Funciona com middleware de autenticação existente
- Melhor prática de segurança

### Retorno do Template

Quando `logo_url` ou `signature_url` apontam para o bucket `certificate-templates`, a API agora retorna **path relativo**:
```json
{
  "logo_url": "/certificates/template/123/logo",
  "signature_url": "/certificates/template/123/signature"
}
```

URLs externas continuam sendo retornadas normalmente.

## Mudanças no Frontend

### 1. Arquivo Utilitário com Fetch + Blob

**Arquivo:** `src/utils/certificateImageUtils.ts`

**Abordagem:** Fetch + Blob URLs (mais seguro que token na URL)

**Funções principais:**

#### `loadCertificateImage(imageUrl, token, cityId?)`
Carrega imagem via fetch com blob URL (token no header).

**Fluxo:**
1. Verifica se é URL externa ou data URL → retorna direto
2. Se for path relativo (`/certificates/...`):
   - Verifica cache de blobs
   - Faz fetch com `Authorization: Bearer <token>` header
   - Converte response em blob
   - Cria `URL.createObjectURL(blob)`
   - Armazena no cache
   - Retorna blob URL

**Vantagens:**
- ✅ Token no header (seguro, não vaza)
- ✅ Funciona com middleware de autenticação existente
- ✅ Cache automático para evitar múltiplas requisições
- ✅ Gerenciamento de memória (revoke blobs)

**Código de exemplo:**
```typescript
const logoUrl = await loadCertificateImage(
  "/certificates/template/123/logo",
  "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "city-id-123"
);
// Resultado: "blob:http://localhost:3000/abc-123-def"
```

#### `getAccessToken()`
Helper para obter token JWT do localStorage.

#### `getCityId()`
Helper para obter ID da cidade do localStorage (para contexto).

#### `revokeCertificateImageBlob(imageUrl, token)`
Revoga blob URL específico e remove do cache.

#### `revokeCertificateImageBlobs()`
Limpa todos os blobs do cache (libera memória).

### 2. Componente CertificateTemplate

**Arquivo:** `src/components/certificates/CertificateTemplate.tsx`

**Alterações:**
1. Usa `useState` para armazenar blob URLs do logo e assinatura
2. Usa `useEffect` para carregar imagens via fetch quando o template mudar
3. Implementa cleanup para revogar blobs ao desmontar

**Código:**
```typescript
const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
const [signatureUrl, setSignatureUrl] = useState<string | undefined>(undefined);

useEffect(() => {
  const accessToken = getAccessToken();
  const cityId = getCityId();
  
  const loadImages = async () => {
    const [loadedLogo, loadedSignature] = await Promise.all([
      loadCertificateImage(template.logo_url, accessToken, cityId),
      loadCertificateImage(template.signature_url, accessToken, cityId)
    ]);
    
    setLogoUrl(loadedLogo);
    setSignatureUrl(loadedSignature);
  };

  loadImages();

  // Cleanup: revogar blobs ao desmontar
  return () => {
    if (template.logo_url) {
      revokeCertificateImageBlob(template.logo_url, accessToken);
    }
    if (template.signature_url) {
      revokeCertificateImageBlob(template.signature_url, accessToken);
    }
  };
}, [template.logo_url, template.signature_url]);

// Uso:
backgroundImage: logoUrl ? `url(${logoUrl})` : 'none'
<img src={signatureUrl} alt="Assinatura" />
```

### 3. Componente CertificateCustomizer

**Arquivo:** `src/components/certificates/CertificateCustomizer.tsx`

**Alterações:**
1. Usa `useState` para armazenar blob URLs de preview
2. Usa `useEffect` para carregar preview das imagens
3. Implementa cleanup para revogar blobs ao mudar template

**Código:**
```typescript
const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | undefined>(undefined);
const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | undefined>(undefined);

useEffect(() => {
  const accessToken = getAccessToken();
  const cityId = getCityId();

  const loadPreviews = async () => {
    const [loadedLogo, loadedSignature] = await Promise.all([
      loadCertificateImage(template.logo_url, accessToken, cityId),
      loadCertificateImage(template.signature_url, accessToken, cityId)
    ]);

    setLogoPreviewUrl(loadedLogo);
    setSignaturePreviewUrl(loadedSignature);
  };

  loadPreviews();

  // Cleanup
  return () => {
    if (template.logo_url) {
      revokeCertificateImageBlob(template.logo_url, accessToken);
    }
    if (template.signature_url) {
      revokeCertificateImageBlob(template.signature_url, accessToken);
    }
  };
}, [template.logo_url, template.signature_url]);

// Uso no preview:
<img src={logoPreviewUrl} alt="Logo" />
```

### 4. Outros Componentes

**Componentes que herdam automaticamente:**
- `CertificatePDF.tsx` - usa `CertificateTemplateComponent`
- `CertificateViewer.tsx` - usa `CertificatePDF`
- `Certificates.tsx` (página) - usa `CertificateTemplateComponent`

Todos esses componentes já recebem as URLs autenticadas automaticamente.

## Contexto de Cidade

O interceptor do axios (`src/lib/api.ts`) já está configurado para enviar headers de cidade automaticamente:
- `X-City-ID`: ID da cidade (do user.tenant_id ou meta.cityId)
- Regras existentes para admin, tecadm, diretor, coordenador

**Não é necessário modificar** para as rotas de certificados.

## Fluxo Completo com Fetch + Blob

### 1. Backend retorna path relativo
```json
{
  "logo_url": "/certificates/template/abc123/logo",
  "signature_url": "/certificates/template/abc123/signature"
}
```

### 2. Frontend faz fetch com token no header
```typescript
const response = await fetch(
  "https://api.example.com/certificates/template/abc123/logo",
  {
    headers: {
      'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGc...',
      'X-City-ID': 'city-123'
    }
  }
);
```

### 3. Frontend converte em blob URL
```typescript
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
// blobUrl: "blob:http://localhost:3000/abc-123-def"
```

### 4. Frontend usa blob URL na tag <img>
```html
<img src="blob:http://localhost:3000/abc-123-def" />
```

### 5. Cleanup ao desmontar
```typescript
useEffect(() => {
  // ... carregar imagens ...
  
  return () => {
    URL.revokeObjectURL(blobUrl); // Libera memória
  };
}, []);
```

## Gerenciamento de Cache e Memória

### Cache de Blobs
Para evitar recarregar a mesma imagem múltiplas vezes:
- Cache interno em Map `<cacheKey, blobUrl>`
- Cache key: `${imageUrl}_${token}`
- Reutiliza blob URL se já estiver no cache

### Cleanup de Memória
Blobs consomem memória, então é importante revogar:
- `URL.revokeObjectURL(blobUrl)` quando não precisar mais
- Implementado no `useEffect` cleanup de cada componente
- Função `revokeCertificateImageBlobs()` para limpar tudo de uma vez

### Lifecycle
```
1. Componente monta
   → useEffect chama loadCertificateImage()
   → Verifica cache, se não tiver faz fetch
   → Cria blob URL, armazena no cache
   → setState com blob URL

2. Componente atualiza (template.logo_url muda)
   → useEffect cleanup revoga blob antigo
   → Repete passo 1 com nova URL

3. Componente desmonta
   → useEffect cleanup revoga todos os blobs
```

## Considerações de Segurança

### ✅ Token no Header (Implementação Atual)

**Vantagens:**
- ✅ Token NÃO vaza em logs do servidor
- ✅ Token NÃO vaza em referer
- ✅ Token NÃO vaza no histórico do navegador
- ✅ Funciona com middleware de autenticação existente
- ✅ Melhor prática de segurança

**Desvantagens:**
- Código extra no frontend (useEffect + useState)
- Gerenciamento de memória (revoke blobs)
- Pequeno delay inicial no carregamento (fetch assíncrono)

## Compatibilidade

A implementação mantém compatibilidade com:
- ✅ URLs externas (https://example.com/logo.png)
- ✅ Data URLs (data:image/png;base64,...)
- ✅ Paths relativos novos (/certificates/template/...)
- ✅ Upload de novas imagens (base64 via FileReader)

## Testes Recomendados

1. **Template com logo do MinIO**
   - Criar/editar template com logo
   - Verificar preview no customizer
   - Verificar preview na página de certificados
   - Gerar PDF do certificado

2. **Template com assinatura do MinIO**
   - Criar/editar template com assinatura
   - Verificar preview em todos os locais
   - Gerar PDF

3. **Template com URL externa**
   - Usar URL https:// direta
   - Verificar que continua funcionando

4. **Template com base64**
   - Upload de nova imagem
   - Verificar que base64 funciona

5. **Expiração de token**
   - Aguardar expiração do JWT
   - Verificar erro adequado
   - Re-login e verificar funcionamento

6. **Gerenciamento de memória**
   - Trocar entre várias avaliações/templates
   - Verificar que blobs antigos são revogados
   - Não deve haver memory leak

## Performance

### Cache de Blobs
- **Primeira carga:** ~200-500ms (depende do tamanho da imagem)
- **Cargas subsequentes:** Instantâneo (lê do cache)
- Cache persiste enquanto o token for o mesmo

### Otimizações Implementadas
1. **Promise.all:** Carrega logo e assinatura em paralelo
2. **Cache automático:** Evita requisições duplicadas
3. **Backend Cache-Control:** 1 hora de cache no navegador

## Próximos Passos (se necessário)

### Melhorias Opcionais

1. **Loading state visual**
   ```typescript
   {isLoadingImages && <Skeleton />}
   {logoUrl && <img src={logoUrl} />}
   ```

2. **Error handling melhorado**
   ```typescript
   const [imageError, setImageError] = useState<string | null>(null);
   
   try {
     // ... loadCertificateImage ...
   } catch (error) {
     setImageError("Erro ao carregar imagem");
   }
   ```

3. **Retry automático**
   - Tentar novamente em caso de falha de rede
   - Exponential backoff

4. **Preload de imagens**
   - Pré-carregar imagens de certificados antes de abrir modal
   - Melhor UX

## Referências

- Arquivo utilitário: `src/utils/certificateImageUtils.ts`
- Componente template: `src/components/certificates/CertificateTemplate.tsx`
- Componente customizer: `src/components/certificates/CertificateCustomizer.tsx`
- API client: `src/lib/api.ts`
