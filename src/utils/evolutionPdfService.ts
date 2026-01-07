import type { ProcessedEvolutionData } from '@/components/evolution/EvolutionCharts';
import type { ComparisonResponse } from '@/services/evaluationComparisonApi';
import { EvolutionPDFLayout } from '@/components/evolution/EvolutionPDFLayout';
import React from 'react';
import { createRoot } from 'react-dom/client';

interface FilterInfo {
  state?: { id: string; name: string };
  municipality?: { id: string; name: string };
  school?: { id: string; name: string }; // Escola única (para compatibilidade)
  schools?: Array<{ id?: string; name: string }>; // Múltiplas escolas
  grade?: { id: string; name: string };
  class?: { id: string; name: string };
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Captura uma seção individual do HTML como canvas
 * Otimizado para performance
 */
async function captureSection(
  element: HTMLElement,
  html2canvas: any,
  scale: number = 1.0
): Promise<HTMLCanvasElement> {
  return await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    removeContainer: true, // Remove container temporário após captura
    imageTimeout: 0, // Não esperar por imagens externas
    ignoreElements: (el) => {
      // Ignorar elementos que não são visíveis
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return true;
      }
      
      // Ignorar elementos de formulário que não são necessários para o PDF
      const tagName = el.tagName?.toLowerCase();
      const formElements = ['input', 'textarea', 'select', 'button', 'form'];
      if (formElements.includes(tagName)) {
        return true;
      }
      
      // Ignorar labels não associados (que causam os warnings)
      if (tagName === 'label') {
        const forAttr = (el as HTMLLabelElement).htmlFor;
        const hasInput = el.querySelector('input, textarea, select');
        if (!forAttr && !hasInput) {
          return true;
        }
      }
      
      // Ignorar elementos com role de formulário que não são visíveis no PDF
      const role = el.getAttribute('role');
      if (role === 'textbox' || role === 'combobox' || role === 'button') {
        return true;
      }
      
      return false;
    },
  });
}

/**
 * Adiciona uma seção ao PDF, criando nova página se necessário
 * Retorna a nova posição Y após adicionar a seção
 */
function addSectionToPDF(
  pdf: any,
  canvas: HTMLCanvasElement,
  currentY: number,
  pageHeight: number,
  marginTop: number,
  marginBottom: number,
  marginLeft: number,
  marginRight: number,
  imgWidth: number
): number {
  const usableHeight = pageHeight - marginTop - marginBottom;
  const usableWidth = imgWidth - marginLeft - marginRight;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;
  // Usar JPEG com qualidade 0.85 para melhor performance (mais rápido que PNG)
  const imgData = canvas.toDataURL('image/jpeg', 0.85);
  
  // Se a seção não cabe na página atual, criar nova página
  // Isso garante que cada seção completa (gráfico) fique em uma única página
  if (currentY + imgHeight > pageHeight - marginBottom) {
    pdf.addPage();
    currentY = marginTop;
  }
  
  // Adicionar a seção na posição atual com margens laterais
  pdf.addImage(imgData, 'JPEG', marginLeft, currentY, usableWidth, imgHeight);
  
  // Retornar nova posição Y (com pequeno espaçamento entre seções)
  return currentY + imgHeight + 5; // 5mm de espaçamento entre seções
}

/**
 * Adiciona página de informações sobre filtros e avaliações selecionadas
 */
function addFiltersInfoPage(
  pdf: any,
  pageWidth: number,
  pageHeight: number,
  filterInfo: FilterInfo | null,
  evaluationNames: string[],
  processedData: ProcessedEvolutionData | null
): void {
  const margin = 20;
  const centerX = pageWidth / 2;
  let currentY = margin + 5;

  // Título da página
  pdf.setFontSize(18);
  pdf.setTextColor(37, 99, 235);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Informações do Relatório', centerX, currentY, { align: 'center' });

  currentY += 12;

  // Linha decorativa
  pdf.setDrawColor(37, 99, 235);
  pdf.setLineWidth(1);
  pdf.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 15;

  // Seção de Filtros Aplicados
  pdf.setFontSize(14);
  pdf.setTextColor(37, 99, 235);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Filtros Aplicados', margin, currentY);

  currentY += 10;

  pdf.setFontSize(11);
  pdf.setTextColor(50, 50, 50);
  pdf.setFont('helvetica', 'normal');

  if (filterInfo) {
    // Estado
    if (filterInfo.state) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Estado:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(filterInfo.state.name, margin + 30, currentY);
      currentY += 8;
    }

    // Município
    if (filterInfo.municipality) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Município:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(filterInfo.municipality.name, margin + 30, currentY);
      currentY += 8;
    }

    // Escola(s) (com quebra de linha se necessário)
    const schoolsToDisplay = filterInfo.schools && filterInfo.schools.length > 0 
      ? filterInfo.schools 
      : filterInfo.school 
        ? [filterInfo.school]
        : [];
    
    if (schoolsToDisplay.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(schoolsToDisplay.length > 1 ? 'Escolas:' : 'Escola:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      
      const maxWidth = pageWidth - 2 * margin - 30;
      
      schoolsToDisplay.forEach((school, schoolIndex) => {
        const schoolName = school.name;
        const startY = currentY;
        
        // Verificar se precisa quebrar linha
        if (pdf.getTextWidth(schoolName) > maxWidth) {
          // Quebrar em múltiplas linhas
          const words = schoolName.split(' ');
          let line = '';
          let linesAdded = 0;
          
          words.forEach((word, index) => {
            const testLine = line ? `${line} ${word}` : word;
            
            // Se a palavra sozinha é maior que maxWidth, quebrar a palavra
            if (pdf.getTextWidth(word) > maxWidth && !line) {
              // Quebrar palavra longa
              let charLine = '';
              for (const char of word) {
                const testCharLine = charLine + char;
                if (pdf.getTextWidth(testCharLine) > maxWidth && charLine) {
                  pdf.text(charLine, margin + 30, currentY, { maxWidth: maxWidth });
                  currentY += 7;
                  linesAdded++;
                  charLine = char;
                } else {
                  charLine = testCharLine;
                }
              }
              if (charLine) {
                line = charLine;
              }
            } else if (pdf.getTextWidth(testLine) > maxWidth && line) {
              // Quebrar linha antes de adicionar a palavra
              pdf.text(line, margin + 30, currentY, { maxWidth: maxWidth });
              currentY += 7;
              linesAdded++;
              line = word;
            } else {
              line = testLine;
            }
            
            // Se é a última palavra, adicionar a linha
            if (index === words.length - 1 && line) {
              pdf.text(line, margin + 30, currentY, { maxWidth: maxWidth });
              if (linesAdded > 0) {
                currentY += 7;
              }
            }
          });
        } else {
          pdf.text(schoolName, margin + 30, currentY);
        }
        
        // Adicionar espaço entre escolas se houver múltiplas
        if (schoolIndex < schoolsToDisplay.length - 1) {
          currentY += 2;
        } else {
          currentY += 8;
        }
      });
    }

    // Série
    if (filterInfo.grade) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Série:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(filterInfo.grade.name, margin + 30, currentY);
      currentY += 8;
    }

    // Turma
    if (filterInfo.class) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Turma:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(filterInfo.class.name, margin + 30, currentY);
      currentY += 8;
    }

    // Período
    if (filterInfo.periodStart || filterInfo.periodEnd) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Período:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      
      const formatDate = (dateString: string) => {
        try {
          return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
          return dateString;
        }
      };
      
      const periodText = filterInfo.periodStart && filterInfo.periodEnd
        ? `${formatDate(filterInfo.periodStart)} a ${formatDate(filterInfo.periodEnd)}`
        : filterInfo.periodStart
        ? `A partir de ${formatDate(filterInfo.periodStart)}`
        : `Até ${formatDate(filterInfo.periodEnd!)}`;
      pdf.text(periodText, margin + 30, currentY);
      currentY += 8;
    }

    // Se nenhum filtro específico foi aplicado
    const hasSchools = (filterInfo.schools && filterInfo.schools.length > 0) || filterInfo.school;
    if (!filterInfo.state && !filterInfo.municipality && !hasSchools && 
        !filterInfo.grade && !filterInfo.class && !filterInfo.periodStart && !filterInfo.periodEnd) {
      pdf.setTextColor(150, 150, 150);
      pdf.text('Nenhum filtro específico aplicado', margin, currentY);
      currentY += 8;
    }
  } else {
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhum filtro específico aplicado', margin, currentY);
    currentY += 8;
  }

  currentY += 10;

  // Linha separadora
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 12;

  // Seção de Análise de Evolução (estatísticas gerais)
  if (processedData) {
    // Calcular estatísticas gerais
    const calculateGeneralStats = (data: ProcessedEvolutionData) => {
      if (!data.generalData || data.generalData.length === 0) return null;
      
      const merged = data.generalData.reduce((acc, item) => {
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
        ? ((etapas[etapas.length - 1] - etapas[0]) / etapas[0]) * 100
        : 0;

      return {
        media,
        melhorNota,
        piorNota,
        variacaoTotal,
        totalAvaliacoes: etapas.length,
      };
    };

    const generalStats = calculateGeneralStats(processedData);

    if (generalStats) {
      pdf.setFontSize(14);
      pdf.setTextColor(37, 99, 235);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Análise de Evolução', margin, currentY);

      currentY += 10;

      // Layout em duas colunas para economizar espaço
      const colWidth = (pageWidth - 2 * margin - 10) / 2;
      const leftCol = margin;
      const rightCol = margin + colWidth + 10;

      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);
      pdf.setFont('helvetica', 'normal');

      // Coluna esquerda
      pdf.setFont('helvetica', 'bold');
      pdf.text('Média Geral:', leftCol, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generalStats.media.toFixed(1).replace('.', ',')} pontos`, leftCol + 35, currentY);
      currentY += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Melhor Resultado:', leftCol, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generalStats.melhorNota.toFixed(1).replace('.', ',')} pontos`, leftCol + 35, currentY);
      currentY += 7;

      // Coluna direita
      const rightY = currentY - 14;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Variação Total:', rightCol, rightY);
      pdf.setFont('helvetica', 'normal');
      const variacaoColor = generalStats.variacaoTotal > 0 ? [16, 185, 129] : generalStats.variacaoTotal < 0 ? [239, 68, 68] : [107, 114, 128];
      pdf.setTextColor(variacaoColor[0], variacaoColor[1], variacaoColor[2]);
      pdf.text(`${generalStats.variacaoTotal > 0 ? '+' : ''}${generalStats.variacaoTotal.toFixed(1).replace('.', ',')}%`, rightCol + 35, rightY);
      pdf.setTextColor(50, 50, 50);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Total de Avaliações:', rightCol, rightY + 7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generalStats.totalAvaliacoes}`, rightCol + 35, rightY + 7);

      currentY += 10;
    }
  }

  // Linha separadora
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 12;

  // Seção de Avaliações Selecionadas
  pdf.setFontSize(14);
  pdf.setTextColor(37, 99, 235);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Avaliações Selecionadas', margin, currentY);

  currentY += 8;

  pdf.setFontSize(10);
  pdf.setTextColor(50, 50, 50);
  pdf.setFont('helvetica', 'normal');

  if (evaluationNames && evaluationNames.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total: ${evaluationNames.length} avaliação(ões)`, margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    // Reduzir número máximo para economizar espaço
    const maxEvaluations = Math.min(evaluationNames.length, 12);
    for (let i = 0; i < maxEvaluations; i++) {
      const evalName = evaluationNames[i];
      // Truncar se muito longo
      let displayName = evalName;
      if (pdf.getTextWidth(displayName) > pageWidth - 2 * margin - 20) {
        let truncated = evalName;
        while (pdf.getTextWidth(truncated + '...') > pageWidth - 2 * margin - 20 && truncated.length > 0) {
          truncated = truncated.substring(0, truncated.length - 1);
        }
        displayName = truncated + '...';
      }
      pdf.text(`${i + 1}. ${displayName}`, margin + 5, currentY, { maxWidth: pageWidth - 2 * margin - 10 });
      currentY += 6;
    }

    if (evaluationNames.length > 12) {
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(9);
      pdf.text(`... e mais ${evaluationNames.length - 12} avaliação(ões)`, margin + 5, currentY);
    }
  } else {
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhuma avaliação selecionada', margin, currentY);
  }
}

/**
 * Adiciona capa ao PDF
 */
function addCoverPage(
  pdf: any,
  pageWidth: number,
  pageHeight: number,
  evaluationNames: string[],
  comparisonData: ComparisonResponse | null,
  filterInfo: FilterInfo | null
): void {
  // Cor de fundo gradiente (simulado com retângulos)
  const gradientColors = [
    { r: 37, g: 99, b: 235 }, // blue-600
    { r: 79, g: 70, b: 229 }, // indigo-600
  ];

  // Desenhar gradiente de fundo
  for (let i = 0; i < pageHeight; i += 2) {
    const ratio = i / pageHeight;
    const r = Math.round(gradientColors[0].r + (gradientColors[1].r - gradientColors[0].r) * ratio);
    const g = Math.round(gradientColors[0].g + (gradientColors[1].g - gradientColors[0].g) * ratio);
    const b = Math.round(gradientColors[0].b + (gradientColors[1].b - gradientColors[0].b) * ratio);
    
    pdf.setFillColor(r, g, b);
    pdf.rect(0, i, pageWidth, 2, 'F');
  }

  // Círculo decorativo no topo (sutil, usando cor do gradiente mais clara)
  pdf.setFillColor(100, 130, 255);
  pdf.circle(pageWidth / 2, 50, 35, 'F');

  // Ícone/Título principal
  const centerX = pageWidth / 2;
  let currentY = 80;

  // Título principal
  pdf.setFontSize(32);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Análise de Evolução', centerX, currentY, { align: 'center' });

  currentY += 15;

  // Subtítulo
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Relatório de Comparação de Avaliações', centerX, currentY, { align: 'center' });

  currentY += 40;

  // Linha decorativa
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(2);
  pdf.line(centerX - 50, currentY, centerX + 50, currentY);

  currentY += 30;

  // Card de informações
  const cardWidth = pageWidth - 60;
  const cardHeight = 80;
  const cardX = (pageWidth - cardWidth) / 2;

  // Fundo do card (branco)
  pdf.setFillColor(255, 255, 255);
  pdf.rect(cardX, currentY, cardWidth, cardHeight, 'F');
  
  // Borda do card
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.rect(cardX, currentY, cardWidth, cardHeight, 'S');

  // Conteúdo do card
  const cardContentY = currentY + 15;
  let cardY = cardContentY;

  // Título do card
  pdf.setFontSize(14);
  pdf.setTextColor(37, 99, 235);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Avaliações Comparadas', centerX, cardY, { align: 'center' });

  cardY += 10;

  // Lista de avaliações
  pdf.setFontSize(11);
  pdf.setTextColor(30, 30, 30);
  pdf.setFont('helvetica', 'normal');
  
  const maxEvaluations = Math.min(evaluationNames.length, 5);
  for (let i = 0; i < maxEvaluations; i++) {
    const evalName = evaluationNames[i];
    // Truncar nome se muito longo
    let displayName = evalName;
    if (pdf.getTextWidth(evalName) > cardWidth - 30) {
      let truncated = evalName;
      while (pdf.getTextWidth(truncated + '...') > cardWidth - 30 && truncated.length > 0) {
        truncated = truncated.substring(0, truncated.length - 1);
      }
      displayName = truncated + '...';
    }
    pdf.text(`• ${displayName}`, cardX + 10, cardY, { maxWidth: cardWidth - 20 });
    cardY += 7;
  }

  if (evaluationNames.length > 5) {
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`... e mais ${evaluationNames.length - 5} avaliação(ões)`, centerX, cardY, { align: 'center' });
  }

  currentY += cardHeight + 30;

  // Informações adicionais
  if (comparisonData) {
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    
    const totalEvaluations = comparisonData.total_evaluations || evaluationNames.length;
    const totalComparisons = comparisonData.total_comparisons || 0;
    
    pdf.text(`Total de Avaliações: ${totalEvaluations}`, centerX, currentY, { align: 'center' });
    currentY += 8;
    pdf.text(`Comparações Realizadas: ${totalComparisons}`, centerX, currentY, { align: 'center' });
    currentY += 20;
  }

  // Data de geração
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'italic');
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  pdf.text(`Gerado em ${currentDate}`, centerX, currentY, { align: 'center' });

  // Filtros aplicados (com quebra de linha se necessário)
  if (filterInfo) {
    currentY += 10;
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    
    const filterItems: string[] = [];
    
    // Coletar todos os filtros
    if (filterInfo.state) {
      filterItems.push(`Estado: ${filterInfo.state.name}`);
    }
    if (filterInfo.municipality) {
      filterItems.push(`Município: ${filterInfo.municipality.name}`);
    }
    // Escola(s)
    const schoolsToDisplay = filterInfo.schools && filterInfo.schools.length > 0 
      ? filterInfo.schools 
      : filterInfo.school 
        ? [filterInfo.school]
        : [];
    
    if (schoolsToDisplay.length > 0) {
      if (schoolsToDisplay.length === 1) {
        filterItems.push(`Escola: ${schoolsToDisplay[0].name}`);
      } else {
        // Múltiplas escolas - adicionar em item separado
        const schoolsText = `Escolas: ${schoolsToDisplay.map(s => s.name).join(', ')}`;
        filterItems.push(schoolsText);
      }
    }
    if (filterInfo.grade) {
      filterItems.push(`Série: ${filterInfo.grade.name}`);
    }
    if (filterInfo.class) {
      filterItems.push(`Turma: ${filterInfo.class.name}`);
    }
    if (filterInfo.periodStart || filterInfo.periodEnd) {
      const formatDate = (dateString: string) => {
        try {
          return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
          return dateString;
        }
      };
      
      const periodText = filterInfo.periodStart && filterInfo.periodEnd
        ? `Período: ${formatDate(filterInfo.periodStart)} a ${formatDate(filterInfo.periodEnd)}`
        : filterInfo.periodStart
        ? `Período: A partir de ${formatDate(filterInfo.periodStart)}`
        : `Período: Até ${formatDate(filterInfo.periodEnd!)}`;
      filterItems.push(periodText);
    }
    
    // Organizar em linhas com quebra automática
    if (filterItems.length > 0) {
      const maxWidth = pageWidth - 40;
      const filterLines: string[] = [];
      let currentLine = '';
      
      filterItems.forEach((item, index) => {
        const separator = currentLine ? ' | ' : '';
        const testLine = currentLine + separator + item;
        
        // Verificar se cabe na linha
        if (pdf.getTextWidth(testLine) <= maxWidth && currentLine) {
          currentLine = testLine;
        } else {
          // Se já tem conteúdo na linha, adicionar e começar nova
          if (currentLine) {
            filterLines.push(currentLine);
          }
          currentLine = item;
        }
        
        // Se é o último item, adicionar a linha atual
        if (index === filterItems.length - 1 && currentLine) {
          filterLines.push(currentLine);
        }
      });
      
      // Adicionar linhas de filtros
      filterLines.forEach((line, index) => {
        pdf.text(line, centerX, currentY, { align: 'center', maxWidth: maxWidth });
        if (index < filterLines.length - 1) {
          currentY += 5;
        }
      });
    }
  }

  // Rodapé da capa
  currentY = pageHeight - 30;
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Afirme Play Soluções Educativas', centerX, currentY, { align: 'center' });
}

/**
 * Adiciona página divisória para uma categoria de gráficos
 */
function addCategoryDivider(
  pdf: any,
  pageWidth: number,
  pageHeight: number,
  categoryTitle: string,
  categoryDescription: string
): void {
  const centerX = pageWidth / 2;
  let currentY = pageHeight / 2 - 40;

  // Fundo gradiente sutil
  const gradientColors = [
    { r: 37, g: 99, b: 235 }, // blue-600
    { r: 79, g: 70, b: 229 }, // indigo-600
  ];

  for (let i = 0; i < pageHeight; i += 3) {
    const ratio = i / pageHeight;
    const r = Math.round(gradientColors[0].r + (gradientColors[1].r - gradientColors[0].r) * ratio);
    const g = Math.round(gradientColors[0].g + (gradientColors[1].g - gradientColors[0].g) * ratio);
    const b = Math.round(gradientColors[0].b + (gradientColors[1].b - gradientColors[0].b) * ratio);
    
    pdf.setFillColor(r, g, b);
    pdf.rect(0, i, pageWidth, 3, 'F');
  }

  // Ícone decorativo (círculo)
  pdf.setFillColor(200, 220, 255);
  pdf.circle(centerX, currentY - 10, 30, 'F');

  // Título da categoria
  pdf.setFontSize(28);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(categoryTitle, centerX, currentY, { align: 'center' });

  currentY += 15;

  // Descrição
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text(categoryDescription, centerX, currentY, { align: 'center' });

  currentY += 20;

  // Linha decorativa
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(2);
  pdf.line(centerX - 60, currentY, centerX + 60, currentY);
}

/**
 * Adiciona rodapé em todas as páginas do PDF
 */
function addFootersToAllPages(
  pdf: any,
  pageHeight: number,
  totalPages: number
): void {
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Afirme Play Soluções Educativas', 15, pageHeight - 10);
    pdf.text(`Página ${i} de ${totalPages}`, 105, pageHeight - 10, { align: 'center' });
    pdf.text(new Date().toLocaleString('pt-BR'), 195, pageHeight - 10, { align: 'right' });
  }
}

/**
 * Gera PDF a partir do layout HTML usando html2canvas e jsPDF
 * Agora captura cada seção separadamente para evitar cortes entre páginas
 */
export async function generateEvolutionPDFFromHTML(
  processedData: ProcessedEvolutionData,
  comparisonData: ComparisonResponse | null,
  evaluationNames: string[],
  filterInfo?: FilterInfo | null
): Promise<void> {
  try {
    // Importar bibliotecas dinamicamente
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    // Criar elemento temporário para renderizar o layout
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: 210mm;
      background: white;
      font-family: Arial, Helvetica, sans-serif;
    `;
    document.body.appendChild(container);

    // Renderizar o componente React no container
    const root = createRoot(container);
    
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(EvolutionPDFLayout, {
          processedData,
          comparisonData,
          evaluationNames,
        })
      );
      
      // Aguardar para garantir que o React renderizou completamente
      // e que os gráficos Recharts foram renderizados
      // Tempos reduzidos para melhor performance
      setTimeout(() => {
        const checkCharts = () => {
          const svgElements = container.querySelectorAll('svg');
          const expectedSections = container.querySelectorAll('[data-pdf-section]').length;
          // Verificar se temos SVGs e se temos pelo menos algumas seções renderizadas
          if (svgElements.length > 0 && expectedSections > 0) {
            // Tempo mínimo de espera reduzido
            setTimeout(resolve, 300);
          } else {
            setTimeout(checkCharts, 200);
          }
        };
        checkCharts();
      }, 300);
    });

    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const marginTop = 15; // Margem superior
    const marginBottom = 15; // Margem inferior para rodapé
    const marginLeft = 15; // Margem esquerda
    const marginRight = 15; // Margem direita

    // Adicionar capa como primeira página
    addCoverPage(pdf, imgWidth, pageHeight, evaluationNames, comparisonData, filterInfo || null);
    
    // Adicionar página de informações sobre filtros e avaliações
    pdf.addPage();
    addFiltersInfoPage(pdf, imgWidth, pageHeight, filterInfo || null, evaluationNames, processedData);
    
    // Não criar página vazia - a primeira página divisória ou gráfico criará quando necessário
    let currentY = marginTop;

    // Identificar todas as seções usando data-pdf-section
    const allSections = Array.from(container.querySelectorAll('[data-pdf-section]')) as HTMLElement[];

    // Organizar seções por categoria
    const generalSections: HTMLElement[] = [];
    const subjectSections: HTMLElement[] = [];
    const levelSections: HTMLElement[] = [];
    const otherSections: HTMLElement[] = [];

    allSections.forEach((section) => {
      const sectionId = section.getAttribute('data-pdf-section') || '';
      
      if (sectionId === 'general-charts') {
        generalSections.push(section);
      } else if (sectionId.startsWith('subject-')) {
        subjectSections.push(section);
      } else if (sectionId.startsWith('level-')) {
        levelSections.push(section);
      } else {
        otherSections.push(section);
      }
    });

    // Função auxiliar para adicionar seções
    const addSectionsToPDF = async (sections: HTMLElement[]) => {
      for (const sectionElement of sections) {
        // Capturar seção individual
        const sectionCanvas = await captureSection(sectionElement, html2canvas, 1.0);
        
        // Adicionar ao PDF (criando nova página se necessário)
        currentY = addSectionToPDF(
          pdf,
          sectionCanvas,
          currentY,
          pageHeight,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          imgWidth
        );
        
        // Liberar memória do canvas após uso
        sectionCanvas.width = 0;
        sectionCanvas.height = 0;
      }
    };

    // Removido: outras seções (header, summary, etc.) - página 3 removida conforme solicitado

    // Adicionar gráficos gerais com página divisória
    if (generalSections.length > 0) {
      // Criar página divisória
      pdf.addPage();
      addCategoryDivider(
        pdf,
        imgWidth,
        pageHeight,
        'Gráficos Gerais',
        'Análise de Nota e Proficiência Geral'
      );
      // Criar página para os gráficos
      pdf.addPage();
      currentY = marginTop;
      await addSectionsToPDF(generalSections);
    }

    // Adicionar gráficos por disciplina com página divisória
    if (subjectSections.length > 0) {
      pdf.addPage();
      addCategoryDivider(
        pdf,
        imgWidth,
        pageHeight,
        'Gráficos por Disciplina',
        'Análise Detalhada por Disciplina (Nota e Proficiência)'
      );
      pdf.addPage();
      currentY = marginTop;
      await addSectionsToPDF(subjectSections);
    }

    // Adicionar gráficos por nível com página divisória
    if (levelSections.length > 0) {
      pdf.addPage();
      addCategoryDivider(
        pdf,
        imgWidth,
        pageHeight,
        'Gráficos por Nível',
        'Análise de Proficiência por Níveis de Desempenho'
      );
      pdf.addPage();
      currentY = marginTop;
      await addSectionsToPDF(levelSections);
    }

    // Remover elemento temporário
    document.body.removeChild(container);
    root.unmount();

    // Adicionar rodapé em todas as páginas
    const totalPages = pdf.getNumberOfPages();
    addFootersToAllPages(pdf, pageHeight, totalPages);

    // Salvar PDF
    const fileName = `relatorio-evolucao-${evaluationNames.join('-').replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}
