import AcertoNiveis from "./AcertoNiveis";

/** Acerto e níveis alimentado por `GET /answer-sheets/resultados-agregados` (mesmos filtros que Resultados / Relatório Escolar Cartão). */
export default function AcertoNiveisCartaoResposta() {
  return <AcertoNiveis answerSheetsResultadosAgregados />;
}
