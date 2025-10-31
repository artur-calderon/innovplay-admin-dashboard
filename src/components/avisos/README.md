# Sistema de Notificações de Avisos

## 📋 Visão Geral

Sistema completo de notificações de avisos com badge persistente na sidebar que rastreia avisos não lidos por usuário.

## ✨ Funcionalidades

### 1. **Badge na Sidebar**
- ✅ Mostra contador de avisos não lidos em tempo real
- ✅ Badge vermelho com número destacado
- ✅ Aparece tanto no menu expandido quanto colapsado
- ✅ Desaparece quando não há avisos não lidos

### 2. **Indicador Visual nos Cards**
- ✅ Borda azul esquerda em avisos não lidos
- ✅ Background azul claro suave
- ✅ Badge "Novo" azul
- ✅ Ícone pulsante (CircleDot) ao lado do título

### 3. **Sistema de Tracking**
- ✅ Persistência em localStorage (por usuário)
- ✅ Marca como lido automaticamente ao abrir detalhes (500ms delay)
- ✅ Sincronização em tempo real entre componentes
- ✅ Não perde dados ao recarregar página

### 4. **Ações do Usuário**
- ✅ Botão "Marcar todos como lidos" (aparece quando há não lidos)
- ✅ Contador de avisos novos no header
- ✅ Atualização automática do badge ao visualizar

## 🏗️ Arquitetura

### Hook Principal: `useUnreadAvisos`

```typescript
const {
  markAsRead,           // Marca um aviso como lido
  markMultipleAsRead,   // Marca múltiplos avisos como lidos
  markAllAsRead,        // Marca todos de uma lista como lidos
  isAvisoRead,          // Verifica se um aviso foi lido
  getUnreadCount,       // Conta avisos não lidos
  clearAllRead,         // Limpa todos (debug/reset)
  readAvisos,           // Array de IDs lidos
} = useUnreadAvisos();
```

### Componentes Integrados

1. **Sidebar** (`src/components/layout/Sidebar.tsx`)
   - Busca IDs dos avisos
   - Calcula contador não lidos
   - Exibe badge dinâmico

2. **Avisos Page** (`src/pages/Avisos.tsx`)
   - Mostra contador de novos avisos
   - Botão "Marcar todos como lidos"
   - Badges informativos

3. **AvisoCard** (`src/components/avisos/AvisoCard.tsx`)
   - Indicador visual de não lido
   - Badge "Novo"
   - Borda e background destacados

4. **AvisoDetailModal** (`src/components/avisos/AvisoDetailModal.tsx`)
   - Marca como lido automaticamente ao abrir
   - Delay de 500ms para garantir visualização

## 💾 Persistência

### LocalStorage
- **Chave**: `avisos_lidos_{userId}`
- **Formato**: Array de IDs de avisos lidos
- **Exemplo**: `["1", "2", "3", "4"]`

### Comportamento
- Carrega automaticamente ao montar componente
- Salva imediatamente ao marcar como lido
- Específico por usuário (multi-conta safe)

## 🎨 Visual

### Badge Sidebar
```
┌─────────────────┐
│ 🔔 Avisos    [5]│  ← Badge vermelho
└─────────────────┘
```

### Card Não Lido
```
┌─────────────────────────────┐
│ ║ 📢 Título do Aviso ● ←────┤ Borda azul + Ícone pulsante
│ ║ [Novo] [Todos]            │ ← Badge "Novo"
│ ║ Mensagem preview...       │
│ ║ 👤 Autor | 📅 Data        │
└─────────────────────────────┘
```

### Header da Página
```
Avisos
[5 novos] [8 avisos] [✓ Marcar todos como lidos] [↻ Atualizar]
```

## 🔄 Fluxo de Uso

1. **Usuário entra no sistema**
   - Sidebar carrega avisos do backend (mockados)
   - Hook verifica localStorage para avisos lidos
   - Badge atualiza com contador

2. **Usuário navega para Avisos**
   - Página mostra cards com indicadores visuais
   - Avisos não lidos têm borda azul
   - Header mostra contador de novos

3. **Usuário clica "Ver detalhes"**
   - Modal abre
   - Após 500ms, marca como lido
   - Badge atualiza automaticamente
   - Indicador visual do card desaparece

4. **Usuário clica "Marcar todos como lidos"**
   - Todos os avisos atuais marcados como lidos
   - Badge zera
   - Indicadores visuais removidos
   - Toast de confirmação

## 🔌 Integração com API

### Quando endpoints estiverem prontos:

1. **Sidebar** - Buscar avisos reais:
```typescript
// src/components/layout/Sidebar.tsx (linha 95)
import { getFilteredAvisos } from '@/services/avisosApi';
const avisos = await getFilteredAvisos({ 
  role: user.role, 
  user_id: user.id 
});
const ids = avisos.map(a => a.id);
setAvisoIds(ids);
```

2. **Opcional**: Backend pode rastrear visualizações
```typescript
// Ao marcar como lido, também enviar para API
await api.post(`/avisos/${avisoId}/mark-read`);
```

## 🐛 Debug

### Resetar avisos lidos (Console do navegador):
```javascript
localStorage.removeItem('avisos_lidos_' + userId);
```

### Ver avisos lidos:
```javascript
console.log(localStorage.getItem('avisos_lidos_' + userId));
```

## 📝 TODO para Produção

- [ ] Integrar com API real de avisos
- [ ] Considerar sincronização backend de avisos lidos
- [ ] Adicionar WebSocket para notificações em tempo real
- [ ] Cache inteligente com revalidação
- [ ] Animação de transição ao marcar como lido
- [ ] Som de notificação (opcional)

## 🎯 Casos de Uso Cobertos

✅ Admin vê todos os avisos  
✅ Tec Adm vê avisos do município  
✅ Diretor vê avisos da escola  
✅ Aluno vê avisos relevantes  
✅ Badge persiste entre sessões  
✅ Multi-usuário no mesmo navegador  
✅ Visual claro de avisos novos  
✅ UX intuitiva e responsiva  

