# Gerador de Cartões Resposta

Sistema completo para geração de cartões resposta personalizados para provas físicas.

## Estrutura

### Componentes

- **AnswerSheetCard**: Componente visual do cartão resposta com layout fiel ao modelo fornecido
- **AnswerSheetPreviewModal**: Modal para visualização prévia do cartão de um aluno específico

### Página

- **AnswerSheetGenerator** (`/app/cartao-resposta`): Página principal com 3 etapas:
  1. Configuração da prova (escola, turma, quantidade de questões, gabarito)
  2. Seleção de alunos presentes/faltosos
  3. Geração e download dos cartões em PDF (ZIP)

### Serviços

- **answerSheetPdfService**: Funções para geração de QR Code (apenas para prévia)
  - `generateQRCode()`: Gera QR Code com dados do aluno e prova (usado apenas na prévia visual)
  
**Nota**: A geração de PDFs é feita pelo backend. O frontend apenas envia os dados via API.

### Tipos

- **answer-sheet.ts**: Interfaces TypeScript para todos os dados necessários

## Funcionalidades

### Etapa 1: Configuração
- Seleção hierárquica: Escola → Série → Turma
- Input de nome da prova
- Configuração da quantidade de questões (1-100)
- Grid interativo para preenchimento do gabarito
- Validação: todas as questões devem ter resposta

### Etapa 2: Seleção de Alunos
- Lista completa de alunos da turma selecionada
- Checkbox individual para marcar presentes/faltosos
- Botões rápidos:
  - "Marcar Todos como Presentes"
  - "Inverter Seleção"
- Botão "Ver Prévia" para cada aluno
- Contador de alunos selecionados

### Etapa 3: Geração
- Resumo das configurações
- Contador de cartões a serem gerados
- Barra de progresso durante geração
- Download automático do arquivo ZIP

## Layout do Cartão

Baseado na imagem fornecida, cada cartão contém:

### Cabeçalho
- Título "CARTÃO RESPOSTA"
- QR Code (canto superior direito)
- Nome completo do aluno
- Estado, município, escola
- Turma e nome da prova

### Instruções
- Bloco roxo com "INSTRUÇÕES PARA O ALUNO"
- Lista de instruções de preenchimento
- Exemplos visuais de marcação correta/incorreta

### Bloco de Atenção (Uso do Aplicador)
- Opções para marcar:
  1. Aluno ausente
  2. Aluno com deficiência
  3. Aluno com tempo adicional

### Grid de Respostas
- Bloco "BLOCO 01" (roxo)
- Grade com todas as questões
- 4 círculos por questão (A, B, C, D)
- Layout adaptável ao número de questões

### Rodapé
- Linha para assinatura do participante

## QR Code

O QR Code contém JSON com:
```typescript
{
  aluno_id: string;
  escola_id: string;
  turma_id: string;
  prova_titulo: string;
  data_geracao: string;
}
```

Pode ser usado futuramente para:
- Correção automática via leitura óptica
- Validação de autenticidade
- Rastreamento de provas

## Dependências

- `qrcode`: Geração de QR Codes (apenas para prévia visual)

**Nota**: `jspdf` e `jszip` não são mais necessários no frontend, pois a geração de PDFs é feita pelo backend.

## Uso

```typescript
import AnswerSheetGenerator from '@/pages/AnswerSheetGenerator';

// A página está disponível em /app/cartao-resposta
// Acessível via menu ou navegação direta
```

## API Endpoints Esperados

A página tenta usar os seguintes endpoints:

- `GET /schools` - Lista de escolas
- `GET /series` - Lista de séries
- `GET /classes?school_id=X&serie_id=Y` - Lista de turmas
- `GET /students?class_id=X` - Lista de alunos

**Nota**: Se os endpoints não existirem, dados mock são usados para desenvolvimento.

## Melhorias Futuras

- [ ] Integração com backend para salvar configurações
- [ ] Endpoint `POST /answer-sheets` para armazenar gabarito
- [ ] Sistema de correção automática via leitura óptica
- [ ] Suporte a múltiplos blocos de questões
- [ ] Personalização de logo da escola
- [ ] Opção de questões com 5 alternativas (A-E)
- [ ] Geração de gabarito do professor (com respostas marcadas)
- [ ] Histórico de cartões gerados


