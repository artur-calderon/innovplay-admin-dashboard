/**
 * Simulador de pontos INSE (paridade com o backend: inse_normalizer + inse_scoring).
 * A fonte de verdade é o Python; este módulo espelha as mesmas tabelas para soma em
 * tempo real no cliente. Manter alinhado a:
 * `afirmeplay_backend/app/socioeconomic_forms/constants/inse_*.py` e ao PDF InnovPlay.
 * Não há outro ficheiro no repo com tabelas duplicadas — ecrãs do simulador devem usar
 * `calcularInseDeRespostas` / `pontuacaoParaNivelInse` daqui.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Responses = Record<string, any>;

const ESCOLARIDADE_PONTOS: Record<string, number> = {
  fundamental_incompleto: 1,
  fundamental_ate_4: 2,
  fundamental_completo: 4,
  medio_completo: 7,
  superior_completo: 10,
  nao_sei: 0,
  desconhecido: 0,
};

const BENS_PONTOS: Record<string, Record<string, number>> = {
  geladeira: { '0': 0, '1': 3, '2': 4, '3+': 5 },
  computador: { '0': 1, '1': 4, '2': 6, '3+': 8 },
  quartos: { '0': 0, '1': 2, '2': 4, '3+': 6 },
  televisao: { '0': 0, '1': 2, '2': 3, '3+': 4 },
  banheiro: { '0': 0, '1': 3, '2': 5, '3+': 7 },
  carro: { '0': 1, '1': 5, '2': 8, '3+': 10 },
  celular: { '0': 0, '1': 2, '2': 3, '3+': 4 },
};

const SERVICOS_PONTOS: Record<string, { false: number; true: number }> = {
  tv_internet: { false: 1, true: 3 },
  wifi: { false: 1, true: 5 },
  quarto_so_seu: { false: 1, true: 4 },
  mesa_estudar: { false: 1, true: 2 },
  microondas: { false: 1, true: 3 },
  aspirador: { false: 1, true: 2 },
  maquina_lavar: { false: 1, true: 4 },
  freezer: { false: 1, true: 3 },
  garagem: { false: 1, true: 4 },
};

const BENS_CHAVES = Object.keys(BENS_PONTOS) as Array<keyof typeof BENS_PONTOS>;
const SERVICOS_CHAVES = Object.keys(SERVICOS_PONTOS) as Array<keyof typeof SERVICOS_PONTOS>;

const ESCOLARIDADE_MAE = ['q8', 'q9'] as const;
const ESCOLARIDADE_PAI = ['q10', 'q9'] as const;

// Mesma ordem do backend: q12* (legado) antes de q13*; em formulário atual, q12 é infra (Sim/Não) e é ignorada.
const BENS_MAP: Record<keyof typeof BENS_PONTOS, [string, string]> = {
  geladeira: ['q12a', 'q13a'],
  computador: ['q12b', 'q13b'],
  quartos: ['q12c', 'q13c'],
  televisao: ['q12d', 'q13d'],
  banheiro: ['q12e', 'q13e'],
  carro: ['q12f', 'q13f'],
  celular: ['q12g', 'q13g'],
};

const SERVICOS_MAP: Record<keyof typeof SERVICOS_PONTOS, [string, string]> = {
  tv_internet: ['q14a', 'q13a'],
  wifi: ['q14b', 'q13b'],
  quarto_so_seu: ['q14c', 'q13c'],
  mesa_estudar: ['q14d', 'q13d'],
  microondas: ['q14e', 'q13e'],
  aspirador: ['q14f', 'q13f'],
  maquina_lavar: ['q14g', 'q13g'],
  freezer: ['q14h', 'q13h'],
  garagem: ['q14i', 'q13i'],
};

const ALIASES_ESCOLARIDADE: Array<{ conceito: keyof typeof ESCOLARIDADE_PONTOS; textos: string[] }> = [
  { conceito: 'fundamental_incompleto', textos: [
    'Não completou o 5º ano',
    'Não completou a 4ª série',
    'Não completou a 4ª série ou o 5º ano do Ensino Fundamental',
  ] },
  { conceito: 'fundamental_ate_4', textos: [
    'Ensino Fundamental, até a 4ª série ou o 5º ano',
    'Ensino Fundamental até o 5º ano',
  ] },
  { conceito: 'fundamental_completo', textos: ['Ensino Fundamental completo'] },
  { conceito: 'medio_completo', textos: ['Ensino Médio completo'] },
  { conceito: 'superior_completo', textos: [
    'Ensino Superior completo (faculdade ou graduação)',
    'Ensino Superior completo',
  ] },
  { conceito: 'nao_sei', textos: ['Não sei'] },
];

const BENS_OPCOES: Record<string, string[]> = {
  '0': ['Nenhum', '0'],
  '1': ['1'],
  '2': ['2'],
  '3+': ['3 ou mais'],
};

const SIM = ['Sim', 'sim', 'Sím', 'sím'];
const NAO = ['Não', 'Nao', 'não', 'nao'];

function firstScalarString(res: Responses, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = res[k];
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function isInepTwoParentForm(res: Responses): boolean {
  for (const key of Object.keys(res)) {
    if (key.startsWith('q10')) return false;
  }
  const v10 = res.q10;
  if (v10 != null && typeof v10 !== 'object') {
    if (String(v10).trim() !== '') return false;
  }
  return Boolean(firstScalarString(res, ['q8']) && firstScalarString(res, ['q9']));
}

function normalizarEscolaridadeTexto(texto: string | null): keyof typeof ESCOLARIDADE_PONTOS {
  if (!texto || !String(texto).trim()) return 'desconhecido';
  const t = String(texto).trim();
  for (const g of ALIASES_ESCOLARIDADE) {
    for (const a of g.textos) {
      if (a.trim() === t) return g.conceito;
    }
  }
  return 'desconhecido';
}

function normalizarQuantidade(raw: string | null): '0' | '1' | '2' | '3+' {
  if (!raw || !String(raw).trim()) return '0';
  const t = String(raw).trim();
  for (const [can, aliases] of Object.entries(BENS_OPCOES)) {
    if (aliases.includes(t)) return can as '0' | '1' | '2' | '3+';
  }
  if (t === '1' || t === '2') return t;
  if (t.includes('3') || t.toLowerCase().includes('ou mais')) return '3+';
  return '0';
}

function normalizarSimNao(raw: string | null): boolean {
  if (!raw || !String(raw).trim()) return false;
  const t = String(raw).trim();
  if (SIM.includes(t)) return true;
  if (NAO.includes(t)) return false;
  return false;
}

/** Se for Sim ou Não, não é contagem de bens (ex.: q12 atual = infra na rua). Alinhado a `inse_normalizer._first_bem_quantidade_bruta`. */
function isRespostaSimNao(text: string | null | undefined): boolean {
  if (text == null || !String(text).trim()) return false;
  return SIM.includes(String(text).trim()) || NAO.includes(String(text).trim());
}

function firstBemQuantidadeBruta(res: Responses, keys: [string, string]): string | null {
  for (const k of keys) {
    const v = res[k];
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') continue;
    const s = String(v).trim();
    if (!s) continue;
    if (isRespostaSimNao(s)) continue;
    return s;
  }
  return null;
}

export interface InseCanonico {
  maeEscolaridade: keyof typeof ESCOLARIDADE_PONTOS;
  paiEscolaridade: keyof typeof ESCOLARIDADE_PONTOS;
  bens: Record<string, '0' | '1' | '2' | '3+'>;
  servicos: Record<string, boolean>;
}

/** Igual a `normalizar_respostas` (Python) para cálculo INSE. */
export function normalizarRespostasInse(responses: Responses | null | undefined): InseCanonico {
  if (!responses || Object.keys(responses).length === 0) {
    return {
      maeEscolaridade: 'desconhecido',
      paiEscolaridade: 'desconhecido',
      bens: Object.fromEntries(BENS_CHAVES.map((k) => [k, '0' as const])) as InseCanonico['bens'],
      servicos: Object.fromEntries(SERVICOS_CHAVES.map((k) => [k, false])) as InseCanonico['servicos'],
    };
  }
  const res = responses as Responses;

  let mae: keyof typeof ESCOLARIDADE_PONTOS;
  let pai: keyof typeof ESCOLARIDADE_PONTOS;

  if (isInepTwoParentForm(res)) {
    mae = normalizarEscolaridadeTexto(firstScalarString(res, ['q8']));
    pai = normalizarEscolaridadeTexto(firstScalarString(res, ['q9']));
  } else {
    mae = normalizarEscolaridadeTexto(firstScalarString(res, [...ESCOLARIDADE_MAE]));
    pai = normalizarEscolaridadeTexto(firstScalarString(res, [...ESCOLARIDADE_PAI]));
  }

  const bens: InseCanonico['bens'] = { ...Object.fromEntries(BENS_CHAVES.map((k) => [k, '0' as const])) } as InseCanonico['bens'];
  for (const item of BENS_CHAVES) {
    const raw = firstBemQuantidadeBruta(res, BENS_MAP[item]);
    bens[item] = normalizarQuantidade(raw);
  }

  const servicos: InseCanonico['servicos'] = { ...Object.fromEntries(SERVICOS_CHAVES.map((k) => [k, false])) } as InseCanonico['servicos'];
  for (const item of SERVICOS_CHAVES) {
    const [a, b] = SERVICOS_MAP[item];
    const raw = firstScalarString(res, [a, b]);
    servicos[item] = normalizarSimNao(raw);
  }

  return { maeEscolaridade: mae, paiEscolaridade: pai, bens, servicos };
}

export const INSE_PONTUACAO_MAXIMA_TEORICA = 94;

export function calcularPontosInse(n: InseCanonico): number {
  let total = 0;
  total += ESCOLARIDADE_PONTOS[n.maeEscolaridade] ?? 0;
  total += ESCOLARIDADE_PONTOS[n.paiEscolaridade] ?? 0;
  for (const item of BENS_CHAVES) {
    const v = n.bens[item] ?? '0';
    total += BENS_PONTOS[item][v] ?? 0;
  }
  for (const item of SERVICOS_CHAVES) {
    const v = n.servicos[item] ?? false;
    const row = SERVICOS_PONTOS[item];
    total += v ? row.true : row.false;
  }
  return total;
}

const FAIXAS: Array<{ min: number; max: number; nivel: number; label: string }> = [
  { min: 10, max: 30, nivel: 1, label: 'Muito Baixo' },
  { min: 31, max: 50, nivel: 2, label: 'Baixo' },
  { min: 51, max: 70, nivel: 3, label: 'Médio Baixo' },
  { min: 71, max: 90, nivel: 4, label: 'Médio' },
  { min: 91, max: 110, nivel: 5, label: 'Alto' },
  { min: 111, max: 9999, nivel: 6, label: 'Muito Alto' },
];

export function pontuacaoParaNivelInse(pontos: number | null | undefined): { nivel: number | null; label: string } {
  if (pontos == null || pontos < 10) {
    return { nivel: null, label: 'Não calculado' };
  }
  for (const f of FAIXAS) {
    if (pontos >= f.min && pontos <= f.max) {
      return { nivel: f.nivel, label: f.label };
    }
  }
  return { nivel: 6, label: 'Muito Alto' };
}

export function calcularInseDeRespostas(responses: Responses | null | undefined) {
  const n = normalizarRespostasInse(responses);
  const pontos = calcularPontosInse(n);
  const { nivel, label } = pontuacaoParaNivelInse(pontos);
  return { pontos, nivel, label, canonico: n };
}
