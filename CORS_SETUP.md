# Configuração de CORS - Solução

## Problema
A aplicação estava tentando fazer requisições diretamente para `https://demo-api.afirmeplay.com.br` do frontend rodando em `localhost:8080`, causando erros de CORS.

## Solução Implementada

### 1. Configuração do Proxy no Vite
O arquivo `vite.config.ts` foi atualizado para usar um proxy que redireciona todas as requisições `/api/*` para a API externa, evitando problemas de CORS.

### 2. Configuração da API
O arquivo `src/lib/api.ts` foi configurado para usar `/api` como base URL, que será redirecionada pelo proxy.

### 3. Como usar

#### Opção 1: Usar a API externa (recomendado)
```bash
# Definir a variável de ambiente
export VITE_API_BASE_URL=https://demo-api.afirmeplay.com.br

# Ou criar um arquivo .env.local com:
echo "VITE_API_BASE_URL=https://demo-api.afirmeplay.com.br" > .env.local

# Reiniciar o servidor
npm run dev
```

#### Opção 2: Usar API local
```bash
# Se você tem o backend rodando localmente
export VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

### 4. Verificação
Após reiniciar o servidor, você deve ver no console:
- `[GET] /api/users/school/... -> https://demo-api.afirmeplay.com.br/api/users/school/...`
- `[200] /api/users/school/...`

### 5. Fallback
Se a API externa não estiver disponível, os componentes já têm fallbacks com dados mockados para não quebrar a interface.

## Arquivos Modificados
- `vite.config.ts` - Configuração do proxy
- `src/lib/api.ts` - Base URL da API
- `env.example` - Exemplo de configuração de ambiente
