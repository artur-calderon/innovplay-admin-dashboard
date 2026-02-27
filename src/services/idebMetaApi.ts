/**
 * API de persistência da Calculadora de Metas IDEB.
 * Base URL e autenticação: mesmo host da API, JWT no header Authorization: Bearer <token>.
 * Contexto: city_id (UUID do município) + level ("Anos Iniciais" | "Anos Finais").
 */

import { api } from '@/lib/api';
import type { IdebData } from '@/types/idebMeta';

/** Nível aceito pela API */
export type IdebMetaLevel = 'Anos Iniciais' | 'Anos Finais';

/** Item de histórico no payload */
export interface IdebMetaHistoricoItem {
  ano: number;
  ideb: number;
  port: number;
  math: number;
  fluxo: number;
}

/** Escola no payload (aceita nome ou name) */
export interface IdebMetaEscola {
  id: string;
  nome?: string;
  name?: string;
  level: string;
  ideb: number;
  historico?: IdebMetaHistoricoItem[];
}

/** municipalityData no payload */
export interface IdebMetaMunicipalityData {
  municipio: string;
  uf: string;
  escola?: string;
  rede?: string;
  ano: number;
  ideb: number;
  proficienciaPortugues: number;
  proficienciaMatematica: number;
  fluxo: number;
  level: string;
  historico: IdebMetaHistoricoItem[];
  escolas?: IdebMetaEscola[];
}

/** Payload completo (estado da calculadora) */
export interface IdebMetaPayload {
  municipalityData: IdebMetaMunicipalityData;
  customTarget: number;
  activeEntityId: string | null;
  targetYear: number;
}

/** Resposta do GET e do PUT */
export interface IdebMetaSaveResponse {
  payload: IdebMetaPayload;
  updated_at: string;
}

/**
 * Carrega dados salvos para (city_id, level).
 * @returns payload ou null se 404 (sem dados salvos)
 */
export async function getSavedData(
  cityId: string,
  level: IdebMetaLevel
): Promise<IdebMetaPayload | null> {
  try {
    const { data } = await api.get<IdebMetaSaveResponse>('/ideb-meta', {
      params: { city_id: cityId, level },
    });
    return data?.payload ?? null;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

/**
 * Salva/atualiza o estado da calculadora (upsert por city_id + level).
 */
export async function saveData(
  cityId: string,
  level: IdebMetaLevel,
  payload: IdebMetaPayload
): Promise<IdebMetaSaveResponse> {
  const { data } = await api.put<IdebMetaSaveResponse>('/ideb-meta', {
    city_id: cityId,
    level,
    municipalityData: payload.municipalityData,
    customTarget: payload.customTarget,
    activeEntityId: payload.activeEntityId,
    targetYear: payload.targetYear,
  });
  return data;
}

/** Body para adicionar escola (aceita escola ou school, nome ou name) */
export interface IdebMetaAddSchoolBody {
  city_id: string;
  level: IdebMetaLevel;
  escola?: IdebMetaEscola;
  school?: IdebMetaEscola;
}

/**
 * Adiciona/atualiza uma escola apenas no payload da calculadora (não altera tabela de escolas).
 */
export async function addSchool(
  cityId: string,
  level: IdebMetaLevel,
  escola: IdebMetaEscola
): Promise<IdebMetaSaveResponse> {
  const { data } = await api.post<IdebMetaSaveResponse>('/ideb-meta/schools', {
    city_id: cityId,
    level,
    escola: {
      id: escola.id,
      nome: escola.nome ?? escola.name,
      name: escola.name ?? escola.nome,
      level: escola.level,
      ideb: escola.ideb,
      historico: escola.historico,
    },
  } as IdebMetaAddSchoolBody);
  return data;
}

/**
 * Remove a escola do payload da calculadora para (city_id, level).
 * Não remove a escola do sistema, só do save da calculadora.
 */
export async function removeSchool(
  cityId: string,
  level: IdebMetaLevel,
  schoolId: string
): Promise<IdebMetaSaveResponse | undefined> {
  const { data } = await api.delete<IdebMetaSaveResponse | undefined>(
    `/ideb-meta/schools/${encodeURIComponent(schoolId)}`,
    { params: { city_id: cityId, level } }
  );
  return data;
}

/**
 * Converte IdebData (tipo da calculadora) para IdebMetaMunicipalityData (payload API).
 */
export function toApiMunicipalityData(data: IdebData): IdebMetaMunicipalityData {
  return {
    municipio: data.municipio,
    uf: data.uf,
    escola: data.escola,
    rede: data.rede,
    ano: data.ano,
    ideb: data.ideb,
    proficienciaPortugues: data.proficienciaPortugues,
    proficienciaMatematica: data.proficienciaMatematica,
    fluxo: data.fluxo,
    level: data.level,
    historico: data.historico.map((h) => ({
      ano: h.ano,
      ideb: h.ideb,
      port: h.port,
      math: h.math,
      fluxo: h.fluxo,
    })),
    escolas: data.escolas?.map((e) => ({
      id: e.id,
      nome: e.nome,
      level: e.level,
      ideb: e.ideb,
      historico: e.historico?.map((h) => ({
        ano: h.ano,
        ideb: h.ideb,
        port: h.port,
        math: h.math,
        fluxo: h.fluxo,
      })),
    })),
  };
}
