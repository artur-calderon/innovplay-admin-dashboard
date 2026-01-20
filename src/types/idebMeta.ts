/**
 * Tipos para a calculadora de metas IDEB
 * Baseado em afirme-calculo-de-meta/types.ts
 */

export interface HistoricoCompleto {
  ano: number;
  ideb: number;
  meta?: number;
  fluxo: number;
  port: number;
  math: number;
  idebEstado?: number;
  idebBrasil?: number;
}

export interface Escola {
  id: string;
  nome: string;
  level: EducationLevel;
  ideb: number;
  historico?: HistoricoCompleto[];
}

export interface IqealMétricas {
  iqa: number;
  iqf: number;
  iqap: number;
  ig: number;
  fse: number;
  p: number;
  notaFinal: number;
  conceito: number;
  ranking?: number;
}

export interface IdebData {
  municipio: string;
  uf: string;
  escola?: string;
  rede?: string;
  ano: number;
  fluxo: number;
  proficienciaPortugues: number;
  proficienciaMatematica: number;
  ideb: number;
  level: EducationLevel;
  isMunicipal?: boolean;
  historico: HistoricoCompleto[];
  iqeal?: IqealMétricas;
  escolas?: Escola[];
}

export enum EducationLevel {
  INICIAIS = 'Anos Iniciais',
  FINAIS = 'Anos Finais'
}

// Re-exportar GrowthAnalysis do utilitário
export type { GrowthAnalysis } from '@/utils/idebCalculator';
