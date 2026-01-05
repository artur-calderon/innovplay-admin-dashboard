/**
 * Componentes do Sistema de Competições
 * 
 * Este módulo exporta todos os componentes relacionados ao sistema de competições,
 * permitindo import centralizado.
 */

// Componentes administrativos
export { CompetitionAdminPanel } from './CompetitionAdminPanel';
export { ClassSelector } from './ClassSelector';
export { ColorPicker } from './ColorPicker';
export { IconPicker } from './IconPicker';

// Componentes para alunos
export { CompetitionEnrollment } from './CompetitionEnrollment';

// Componentes de resultados
export { CompetitionResultsCards } from './CompetitionResultsCards';

// Re-exportar tipos úteis para conveniência
export type {
  Competition,
  CompetitionFormData,
  CompetitionResult,
  CompetitionRanking,
  CompetitionEnrollmentStatus,
  CompetitionSession,
  CompetitionQuestion,
  CompetitionSubmitResponse,
  CompetitionResultsResponse,
  CompetitionStatus,
  CompetitionDifficulty,
  QuestionSelectionMode,
  ClassForSelection,
  CompetitionAdminPanelProps,
  ClassSelectorProps,
  CompetitionEnrollmentProps,
  CompetitionResultsCardsProps
} from '@/types/competition-types';

