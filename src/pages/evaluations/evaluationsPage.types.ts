/** Estatísticas agregadas exibidas no topo da Central de Avaliações (professor/admin). */
export interface EvaluationDashboardStats {
  total: number;
  thisMonth: number;
  totalQuestions: number;
  averageQuestions: number;
  virtualEvaluations: number;
  physicalEvaluations: number;
  completedEvaluations: number;
  pendingResults: number;
}
