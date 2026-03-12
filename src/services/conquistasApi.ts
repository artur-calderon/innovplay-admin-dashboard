import { api } from "@/lib/api";

export type MedalhaTipo = "bronze" | "prata" | "ouro" | "platina";

export interface ConquistaNivel {
  medalha: MedalhaTipo;
  progresso: number;
  desbloqueada: boolean;
  moedas_valor: number;
  resgatado: boolean;
  /** Texto do requisito para este nível (ex.: "5 avaliações concluídas") — se a API enviar */
  requisito?: string;
  /** Valor atual do progresso (ex.: 3) — se a API enviar junto com progresso_meta */
  progresso_atual?: number;
  /** Meta do progresso (ex.: 5) — se a API enviar */
  progresso_meta?: number;
}

export interface Conquista {
  achievement_id: string;
  nome: string;
  descricao: string;
  estado: "revelada" | "oculta" | "desbloqueada";
  niveis?: ConquistaNivel[];
  /** Medalha atual (API envia medalha_atual) */
  medalha?: MedalhaTipo | null;
  progresso?: number;
  moedas_valor?: number;
  resgatado?: boolean;
}

/** Nível bruto da API (pode trazer campos extras) */
interface ConquistaNivelRaw extends ConquistaNivel {
  [key: string]: unknown;
}

/** Resposta bruta da API (pode vir com id, medalha_atual, progresso_percent) */
interface ConquistaRaw {
  id?: string;
  achievement_id?: string;
  nome: string;
  descricao: string;
  estado: string;
  niveis?: ConquistaNivelRaw[];
  medalha_atual?: MedalhaTipo | null;
  medalha?: MedalhaTipo | null;
  progresso_percent?: number;
  progresso?: number;
  moedas_valor?: number;
  resgatado?: boolean;
  [key: string]: unknown;
}

export interface ConquistasResponse {
  conquistas: Conquista[] | ConquistaRaw[];
}

function normalizeNivel(n: ConquistaNivelRaw): ConquistaNivel {
  return {
    medalha: n.medalha,
    progresso: n.progresso ?? 0,
    desbloqueada: n.desbloqueada ?? false,
    moedas_valor: n.moedas_valor ?? 0,
    resgatado: n.resgatado ?? false,
    requisito: n.requisito,
    progresso_atual: n.progresso_atual,
    progresso_meta: n.progresso_meta,
  };
}

function normalizeConquista(raw: ConquistaRaw): Conquista {
  const niveis = raw.niveis?.map((n) => normalizeNivel(n as ConquistaNivelRaw));
  return {
    achievement_id: raw.id ?? raw.achievement_id ?? "",
    nome: raw.nome ?? "",
    descricao: raw.descricao ?? "",
    estado: (raw.estado === "oculta" || raw.estado === "revelada" || raw.estado === "desbloqueada" ? raw.estado : "revelada") as Conquista["estado"],
    niveis,
    medalha: raw.medalha_atual ?? raw.medalha ?? undefined,
    progresso: raw.progresso_percent ?? raw.progresso,
    moedas_valor: raw.moedas_valor,
    resgatado: raw.resgatado,
  };
}

export interface ResgatarPayload {
  achievement_id: string;
  medalha: MedalhaTipo;
}

export interface ResgatarResponse {
  moedas_creditadas: number;
  novo_saldo: number;
}

/**
 * GET /students/me/conquistas
 * Conquistas do aluno logado. Normaliza id→achievement_id, medalha_atual→medalha, progresso_percent→progresso.
 */
export async function getConquistas(): Promise<Conquista[]> {
  const { data } = await api.get<ConquistasResponse>("/students/me/conquistas");
  const list = data?.conquistas ?? [];
  return Array.isArray(list) ? list.map((c) => normalizeConquista(c as ConquistaRaw)) : [];
}

/**
 * POST /students/me/conquistas/resgatar
 * Resgata uma medalha por moedas. Body: { achievement_id, medalha }.
 */
export async function resgatarConquista(
  payload: ResgatarPayload
): Promise<ResgatarResponse> {
  const { data } = await api.post<ResgatarResponse>(
    "/students/me/conquistas/resgatar",
    payload
  );
  return data;
}
