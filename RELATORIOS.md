# 📊 Funcionalidade de Relatórios - Sistema de Avaliações

## 🎯 Visão Geral

Foi implementada uma funcionalidade completa de geração de relatórios para as avaliações, permitindo aos professores e administradores visualizar, analisar e exportar os resultados das avaliações de forma detalhada.

## 📍 Como Acessar

1. **Acesse** a página de Avaliações (`/app/avaliacoes`)
2. **Clique** na aba **"Resultados"**
3. **Clique** no botão **"Gerar Relatório"**

## 🔧 Funcionalidades Disponíveis

### 📈 Visualização de Relatório
- **Resumo Executivo** com estatísticas gerais
- **Status das Avaliações** (concluídas, pendentes, total de alunos)
- **Detalhamento por Avaliação** em formato de tabela
- **Análise de Desempenho por Dificuldade** (questões fáceis, médias e difíceis)

### 💾 Opções de Exportação

#### 1. **Imprimir Relatório**
- Abre uma janela de impressão
- Layout otimizado para impressão
- Remove elementos de navegação automaticamente

#### 2. **Baixar CSV**
- Gera arquivo CSV com dados essenciais
- Formato compatível com Excel e Google Sheets
- Inclui: nome da avaliação, disciplina, série, escola, datas, participação, médias, etc.

#### 3. **Baixar HTML**
- Gera relatório completo em HTML
- Inclui todas as seções e formatação
- Pode ser aberto em qualquer navegador

## 📊 Dados Incluídos no Relatório

### Estatísticas Gerais
- Total de avaliações
- Avaliações concluídas
- Alunos participantes
- Média geral
- Taxa de aprovação média

### Por Avaliação
- Título e disciplina
- Participação (alunos que fizeram/total)
- Média da turma
- Taxa de aprovação
- Status da correção
- Data de aplicação

### Análise de Dificuldade
- Desempenho em questões fáceis
- Desempenho em questões médias
- Desempenho em questões difíceis
- Número de questões por nível

## 🗂️ Estrutura dos Arquivos

### Arquivos Implementados
```
src/
├── lib/
│   └── mockData.ts              # Dados mock e APIs simuladas
├── components/
│   └── evaluations/
│       ├── EvaluationResults.tsx    # Visualização de resultados
│       └── EvaluationReport.tsx     # Componente de relatório
└── pages/
    └── Evaluations.tsx          # Página principal integrada
```

### APIs Mock Disponíveis
```typescript
// Buscar todos os resultados
mockApi.getEvaluationResults()

// Buscar resultado específico
mockApi.getEvaluationResultById(id)

// Buscar por status
mockApi.getResultsByStatus('completed' | 'pending' | 'in_progress')

// Exportar resultados
mockApi.exportResults(resultIds)

// Gerar CSV
mockApi.generateCSVReport()
```

## 📋 Dados de Exemplo

O sistema inclui 5 avaliações de exemplo:

1. **Matemática 5º Ano** - Concluída (32 alunos, média 7.2, 75% aprovação)
2. **Português 3º Ano** - Concluída (25 alunos, média 6.8, 68% aprovação)
3. **Ciências 4º Ano** - Pendente (28 alunos, 15 participaram)
4. **História 6º Ano** - Concluída (30 alunos, média 8.1, 83% aprovação)
5. **Geografia 8º Ano** - Concluída (26 alunos, média 6.4, 62% aprovação)

## 🎨 Recursos Visuais

- **Progress bars** para visualizar percentuais
- **Badges coloridos** para status e categorias
- **Cards com ícones** para diferentes métricas
- **Tabelas responsivas** para dados detalhados
- **Cores semânticas** (verde=bom, laranja=atenção, vermelho=problema)

## 🔄 Integração

A funcionalidade está totalmente integrada com:
- ✅ Sistema de navegação existente
- ✅ Componentes UI do projeto
- ✅ Sistema de toasts para feedback
- ✅ Estados de loading e erro
- ✅ Responsividade mobile

## 🚀 Como Usar

1. **Visualizar**: Click em "Gerar Relatório" na aba Resultados
2. **Navegar**: Use as diferentes seções do relatório
3. **Imprimir**: Click no botão "Imprimir" para impressão da tela
4. **Excel**: Click em "Excel" para download da planilha
5. **PDF**: Click no dropdown "PDF" e escolha:
   - **"Salvar PDF"** para download do arquivo
   - **"Imprimir PDF"** para abrir em nova aba e imprimir
6. **Voltar**: Use o botão "Voltar" para retornar à lista

## 💡 Próximos Passos

Para integrar com API real:
1. Substitua `mockApi` por chamadas reais da API
2. Ajuste as interfaces se necessário
3. Implemente autenticação para endpoints
4. Adicione filtros por data/escola/disciplina se necessário

---

**Funcionalidade implementada e testada! 🎉** 