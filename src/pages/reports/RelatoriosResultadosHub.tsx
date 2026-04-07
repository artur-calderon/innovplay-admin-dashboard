import { lazy } from 'react';
import { BarChart3 } from 'lucide-react';
import type { ReportTabValue } from '@/pages/reports/DualReportEvalCartaoTabs';
import { DualReportEvalCartaoTabs } from '@/pages/reports/DualReportEvalCartaoTabs';

const Results = lazy(() => import('@/pages/evaluations/Results'));
const AnswerSheetResults = lazy(() => import('@/pages/answer-sheet/AnswerSheetResults'));

type Props = {
  defaultTab: ReportTabValue;
};

export default function RelatoriosResultadosHub({ defaultTab }: Props) {
  return (
    <DualReportEvalCartaoTabs
      defaultTab={defaultTab}
      title="Resultados"
      titleIcon={BarChart3}
      description="Alterne entre avaliação online e cartão-resposta para acompanhar desempenho e exportar relatórios."
      avaliacao={<Results hidePageHeading />}
      cartao={<AnswerSheetResults hidePageHeading />}
    />
  );
}
