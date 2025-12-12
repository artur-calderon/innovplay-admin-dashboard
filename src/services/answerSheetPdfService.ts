import jsPDF from 'jspdf';
import { AnswerSheetConfig, StudentAnswerSheet, QRCodeData } from '@/types/answer-sheet';

/**
 * Gera um QR Code como data URL
 * @param data Dados a serem codificados no QR Code
 * @returns Promise com data URL do QR Code
 */
export const generateQRCode = async (data: QRCodeData): Promise<string> => {
  try {
    // Importação dinâmica do qrcode
    const QRCode = await import('qrcode');
    const qrString = JSON.stringify(data);
    const qrDataUrl = await QRCode.default.toDataURL(qrString, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'H'
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    // Retorna um QR Code placeholder em caso de erro
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
};

/**
 * Desenha o cabeçalho do cartão resposta
 */
const drawHeader = async (
  doc: jsPDF,
  student: StudentAnswerSheet,
  config: AnswerSheetConfig,
  qrCodeUrl: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Título principal
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTÃO RESPOSTA', pageWidth / 2, 15, { align: 'center' });
  
  // QR Code no canto superior direito
  doc.addImage(qrCodeUrl, 'PNG', pageWidth - 40, 10, 30, 30);
  
  // Informações do aluno e prova
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('NOME COMPLETO:', 15, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(student.name.toUpperCase(), 50, 30);
  
  // Linha para o nome
  doc.setLineWidth(0.3);
  doc.line(50, 31, pageWidth - 45, 31);
  
  // Município e Escola
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO:', 15, 38);
  doc.setFont('helvetica', 'normal');
  doc.text('ALAGOAS', 35, 38);
  
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICÍPIO:', 80, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(config.municipio.toUpperCase(), 110, 38);
  
  doc.setFont('helvetica', 'bold');
  doc.text('ESCOLA:', 15, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(config.escola_nome.toUpperCase(), 35, 45);
  doc.line(35, 46, pageWidth - 15, 46);
  
  // Informações da turma
  doc.setFont('helvetica', 'bold');
  doc.text('TURMA:', 15, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(config.turma_nome.toUpperCase(), 35, 52);
  
  doc.setFont('helvetica', 'bold');
  doc.text('PROVA:', 80, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(config.prova_titulo.toUpperCase(), 100, 52);
  
  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(15, 58, pageWidth - 15, 58);
};

/**
 * Desenha as instruções
 */
const drawInstructions = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Título das instruções
  doc.setFillColor(139, 0, 139); // Roxo
  doc.rect(15, 62, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTRUÇÕES PARA O ALUNO', pageWidth / 2, 67.5, { align: 'center' });
  
  // Instruções
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const instructions = [
    '• Preencha seu nome e a data de nascimento.',
    '• Cada questão terá SOMENTE UMA resposta correta portanto seu cartão-resposta.',
    '• Tenha muita atenção ao marcar as alternativas.',
    '• As respostas rasuradas ou com dupla marcação não serão válidas para contagem.',
    '• Para as marcações nesse CARTÃO-RESPOSTA, preencha os círculos completamente, utilizando caneta esferográfica de tinta preta',
    '  (demarcada em material transparente) conforme a ilustração:'
  ];
  
  let yPos = 75;
  instructions.forEach(instruction => {
    doc.text(instruction, 17, yPos);
    yPos += 4;
  });
  
  // Exemplos de marcação
  yPos += 2;
  const centerX = pageWidth / 2;
  
  // Círculo preenchido (correto)
  doc.setFillColor(0, 0, 0);
  doc.circle(centerX - 30, yPos, 3, 'F');
  doc.setFontSize(7);
  doc.text('CORRETO', centerX - 30, yPos + 6, { align: 'center' });
  
  // Círculo com X (incorreto)
  doc.circle(centerX - 10, yPos, 3, 'S');
  doc.line(centerX - 12, yPos - 2, centerX - 8, yPos + 2);
  doc.line(centerX - 8, yPos - 2, centerX - 12, yPos + 2);
  doc.text('INCORRETO', centerX - 10, yPos + 6, { align: 'center' });
  
  // Círculo parcial (incorreto)
  doc.circle(centerX + 10, yPos, 3, 'S');
  doc.setFillColor(0, 0, 0);
  doc.circle(centerX + 10, yPos, 1.5, 'F');
  doc.text('INCORRETO', centerX + 10, yPos + 6, { align: 'center' });
  
  // Círculo rasurado (incorreto)
  doc.circle(centerX + 30, yPos, 3, 'S');
  doc.setLineWidth(0.5);
  doc.line(centerX + 28, yPos - 1, centerX + 32, yPos + 1);
  doc.line(centerX + 28, yPos + 1, centerX + 32, yPos - 1);
  doc.text('INCORRETO', centerX + 30, yPos + 6, { align: 'center' });
  
  // Linha separadora
  doc.setLineWidth(0.3);
  doc.line(15, yPos + 10, pageWidth - 15, yPos + 10);
  
  return yPos + 10;
};

/**
 * Desenha blocos de atenção
 */
const drawAttentionBlock = (doc: jsPDF, yPos: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Título do bloco
  doc.setFillColor(139, 0, 139); // Roxo
  doc.rect(15, yPos + 2, pageWidth - 30, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ATENÇÃO: BLOCO EXCLUSIVO PARA USO DO APLICADOR', pageWidth / 2, yPos + 6, { align: 'center' });
  
  // Opções
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const options = [
    '1. Aluno ausente',
    '2. Aluno com deficiência indicada no Censo',
    '3. Aluno com atendimento especializado que utilizou tempo adicional'
  ];
  
  let optionY = yPos + 12;
  options.forEach((option, index) => {
    // Círculo para marcar
    doc.circle(20, optionY, 2, 'S');
    doc.text(option, 25, optionY + 1);
    optionY += 5;
  });
  
  return optionY + 3;
};

/**
 * Desenha o grid de respostas
 */
const drawAnswerGrid = (doc: jsPDF, yPos: number, config: AnswerSheetConfig) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalQuestions = config.total_questoes;
  
  // Título do bloco
  doc.setFillColor(139, 0, 139); // Roxo
  doc.rect(15, yPos, pageWidth - 30, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BLOCO 01', pageWidth / 2, yPos + 4, { align: 'center' });
  
  yPos += 8;
  
  // Configuração do grid
  const startX = 20;
  const circleRadius = 2.5;
  const horizontalSpacing = 7;
  const verticalSpacing = 7;
  const questionsPerColumn = 10;
  const columns = Math.ceil(totalQuestions / questionsPerColumn);
  const columnWidth = (pageWidth - 40) / columns;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  for (let i = 0; i < totalQuestions; i++) {
    const questionNumber = i + 1;
    const columnIndex = Math.floor(i / questionsPerColumn);
    const rowIndex = i % questionsPerColumn;
    
    const baseX = startX + (columnIndex * columnWidth);
    const baseY = yPos + (rowIndex * verticalSpacing);
    
    // Número da questão
    doc.setFont('helvetica', 'bold');
    doc.text(`${questionNumber}.`, baseX, baseY + 1);
    
    // Círculos para as alternativas
    const options = ['A', 'B', 'C', 'D'];
    options.forEach((option, optionIndex) => {
      const circleX = baseX + 10 + (optionIndex * horizontalSpacing);
      
      // Desenha o círculo
      doc.setLineWidth(0.3);
      doc.circle(circleX, baseY, circleRadius, 'S');
      
      // Preenche se for a resposta correta (para gabarito do professor)
      // Nota: No cartão do aluno, NÃO deve vir preenchido
      // if (config.gabarito[questionNumber] === option) {
      //   doc.setFillColor(200, 200, 200);
      //   doc.circle(circleX, baseY, circleRadius - 0.5, 'F');
      // }
      
      // Letra da alternativa
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(option, circleX, baseY - circleRadius - 1, { align: 'center' });
    });
  }
  
  return yPos + (Math.min(questionsPerColumn, totalQuestions) * verticalSpacing) + 5;
};

/**
 * Desenha o rodapé com linha de assinatura
 */
const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Linha para assinatura
  const signatureY = pageHeight - 20;
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do participante:', pageWidth / 2, signatureY + 5, { align: 'center' });
};

/**
 * Gera um PDF individual para um aluno
 */
export const generateAnswerSheetPDF = async (
  student: StudentAnswerSheet,
  config: AnswerSheetConfig
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Gera o QR Code
  const qrCodeData: QRCodeData = {
    aluno_id: student.id,
    escola_id: config.escola_id,
    turma_id: config.turma_id,
    prova_titulo: config.prova_titulo,
    data_geracao: config.data_geracao
  };
  const qrCodeUrl = await generateQRCode(qrCodeData);
  
  // Desenha os componentes do cartão
  await drawHeader(doc, student, config, qrCodeUrl);
  const yAfterInstructions = drawInstructions(doc);
  const yAfterAttention = drawAttentionBlock(doc, yAfterInstructions);
  drawAnswerGrid(doc, yAfterAttention, config);
  drawFooter(doc);
  
  // Retorna o PDF como Blob
  return doc.output('blob');
};

/**
 * Gera múltiplos PDFs e compacta em um arquivo ZIP
 */
export const generateMultipleAnswerSheets = async (
  students: StudentAnswerSheet[],
  config: AnswerSheetConfig,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> => {
  try {
    // Importação dinâmica do JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Gera um PDF para cada aluno
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (onProgress) {
        onProgress(i + 1, students.length);
      }
      
      const pdfBlob = await generateAnswerSheetPDF(student, config);
      
      // Sanitiza o nome do arquivo
      const sanitizedName = student.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '_'); // Substitui espaços por underscore
      
      zip.file(`cartao_${sanitizedName}_${student.id}.pdf`, pdfBlob);
    }
    
    // Gera o arquivo ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return zipBlob;
  } catch (error) {
    console.error('Erro ao gerar múltiplos cartões:', error);
    throw new Error('Erro ao gerar arquivo ZIP com os cartões resposta');
  }
};

/**
 * Faz o download de um arquivo Blob
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


