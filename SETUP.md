# Setup do InnovPlay Admin Dashboard

Este documento fornece instruções para configurar e executar o frontend do InnovPlay Admin Dashboard.

## Pré-requisitos

- Node.js 18+ instalado
- Git

## ⚠️ Backend em Atualização

**Nota Importante:** O backend antigo foi removido e será substituído por uma versão mais nova. 

As integrações da API no frontend foram mantidas e estão preparadas para funcionar com o novo backend quando disponível.

## Configuração do Frontend

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto com:
   ```
   VITE_API_BASE_URL=http://localhost:5000
   VITE_DEBUG_MODE=false
   ```

3. **Execute o frontend em modo desenvolvimento:**
   ```bash
   npm run dev
   ```
   O frontend estará disponível em `http://localhost:8080`

## Integração com API Já Implementada

O frontend possui integração completa com os seguintes endpoints da API:

### Autenticação
- **Login:** `POST /login/`
- **Logout:** `POST /logout/`
- **Persistir usuário:** `GET /persist-user/`

### Usuários
- **Listar usuários:** `GET /users/list`
- **Criar usuário:** `POST /admin/criar-usuario`
- **Buscar usuário:** `GET /users/{id}`

### Escolas/Instituições (CRUD Completo)
- **Listar escolas:** `GET /school`
- **Criar escola:** `POST /school`
- **Buscar escola:** `GET /school/{id}`
- **Atualizar escola:** `PUT /school/{id}`
- **Deletar escola:** `DELETE /school/{id}`

### Questões
- **Listar questões:** `GET /questions/`
- **Criar questão:** `POST /questions`
- **Buscar questão:** `GET /questions/{id}`
- **Atualizar questão:** `PUT /questions/{id}`
- **Deletar questão:** `DELETE /questions/{id}`

### Avaliações/Testes
- **Listar testes:** `GET /test/`
- **Criar teste:** `POST /test`
- **Buscar teste:** `GET /test/{id}`
- **Atualizar teste:** `PUT /test/{id}`
- **Deletar teste:** `DELETE /test/{id}`

### Disciplinas, Séries e Cursos
- **Listar disciplinas:** `GET /subjects`
- **Listar séries:** `GET /grades/`
- **Listar cursos:** `GET /education_stages`
- **Séries por etapa de ensino:** `GET /grades/education-stage/{id}`

### Cidades
- **Listar cidades:** `GET /city/`

## Funcionalidades Implementadas no Frontend

### ✅ Totalmente Funcionais
- **Dashboard:** Dados reais da API com loading states
- **Página de Instituições:** CRUD completo (criar, editar, excluir)
- **Autenticação:** Login, logout, persistência de sessão
- **Navegação:** Integrada com dados da API

### ✅ Interface Preparada (Aguardando Endpoints CRUD)
- **Página de Cursos:** Interface completa, endpoints GET funcionais
- **Página de Disciplinas:** Interface completa, endpoints GET funcionais  
- **Página de Séries:** Interface completa, endpoints GET funcionais

## Quando Adicionar o Novo Backend

1. **Cole a nova pasta do backend na raiz do projeto**

2. **Configure as variáveis de ambiente do backend:**
   ```
   DATABASE_URL=sua_url_do_banco_de_dados
   JWT_SECRET_KEY=sua_chave_secreta_jwt
   SENDGRID_API_KEY=sua_chave_sendgrid (opcional)
   SENDGRID_FROM_EMAIL=seu_email_sendgrid (opcional)
   FRONTEND_URL=http://localhost:8080
   ```

3. **Para ativar funcionalidades completas de Cursos, Disciplinas e Séries, implemente:**
   ```python
   # Cursos (/education_stages)
   @bp.route('', methods=['POST', 'PUT', 'DELETE'])
   
   # Disciplinas (/subjects)  
   @bp.route('', methods=['POST', 'PUT', 'DELETE'])
   
   # Séries (/grades)
   @bp.route('', methods=['POST', 'PUT', 'DELETE'])
   ```

## Estrutura Atual

```
innovplay-admin-dashboard/
├── src/                    # Código fonte do frontend (integração API completa)
├── public/                 # Arquivos públicos
├── .env.local             # Variáveis de ambiente do frontend
├── SETUP.md               # Este arquivo
└── CORRECOES_API.md       # Relatório de correções realizadas
```

## Scripts Úteis

```bash
# Rodar o frontend
npm run dev

# Instalar dependências
npm install

# Build para produção
npm run build
```

## Status das Integrações

- ✅ **Código preparado:** Todas as integrações da API implementadas
- ✅ **UI/UX completa:** Interface moderna e responsiva
- ✅ **Validações:** Formulários com validação completa
- ✅ **Loading states:** Skeletons e indicadores profissionais
- ✅ **Tratamento de erros:** Mensagens específicas e fallbacks
- ⏳ **Aguardando:** Nova versão do backend para funcionalidades completas 