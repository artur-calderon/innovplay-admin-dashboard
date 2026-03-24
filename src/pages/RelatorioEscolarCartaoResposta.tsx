import RelatorioEscolar from "./RelatorioEscolar";

/** Relatório escolar alimentado por `GET /answer-sheets/resultados-agregados` (mesmos parâmetros que a página de resultados do cartão). */
export default function RelatorioEscolarCartaoResposta() {
  return <RelatorioEscolar answerSheetsResultadosAgregados />;
}
