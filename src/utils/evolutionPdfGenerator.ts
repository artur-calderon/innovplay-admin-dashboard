import type { ProcessedEvolutionData } from '@/components/evolution/EvolutionCharts';
import type { ComparisonResponse } from '@/services/evaluationComparisonApi';

interface PDFDocument {
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
  setFont: (font: string, style: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (width: number) => void;
  getTextWidth: (text: string) => number;
  text: (text: string, x: number, y: number, options?: { align?: string; maxWidth?: number }) => void;
  rect: (x: number, y: number, w: number, h: number, mode?: string) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, mode: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addPage: (orientation?: string) => void;
  save: (filename: string) => void;
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

interface ChartOptions {
  type: 'nota' | 'proficiencia' | 'quantidade';
  yDomain?: [number, number];
  showVariation?: boolean;
  title?: string;
}

interface SegmentData {
  up: number | null;
  down: number | null;
  flat: number | null;
}

// Paleta de cores
const CUSTOM_COLORS = ['#81338A', '#758E4F', '#F6AE2D', '#33658A', '#86BBD8'];
const PROFICIENCY_COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];

// Cores para linhas segmentadas
const LINE_COLORS = {
  up: [16, 185, 129] as [number, number, number], // Verde
  down: [239, 68, 68] as [number, number, number], // Vermelho
  flat: [107, 114, 128] as [number, number, number], // Cinza
};

// Função auxiliar: obter cor baseada no índice
function getColorByIndex(index: number): string {
  return CUSTOM_COLORS[index % CUSTOM_COLORS.length];
}

// Função auxiliar: converter hex para RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

// Função auxiliar: calcular variação percentual
function calculateVariation(from: number, to: number): number {
  if (from === 0) return to === 0 ? 0 : 100;
  return ((to - from) / from) * 100;
}

// Função auxiliar: segmentar dados (up/down/flat)
function segmentData(data: number[], threshold = 0.1): SegmentData[] {
  const segments: SegmentData[] = [];
  
  for (let i = 0; i < data.length; i++) {
    segments.push({ up: null, down: null, flat: null });
  }

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const cur = data[i];
    
    if (cur > prev + threshold) {
      segments[i - 1].up = prev;
      segments[i].up = cur;
    } else if (cur < prev - threshold) {
      segments[i - 1].down = prev;
      segments[i].down = cur;
    } else {
      segments[i - 1].flat = prev;
      segments[i].flat = cur;
    }
  }

  return segments;
}

// Função auxiliar: adicionar rodapé
export function addFooter(doc: PDFDocument, pageNum: number, pageWidth: number, pageHeight: number, margin: number): void {
  const centerX = pageWidth / 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Afirme Play Soluções Educativas', margin, pageHeight - 10);
  doc.text(`Página ${pageNum}`, centerX, pageHeight - 10, { align: 'center' });
  doc.text(new Date().toLocaleString('pt-BR'), pageWidth - margin, pageHeight - 10, { align: 'right' });
}

// Função auxiliar: adicionar cabeçalho
export function addHeader(
  doc: PDFDocument,
  title: string,
  evaluationNames: string[],
  pageWidth: number
): number {
  let y = 20;
  const centerX = pageWidth / 2;
  const margin = 15;

  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('ANÁLISE DE EVOLUÇÃO', centerX, y, { align: 'center' });
  y += 8;

  // Informações das avaliações
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const evaluationsText = evaluationNames.join(' • ');
  doc.text(evaluationsText, centerX, y, { align: 'center', maxWidth: pageWidth - 2 * margin });
  y += 8;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Título da seção
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, centerX, y, { align: 'center' });
  y += 10;

  return y;
}

// Função auxiliar: desenhar gráfico composto (barras + linhas) com layout melhorado
export function drawComposedChart(
  doc: PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  data: ChartDataPoint[],
  options: ChartOptions
): void {
  if (data.length === 0) return;

  // Área do gráfico com margens maiores
  const chartMarginX = 25;
  const chartMarginY = 15;
  const chartAreaX = x + chartMarginX;
  const chartAreaY = y + chartMarginY;
  const chartAreaW = w - (chartMarginX * 2);
  const chartAreaH = h - (chartMarginY * 2) - 20; // Espaço extra para labels

  const values = data.map(d => d.value);
  const segments = segmentData(values);
  const yDomain = options.yDomain || [0, Math.max(...values, 1) * 1.1];
  const yRange = yDomain[1] - yDomain[0];

  // Grid de fundo
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.1);
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const yPos = chartAreaY + (chartAreaH * (1 - i / gridLines));
    doc.line(chartAreaX, yPos, chartAreaX + chartAreaW, yPos);
    
    // Labels do eixo Y (à esquerda)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const labelValue = yDomain[0] + (yRange * i / gridLines);
    const labelText = options.type === 'nota' 
      ? labelValue.toFixed(1).replace('.', ',')
      : labelValue.toFixed(0);
    doc.text(labelText, x + 5, yPos + 2);
  }

  // Eixo X (linha base)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(chartAreaX, chartAreaY + chartAreaH, chartAreaX + chartAreaW, chartAreaY + chartAreaH);

  // Eixo Y (linha vertical)
  doc.line(chartAreaX, chartAreaY, chartAreaX, chartAreaY + chartAreaH);

  // Calcular dimensões das barras com espaçamento adequado
  const numBars = data.length;
  const barSpacing = chartAreaW / (numBars + 1); // Espaço entre barras
  const barWidth = barSpacing * 0.6; // Largura da barra (60% do espaço)
  const barStartOffset = barSpacing * 0.2; // Offset inicial
  
  // Desenhar barras
  data.forEach((item, index) => {
    const barX = chartAreaX + barStartOffset + index * barSpacing;
    const barHeight = (item.value / yDomain[1]) * chartAreaH;
    const barY = chartAreaY + chartAreaH - barHeight;

    // Desenhar barra
    const [r, g, b] = hexToRgb(item.color);
    doc.setFillColor(r, g, b);
    doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');

    // Borda da barra
    doc.setDrawColor(r * 0.7, g * 0.7, b * 0.7);
    doc.setLineWidth(0.2);
    doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2);

    // Label do valor na barra (dentro da barra se houver espaço, senão acima)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const labelText = options.type === 'nota' 
      ? item.value.toFixed(1).replace('.', ',')
      : item.value.toFixed(0);
    
    if (barHeight > 8) {
      // Dentro da barra (texto branco)
      doc.setTextColor(255, 255, 255);
      doc.text(labelText, barX + barWidth / 2, barY + barHeight / 2 + 2, { align: 'center' });
    } else {
      // Acima da barra (texto preto)
      doc.setTextColor(0, 0, 0);
      doc.text(labelText, barX + barWidth / 2, barY - 3, { align: 'center' });
    }

    // Label do eixo X (nome da avaliação) - abaixo do gráfico
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    const nameText = item.name.length > 15 ? item.name.substring(0, 13) + '...' : item.name;
    doc.text(nameText, barX + barWidth / 2, chartAreaY + chartAreaH + 8, { align: 'center' });
  });

  // Desenhar linhas segmentadas com labels de variação posicionados adequadamente
  data.forEach((item, index) => {
    if (index === 0) return;

    const prevValue = data[index - 1].value;
    const curValue = item.value;
    const prevBarCenterX = chartAreaX + barStartOffset + (index - 1) * barSpacing + barWidth / 2;
    const curBarCenterX = chartAreaX + barStartOffset + index * barSpacing + barWidth / 2;
    const prevBarTopY = chartAreaY + chartAreaH - (prevValue / yDomain[1]) * chartAreaH;
    const curBarTopY = chartAreaY + chartAreaH - (curValue / yDomain[1]) * chartAreaH;

    const segment = segments[index];
    let lineColor: [number, number, number] = LINE_COLORS.flat;
    let hasSegment = false;

    if (segment.up !== null && segment.up !== undefined) {
      lineColor = LINE_COLORS.up;
      hasSegment = true;
    } else if (segment.down !== null && segment.down !== undefined) {
      lineColor = LINE_COLORS.down;
      hasSegment = true;
    } else if (segment.flat !== null && segment.flat !== undefined) {
      lineColor = LINE_COLORS.flat;
      hasSegment = true;
    }

    if (hasSegment) {
      // Desenhar linha
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
      doc.setLineWidth(2.5);
      doc.line(prevBarCenterX, prevBarTopY, curBarCenterX, curBarTopY);

      // Label de variação percentual - posicionado acima da linha, evitando sobreposição
      if (options.showVariation) {
        const variation = calculateVariation(prevValue, curValue);
        const midX = (prevBarCenterX + curBarCenterX) / 2;
        const midY = (prevBarTopY + curBarTopY) / 2;
        
        // Calcular posição Y do label (acima da linha, com margem)
        const labelOffsetY = 8; // Distância acima da linha
        const labelY = Math.min(prevBarTopY, curBarTopY) - labelOffsetY;
        
        // Garantir que o label não fique muito alto (fora da área do gráfico)
        const minLabelY = chartAreaY - 5;
        const finalLabelY = Math.max(minLabelY, labelY);
        
        // Fundo branco para o label (para melhor legibilidade)
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        const labelText = `${variation > 0 ? '+' : ''}${variation.toFixed(1).replace('.', ',')}%`;
        const textWidth = doc.getTextWidth(labelText) || 20;
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(midX - textWidth / 2 - 2, finalLabelY - 3, textWidth + 4, 6, 1, 1, 'FD');
        
        // Texto do label
        doc.setTextColor(lineColor[0], lineColor[1], lineColor[2]);
        doc.text(labelText, midX, finalLabelY + 1, { align: 'center' });
      }
    }
  });
}

// Função auxiliar: calcular estatísticas gerais
export function calculateGeneralStats(processedData: ProcessedEvolutionData) {
  if (!processedData.generalData || processedData.generalData.length === 0) return null;

  const merged = processedData.generalData.reduce((acc, item) => {
    const key = (item.name || 'Geral').trim();
    if (!acc[key]) acc[key] = { name: key, etapas: [] };
    
    for (let i = 1; i <= 10; i++) {
      const etapaKey = `etapa${i}` as keyof typeof item;
      const value = (item as any)[etapaKey];
      if (value !== undefined && value !== null && typeof value === 'number') {
        acc[key].etapas.push(value);
      }
    }
    return acc;
  }, {} as Record<string, { name: string; etapas: number[] }>);

  const geral = Object.values(merged)[0];
  if (!geral || geral.etapas.length === 0) return null;

  const etapas = geral.etapas;
  const media = etapas.reduce((sum, val) => sum + val, 0) / etapas.length;
  const melhorNota = Math.max(...etapas);
  const piorNota = Math.min(...etapas);
  const variacaoTotal = etapas.length > 1 
    ? calculateVariation(etapas[0], etapas[etapas.length - 1]) 
    : 0;

  return {
    media,
    melhorNota,
    piorNota,
    variacaoTotal,
    totalAvaliacoes: etapas.length,
  };
}

// Função auxiliar: processar dados de uma série para gráfico
export function processDataSeries(
  rows: any[],
  evaluationNames: string[]
): { etapas: number[] } | null {
  if (!rows || rows.length === 0) return null;

  const merged = rows.reduce((acc, item) => {
    const key = (item.name || 'Geral').trim();
    if (!acc[key]) acc[key] = { name: key, etapas: [] };
    
    for (let i = 1; i <= 10; i++) {
      const etapaKey = `etapa${i}` as keyof typeof item;
      const value = (item as any)[etapaKey];
      if (value !== undefined && value !== null && typeof value === 'number') {
        acc[key].etapas.push(value);
      }
    }
    return acc;
  }, {} as Record<string, { name: string; etapas: number[] }>);

  const result = Object.values(merged)[0];
  if (!result || result.etapas.length === 0) return null;

  // Garantir que temos dados para todas as avaliações
  while (result.etapas.length < evaluationNames.length) {
    result.etapas.push(0);
  }

  return result;
}

// Função principal: gerar PDF completo
export async function generateEvolutionPDF(
  processedData: ProcessedEvolutionData,
  comparisonData: ComparisonResponse
): Promise<void> {
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as unknown as PDFDocument;
  
  let pageCount = 0;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ===== PÁGINA 1: Cabeçalho e Resumo Estatístico =====
  pageCount++;
  let startY = addHeader(doc, 'RESUMO ESTATÍSTICO', processedData.evaluationNames, pageWidth);

  const generalStats = calculateGeneralStats(processedData);
  if (generalStats) {
    const cardWidth = (pageWidth - 2 * margin - 5) / 2;
    const cardHeight = 28;
    const gap = 5;

    const cards = [
      { label: 'MÉDIA GERAL', value: generalStats.media.toFixed(1).replace('.', ','), unit: 'pontos' },
      { label: 'MELHOR RESULTADO', value: generalStats.melhorNota.toFixed(1).replace('.', ','), unit: 'pontos' },
      { label: 'VARIAÇÃO TOTAL', value: `${generalStats.variacaoTotal > 0 ? '+' : ''}${generalStats.variacaoTotal.toFixed(1)}%`, unit: 'período' },
      { label: 'TOTAL DE AVALIAÇÕES', value: generalStats.totalAvaliacoes.toString(), unit: 'avaliações' },
    ];

    cards.forEach((card, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = margin + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);

      // Card background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.1);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

      // Card label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(card.label, x + 3, y + 5, { maxWidth: cardWidth - 6 });

      // Card value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.text(card.value, x + 3, y + 15);

      // Card unit
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(card.unit, x + 3, y + 20);
    });

    startY += 2 * (cardHeight + gap) + 10;
  }

  addFooter(doc, pageCount, pageWidth, pageHeight, margin);

  // ===== PÁGINA 2: Gráficos Gerais =====
  doc.addPage();
  pageCount++;
  startY = addHeader(doc, 'GRÁFICOS GERAIS', processedData.evaluationNames, pageWidth);

  // Gráfico de Nota Geral
  if (processedData.generalData && processedData.generalData.length > 0) {
    const processed = processDataSeries(processedData.generalData, processedData.evaluationNames);
    if (processed && processed.etapas.length > 0) {
      const chartData: ChartDataPoint[] = processedData.evaluationNames.map((name, index) => ({
        name,
        value: processed.etapas[index] || 0,
        color: getColorByIndex(index),
      }));

      // Título do gráfico
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Nota Geral', margin, startY);

      drawComposedChart(
        doc,
        margin,
        startY + 5,
        pageWidth - 2 * margin,
        70,
        chartData,
        { type: 'nota', yDomain: [0, 10], showVariation: true, title: 'Nota Geral' }
      );

      startY += 85;
    }
  }

  // Verificar se precisa de nova página para o gráfico de proficiência
  if (startY + 85 > pageHeight - 30) {
    doc.addPage();
    pageCount++;
    startY = addHeader(doc, 'GRÁFICOS GERAIS - PROFICIÊNCIA', processedData.evaluationNames, pageWidth);
  }

  // Gráfico de Proficiência Geral
  if (processedData.proficiencyData && processedData.proficiencyData.length > 0) {
    const processed = processDataSeries(processedData.proficiencyData, processedData.evaluationNames);
    if (processed && processed.etapas.length > 0) {
      const chartData: ChartDataPoint[] = processedData.evaluationNames.map((name, index) => ({
        name,
        value: processed.etapas[index] || 0,
        color: PROFICIENCY_COLORS[index % PROFICIENCY_COLORS.length],
      }));

      // Título do gráfico
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Proficiência Geral', margin, startY);

      drawComposedChart(
        doc,
        margin,
        startY + 5,
        pageWidth - 2 * margin,
        70,
        chartData,
        { type: 'proficiencia', yDomain: [0, 425], showVariation: true, title: 'Proficiência Geral' }
      );
    }
  }

  addFooter(doc, pageCount, pageWidth, pageHeight, margin);

  // ===== PÁGINAS 3+: Gráficos por Disciplina =====
  if (processedData.subjectData && Object.keys(processedData.subjectData).length > 0) {
    Object.entries(processedData.subjectData).forEach(([subject, rows]) => {
      const processed = processDataSeries(rows, processedData.evaluationNames);
      if (!processed || processed.etapas.length === 0) return;

      // Verificar se precisa de nova página
      if (startY + 85 > pageHeight - 30) {
        doc.addPage();
        pageCount++;
        startY = addHeader(doc, `GRÁFICOS POR DISCIPLINA - ${subject.toUpperCase()}`, processedData.evaluationNames, pageWidth);
      } else {
        startY = addHeader(doc, `GRÁFICOS POR DISCIPLINA - ${subject.toUpperCase()}`, processedData.evaluationNames, pageWidth);
      }

      const chartData: ChartDataPoint[] = processedData.evaluationNames.map((name, index) => ({
        name,
        value: processed.etapas[index] || 0,
        color: getColorByIndex(index),
      }));

      // Gráfico de Notas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Notas - ${subject}`, margin, startY);

      drawComposedChart(
        doc,
        margin,
        startY + 5,
        pageWidth - 2 * margin,
        70,
        chartData,
        { type: 'nota', yDomain: [0, 10], showVariation: true, title: `Notas - ${subject}` }
      );

      startY += 85;

      // Gráfico de Proficiência (se disponível)
      const proficiencyRows = processedData.subjectProficiencyData[subject];
      if (proficiencyRows && proficiencyRows.length > 0) {
        const processedProf = processDataSeries(proficiencyRows, processedData.evaluationNames);
        if (processedProf && processedProf.etapas.length > 0) {
          // Verificar se precisa de nova página
          if (startY + 85 > pageHeight - 30) {
            addFooter(doc, pageCount, pageWidth, pageHeight, margin);
            doc.addPage();
            pageCount++;
            startY = addHeader(doc, `PROFICIÊNCIA - ${subject.toUpperCase()}`, processedData.evaluationNames, pageWidth);
          }

          const profChartData: ChartDataPoint[] = processedData.evaluationNames.map((name, index) => ({
            name,
            value: processedProf.etapas[index] || 0,
            color: PROFICIENCY_COLORS[index % PROFICIENCY_COLORS.length],
          }));

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(`Proficiência - ${subject}`, margin, startY);

          const yDomain: [number, number] = subject.toLowerCase().includes('matemática') || 
            subject.toLowerCase().includes('matematica') ? [0, 425] : [0, 400];

          drawComposedChart(
            doc,
            margin,
            startY + 5,
            pageWidth - 2 * margin,
            70,
            profChartData,
            { type: 'proficiencia', yDomain, showVariation: true, title: `Proficiência - ${subject}` }
          );

          startY += 85;
        }
      }

      addFooter(doc, pageCount, pageWidth, pageHeight, margin);
    });
  }

  // ===== PÁGINAS FINAIS: Gráficos por Níveis =====
  if (processedData.levelsData && Object.keys(processedData.levelsData).length > 0) {
    const levelColors: Record<string, string> = {
      'Abaixo do Básico': '#DC2626',
      'Básico': '#F59E0B',
      'Adequado': '#3B82F6',
      'Avançado': '#10B981',
    };

    Object.entries(processedData.levelsData).forEach(([levelName, rows]) => {
      const processed = processDataSeries(rows, processedData.evaluationNames);
      if (!processed || processed.etapas.length === 0) return;

      // Verificar se precisa de nova página
      if (startY + 85 > pageHeight - 30) {
        doc.addPage();
        pageCount++;
        startY = addHeader(doc, `GRÁFICOS POR NÍVEIS - ${levelName.toUpperCase()}`, processedData.evaluationNames, pageWidth);
      } else {
        startY = addHeader(doc, `GRÁFICOS POR NÍVEIS - ${levelName.toUpperCase()}`, processedData.evaluationNames, pageWidth);
      }

      const chartData: ChartDataPoint[] = processedData.evaluationNames.map((name, index) => ({
        name,
        value: processed.etapas[index] || 0,
        color: levelColors[levelName] || '#6B7280',
      }));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(levelName, margin, startY);

      const maxValue = Math.max(...chartData.map(d => d.value), 1);
      drawComposedChart(
        doc,
        margin,
        startY + 5,
        pageWidth - 2 * margin,
        70,
        chartData,
        { type: 'quantidade', yDomain: [0, maxValue * 1.1], showVariation: true, title: levelName }
      );

      startY += 85;
      addFooter(doc, pageCount, pageWidth, pageHeight, margin);
    });
  }

  // Salvar PDF
  const fileName = `relatorio-evolucao-${processedData.evaluationNames.join('-').replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
