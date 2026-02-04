<!-- Instruções curtas e acionáveis para agentes de código (Copilot / GPT) -->
# Copilot instructions — InnovPlay Admin Dashboard

Objetivo curto
- Ajudar agentes a serem imediatamente produtivos: entender arquitetura, fluxos de API/autenticação, convenções do projeto e comandos de desenvolvimento.

Idioma das respostas
- Responda sempre em português do Brasil (pt-br) — todas as mensagens, commits e PR descriptions devem estar em português.

Comandos úteis
- Desenvolvimento: `npm run dev` (Vite)
- Build: `npm run build` ou `npm run build:dev`
- Preview do build: `npm run preview`
- Lint: `npm run lint`

Visão geral da arquitetura
- Frontend React + TypeScript + Vite (pasta `src/`). UI composta por `src/pages/*`, `src/components/*` e `src/app/*`.
- Gerenciamento de estado: `zustand` (ex.: `src/context/authContext/index.ts` - `useAuth`).
- Chamadas HTTP centralizadas: `src/lib/api.ts` — use essa instância (`api`) para todas as requisições. Há utilitários `apiWithRetry`/`apiWithTimeout` para endpoints críticos.
- Rotas: `react-router-dom` com páginas em `src/pages`.
- Dados e cache: usa `@tanstack/react-query` em várias partes da UI (buscar componentes que importam `useQuery`/`useMutation`).

Padrões e convenções específicas
- Alias TypeScript: `@/*` aponta para `src/*` (veja `tsconfig.json`). Use `@/lib/api` para importar a instância axios.
- Autenticação: o token JWT é armazenado em `localStorage` sob a chave `token`. O `api` adiciona `Authorization: Bearer <token>` via interceptors. Para persistir login, use `useAuth.persistUser()` ou `useAuth.autoLogin()`.
- Não adicionar headers CORS no frontend — a API já tem comentários no `src/lib/api.ts` avisando isso.
- Tratamento de erros: `src/lib/api.ts` já preserva respostas 404/5xx para endpoints específicos (ex.: `/play-tv/`, `/skills/`, `/student-answers/submit`). Preserve esse comportamento quando alterar lógica de erros.
- Requisições críticas: prefira `apiWithRetry` para endpoints que salvam/mandam respostas (`/student-answers/*`, `answer-sheets/correct-new`).

Arquivos de referência (exemplos práticos)
- `src/lib/api.ts` — instância axios, interceptors, `apiWithRetry`/`apiWithTimeout`.
- `src/context/authContext/index.ts` — fluxos de `login`, `logout`, `persistUser`, e aplicação de `settings` após login.
- `src/hooks` — hooks reutilizáveis (`useSettings`, `useEvaluation`, `use-toast`, etc.).
- `src/pages` e `src/components` — padrões de UI/fluxo; procurar `PrivateRoute.tsx` para entender proteção de rotas.

Boas práticas específicas ao projeto
- Quando adicionar um novo endpoint, atualize `src/lib/api.ts` apenas se for comportamento global; preferir encapsular lógica por recurso (ex.: `services/` ou hook local).
- Mantenha toasts e mensagens de erro no nível de componente quando a UX exigir mensagens específicas; use os throw/rejeições do `api` para lógica programática.
- Ao alterar autenticação, respeite a sequência: atualizar `localStorage.token`, definir `api.defaults.headers.common.Authorization`, e então chamar `useAuth.fetchUserDetails`.
- Use o proxy de desenvolvimento (`/api`) e a variável `VITE_API_BASE_URL` para evitar tocar CORS no frontend.

Armadilhas conhecidas
- Há mistura de `.tsx` e alguns `.jsx` históricos em `src/pages` — verifique tipos ao alterar arquivos antigos.
- Alguns endpoints (Play TV / Skills) podem retornar 404 intencionalmente; não substituir a checagem específica implementada em `api.ts`.

Como um agente deve agir
- Antes de editar: localizar `api` e `useAuth` e confirmar impacto em chamadas/estados.
- Preferir mudanças pequenas e orientadas a comportamento (não reformatações massivas).
- Incluir exemplos concretos em pull requests: qual endpoint foi tocado e por quê (referencie `src/lib/api.ts` ou o hook afetado).

Se algo não for detectável
- Pergunte explicitamente: qual backend URL usar em `VITE_API_BASE_URL` ou se existe proxy diferente no ambiente do dev.

Feedback
- Se esta instrução estiver incompleta, indique quais áreas precisa de mais detalhes (ex.: fluxos de deploy, testes end-to-end, secrets/env).
