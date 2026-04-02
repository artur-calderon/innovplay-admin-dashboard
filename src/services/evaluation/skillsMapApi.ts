import { api } from '@/lib/api';

export type SkillsMapFaixa = 'abaixo_do_basico' | 'basico' | 'adequado' | 'avancado';

export interface SkillsMapHabilidade {
  skill_id: string;
  codigo: string;
  descricao: string;
  subject_id?: string | null;
  /** Cartão-resposta: bloco/disciplina da questão (evita misturar mesma habilidade entre disciplinas). */
  disciplina_nome?: string | null;
  percentual_acertos: number;
  faixa: SkillsMapFaixa;
  total_tentativas?: number;
}

export interface DisciplinaOpcao {
  id: string;
  nome: string;
}

export interface SkillsMapResponse {
  nivel_granularidade?: string;
  disciplinas_disponiveis: DisciplinaOpcao[];
  habilidades: SkillsMapHabilidade[];
  por_faixa: Record<SkillsMapFaixa, SkillsMapHabilidade[]>;
  filtros_aplicados?: Record<string, string | undefined>;
  total_alunos_escopo?: number;
}

export interface SkillsMapErrosResponse {
  percentual_erros: number;
  total_alunos_escopo: number;
  total_alunos_que_erraram: number;
  alunos: Array<{
    id: string;
    nome: string;
    escola?: string;
    serie?: string;
    turma?: string;
  }>;
  filtros_aplicados?: Record<string, string | undefined>;
}

function withCityMeta(municipio: string | undefined) {
  return municipio && municipio !== 'all'
    ? { meta: { cityId: municipio } as { cityId: string } }
    : {};
}

export type EvaluationFilterParams = {
  estado?: string;
  municipio?: string;
  avaliacao?: string;
  escola?: string;
  serie?: string;
  turma?: string;
};

export async function fetchEvaluationFilterOptions(params: EvaluationFilterParams) {
  const q = new URLSearchParams();
  if (params.estado && params.estado !== 'all') q.set('estado', params.estado);
  if (params.municipio && params.municipio !== 'all') q.set('municipio', params.municipio);
  if (params.avaliacao && params.avaliacao !== 'all') q.set('avaliacao', params.avaliacao);
  if (params.escola && params.escola !== 'all') q.set('escola', params.escola);
  if (params.serie && params.serie !== 'all') q.set('serie', params.serie);
  if (params.turma && params.turma !== 'all') q.set('turma', params.turma);
  const url = `/evaluation-results/opcoes-filtros${q.toString() ? `?${q}` : ''}`;
  const { data } = await api.get(url, withCityMeta(params.municipio));
  return data;
}

export type AnswerSheetFilterParams = {
  estado?: string;
  municipio?: string;
  gabarito?: string;
  escola?: string;
  serie?: string;
  turma?: string;
};

export async function fetchAnswerSheetFilterOptions(params: AnswerSheetFilterParams) {
  const q = new URLSearchParams();
  if (params.estado && params.estado !== 'all') q.set('estado', params.estado);
  if (params.municipio && params.municipio !== 'all') q.set('municipio', params.municipio);
  if (params.gabarito && params.gabarito !== 'all') q.set('gabarito', params.gabarito);
  if (params.escola && params.escola !== 'all') q.set('escola', params.escola);
  if (params.serie && params.serie !== 'all') q.set('serie', params.serie);
  if (params.turma && params.turma !== 'all') q.set('turma', params.turma);
  const url = `/answer-sheets/opcoes-filtros-results${q.toString() ? `?${q}` : ''}`;
  const { data } = await api.get(url, withCityMeta(params.municipio));
  return data;
}

export async function fetchSkillsMapOnline(
  params: EvaluationFilterParams & { disciplina?: string }
): Promise<SkillsMapResponse> {
  const q = new URLSearchParams();
  if (params.estado && params.estado !== 'all') q.set('estado', params.estado);
  if (params.municipio && params.municipio !== 'all') q.set('municipio', params.municipio);
  if (params.avaliacao) q.set('avaliacao', params.avaliacao);
  if (params.escola && params.escola !== 'all') q.set('escola', params.escola);
  if (params.serie && params.serie !== 'all') q.set('serie', params.serie);
  if (params.turma && params.turma !== 'all') q.set('turma', params.turma);
  q.set('disciplina', params.disciplina && params.disciplina !== 'all' ? params.disciplina : 'all');
  const { data } = await api.get<SkillsMapResponse>(
    `/evaluation-results/mapa-habilidades?${q}`,
    withCityMeta(params.municipio)
  );
  return data;
}

export async function fetchSkillsMapOnlineErros(
  params: EvaluationFilterParams & { disciplina?: string; skill_id: string }
): Promise<SkillsMapErrosResponse> {
  const q = new URLSearchParams();
  if (params.estado && params.estado !== 'all') q.set('estado', params.estado);
  if (params.municipio && params.municipio !== 'all') q.set('municipio', params.municipio);
  if (params.avaliacao) q.set('avaliacao', params.avaliacao);
  if (params.escola && params.escola !== 'all') q.set('escola', params.escola);
  if (params.serie && params.serie !== 'all') q.set('serie', params.serie);
  if (params.turma && params.turma !== 'all') q.set('turma', params.turma);
  q.set('disciplina', params.disciplina && params.disciplina !== 'all' ? params.disciplina : 'all');
  q.set('skill_id', params.skill_id);
  const { data } = await api.get<SkillsMapErrosResponse>(
    `/evaluation-results/mapa-habilidades/erros?${q}`,
    withCityMeta(params.municipio)
  );
  return data;
}

export async function fetchSkillsMapCartao(
  params: AnswerSheetFilterParams & { disciplina?: string }
): Promise<SkillsMapResponse> {
  const q = new URLSearchParams();
  if (params.estado && params.estado !== 'all') q.set('estado', params.estado);
  if (params.municipio && params.municipio !== 'all') q.set('municipio', params.municipio);
  if (params.gabarito) q.set('gabarito', params.gabarito);
  if (params.escola && params.escola !== 'all') q.set('escola', params.escola);
  if (params.serie && params.serie !== 'all') q.set('serie', params.serie);
  if (params.turma && params.turma !== 'all') q.set('turma', params.turma);
  q.set('disciplina', params.disciplina && params.disciplina !== 'all' ? params.disciplina : 'all');
  const { data } = await api.get<SkillsMapResponse>(
    `/answer-sheets/mapa-habilidades?${q}`,
    withCityMeta(params.municipio)
  );
  return data;
}

export async function fetchSkillsMapCartaoErros(
  params: AnswerSheetFilterParams & {
    disciplina?: string;
    skill_id: string;
    /** Disciplina/bloco da habilidade (igual subject_id do item do mapa). */
    bloco_disciplina?: string | null;
  }
): Promise<SkillsMapErrosResponse> {
  const q = new URLSearchParams();
  if (params.estado && params.estado !== 'all') q.set('estado', params.estado);
  if (params.municipio && params.municipio !== 'all') q.set('municipio', params.municipio);
  if (params.gabarito) q.set('gabarito', params.gabarito);
  if (params.escola && params.escola !== 'all') q.set('escola', params.escola);
  if (params.serie && params.serie !== 'all') q.set('serie', params.serie);
  if (params.turma && params.turma !== 'all') q.set('turma', params.turma);
  q.set('disciplina', params.disciplina && params.disciplina !== 'all' ? params.disciplina : 'all');
  q.set('skill_id', params.skill_id);
  if (params.bloco_disciplina && params.bloco_disciplina !== 'all') {
    q.set('bloco_disciplina', params.bloco_disciplina);
  }
  const { data } = await api.get<SkillsMapErrosResponse>(
    `/answer-sheets/mapa-habilidades/erros?${q}`,
    withCityMeta(params.municipio)
  );
  return data;
}
