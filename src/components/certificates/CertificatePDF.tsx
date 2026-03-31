import { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { CertificateTemplateComponent } from './CertificateTemplate';
import type { CertificateTemplate, Certificate } from '@/types/certificates';
import { useAuth } from '@/context/authContext';
import { resolveReportLogoForPdf } from '@/utils/pdfCityBranding';

interface CertificatePDFProps {
  certificate: Certificate;
  template?: CertificateTemplate;
  /** UUID do município para sobrepor a logo municipal no PDF (paisagem) */
  brandingCityId?: string | null;
}

export function CertificatePDF({ certificate, template, brandingCityId }: CertificatePDFProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const generatePDF = async () => {
    if (!certificateRef.current) return;

    try {
      // Capturar com escala alta para qualidade
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: certificate.template.background_color || '#ffffff',
        width: certificateRef.current.scrollWidth,
        height: certificateRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // PDF A4 paisagem
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Dimensões do PDF A4 paisagem: 297mm x 210mm
      const pdfWidth = pdf.internal.pageSize.getWidth();   // 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm
      
      // Preencher toda a página sem margens (full page)
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const cityId = brandingCityId ?? user?.city_id ?? user?.tenant_id ?? null;
      const municipalLogo = await resolveReportLogoForPdf(cityId);
      if (municipalLogo) {
        const maxW = 55;
        const maxH = 28;
        let lw = maxW;
        let lh = (municipalLogo.ih / municipalLogo.iw) * lw;
        if (lh > maxH) {
          lh = maxH;
          lw = (municipalLogo.iw / municipalLogo.ih) * lh;
        }
        pdf.addImage(municipalLogo.dataUrl, 'PNG', (pdfWidth - lw) / 2, 8, lw, lh);
      }

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
        scale: 3,
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
                @page {
                  size: A4 landscape;
                  margin: 0;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                html, body {
                  width: 100%;
                  height: 100%;
                  margin: 0;
                  padding: 0;
                }
                body {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: white;
                }
                img {
                  width: 100vw;
                  height: 100vh;
                  object-fit: fill;
                }
                @media print {
                  body {
                    background: white;
                  }
                  img {
                    width: 100%;
                    height: 100%;
                    object-fit: fill;
                  }
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" alt="Certificado" />
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 500);
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

      {/* Container com proporção A4 paisagem para preview e captura */}
      <div
        ref={certificateRef}
        className="certificate-container"
        style={{
          width: '100%',
          aspectRatio: '297 / 210', // Proporção A4 paisagem
          margin: '0 auto',
          backgroundColor: usedTemplate.background_color || '#ffffff',
          overflow: 'hidden'
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
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

