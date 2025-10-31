import { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { CertificateTemplateComponent } from './CertificateTemplate';
import type { CertificateTemplate, Certificate } from '@/types/certificates';

interface CertificatePDFProps {
  certificate: Certificate;
  template?: CertificateTemplate;
}

export function CertificatePDF({ certificate, template }: CertificatePDFProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: certificate.template.background_color || '#ffffff',
        width: certificateRef.current.scrollWidth,
        height: certificateRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      const xOffset = (pdfWidth - imgScaledWidth) / 2;
      const yOffset = (pdfHeight - imgScaledHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgScaledWidth, imgScaledHeight);
      pdf.save(`certificado-${certificate.student_name.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    }
  };

  const handlePrint = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: certificate.template.background_color || '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Certificado - ${certificate.student_name}</title>
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
                @media print {
                  body {
                    padding: 0;
                  }
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" alt="Certificado" />
              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
    }
  };

  const usedTemplate = template || certificate.template;
  const textContent = usedTemplate.text_content.replace(
    /\{\{nome_aluno\}\}/g,
    certificate.student_name
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={generatePDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Baixar PDF
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div
        ref={certificateRef}
        className="certificate-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          backgroundColor: '#f5f5f5'
        }}
      >
        <CertificateTemplateComponent
          template={{
            ...usedTemplate,
            text_content: textContent
          }}
          studentName={certificate.student_name}
          evaluationTitle={certificate.evaluation_title}
          grade={certificate.grade}
        />
      </div>
    </div>
  );
}

