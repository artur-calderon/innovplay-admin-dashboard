// Componentes Principais de Avaliações
export { default as EvaluationForm } from './EvaluationForm';
export { default as EvaluationReport } from './EvaluationReport';
export { default as EvaluationResults } from './EvaluationResults';
export { default as EvaluationStepper } from './EvaluationStepper';
export { default as CreateEvaluationForm } from './CreateEvaluationForm';
export { default as DetailedResultsView } from './DetailedResultsView';
export { default as QuestionBank } from './QuestionBank';
export { default as QuestionSelectionStep } from './QuestionSelectionStep';
export { default as ResultsTable } from './ResultsTable';
export { default as StudentDetailedResults } from './StudentDetailedResults';
export { default as StudentEvaluations } from './StudentEvaluations';
export { default as StartEvaluationModal } from './StartEvaluationModal';
export { default as PhysicalEvaluationCorrection } from './PhysicalEvaluationCorrection';
export { default as ErrorBoundary } from './ErrorBoundary';

// Relatório Completo
export { RelatorioCompletoView } from './RelatorioCompletoView';
export { RelatorioCompletoExample } from './RelatorioCompletoExample';

// Re-export dos subdiretórios (apenas os que não causam conflitos)
export * from './results-table';
export * from './TakeEvaluation';
