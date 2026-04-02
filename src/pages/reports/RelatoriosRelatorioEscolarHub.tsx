import { lazy } from 'react';
import { FileText } from 'lucide-react';
import { DualReportEvalCartaoTabs } from '@/pages/reports/DualReportEvalCartaoTabs';

const RelatorioEscolar = lazy(() => import('@/pages/reports/RelatorioEscolar'));

export default function RelatoriosRelatorioEscolarHub() {
  return (
    <DualReportEvalCartaoTabs
      defaultTab="avaliacao"
      title="Relatório Escolar"
      titleIcon={FileText}
      description="Alterne entre avaliação online e cartão-resposta para relatórios escolares detalhados do município."
      avaliacao={<RelatorioEscolar hidePageHeading />}
      cartao={<RelatorioEscolar answerSheetsResultadosAgregados hidePageHeading />}
    />
  );
}
