/**
 * Utilitários de Formatação para Resultados de Avaliação
 * 
 * ✅ IMPORTANTE: Estes formatadores apenas exibem dados já calculados pela API
 * NÃO fazem cálculos locais - todos os cálculos vêm do backend
 */

import { CompletionStatusLevel } from '../types/completion';

// ===== FORMATADORES DE NOTA =====

/**
 * Formata nota para exibição (0-10)
 * @param grade - Nota já calculada pela API (0-10)
 * @param decimals - Número de casas decimais (padrão: 1)
 */
export const formatGrade = (grade: number, decimals: number = 1): string => {
  if (grade === null || grade === undefined || isNaN(grade)) {
    return 'N/A';
  }
  return grade.toFixed(decimals);
};

/**
 * Formata nota como porcentagem (0-100%)
 * @param grade - Nota já calculada pela API (0-10)
 */
export const formatGradeAsPercentage = (grade: number): string => {
  if (grade === null || grade === undefined || isNaN(grade)) {
    return 'N/A';
  }
  return `${(grade * 10).toFixed(1)}%`;
};

// ===== FORMATADORES DE PROFICIÊNCIA =====

/**
 * Formata proficiência para exibição
 * @param proficiency - Proficiência já calculada pela API
 * @param decimals - Número de casas decimais (padrão: 0)
 */
export const formatProficiency = (proficiency: number, decimals: number = 0): string => {
  if (proficiency === null || proficiency === undefined || isNaN(proficiency)) {
    return 'N/A';
  }
  return proficiency.toFixed(decimals);
};

/**
 * Formata proficiência como porcentagem do máximo
 * @param proficiency - Proficiência já calculada pela API
 * @param maxProficiency - Proficiência máxima para o nível/disciplina
 */
export const formatProficiencyAsPercentage = (proficiency: number, maxProficiency: number): string => {
  if (proficiency === null || proficiency === undefined || isNaN(proficiency)) {
    return 'N/A';
  }
  const percentage = (proficiency / maxProficiency) * 100;
  return `${percentage.toFixed(1)}%`;
};

// ===== FORMATADORES DE TEMPO =====

/**
 * Formata tempo em segundos para formato legível
 * @param seconds - Tempo em segundos já calculado pela API
 */
export const formatTime = (seconds: number): string => {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return 'N/A';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

/**
 * Formata tempo em minutos para formato legível
 * @param minutes - Tempo em minutos já calculado pela API
 */
export const formatTimeMinutes = (minutes: number): string => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return 'N/A';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${remainingMinutes}m`;
  }
};

// ===== FORMATADORES DE PORCENTAGEM =====

/**
 * Formata porcentagem para exibição
 * @param value - Valor já calculado pela API (0-1 ou 0-100)
 * @param decimals - Número de casas decimais (padrão: 1)
 * @param isDecimal - Se o valor já está em decimal (padrão: false)
 */
export const formatPercentage = (value: number, decimals: number = 1, isDecimal: boolean = false): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Formata taxa de conclusão
 * @param completed - Número de itens completados
 * @param total - Total de itens
 */
export const formatCompletionRate = (completed: number, total: number): string => {
  if (total === 0) return '0%';
  const rate = (completed / total) * 100;
  return `${rate.toFixed(1)}%`;
};

// ===== FORMATADORES DE CLASSIFICAÇÃO =====

/**
 * Formata classificação para exibição
 * @param classification - Classificação já calculada pela API
 */
export const formatClassification = (classification: string): string => {
  if (!classification) return 'N/A';
  
  // Mapeia classificações para nomes mais amigáveis
  const classificationMap: Record<string, string> = {
    'abaixo_do_basico': 'Abaixo do Básico',
    'basico': 'Básico',
    'adequado': 'Adequado',
    'avancado': 'Avançado',
    'Abaixo do Básico': 'Abaixo do Básico',
    'Básico': 'Básico',
    'Adequado': 'Adequado',
    'Avançado': 'Avançado'
  };

  return classificationMap[classification] || classification;
};

// ===== FORMATADORES DE STATUS =====

/**
 * Formata status de completude para exibição
 * @param status - Status já calculado pela API
 */
export const formatCompletionStatus = (status: CompletionStatusLevel): string => {
  const statusMap: Record<CompletionStatusLevel, string> = {
    [CompletionStatusLevel.COMPLETE]: 'Completo',
    [CompletionStatusLevel.MOSTLY_COMPLETE]: 'Quase Completo',
    [CompletionStatusLevel.PARTIALLY_COMPLETE]: 'Parcialmente Completo',
    [CompletionStatusLevel.INCOMPLETE]: 'Incompleto',
    [CompletionStatusLevel.NOT_STARTED]: 'Não Iniciado',
    [CompletionStatusLevel.INVALID]: 'Inválido'
  };

  return statusMap[status] || 'Desconhecido';
};

/**
 * Formata status de avaliação para exibição
 * @param status - Status já calculado pela API
 */
export const formatEvaluationStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'concluida': 'Concluída',
    'em_andamento': 'Em Andamento',
    'pendente': 'Pendente',
    'agendada': 'Agendada',
    'finalizada': 'Finalizada',
    'cancelada': 'Cancelada'
  };

  return statusMap[status] || status;
};

// ===== FORMATADORES DE DATA =====

/**
 * Formata data para exibição
 * @param dateString - Data já formatada pela API
 * @param locale - Locale para formatação (padrão: 'pt-BR')
 */
export const formatDate = (dateString: string, locale: string = 'pt-BR'): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale);
  } catch {
    return 'Data Inválida';
  }
};

/**
 * Formata data e hora para exibição
 * @param dateString - Data já formatada pela API
 * @param locale - Locale para formatação (padrão: 'pt-BR')
 */
export const formatDateTime = (dateString: string, locale: string = 'pt-BR'): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString(locale);
  } catch {
    return 'Data Inválida';
  }
};

/**
 * Formata data relativa (ex: "há 2 horas")
 * @param dateString - Data já formatada pela API
 */
export const formatRelativeDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'agora mesmo';
    if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `há ${Math.floor(diffInSeconds / 86400)} dias`;
    
    return `há ${Math.floor(diffInSeconds / 2592000)} meses`;
  } catch {
    return 'Data Inválida';
  }
};

// ===== FORMATADORES DE NÚMEROS =====

/**
 * Formata número para exibição com separadores de milhares
 * @param number - Número já calculado pela API
 * @param decimals - Número de casas decimais (padrão: 0)
 */
export const formatNumber = (number: number, decimals: number = 0): string => {
  if (number === null || number === undefined || isNaN(number)) {
    return 'N/A';
  }
  
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formata estatísticas para exibição
 * @param value - Valor já calculado pela API
 * @param total - Total para cálculo de porcentagem
 * @param showPercentage - Se deve mostrar porcentagem (padrão: true)
 */
export const formatStats = (value: number, total: number, showPercentage: boolean = true): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const formattedValue = formatNumber(value);
  
  if (showPercentage && total > 0) {
    const percentage = (value / total) * 100;
    return `${formattedValue} (${percentage.toFixed(1)}%)`;
  }
  
  return formattedValue;
};

// ===== FORMATADORES DE VALIDAÇÃO =====

/**
 * Valida se um valor numérico é válido
 * @param value - Valor a ser validado
 */
export const isValidNumber = (value: unknown): boolean => {
  return value !== null && value !== undefined && !isNaN(Number(value)) && isFinite(Number(value));
};

/**
 * Valida se uma data é válida
 * @param dateString - Data a ser validada
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

// ===== FORMATADORES DE TEXTO =====

/**
 * Trunca texto para exibição
 * @param text - Texto a ser truncado
 * @param maxLength - Comprimento máximo (padrão: 50)
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Capitaliza primeira letra de cada palavra
 * @param text - Texto a ser capitalizado
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

// ===== FORMATADORES DE MÉTRICAS =====

/**
 * Formata métrica de acertos/erros
 * @param correct - Número de acertos já calculado pela API
 * @param total - Total de questões
 */
export const formatAccuracy = (correct: number, total: number): string => {
  if (total === 0) return '0/0 (0%)';
  const percentage = (correct / total) * 100;
  return `${correct}/${total} (${percentage.toFixed(1)}%)`;
};

/**
 * Formata tempo médio por questão
 * @param totalTime - Tempo total já calculado pela API (em segundos)
 * @param questionCount - Número de questões
 */
export const formatAverageTimePerQuestion = (totalTime: number, questionCount: number): string => {
  if (questionCount === 0) return 'N/A';
  const averageTime = totalTime / questionCount;
  return formatTime(averageTime);
};

 