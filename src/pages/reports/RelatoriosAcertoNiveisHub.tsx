import { lazy } from 'react';
import { Target } from 'lucide-react';
import { DualReportEvalCartaoTabs } from '@/pages/reports/DualReportEvalCartaoTabs';

const AcertoNiveis = lazy(() => import('@/pages/evaluations/AcertoNiveis'));
const AcertoNiveisCartao = lazy(() => import('@/pages/evaluations/AcertoNiveisCartao'));

export default function RelatoriosAcertoNiveisHub() {
  return (
    <DualReportEvalCartaoTabs
      defaultTab="avaliacao"
      title="Acerto e Níveis"
      titleIcon={Target}
      description="Alterne entre avaliação online e cartão-resposta para análise de acertos, níveis de proficiência e exportação em PDF."
      avaliacao={<AcertoNiveis hidePageHeading />}
      cartao={<AcertoNiveisCartao answerSheetsResultadosAgregados hidePageHeading />}
    />
  );
}
