# 📊 Funcionalidades de Exportação PDF e Excel - Sistema de Avaliações

## 🎯 Visão Geral

Implementei funcionalidades avançadas de exportação de relatórios em **PDF** e **Excel (XLS)**, permitindo aos usuários gerar documentos profissionais com todos os dados das avaliações.

## 🔧 Bibliotecas Utilizadas

### Para PDF:
- **jsPDF** - Geração de arquivos PDF
- **html2canvas** - Captura do conteúdo HTML como imagem

### Para Excel:
- **xlsx** - Geração de planilhas Excel
- **file-saver** - Download de arquivos no navegador

## 📍 Como Acessar

1. **Acesse** `/app/avaliacoes`
2. **Clique** na aba **"Resultados"**
3. **Clique** em **"Gerar Relatório"**
4. **Use** os botões de exportação no topo da tela

## 🎨 Opções de Exportação Disponíveis

### 📄 **PDF** (com dropdown)
- **Funcionalidade**: Gera PDF do relatório visual completo
- **Método**: Captura screenshot da tela e converte para PDF
- **Opções disponíveis**:
  - **💾 Salvar PDF**: Download do arquivo PDF
  - **🖨️ Imprimir PDF**: Abre PDF em nova aba para impressão
- **Características**:
  - Múltiplas páginas automáticas (se necessário)
  - Qualidade alta (scale: 2)
  - Formato A4 otimizado
  - Mantém toda a formatação visual
  - **Logo da empresa** no canto superior direito (todas as páginas)

### 📊 **Excel (.xlsx)**
- **Funcionalidade**: Gera planilha Excel com 3 abas
- **Estrutura**:
  
  #### **Aba 1: Resumo**
  - Cabeçalho com data de geração
  - Estatísticas gerais (total avaliações, participantes, médias)
  - Tabela detalhada de cada avaliação
  - Colunas: Avaliação, Disciplina, Série, Escola, Data, Participação, Médias, etc.

  #### **Aba 2: Análise Dificuldade**
  - Desempenho por nível de dificuldade
  - Questões fáceis, médias e difíceis
  - Taxa de acerto por categoria

  #### **Aba 3: Resultados Alunos**
  - Dados individuais de cada aluno
  - Notas, acertos, erros, percentuais
  - Status de aprovação
  - Tempo gasto na prova



### 🖨️ **Imprimir**
- Versão otimizada para impressão
- Remove elementos de navegação
- Layout limpo e profissional

## 💾 Arquivos Gerados

### Nomenclatura:
- **PDF**: `relatorio-avaliacoes-YYYY-MM-DD.pdf`
- **Excel**: `relatorio-avaliacoes-YYYY-MM-DD.xlsx`

### Exemplo de dados no Excel:

#### **Planilha "Resumo":**
```
RELATÓRIO DE AVALIAÇÕES
Gerado em: 20/01/2024

RESUMO GERAL
Total de Avaliações: 4
Alunos Participantes: 107
Média Geral: 7.1
Taxa de Aprovação Média: 72.0%

DETALHAMENTO POR AVALIAÇÃO
Avaliação | Disciplina | Série | Escola | Data | Total Alunos | Participantes | Média | Taxa Aprovação
Matemática 5º Ano | Matemática | 5º Ano | E.M. João Silva | 15/01/2024 | 32 | 28 | 7.2 | 75%
...
```

#### **Planilha "Análise Dificuldade":**
```
ANÁLISE POR DIFICULDADE

Avaliação | Questões Fáceis | Taxa Fáceis (%) | Questões Médias | Taxa Médias (%) | Questões Difíceis | Taxa Difíceis (%)
Matemática 5º Ano | 8 | 88.5 | 10 | 68.2 | 2 | 45.0
...
```

#### **Planilha "Resultados Alunos":**
```
RESULTADOS DOS ALUNOS

Avaliação | Aluno | Nota | Acertos | Erros | Em Branco | Percentual | Status | Tempo (min)
Matemática 5º Ano | Ana Silva Santos | 8.5 | 17 | 2 | 1 | 85% | Aprovado | 45
...
```

## ⚙️ Implementação Técnica

### **Arquivo: `src/lib/mockData.ts`**
```typescript
// Nova função para gerar dados Excel estruturados
generateExcelData: async () => {
  // Retorna objeto com 3 arrays:
  // - summary: dados do resumo
  // - difficulty: análise de dificuldade  
  // - students: resultados dos alunos
}
```

### **Arquivo: `src/components/evaluations/EvaluationReport.tsx`**
```typescript
// Função base para gerar PDF
const generatePDFBase = async () => {
  // 1. Captura screenshot com html2canvas
  // 2. Carrega logo-header.png do /public
  // 3. Converte para PDF com jsPDF
  // 4. Adiciona logo no canto superior direito (40mm x auto)
  // 5. Gerencia múltiplas páginas automaticamente
  // 6. Inclui logo em todas as páginas
  // 7. Fallback: gera PDF sem logo se houver erro
}

// Função para salvar PDF
const savePDFReport = async () => {
  // 1. Chama generatePDFBase()
  // 2. Salva arquivo com nome baseado na data
}

// Função para imprimir PDF  
const printPDFReport = async () => {
  // 1. Chama generatePDFBase()
  // 2. Abre PDF em nova aba
  // 3. Dispara impressão automaticamente
}

// Função para gerar Excel
const generateExcelReport = async () => {
  // 1. Busca dados estruturados
  // 2. Cria workbook com 3 planilhas
  // 3. Aplica formatação (largura colunas)
  // 4. Gera arquivo .xlsx
}
```

### **Logo no PDF - Detalhes Técnicos:**
```typescript
// Configurações da logo
const logoWidth = 40; // largura em mm
const logoHeight = (logoImg.height * logoWidth) / logoImg.width; // proporção
const logoX = imgWidth - logoWidth - 10; // 10mm da margem direita
const logoY = 10; // 10mm do topo

// Adição da logo
pdf.addImage(logoImg.src, 'PNG', logoX, logoY, logoWidth, logoHeight);

// Tratamento de erro
try {
  await logoPromise; // carrega logo
  // ... adiciona logo normalmente
} catch (logoError) {
  console.warn('Erro ao carregar logo, gerando PDF sem logo');
  // ... gera PDF sem logo
}
```

## 🎨 Interface de Usuário

### **Botões de Exportação:**
- **Imprimir** (ícone: 🖨️) - Abre diálogo de impressão
- **Excel** (ícone: 📊) - Download XLSX
- **PDF** (ícone: 📁 + ▼) - Dropdown com opções:
  - **💾 Salvar PDF** - Download do arquivo
  - **🖨️ Imprimir PDF** - Abre para impressão

### **Estados dos Botões:**
- **Normal**: "Imprimir", "Excel", "PDF"
- **Carregando**: "Gerando..." (com botões desabilitados)
- **Feedback**: Toasts de sucesso ou erro

## 🔄 Fluxo de Uso

1. **Usuário** clica em um botão de exportação
2. **Sistema** mostra "Gerando..." e desabilita botões
3. **Processamento** acontece em background:
   - PDF (Salvar): Captura tela → Carrega logo → Gera PDF → Download
   - PDF (Imprimir): Captura tela → Carrega logo → Gera PDF → Abre em nova aba → Print
   - Excel: Busca dados → Cria planilhas → Download
   - Imprimir: Abre janela de impressão
4. **Feedback** via toast de sucesso/erro
5. **Arquivo** é baixado automaticamente

## 🎯 Casos de Uso

### **Para Professores:**
- Download de relatórios para reuniões pedagógicas
- Análise detalhada do desempenho da turma
- Compartilhamento com coordenação

### **Para Coordenadores:**
- Relatórios executivos para direção
- Dados para planejamento pedagógico
- Análise comparativa entre turmas

### **Para Diretores:**
- Relatórios institucionais
- Dados para secretaria de educação
- Acompanhamento de metas educacionais

## 🔧 Configurações Técnicas

### **PDF:**
- Formato: A4 (210x295mm)
- Resolução: 2x (alta qualidade)
- Páginas: Automáticas conforme conteúdo
- Fundo: Branco forçado
- **Logo**: 40mm de largura, 10mm das margens (superior e direita)
- **Arquivo da logo**: `/public/logo-header.png`

### **Excel:**
- Formato: .xlsx (Office 2007+)
- Codificação: UTF-8
- Planilhas: 3 (Resumo, Dificuldade, Alunos)
- Larguras: Ajustadas automaticamente



## 🚀 Benefícios

✅ **Profissional**: Relatórios com visual, logo da empresa e dados completos
✅ **Flexível**: Múltiplos formatos conforme necessidade
✅ **Prático**: Download automático, sem configuração
✅ **Completo**: Todas as informações em formatos adequados
✅ **Rápido**: Geração em poucos segundos
✅ **Compatível**: Funciona em todos os navegadores modernos
✅ **Robusto**: Sistema continua funcionando mesmo se a logo não carregar

---

**🎉 Funcionalidades de PDF e Excel totalmente implementadas e testadas!** 