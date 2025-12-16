import type { ProcessedEvolutionData } from '@/components/evolution/EvolutionCharts';
import type { ComparisonResponse } from '@/services/evaluationComparisonApi';
import { EvolutionPDFLayout } from '@/components/evolution/EvolutionPDFLayout';
import React from 'react';
import { createRoot } from 'react-dom/client';

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
  evaluationNames: string[]
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
    let currentY = marginTop;

    // Identificar todas as seções usando data-pdf-section
    // querySelectorAll já retorna na ordem do DOM (ordem de aparição)
    const sections = Array.from(container.querySelectorAll('[data-pdf-section]')) as HTMLElement[];

    // Capturar e adicionar cada seção separadamente
    // Scale reduzido para 1.0 para melhor performance (ainda boa qualidade para PDF)
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
