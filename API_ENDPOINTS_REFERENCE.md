# API Endpoints Reference - InnovPlay Admin Dashboard

## Endpoints Mapeados e Verificados

### 📚 **Usuários** (`/users`)
- `GET /users/list` - ✅ Lista usuários
- `GET /users/{user_id}` - ✅ Busca usuário por ID
- `POST /users` - ✅ Criar usuário
- `DELETE /users/{user_id}` - ✅ Deletar usuário
- `POST /users/forgot-password` - ✅ Esqueci minha senha
- `POST /users/reset-password` - ✅ Resetar senha
- `POST /users/change-password` - ✅ Alterar senha

### 🎓 **Estudantes** (`/students`)
- `GET /students` - ✅ Lista estudantes
- `GET /students/recent` - ✅ Estudantes recentes
- `POST /students` - ✅ Criar estudante
- `GET /students/school/{school_id}` - ✅ Estudantes por escola
- `GET /students/me` - ✅ Dados do estudante atual

### 📝 **Avaliações** (`/test`)
- `GET /test/` - ✅ Lista avaliações
- `POST /test` - ✅ Criar avaliação
- `GET /test/{test_id}` - ✅ Buscar avaliação por ID
- `PUT /test/{test_id}` - ✅ Atualizar avaliação
- `DELETE /test/{test_id}` - ✅ Deletar avaliação
- `GET /test/user/{user_id}` - ✅ Avaliações do usuário
- `GET /test/school/{school_id}` - ✅ Avaliações da escola

### 🏫 **Escolas** (`/school`)
- `GET /school` - ✅ Lista escolas
- `GET /schools/recent` - ✅ Escolas recentes (basic_endpoints)
- `POST /school` - ✅ Criar escola
- `GET /school/{school_id}` - ✅ Buscar escola por ID
- `PUT /school/{school_id}` - ✅ Atualizar escola
- `DELETE /school/{school_id}` - ✅ Deletar escola

### 👥 **Turmas** (`/classes`)
- `GET /classes` - ✅ Lista turmas
- `POST /classes` - ✅ Criar turma
- `GET /classes/{class_id}` - ✅ Buscar turma por ID
- `PUT /classes/{class_id}` - ✅ Atualizar turma
- `DELETE /classes/{class_id}` - ✅ Deletar turma
- `GET /classes/school/{school_id}` - ✅ Turmas por escola

### 👨‍🏫 **Professores** (`/teacher`)
- `GET /teacher` - ✅ Lista professores
- `POST /teacher` - ✅ Criar professor
- `GET /teacher/{user_id}` - ✅ Buscar professor por ID
- `GET /teacher/school/{school_id}` - ✅ Professores da escola

### ❓ **Questões** (`/questions`)
- `GET /questions/` - ✅ Lista questões
- `GET /questions/recent` - ✅ Questões recentes (basic_endpoints)
- `POST /questions` - ✅ Criar questão
- `GET /questions/{question_id}` - ✅ Buscar questão por ID
- `PUT /questions/{question_id}` - ✅ Atualizar questão
- `DELETE /questions/{question_id}` - ✅ Deletar questão

### 🔗 **Vínculos Escola-Professor** (`/school-teacher`)
- `GET /school-teacher` - ✅ Lista vínculos
- `POST /school-teacher` - ✅ Criar vínculo
- `DELETE /school-teacher/{id}` - ✅ Remover vínculo

### ⚡ **Atalhos Rápidos** (`/user-quick-links`)
- `GET /user-quick-links/{user_id}` - ✅ Buscar atalhos do usuário
- `POST /user-quick-links/{user_id}` - ✅ Salvar atalhos do usuário
- `DELETE /user-quick-links/{user_id}` - ✅ Deletar atalhos do usuário

### 🏙️ **Cidades** (`/city`)
- `GET /city/states` - ✅ Lista estados

### 📊 **Dashboard** (basic_endpoints)
- `GET /dashboard/stats` - ✅ Estatísticas do dashboard
- `GET /dashboard/comprehensive-stats` - ✅ Estatísticas completas

### 📈 **Resultados de Avaliações** (`/evaluation-results`)
- `GET /evaluation-results/avaliacoes` - ✅ Lista avaliações com resultados
- `POST /evaluation-results/avaliacoes/calcular` - ✅ Calcular resultados
- `GET /evaluation-results/opcoes-filtros/estados` - ✅ Estados para filtro

## ❌ Endpoints que NÃO existem (removidos do frontend)

- `/api/notifications` - Não existe (removido, usando dados mockados)
- `/api/users/school/{user_id}` - Não existe (substituído por `/users/{user_id}`)
- `/api/class/` - Não existe (corrigido para `/classes`)

## 🔧 Correções Implementadas

1. **ProfessorMetrics.tsx**: `/class/` → `/classes`
2. **ProfessorNotifications.tsx**: Removido `/notifications` (não existe)
3. **ProfessorDashboard.tsx**: `/users/school/{id}` → `/users/{id}`
4. **QuestionsList.tsx**: `/questions/` → `/questions/recent`

## 📋 Status dos Endpoints no Frontend

✅ **Todos os endpoints usados no frontend agora existem na API**
✅ **Proxy configurado corretamente no Vite**
✅ **CORS configurado no backend**

## 🚀 Próximos Passos

1. Testar todos os endpoints após restart do servidor
2. Verificar autenticação JWT nos endpoints
3. Implementar tratamento de erros consistente
4. Adicionar loading states nos componentes

---

*Última atualização: $(date)*
*Verificação completa dos endpoints realizada com base no código do backend*
