import * as XLSX from 'xlsx-js-style';
import { ComparisonResponse } from '@/services/evaluationComparisonApi';
import { ProcessedEvolutionData } from '@/utils/evolutionDataProcessor';

/**
 * Estilos reutilizáveis para o Excel
 */
const styles = {
  // Cabeçalho principal (azul escuro)
  mainHeader: {
    font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } }, // Azul profissional
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '1E40AF' } },
      bottom: { style: 'medium', color: { rgb: '1E40AF' } },
      left: { style: 'medium', color: { rgb: '1E40AF' } },
      right: { style: 'medium', color: { rgb: '1E40AF' } },
    },
  },
  
  // Cabeçalho secundário (azul claro)
  subHeader: {
    font: { bold: true, size: 12, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'E0E7FF' } }, // Azul muito claro
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    },
  },
  
  // Célula de dados padrão
  dataCell: {
    font: { size: 11, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },
  
  // Célula de destaque (verde claro)
  highlightCell: {
    font: { bold: true, size: 11, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'D1FAE5' } }, // Verde claro
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '10B981' } },
      bottom: { style: 'thin', color: { rgb: '10B981' } },
      left: { style: 'thin', color: { rgb: '10B981' } },
      right: { style: 'thin', color: { rgb: '10B981' } },
    },
  },
  
  // Célula de alerta (vermelho claro)
  alertCell: {
    font: { bold: true, size: 11, color: { rgb: '991B1B' } },
    fill: { fgColor: { rgb: 'FEE2E2' } }, // Vermelho claro
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'EF4444' } },
      bottom: { style: 'thin', color: { rgb: 'EF4444' } },
      left: { style: 'thin', color: { rgb: 'EF4444' } },
      right: { style: 'thin', color: { rgb: 'EF4444' } },
    },
  },
  
  // Célula de título de seção
  sectionTitle: {
    font: { bold: true, size: 12, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    },
  },
};

/**
 * Retorna estilo baseado no valor (formatação condicional)
 */
function getConditionalStyle(value: number | null | undefined, type: 'positive' | 'negative' | 'neutral' = 'neutral'): any {
  if (value === null || value === undefined) return styles.dataCell;
  
  if (type === 'positive') {
    if (value > 0) return styles.highlightCell;
    if (value < 0) return styles.alertCell;
  } else if (type === 'negative') {
    if (value < 0) return styles.highlightCell;
    if (value > 0) return styles.alertCell;
  }
  
  return styles.dataCell;
}

/**
 * Formata número com 2 casas decimais
 */
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return Number(value).toFixed(2).replace('.', ',');
}

/**
 * Formata percentual
 */
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(2).replace('.', ',')}%`;
}

/**
 * Formata data
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

/**
 * Exporta dados de evolução para Excel
 */
export function exportEvolutionToExcel(
  comparisonData: ComparisonResponse,
  processedData: ProcessedEvolutionData
): void {
  const workbook = XLSX.utils.book_new();

  // 1. Aba: Resumo Executivo
  const summarySheet = createSummarySheet(comparisonData, processedData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Executivo');

  // 2. Aba: Evolução Geral
  const generalSheet = createGeneralSheet(processedData);
  XLSX.utils.book_append_sheet(workbook, generalSheet, 'Evolução Geral');

  // 3. Aba: Por Disciplina - Notas
  const subjectsNotesSheet = createSubjectsNotesSheet(processedData);
  XLSX.utils.book_append_sheet(workbook, subjectsNotesSheet, 'Por Disciplina - Notas');

  // 4. Aba: Por Disciplina - Proficiência
  const subjectsProficiencySheet = createSubjectsProficiencySheet(processedData);
  XLSX.utils.book_append_sheet(workbook, subjectsProficiencySheet, 'Por Disciplina - Proficiência');

  // 5. Aba: Níveis de Proficiência
  const levelsSheet = createLevelsSheet(processedData);
  XLSX.utils.book_append_sheet(workbook, levelsSheet, 'Níveis de Proficiência');

  // 6. Aba: Taxa de Aprovação
  const approvalSheet = createApprovalSheet(processedData);
  XLSX.utils.book_append_sheet(workbook, approvalSheet, 'Taxa de Aprovação');

  // 7. Aba: Comparações Detalhadas
  const comparisonsSheet = createComparisonsSheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, comparisonsSheet, 'Comparações Detalhadas');

  // Gerar nome do arquivo com data
  const fileName = `Evolucao_Avaliacoes_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Salvar arquivo
  XLSX.writeFile(workbook, fileName);
}

/**
 * Cria aba de Resumo Executivo
 */
function createSummarySheet(
  comparisonData: ComparisonResponse,
  processedData: ProcessedEvolutionData
): XLSX.WorkSheet {
  const data: any[] = [];
  
  // Título principal
  data.push(['RESUMO EXECUTIVO - ANÁLISE DE EVOLUÇÃO']);
  data.push([]);
  
  // Informações das Avaliações
  data.push(['AVALIAÇÕES COMPARADAS']);
  data.push(['Avaliação', 'Data de Aplicação']);
  
  const sortedEvaluations = [...comparisonData.evaluations].sort((a, b) => a.order - b.order);
  sortedEvaluations.forEach((evaluation) => {
    data.push([
      evaluation.title,
      formatDate(evaluation.application_date || evaluation.created_at),
    ]);
  });
  
  data.push([]);
  
  // Estatísticas Principais
  data.push(['ESTATÍSTICAS PRINCIPAIS']);
  
  // Calcular estatísticas
  const mergedGeneral = processedData.generalData?.[0] || {};
  const etapas: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const etapaKey = `etapa${i}`;
    const value = (mergedGeneral as any)[etapaKey];
    if (value !== null && value !== undefined) {
      etapas.push(Number(value));
    }
  }
  
  if (etapas.length > 0) {
    const media = etapas.reduce((sum, val) => sum + val, 0) / etapas.length;
    const melhorNota = Math.max(...etapas);
    const piorNota = Math.min(...etapas);
    const variacaoTotal = etapas.length > 1 
      ? ((etapas[etapas.length - 1] - etapas[0]) / etapas[0]) * 100 
      : 0;
    
    data.push(['Métrica', 'Valor', 'Interpretação']);
    data.push(['Média Geral', formatNumber(media), media >= 7 ? '✓ Meta alcançada' : '⚠ Atenção necessária']);
    data.push(['Melhor Resultado', formatNumber(melhorNota), 'Melhor desempenho']);
    data.push(['Pior Resultado', formatNumber(piorNota), 'Pior desempenho']);
    data.push(['Variação Total', formatPercent(variacaoTotal), variacaoTotal > 0 ? '↑ Melhoria' : variacaoTotal < 0 ? '↓ Queda' : '→ Estável']);
    data.push(['Total de Avaliações', etapas.length.toString(), `${etapas.length} avaliação(ões) comparada(s)`]);
  }
  
  data.push([]);
  
  // Proficiência Geral
  const mergedProficiency = processedData.proficiencyData?.[0] || {};
  const proficiencias: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const etapaKey = `etapa${i}`;
    const value = (mergedProficiency as any)[etapaKey];
    if (value !== null && value !== undefined) {
      proficiencias.push(Number(value));
    }
  }
  
  if (proficiencias.length > 0) {
    data.push(['PROFICIÊNCIA GERAL']);
    data.push(['Métrica', 'Valor']);
    const mediaProf = proficiencias.reduce((sum, val) => sum + val, 0) / proficiencias.length;
    const melhorProf = Math.max(...proficiencias);
    const piorProf = Math.min(...proficiencias);
    const variacaoProf = proficiencias.length > 1 
      ? ((proficiencias[proficiencias.length - 1] - proficiencias[0]) / proficiencias[0]) * 100 
      : 0;
    
    data.push(['Média de Proficiência', formatNumber(mediaProf)]);
    data.push(['Maior Proficiência', formatNumber(melhorProf)]);
    data.push(['Menor Proficiência', formatNumber(piorProf)]);
    data.push(['Variação', formatPercent(variacaoProf)]);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Aplicar estilos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Título principal
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (worksheet[titleCell]) {
    worksheet[titleCell].s = {
      ...styles.mainHeader,
      font: { ...styles.mainHeader.font, size: 16 },
    };
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  }
  
  // Seções
  let currentRow = 2;
  for (let row = 0; row <= range.e.r; row++) {
    const cellA = XLSX.utils.encode_cell({ r: row, c: 0 });
    const cellB = XLSX.utils.encode_cell({ r: row, c: 1 });
    const cellC = XLSX.utils.encode_cell({ r: row, c: 2 });
    
    if (worksheet[cellA]) {
      const value = worksheet[cellA].v;
      if (typeof value === 'string' && value.toUpperCase().includes('AVALIAÇÕES') || 
          value.toUpperCase().includes('ESTATÍSTICAS') || 
          value.toUpperCase().includes('PROFICIÊNCIA')) {
        worksheet[cellA].s = styles.sectionTitle;
        if (worksheet[cellB]) worksheet[cellB].s = styles.sectionTitle;
        if (worksheet[cellC]) worksheet[cellC].s = styles.sectionTitle;
      } else if (value === 'Avaliação' || value === 'Métrica' || value === 'Data de Aplicação' || value === 'Valor' || value === 'Interpretação') {
        worksheet[cellA].s = styles.subHeader;
        if (worksheet[cellB]) worksheet[cellB].s = styles.subHeader;
        if (worksheet[cellC]) worksheet[cellC].s = styles.subHeader;
      } else if (value && typeof value === 'string' && !value.includes('RESUMO')) {
        worksheet[cellA].s = styles.dataCell;
        if (worksheet[cellB]) worksheet[cellB].s = styles.dataCell;
        if (worksheet[cellC]) worksheet[cellC].s = styles.dataCell;
      }
    }
  }
  
  // Ajustar larguras
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 30 },
  ];
  
  return worksheet;
}

/**
 * Cria aba de Evolução Geral
 */
function createGeneralSheet(processedData: ProcessedEvolutionData): XLSX.WorkSheet {
  const data: any[] = [];
  
  const numEvaluations = processedData.evaluationNames.length;
  const evaluationColumns: string[] = [];
  const variacaoColumns: string[] = [];
  
  for (let i = 0; i < numEvaluations; i++) {
    evaluationColumns.push(processedData.evaluationNames[i] || `Avaliação ${i + 1}`);
  }
  
  for (let i = 1; i < numEvaluations; i++) {
    variacaoColumns.push(`Variação ${i}→${i + 1}`);
  }
  
  // Cabeçalho
  const headerRow: any[] = ['Métrica', ...evaluationColumns, ...variacaoColumns];
  data.push(headerRow);
  
  // Processar dados gerais
  const processEvolutionData = (evolutionData: any[], metricName: string) => {
    if (!evolutionData || evolutionData.length === 0) return;
    
    const row = evolutionData[0];
    const rowData: any[] = [metricName];
    
    // Valores das avaliações
    for (let i = 1; i <= numEvaluations; i++) {
      const etapaKey = `etapa${i}`;
      const value = (row as any)[etapaKey];
      rowData.push(value !== null && value !== undefined ? Number(value) : null);
    }
    
    // Variações
    for (let i = 1; i < numEvaluations; i++) {
      const variacaoKey = `variacao_${i}_${i + 1}`;
      const value = (row as any)[variacaoKey];
      rowData.push(value !== null && value !== undefined ? Number(value) : null);
    }
    
    data.push(rowData);
  };
  
  // Adicionar dados
  if (processedData.generalData && processedData.generalData.length > 0) {
    processEvolutionData(processedData.generalData, 'Média Geral (Notas)');
  }
  
  if (processedData.proficiencyData && processedData.proficiencyData.length > 0) {
    processEvolutionData(processedData.proficiencyData, 'Média Geral (Proficiência)');
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Aplicar estilos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Cabeçalho
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = styles.mainHeader;
  }
  
  // Dados com formatação condicional
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      const value = worksheet[cellAddress].v;
      
      // Primeira coluna (métrica) - estilo padrão
      if (col === 0) {
        worksheet[cellAddress].s = {
          ...styles.dataCell,
          alignment: { horizontal: 'left', vertical: 'center' },
          font: { ...styles.dataCell.font, bold: true },
        };
      } 
      // Colunas de variação - formatação condicional
      else if (col > numEvaluations) {
        const numValue = typeof value === 'number' ? value : null;
        worksheet[cellAddress].s = getConditionalStyle(numValue, 'positive');
        if (numValue !== null) {
          // Dividir por 100 porque os valores já vêm como percentuais (5.5 = 5.5%)
          // O Excel multiplica por 100 ao aplicar formato %, então precisamos dividir antes
          worksheet[cellAddress].v = numValue / 100;
          worksheet[cellAddress].z = '0.00%';
        }
      }
      // Colunas de valores - estilo padrão
      else {
        worksheet[cellAddress].s = styles.dataCell;
        if (typeof value === 'number') {
          worksheet[cellAddress].z = '0.00';
        }
      }
    }
  }
  
  // Ajustar larguras
  const colWidths = [
    { wch: 30 },
    ...evaluationColumns.map(() => ({ wch: 18 })),
    ...variacaoColumns.map(() => ({ wch: 15 })),
  ];
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

/**
 * Cria aba de Por Disciplina - Notas
 */
function createSubjectsNotesSheet(processedData: ProcessedEvolutionData): XLSX.WorkSheet {
  const data: any[] = [];
  
  const numEvaluations = processedData.evaluationNames.length;
  const evaluationColumns: string[] = [];
  const variacaoColumns: string[] = [];
  
  for (let i = 0; i < numEvaluations; i++) {
    evaluationColumns.push(processedData.evaluationNames[i] || `Avaliação ${i + 1}`);
  }
  
  for (let i = 1; i < numEvaluations; i++) {
    variacaoColumns.push(`Variação ${i}→${i + 1}`);
  }
  
  // Cabeçalho
  const headerRow: any[] = ['Disciplina', ...evaluationColumns, ...variacaoColumns];
  data.push(headerRow);
  
  // Processar dados por disciplina (notas)
  Object.keys(processedData.subjectData).forEach((subjectName) => {
    const subjectData = processedData.subjectData[subjectName];
    if (subjectData && subjectData.length > 0) {
      const row = subjectData[0];
      const rowData: any[] = [subjectName];
      
      for (let i = 1; i <= numEvaluations; i++) {
        const etapaKey = `etapa${i}`;
        const value = (row as any)[etapaKey];
        rowData.push(value !== null && value !== undefined ? Number(value) : null);
      }
      
      for (let i = 1; i < numEvaluations; i++) {
        const variacaoKey = `variacao_${i}_${i + 1}`;
        const value = (row as any)[variacaoKey];
        rowData.push(value !== null && value !== undefined ? Number(value) : null);
      }
      
      data.push(rowData);
    }
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Aplicar estilos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Cabeçalho
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = styles.mainHeader;
  }
  
  // Dados
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      const value = worksheet[cellAddress].v;
      
      // Primeira coluna (disciplina)
      if (col === 0) {
        worksheet[cellAddress].s = {
          ...styles.dataCell,
          alignment: { horizontal: 'left', vertical: 'center' },
          font: { ...styles.dataCell.font, bold: true },
        };
      }
       // Colunas de variação
       else if (col > numEvaluations) {
         const numValue = typeof value === 'number' ? value : null;
         worksheet[cellAddress].s = getConditionalStyle(numValue, 'positive');
         if (numValue !== null) {
           // Dividir por 100 porque os valores já vêm como percentuais (5.5 = 5.5%)
           // O Excel multiplica por 100 ao aplicar formato %, então precisamos dividir antes
           worksheet[cellAddress].v = numValue / 100;
           worksheet[cellAddress].z = '0.00%';
         }
       }
      // Colunas de valores
      else {
        worksheet[cellAddress].s = styles.dataCell;
        if (typeof value === 'number') {
          worksheet[cellAddress].z = '0.00';
        }
      }
    }
  }
  
  // Ajustar larguras
  const colWidths = [
    { wch: 25 },
    ...evaluationColumns.map(() => ({ wch: 18 })),
    ...variacaoColumns.map(() => ({ wch: 15 })),
  ];
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

/**
 * Cria aba de Por Disciplina - Proficiência
 */
function createSubjectsProficiencySheet(processedData: ProcessedEvolutionData): XLSX.WorkSheet {
  const data: any[] = [];
  
  const numEvaluations = processedData.evaluationNames.length;
  const evaluationColumns: string[] = [];
  const variacaoColumns: string[] = [];
  
  for (let i = 0; i < numEvaluations; i++) {
    evaluationColumns.push(processedData.evaluationNames[i] || `Avaliação ${i + 1}`);
  }
  
  for (let i = 1; i < numEvaluations; i++) {
    variacaoColumns.push(`Variação ${i}→${i + 1}`);
  }
  
  // Cabeçalho
  const headerRow: any[] = ['Disciplina', ...evaluationColumns, ...variacaoColumns];
  data.push(headerRow);
  
  // Processar dados por disciplina (proficiência)
  Object.keys(processedData.subjectProficiencyData).forEach((subjectName) => {
    const subjectData = processedData.subjectProficiencyData[subjectName];
    if (subjectData && subjectData.length > 0) {
      const row = subjectData[0];
      const rowData: any[] = [subjectName];
      
      for (let i = 1; i <= numEvaluations; i++) {
        const etapaKey = `etapa${i}`;
        const value = (row as any)[etapaKey];
        rowData.push(value !== null && value !== undefined ? Number(value) : null);
      }
      
      for (let i = 1; i < numEvaluations; i++) {
        const variacaoKey = `variacao_${i}_${i + 1}`;
        const value = (row as any)[variacaoKey];
        rowData.push(value !== null && value !== undefined ? Number(value) : null);
      }
      
      data.push(rowData);
    }
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Aplicar estilos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Cabeçalho
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = styles.mainHeader;
  }
  
  // Dados
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      const value = worksheet[cellAddress].v;
      
      // Primeira coluna (disciplina)
      if (col === 0) {
        worksheet[cellAddress].s = {
          ...styles.dataCell,
          alignment: { horizontal: 'left', vertical: 'center' },
          font: { ...styles.dataCell.font, bold: true },
        };
      }
       // Colunas de variação
       else if (col > numEvaluations) {
         const numValue = typeof value === 'number' ? value : null;
         worksheet[cellAddress].s = getConditionalStyle(numValue, 'positive');
         if (numValue !== null) {
           // Dividir por 100 porque os valores já vêm como percentuais (5.5 = 5.5%)
           // O Excel multiplica por 100 ao aplicar formato %, então precisamos dividir antes
           worksheet[cellAddress].v = numValue / 100;
           worksheet[cellAddress].z = '0.00%';
         }
       }
      // Colunas de valores
      else {
        worksheet[cellAddress].s = styles.dataCell;
        if (typeof value === 'number') {
          worksheet[cellAddress].z = '0.00';
        }
      }
    }
  }
  
  // Ajustar larguras
  const colWidths = [
    { wch: 25 },
    ...evaluationColumns.map(() => ({ wch: 18 })),
    ...variacaoColumns.map(() => ({ wch: 15 })),
  ];
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

/**
 * Cria aba de Níveis de Proficiência
 */
function createLevelsSheet(processedData: ProcessedEvolutionData): XLSX.WorkSheet {
  const data: any[] = [];
  
  const numEvaluations = processedData.evaluationNames.length;
  const evaluationColumns: string[] = [];
  const variacaoColumns: string[] = [];
  
  for (let i = 0; i < numEvaluations; i++) {
    evaluationColumns.push(processedData.evaluationNames[i] || `Avaliação ${i + 1}`);
  }
  
  for (let i = 1; i < numEvaluations; i++) {
    variacaoColumns.push(`Variação ${i}→${i + 1}`);
  }
  
  // Cabeçalho
  const headerRow: any[] = ['Nível de Proficiência', ...evaluationColumns, ...variacaoColumns];
  data.push(headerRow);
  
  // Processar dados de níveis
  Object.keys(processedData.levelsData).forEach((levelName) => {
    const levelData = processedData.levelsData[levelName];
    if (levelData && levelData.length > 0) {
      const row = levelData[0];
      const rowData: any[] = [levelName];
      
      for (let i = 1; i <= numEvaluations; i++) {
        const etapaKey = `etapa${i}`;
        const value = (row as any)[etapaKey];
        rowData.push(value !== null && value !== undefined ? Number(value) : null);
      }
      
      for (let i = 1; i < numEvaluations; i++) {
        const variacaoKey = `variacao_${i}_${i + 1}`;
        const value = (row as any)[variacaoKey];
        rowData.push(value !== null && value !== undefined ? Number(value) : null);
      }
      
      data.push(rowData);
    }
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Aplicar estilos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Cabeçalho
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = styles.mainHeader;
  }
  
  // Dados
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      const value = worksheet[cellAddress].v;
      
      // Primeira coluna (nível)
      if (col === 0) {
        worksheet[cellAddress].s = {
          ...styles.dataCell,
          alignment: { horizontal: 'left', vertical: 'center' },
          font: { ...styles.dataCell.font, bold: true },
        };
      }
       // Colunas de variação
       else if (col > numEvaluations) {
         const numValue = typeof value === 'number' ? value : null;
         worksheet[cellAddress].s = getConditionalStyle(numValue, 'positive');
         if (numValue !== null) {
           // Dividir por 100 porque os valores já vêm como percentuais (5.5 = 5.5%)
           // O Excel multiplica por 100 ao aplicar formato %, então precisamos dividir antes
           worksheet[cellAddress].v = numValue / 100;
           worksheet[cellAddress].z = '0.00%';
         }
       }
      // Colunas de valores
      else {
        worksheet[cellAddress].s = styles.dataCell;
        if (typeof value === 'number') {
          worksheet[cellAddress].z = '0';
        }
      }
    }
  }
  
  // Ajustar larguras
  const colWidths = [
    { wch: 25 },
    ...evaluationColumns.map(() => ({ wch: 18 })),
    ...variacaoColumns.map(() => ({ wch: 15 })),
  ];
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

/**
 * Cria aba de Taxa de Aprovação
 */
function createApprovalSheet(processedData: ProcessedEvolutionData): XLSX.WorkSheet {
  const data: any[] = [];
  
  const numEvaluations = processedData.evaluationNames.length;
  const evaluationColumns: string[] = [];
  const variacaoColumns: string[] = [];
  
  for (let i = 0; i < numEvaluations; i++) {
    evaluationColumns.push(processedData.evaluationNames[i] || `Avaliação ${i + 1}`);
  }
  
  for (let i = 1; i < numEvaluations; i++) {
    variacaoColumns.push(`Variação ${i}→${i + 1}`);
  }
  
  // Cabeçalho
  const headerRow: any[] = ['Métrica', ...evaluationColumns, ...variacaoColumns];
  data.push(headerRow);
  
  // Processar dados de aprovação
  if (processedData.approvalData && processedData.approvalData.length > 0) {
    const row = processedData.approvalData[0];
    const rowData: any[] = ['Taxa de Aprovação (%)'];
    
    for (let i = 1; i <= numEvaluations; i++) {
      const etapaKey = `etapa${i}`;
      const value = (row as any)[etapaKey];
      rowData.push(value !== null && value !== undefined ? Number(value) : null);
    }
    
    for (let i = 1; i < numEvaluations; i++) {
      const variacaoKey = `variacao_${i}_${i + 1}`;
      const value = (row as any)[variacaoKey];
      rowData.push(value !== null && value !== undefined ? Number(value) : null);
    }
    
    data.push(rowData);
  } else {
    data.push(['Taxa de Aprovação (%)', ...Array(evaluationColumns.length + variacaoColumns.length).fill('-')]);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Aplicar estilos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Cabeçalho
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = styles.mainHeader;
  }
  
  // Dados
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      const value = worksheet[cellAddress].v;
      
      // Primeira coluna (métrica)
      if (col === 0) {
        worksheet[cellAddress].s = {
          ...styles.dataCell,
          alignment: { horizontal: 'left', vertical: 'center' },
          font: { ...styles.dataCell.font, bold: true },
        };
      }
       // Colunas de variação
       else if (col > numEvaluations) {
         const numValue = typeof value === 'number' ? value : null;
         worksheet[cellAddress].s = getConditionalStyle(numValue, 'positive');
         if (numValue !== null) {
           // Dividir por 100 porque os valores já vêm como percentuais (5.5 = 5.5%)
           // O Excel multiplica por 100 ao aplicar formato %, então precisamos dividir antes
           worksheet[cellAddress].v = numValue / 100;
           worksheet[cellAddress].z = '0.00%';
         }
       }
      // Colunas de valores (taxa de aprovação já é percentual)
      else {
        worksheet[cellAddress].s = styles.dataCell;
        if (typeof value === 'number') {
          // Taxa de aprovação também precisa ser dividida por 100 se já vier como percentual
          // Verificar se o valor está no range 0-100 (percentual) ou 0-1 (decimal)
          if (value > 1) {
            // Está como percentual, dividir por 100
            worksheet[cellAddress].v = value / 100;
          } else {
            // Já está como decimal, usar direto
            worksheet[cellAddress].v = value;
          }
          worksheet[cellAddress].z = '0.00%';
        }
      }
    }
  }
  
  // Ajustar larguras
  const colWidths = [
    { wch: 25 },
    ...evaluationColumns.map(() => ({ wch: 18 })),
    ...variacaoColumns.map(() => ({ wch: 15 })),
  ];
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

/**
 * Cria aba de Comparações Detalhadas
 */
function createComparisonsSheet(comparisonData: ComparisonResponse): XLSX.WorkSheet {
  const data: any[] = [];
  
  // Cabeçalho
  data.push(['Avaliação Anterior', 'Avaliação Posterior', 'Métrica', 'Valor Anterior', 'Valor Posterior', 'Evolução (%)', 'Tendência']);
  
  // Processar cada comparação
  comparisonData.comparisons.forEach((comparison) => {
    const fromTitle = comparison.from_evaluation.title;
    const toTitle = comparison.to_evaluation.title;
    
    // Média Geral - Notas
    const general = comparison.general_comparison;
    const notaEvol = general.average_grade.evolution.percentage;
    const notaDir = general.average_grade.evolution.direction === 'increase' ? '↑ Melhoria' : 
                    general.average_grade.evolution.direction === 'decrease' ? '↓ Queda' : '→ Estável';
    
    data.push([
      fromTitle,
      toTitle,
      'Média Geral (Notas)',
      formatNumber(general.average_grade.evaluation_1),
      formatNumber(general.average_grade.evaluation_2),
      notaEvol, // Usar número direto, não string formatada
      notaDir,
    ]);
    
    // Média Geral - Proficiência
    if (general.average_proficiency) {
      const profEvol = general.average_proficiency.evolution.percentage;
      const profDir = general.average_proficiency.evolution.direction === 'increase' ? '↑ Melhoria' : 
                      general.average_proficiency.evolution.direction === 'decrease' ? '↓ Queda' : '→ Estável';
      
      data.push([
        fromTitle,
        toTitle,
        'Média Geral (Proficiência)',
        formatNumber(general.average_proficiency.evaluation_1),
        formatNumber(general.average_proficiency.evaluation_2),
        profEvol, // Usar número direto, não string formatada
        profDir,
      ]);
    }
    
    // Total de Alunos
    const totalDiff = general.total_students.evaluation_2 - general.total_students.evaluation_1;
    const totalDir = totalDiff > 0 ? '↑ Aumento' : totalDiff < 0 ? '↓ Diminuição' : '→ Estável';
    
    data.push([
      fromTitle,
      toTitle,
      'Total de Alunos',
      general.total_students.evaluation_1.toString(),
      general.total_students.evaluation_2.toString(),
      totalDiff.toString(),
      totalDir,
    ]);
    
    // Dados por Disciplina
    Object.keys(comparison.subject_comparison).forEach((subjectName) => {
      const subject = comparison.subject_comparison[subjectName];
      
      // Notas por disciplina
      const notaSubjEvol = subject.average_grade.evolution.percentage;
      const notaSubjDir = subject.average_grade.evolution.direction === 'increase' ? '↑ Melhoria' : 
                          subject.average_grade.evolution.direction === 'decrease' ? '↓ Queda' : '→ Estável';
      
      data.push([
        fromTitle,
        toTitle,
        `${subjectName} - Notas`,
        formatNumber(subject.average_grade.evaluation_1),
        formatNumber(subject.average_grade.evaluation_2),
        notaSubjEvol, // Usar número direto, não string formatada
        notaSubjDir,
      ]);
      
      // Proficiência por disciplina
      if (subject.average_proficiency) {
        const profSubjEvol = subject.average_proficiency.evolution.percentage;
        const profSubjDir = subject.average_proficiency.evolution.direction === 'increase' ? '↑ Melhoria' : 
                            subject.average_proficiency.evolution.direction === 'decrease' ? '↓ Queda' : '→ Estável';
        
        data.push([
          fromTitle,
          toTitle,
          `${subjectName} - Proficiência`,
          formatNumber(subject.average_proficiency.evaluation_1),
          formatNumber(subject.average_proficiency.evaluation_2),
          profSubjEvol, // Usar número direto, não string formatada
          profSubjDir,
        ]);
      }
    });
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Aplicar estilos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Cabeçalho
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = styles.mainHeader;
  }
  
  // Dados com formatação condicional
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      const value = worksheet[cellAddress].v;
      
       // Coluna de evolução (percentual)
       if (col === 5) {
         let numValue: number | null = null;
         
         if (typeof value === 'number') {
           numValue = value;
         } else if (typeof value === 'string' && value !== '-') {
           numValue = parseFloat(value.replace('%', '').replace(',', '.'));
         }
         
         if (numValue !== null && !isNaN(numValue)) {
           worksheet[cellAddress].s = getConditionalStyle(numValue, 'positive');
           // Dividir por 100 porque os valores já vêm como percentuais (5.5 = 5.5%)
           // O Excel multiplica por 100 ao aplicar formato %, então precisamos dividir antes
           worksheet[cellAddress].v = numValue / 100;
           worksheet[cellAddress].z = '0.00%';
         } else {
           worksheet[cellAddress].s = styles.dataCell;
         }
       }
      // Coluna de tendência
      else if (col === 6) {
        if (typeof value === 'string') {
          if (value.includes('↑')) {
            worksheet[cellAddress].s = styles.highlightCell;
          } else if (value.includes('↓')) {
            worksheet[cellAddress].s = styles.alertCell;
          } else {
            worksheet[cellAddress].s = styles.dataCell;
          }
        }
      }
      // Outras colunas
      else {
        worksheet[cellAddress].s = styles.dataCell;
      }
    }
  }
  
  // Ajustar larguras
  worksheet['!cols'] = [
    { wch: 30 }, // Avaliação Anterior
    { wch: 30 }, // Avaliação Posterior
    { wch: 30 }, // Métrica
    { wch: 15 }, // Valor Anterior
    { wch: 15 }, // Valor Posterior
    { wch: 15 }, // Evolução
    { wch: 15 }, // Tendência
  ];
  
  return worksheet;
}

