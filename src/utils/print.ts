/**
 * Sistema de Impressão Profissional
 * Layout otimizado para impressão, remoção de elementos de navegação
 * e formatação específica para relatórios de avaliação
 */

export interface PrintOptions {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showPageNumbers?: boolean;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'Letter';
  includeHeader?: boolean;
  includeFooter?: boolean;
  removeNavigation?: boolean;
  colorMode?: 'color' | 'grayscale';
}

export interface PrintSection {
  id: string;
  title: string;
  content: string | HTMLElement;
  pageBreak?: boolean;
}

/**
 * Classe principal para gerenciamento de impressão
 */
export class PrintManager {
  private static instance: PrintManager;
  private defaultOptions: PrintOptions = {
    title: 'Relatório de Avaliações',
    subtitle: 'Gerado automaticamente',
    showLogo: true,
    showPageNumbers: true,
    orientation: 'portrait',
    paperSize: 'A4',
    includeHeader: true,
    includeFooter: true,
    removeNavigation: true,
    colorMode: 'color'
  };

  public static getInstance(): PrintManager {
    if (!PrintManager.instance) {
      PrintManager.instance = new PrintManager();
    }
    return PrintManager.instance;
  }

  /**
   * Imprime um elemento HTML com configurações otimizadas
   */
  public async printElement(
    element: HTMLElement | string,
    options: Partial<PrintOptions> = {}
  ): Promise<void> {
    const config = { ...this.defaultOptions, ...options };
    const printWindow = this.createPrintWindow(config);
    
    if (!printWindow) {
      throw new Error('Não foi possível abrir janela de impressão');
    }

    try {
      const content = typeof element === 'string' ? element : element.outerHTML;
      const printDocument = this.generatePrintDocument(content, config);
      
      printWindow.document.write(printDocument);
      printWindow.document.close();
      
      // Aguardar carregamento completo
      await this.waitForWindowLoad(printWindow);
      
      // Imprimir
      printWindow.focus();
      printWindow.print();
      
      // Fechar janela após impressão (com delay para compatibilidade)
      setTimeout(() => {
        printWindow.close();
      }, 1000);
      
    } catch (error) {
      printWindow.close();
      throw error;
    }
  }

  /**
   * Imprime múltiplas seções de relatório
   */
  public async printReport(
    sections: PrintSection[],
    options: Partial<PrintOptions> = {}
  ): Promise<void> {
    const config = { ...this.defaultOptions, ...options };
    const printWindow = this.createPrintWindow(config);
    
    if (!printWindow) {
      throw new Error('Não foi possível abrir janela de impressão');
    }

    try {
      const reportContent = this.generateReportContent(sections, config);
      const printDocument = this.generatePrintDocument(reportContent, config);
      
      printWindow.document.write(printDocument);
      printWindow.document.close();
      
      await this.waitForWindowLoad(printWindow);
      
      printWindow.focus();
      printWindow.print();
      
      setTimeout(() => {
        printWindow.close();
      }, 1000);
      
    } catch (error) {
      printWindow.close();
      throw error;
    }
  }

  /**
   * Cria janela de impressão otimizada
   */
  private createPrintWindow(options: PrintOptions): Window | null {
    const features = [
      'width=800',
      'height=600',
      'resizable=yes',
      'scrollbars=yes',
      'status=no',
      'toolbar=no',
      'menubar=no',
      'location=no'
    ].join(',');

    return window.open('', 'print-window', features);
  }

  /**
   * Gera documento HTML completo para impressão
   */
  private generatePrintDocument(content: string, options: PrintOptions): string {
    const css = this.generatePrintCSS(options);
    const header = options.includeHeader ? this.generateHeader(options) : '';
    const footer = options.includeFooter ? this.generateFooter(options) : '';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${options.title}</title>
          <style>${css}</style>
        </head>
        <body>
          ${header}
          <main class="print-content">
            ${content}
          </main>
          ${footer}
        </body>
      </html>
    `;
  }

  /**
   * Gera CSS otimizado para impressão
   */
  private generatePrintCSS(options: PrintOptions): string {
    const isGrayscale = options.colorMode === 'grayscale';
    const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
    const paperSize = options.paperSize === 'Letter' ? 'letter' : 'A4';

    return `
      /* Reset e configurações básicas */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      @page {
        size: ${paperSize} ${orientation};
        margin: 15mm;
        ${isGrayscale ? '-webkit-print-color-adjust: economy;' : 'color-adjust: exact;'}
      }

      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        font-size: 12pt;
        line-height: 1.4;
        color: ${isGrayscale ? '#000' : '#333'};
        background: #fff;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }

      /* Cabeçalho */
      .print-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 15pt;
        border-bottom: 2pt solid ${isGrayscale ? '#000' : '#2563eb'};
        margin-bottom: 20pt;
      }

      .print-header .logo {
        max-height: 40pt;
        max-width: 150pt;
      }

      .print-header .title-section {
        flex-grow: 1;
        text-align: center;
        margin: 0 20pt;
      }

      .print-header .title {
        font-size: 16pt;
        font-weight: bold;
        color: ${isGrayscale ? '#000' : '#2563eb'};
        margin-bottom: 5pt;
      }

      .print-header .subtitle {
        font-size: 10pt;
        color: ${isGrayscale ? '#666' : '#64748b'};
      }

      .print-header .meta {
        text-align: right;
        font-size: 9pt;
        color: ${isGrayscale ? '#666' : '#64748b'};
      }

      /* Rodapé */
      .print-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 20pt;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 15mm;
        font-size: 9pt;
        color: ${isGrayscale ? '#666' : '#64748b'};
        border-top: 1pt solid ${isGrayscale ? '#ccc' : '#e2e8f0'};
        background: #fff;
      }

      /* Conteúdo principal */
      .print-content {
        ${options.includeFooter ? 'margin-bottom: 30pt;' : ''}
      }

      /* Elementos a remover/ocultar na impressão */
      .no-print,
      .print-hidden,
      button:not(.print-include),
      .sidebar,
      .navigation,
      .nav,
      .header:not(.print-header),
      .footer:not(.print-footer),
      .toolbar,
      .menu,
      .controls,
      .actions {
        display: none !important;
      }

      /* Estilização de cards e containers */
      .card,
      .card-content,
      .border {
        border: 1pt solid ${isGrayscale ? '#ccc' : '#e2e8f0'} !important;
        border-radius: 4pt;
        padding: 8pt;
        margin-bottom: 12pt;
        break-inside: avoid;
      }

      .card-header {
        border-bottom: 1pt solid ${isGrayscale ? '#ccc' : '#e2e8f0'};
        padding-bottom: 6pt;
        margin-bottom: 8pt;
      }

      .card-title {
        font-size: 14pt;
        font-weight: bold;
        color: ${isGrayscale ? '#000' : '#1e293b'};
      }

      .card-description {
        font-size: 10pt;
        color: ${isGrayscale ? '#666' : '#64748b'};
        margin-top: 2pt;
      }

      /* Tabelas */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 8pt 0;
        break-inside: avoid;
      }

      th, td {
        border: 1pt solid ${isGrayscale ? '#ccc' : '#e2e8f0'};
        padding: 6pt 8pt;
        text-align: left;
        font-size: 10pt;
      }

      th {
        background-color: ${isGrayscale ? '#f5f5f5' : '#f8fafc'} !important;
        font-weight: bold;
        font-size: 9pt;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
      }

      tr:nth-child(even) {
        background-color: ${isGrayscale ? '#fafafa' : '#f8fafc'} !important;
      }

      /* Badges e status */
      .badge,
      .status {
        display: inline-block;
        padding: 2pt 6pt;
        border-radius: 2pt;
        font-size: 8pt;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.3pt;
      }

      .badge-success,
      .status-completed {
        background-color: ${isGrayscale ? '#f0f0f0' : '#dcfce7'} !important;
        color: ${isGrayscale ? '#000' : '#15803d'} !important;
        border: 1pt solid ${isGrayscale ? '#ccc' : '#bbf7d0'};
      }

      .badge-warning,
      .status-pending {
        background-color: ${isGrayscale ? '#f0f0f0' : '#fef3c7'} !important;
        color: ${isGrayscale ? '#000' : '#d97706'} !important;
        border: 1pt solid ${isGrayscale ? '#ccc' : '#fde68a'};
      }

      .badge-error,
      .status-failed {
        background-color: ${isGrayscale ? '#f0f0f0' : '#fee2e2'} !important;
        color: ${isGrayscale ? '#000' : '#dc2626'} !important;
        border: 1pt solid ${isGrayscale ? '#ccc' : '#fecaca'};
      }

      /* Gráficos e progresso */
      .progress,
      .progress-bar {
        background-color: ${isGrayscale ? '#e0e0e0' : '#f1f5f9'} !important;
        border: 1pt solid ${isGrayscale ? '#ccc' : '#e2e8f0'};
        print-color-adjust: exact;
      }

      .progress-fill {
        background-color: ${isGrayscale ? '#666' : '#3b82f6'} !important;
        print-color-adjust: exact;
      }

      /* Grids e layouts */
      .grid {
        display: grid;
        gap: 10pt;
        margin: 10pt 0;
      }

      .grid-cols-2 { grid-template-columns: 1fr 1fr; }
      .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
      .grid-cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

      /* Utilitários de espaçamento */
      .space-y-2 > * + * { margin-top: 4pt; }
      .space-y-4 > * + * { margin-top: 8pt; }
      .space-y-6 > * + * { margin-top: 12pt; }

      .mb-2 { margin-bottom: 4pt; }
      .mb-4 { margin-bottom: 8pt; }
      .mb-6 { margin-bottom: 12pt; }

      .p-2 { padding: 4pt; }
      .p-4 { padding: 8pt; }
      .p-6 { padding: 12pt; }

      /* Quebras de página */
      .page-break {
        page-break-before: always;
      }

      .page-break-inside-avoid {
        page-break-inside: avoid;
      }

      .page-break-after {
        page-break-after: always;
      }

      /* Texto e tipografia */
      .text-xs { font-size: 8pt; }
      .text-sm { font-size: 10pt; }
      .text-base { font-size: 12pt; }
      .text-lg { font-size: 14pt; }
      .text-xl { font-size: 16pt; }
      .text-2xl { font-size: 18pt; }

      .font-bold { font-weight: bold; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }

      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }

      /* Cores específicas para impressão */
      .text-muted-foreground,
      .text-gray-500,
      .text-gray-600 {
        color: ${isGrayscale ? '#666' : '#64748b'} !important;
      }

      .text-green-600 { color: ${isGrayscale ? '#000' : '#059669'} !important; }
      .text-red-600 { color: ${isGrayscale ? '#000' : '#dc2626'} !important; }
      .text-blue-600 { color: ${isGrayscale ? '#000' : '#2563eb'} !important; }
      .text-yellow-600 { color: ${isGrayscale ? '#000' : '#d97706'} !important; }
      .text-purple-600 { color: ${isGrayscale ? '#000' : '#9333ea'} !important; }

      /* Backgrounds para impressão */
      .bg-green-50 { background-color: ${isGrayscale ? '#f9f9f9' : '#f0fdf4'} !important; }
      .bg-red-50 { background-color: ${isGrayscale ? '#f9f9f9' : '#fef2f2'} !important; }
      .bg-blue-50 { background-color: ${isGrayscale ? '#f9f9f9' : '#eff6ff'} !important; }
      .bg-yellow-50 { background-color: ${isGrayscale ? '#f9f9f9' : '#fffbeb'} !important; }
      .bg-purple-50 { background-color: ${isGrayscale ? '#f9f9f9' : '#faf5ff'} !important; }

      /* Responsividade para impressão */
      @media print {
        body { font-size: 11pt; }
        .print-header .title { font-size: 15pt; }
        .card-title { font-size: 13pt; }
        th, td { font-size: 9pt; padding: 4pt 6pt; }
        
        /* Forçar quebras de página adequadas */
        .section { break-inside: avoid; }
        .card { break-inside: avoid; }
        table { break-inside: auto; }
        tr { break-inside: avoid; }
      }

      /* Específico para diferentes tamanhos de papel */
      @media print and (max-width: 8.5in) {
        body { font-size: 10pt; }
        .grid-cols-4 { grid-template-columns: 1fr 1fr; }
        .grid-cols-3 { grid-template-columns: 1fr 1fr; }
      }
    `;
  }

  /**
   * Gera cabeçalho do relatório
   */
  private generateHeader(options: PrintOptions): string {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const currentTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <header class="print-header">
        ${options.showLogo ? `
          <div class="logo-section">
            <img src="/logo-header.png" alt="Logo" class="logo" />
          </div>
        ` : ''}
        <div class="title-section">
          <h1 class="title">${options.title}</h1>
          ${options.subtitle ? `<p class="subtitle">${options.subtitle}</p>` : ''}
        </div>
        <div class="meta">
          <div>${currentDate}</div>
          <div>${currentTime}</div>
        </div>
      </header>
    `;
  }

  /**
   * Gera rodapé do relatório
   */
  private generateFooter(options: PrintOptions): string {
    return `
      <footer class="print-footer">
        <div>© ${new Date().getFullYear()} InnovPlay - Sistema de Avaliações</div>
        ${options.showPageNumbers ? `
          <div>Página <span class="page-number"></span></div>
        ` : ''}
      </footer>
    `;
  }

  /**
   * Gera conteúdo do relatório a partir das seções
   */
  private generateReportContent(sections: PrintSection[], options: PrintOptions): string {
    return sections.map((section, index) => {
      const pageBreak = section.pageBreak && index > 0 ? 'page-break' : '';
      const content = typeof section.content === 'string' 
        ? section.content 
        : section.content.outerHTML;

      return `
        <section id="${section.id}" class="section ${pageBreak} page-break-inside-avoid">
          <h2 class="text-xl font-bold mb-4">${section.title}</h2>
          ${content}
        </section>
      `;
    }).join('\n');
  }

  /**
   * Aguarda carregamento completo da janela
   */
  private waitForWindowLoad(printWindow: Window): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao carregar janela de impressão'));
      }, 10000);

      const checkLoad = () => {
        if (printWindow.document.readyState === 'complete') {
          clearTimeout(timeout);
          // Aguardar um pouco mais para imagens carregarem
          setTimeout(resolve, 500);
        } else {
          setTimeout(checkLoad, 100);
        }
      };

      checkLoad();
    });
  }
}

/**
 * Funções utilitárias para impressão rápida
 */

/**
 * Imprime um elemento específico da página
 */
export const printElement = async (
  elementId: string,
  options: Partial<PrintOptions> = {}
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento com ID '${elementId}' não encontrado`);
  }

  const printManager = PrintManager.getInstance();
  return printManager.printElement(element, options);
};

/**
 * Imprime o conteúdo atual da página com formatação otimizada
 */
export const printCurrentPage = async (
  options: Partial<PrintOptions> = {}
): Promise<void> => {
  const printManager = PrintManager.getInstance();
  return printManager.printElement(document.body, {
    removeNavigation: true,
    ...options
  });
};

/**
 * Prepara uma página para impressão removendo elementos desnecessários
 */
export const preparePrintPage = (): void => {
  // Adicionar classe de impressão ao body
  document.body.classList.add('printing');

  // Ocultar elementos de navegação
  const elementsToHide = [
    'nav', 'header:not(.print-header)', 'footer:not(.print-footer)',
    '.sidebar', '.navigation', '.toolbar', '.menu', '.controls',
    'button:not(.print-include)', '.no-print', '.print-hidden'
  ];

  elementsToHide.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
  });
};

/**
 * Restaura a página após impressão
 */
export const restorePrintPage = (): void => {
  // Remover classe de impressão do body
  document.body.classList.remove('printing');

  // Restaurar elementos ocultos
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    (el as HTMLElement).style.display = '';
  });
};

/**
 * Hook para usar em componentes React
 */
export const usePrint = () => {
  const print = async (
    elementOrId: string | HTMLElement,
    options: Partial<PrintOptions> = {}
  ) => {
    const printManager = PrintManager.getInstance();
    
    if (typeof elementOrId === 'string') {
      const element = document.getElementById(elementOrId);
      if (!element) {
        throw new Error(`Elemento com ID '${elementOrId}' não encontrado`);
      }
      return printManager.printElement(element, options);
    }
    
    return printManager.printElement(elementOrId, options);
  };

  const printReport = async (
    sections: PrintSection[],
    options: Partial<PrintOptions> = {}
  ) => {
    const printManager = PrintManager.getInstance();
    return printManager.printReport(sections, options);
  };

  return {
    print,
    printReport,
    preparePrintPage,
    restorePrintPage
  };
};

export default PrintManager; 