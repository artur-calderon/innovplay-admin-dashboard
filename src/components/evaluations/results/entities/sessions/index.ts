/**
 * Entidade Sessions - Exports
 * Corresponde à tabela: test_sessions
 * 
 * Centraliza todas as exportações relacionadas à entidade Sessions
 */

// Types
export type {
  TestSessionEntity,
  SessionWithStudent,
  SessionStats,
  SessionFilters,
  SessionTimeAnalysis,
  SessionStatus
} from './types';

// Hooks
export { useSessionsData } from './useSessionsData'; 