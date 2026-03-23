import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Filter, Users, Check } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { EvaluationResultsApiService, REPORT_ENTITY_TYPE_ANSWER_SHEET } from "@/services/evaluationResultsApi";
import { getUserHierarchyContext, getRestrictionMessage, validateReportAccess, UserHierarchyContext, cityIdQueryParamForAdmin } from "@/utils/userHierarchy";
import { api } from "@/lib/api";
import type { jsPDF } from "jspdf";
import type { CellHookData, Styles } from "jspdf-autotable";
import { normalizeProficiencyLevelLabel } from "@/utils/reportTagStyles";
import type { ReportProficiencyLabel } from "@/utils/reportTagStyles";
import type { AnswerSheetResultadosAgregadosRaw } from "@/utils/mapAnswerSheetResultadosAgregadosToNovaResposta";
import {
  filtrarGabaritosOpcoesSomenteComHabilidadesVinculadas,
  type GabaritoOpcaoFiltrosResults,
} from "@/utils/answerSheetRelatorioGabaritoComHabilidades";

// Types from the original component
type StudentResult = {
  id: string;
  nome: string;
  turma: string;
  escola?: string;
  serie?: string;
  nota: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  acertos: number;
  erros: number;
  questoes_respondidas: number;
  status: 'concluida' | 'pendente';
  // Removidos campos específicos de disciplinas (LP/MAT)
  respostas?: Record<string, boolean | null>;
};

type EvaluationInfo = {
  id: string;
  titulo: string;
  disciplina: string;
  disciplinas?: string[];
  serie: string;
  escola: string;
  municipio: string;
  data_aplicacao: string;
  logo_url?: string;
};

type DetailedReport = {
  avaliacao: {
    id: string;
    titulo: string;
    disciplina: string;
    total_questoes: number;
  };
  questoes: Array<{
    id: string;
    numero: number;
    texto: string;
    habilidade: string;
    codigo_habilidade: string;
    tipo: 'multipleChoice' | 'open' | 'trueFalse';
    dificuldade: 'Fácil' | 'Médio' | 'Difícil';
    porcentagem_acertos: number;
    porcentagem_erros: number;
  }>;
  alunos: Array<{
    id: string;
    nome: string;
    turma: string;
    respostas: Array<{
      questao_id: string;
      questao_numero: number;
      resposta_correta: boolean;
      resposta_em_branco: boolean;
      tempo_gasto: number;
    }>;
    total_acertos: number;
    total_erros: number;
    total_em_branco: number;
    nota_final: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    status: 'concluida' | 'nao_respondida';
  }>;
};

// Tabela detalhada por disciplina (shape compatível com Results.tsx)
type TabelaDetalhadaPorDisciplina = {
  disciplinas: Array<{
    id: string;
    nome: string;
    questoes: Array<{
      numero: number;
      habilidade: string;
      codigo_habilidade: string;
      question_id: string;
    }>;
    alunos: Array<{
      id?: string;
      aluno_id?: string;
      nome: string;
      escola: string;
      serie: string;
      turma: string;
      classificacao?: string;
      respostas_por_questao?: Array<{
        questao: number;
        acertou: boolean;
        respondeu: boolean;
        resposta: string;
      }>;
      total_acertos: number;
      total_erros: number;
      total_respondidas: number;
      total_questoes_disciplina: number;
      nivel_proficiencia: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado' | string;
      nota: number;
      proficiencia: number;
    }>;
  }>;
  geral?: {
    alunos: Array<{
      id?: string;
      aluno_id?: string;
      nome: string;
      escola?: string;
      serie?: string;
      turma?: string;
      nota_geral?: number;
      proficiencia_geral?: number;
      classificacao?: string;
      nivel_proficiencia_geral?: string;
      total_acertos_geral?: number;
      total_em_branco_geral?: number;
      total_questoes_geral?: number;
      total_respondidas_geral?: number;
      status_geral?: string;
      [key: string]: unknown;
    }>;
  };
} | null;

/** Linhas da API podem usar `aluno_id` (cartão-resposta) em vez de `id`. */
function alunoRowId(aluno: { id?: string; aluno_id?: string }): string {
  return String(aluno.id ?? aluno.aluno_id ?? "").trim();
}

/** Mesma regra de subtítulo do modal em AnswerSheetResults (escola · turma · série). */
function formatAlunoEscolaTurmaSerie(a: { escola?: string; turma?: string; serie?: string }): string {
  return [a.escola, a.turma, a.serie].filter(Boolean).join(" · ") || "—";
}

function getProficiencyLevelRgb(level: ReportProficiencyLabel): [number, number, number] {
  switch (level) {
    case "Avançado":
      return [22, 163, 74];
    case "Adequado":
      return [34, 197, 94];
    case "Básico":
      return [250, 204, 21];
    case "Abaixo do Básico":
      return [239, 68, 68];
  }
}

/**
 * Tabelas massivas (detalhada por questão / por disciplina) — alta densidade (~400 alunos).
 * Não usar na tabela "RELATÓRIO DE DESEMPENHO GERAL" (resumo).
 * Padding corpo: `CELL_PAD_V` menor que `CELL_PAD_H` para baixar a altura das linhas.
 * `PDF_BULK_DENSITY`: 1.0 menos compacto; valores menores encolhem fonte, paddings, linhas e ícones.
 */
const PDF_BULK_DENSITY = 0.62;

const PDF_BULK_LANDSCAPE_FONT = (numCols: number) =>
  Math.max(0.9, Math.min(2.45, 2.35 * (18 / Math.max(1, numCols)) * PDF_BULK_DENSITY));

const PDF_BULK_LANDSCAPE_CELL_PAD_H = (numCols: number) =>
  Math.max(0.014, Math.min(0.065, 0.07 * (18 / Math.max(1, numCols)) * PDF_BULK_DENSITY));

const PDF_BULK_LANDSCAPE_CELL_PAD_V = (numCols: number) =>
  Math.max(0.004, Math.min(0.018, 0.022 * (18 / Math.max(1, numCols)) * PDF_BULK_DENSITY));

const PDF_BULK_HEAD_CELL_PAD: { vertical: number; horizontal: number } = {
  vertical: 0.038 * PDF_BULK_DENSITY,
  horizontal: 0.095 * PDF_BULK_DENSITY,
};

/**
 * ✓/✗ nas colunas de questão: mesmo tamanho em todas as tabelas bulk (detalhe geral e por disciplina).
 * Só reduz se a célula for menor que o alvo; evita ícones minúsculos quando a linha é baixa.
 */
const PDF_BULK_Q_ICON_TARGET_MM = 0.88;
const PDF_BULK_Q_ICON_MIN_MM = 0.52;
const PDF_BULK_Q_ICON_CELL_PAD_MM = 0.09;

function pdfBulkQuestionMarkIconHalfExtentMm(cellWidth: number, cellHeight: number): number {
  const innerW = cellWidth - PDF_BULK_Q_ICON_CELL_PAD_MM;
  const innerH = cellHeight - PDF_BULK_Q_ICON_CELL_PAD_MM;
  if (innerW <= 0.2 || innerH <= 0.2) return PDF_BULK_Q_ICON_MIN_MM;
  const maxHalf = Math.min(innerW, innerH) / 2.18;
  return Math.max(PDF_BULK_Q_ICON_MIN_MM, Math.min(PDF_BULK_Q_ICON_TARGET_MM, maxHalf));
}

/** Só coluna “Aluno”: encolhe fonte e padding vertical; a altura da linha segue esse texto. */
const PDF_BULK_NAME_COL_FONT_MUL = 0.86;
const PDF_BULK_NAME_COL_PAD_V_MUL = 0.42;

/** Altura da linha = 1 linha do nome (ellipsize) + padding vertical — no limite. */
function pdfBulkBodyRowHeightToMatchNameMm(fontSizePt: number, padVerticalMm: number): number {
  const lineMm = fontSizePt * 0.3528 * 1.02;
  return Math.max(1.5, lineMm + padVerticalMm * 2);
}


type DrawProficiencyNivelPdfOpts = {
  compact?: boolean;
  /** Opcional: limita a altura do fundo colorido (faixa central). Omitir = preenche a célula toda. */
  chipMaxHeightMm?: number;
};

/** Fundo colorido + texto multilinha (evita cortar "Abaixo do Básico" e cinza por rótulo desconhecido). */
function drawProficiencyNivelInPdfCell(
  d: jsPDF,
  cell: { x: number; y: number; width: number; height: number },
  rawLabel: string,
  fontSize: number,
  opts: DrawProficiencyNivelPdfOpts = {}
): void {
  const compact = opts.compact ?? false;
  const chipMax = opts.chipMaxHeightMm;

  const label = normalizeProficiencyLevelLabel(
    rawLabel === "—" || rawLabel === "-" ? "" : rawLabel
  );
  const [r, g, b] = getProficiencyLevelRgb(label);

  let fillY = cell.y;
  let fillH = cell.height;
  if (chipMax != null && chipMax > 0 && Number.isFinite(chipMax)) {
    const m = 0.1;
    fillH = Math.min(chipMax, Math.max(1.05, cell.height - m * 2));
    fillY = cell.y + (cell.height - fillH) / 2;
  }

  d.setFillColor(r, g, b);
  d.rect(cell.x, fillY, cell.width, fillH, "F");
  d.setTextColor(255, 255, 255);
  d.setFont("helvetica", "bold");

  let fs: number;
  let pad: number;
  let lineH: number;
  const chipMode = chipMax != null && chipMax > 0;

  if (compact) {
    fs = Math.max(1.15, Math.min(2.05, fontSize));
    if (chipMode) {
      fs = Math.min(fs, Math.max(1.1, fillH * 0.38));
    } else {
      fs = Math.min(fs, Math.max(1.05, fillH * 0.48));
    }
    pad = chipMode ? 0.22 : 0.28;
    lineH = Math.max(fs * (chipMode ? 0.2 : 0.24), chipMode ? 1.05 : 1.02);
  } else {
    fs = Math.max(5, label.length > 24 && fontSize > 6 ? fontSize - 1.25 : fontSize);
    pad = 2;
    lineH = Math.max(fs * 0.42, 2.8);
  }

  d.setFontSize(fs);
  const maxW = Math.max(compact ? 2.2 : 4, cell.width - pad * 2);
  const lines = d.splitTextToSize(label, maxW);
  const totalH = lines.length * lineH;
  const startY = fillY + (fillH - totalH) / 2 + lineH * (compact ? 0.14 : 0.25);
  lines.forEach((line, i) => {
    d.text(line, cell.x + cell.width / 2, startY + i * lineH, { align: "center" });
  });
  d.setDrawColor(200, 200, 200);
  d.setLineWidth(0.05);
  d.rect(cell.x, cell.y, cell.width, cell.height);
}

type AnswerSheetSkillRow = { id?: string; code?: string; description?: string };

/** Preenche `questoes` vazias com a lista de habilidades da avaliação (cartão-resposta). */
function enrichTabelaDetalhadaAnswerSheetSkills(
  tabela: TabelaDetalhadaPorDisciplina | null,
  skills: AnswerSheetSkillRow[] | undefined,
  isAnswerSheet: boolean
): TabelaDetalhadaPorDisciplina | null {
  if (!isAnswerSheet || !tabela?.disciplinas?.length || !skills?.length) return tabela;
  const sorted = [...skills].filter((s) => s?.id).sort((a, b) => {
    const ca = (a.code || a.id || "").toString();
    const cb = (b.code || b.id || "").toString();
    return ca.localeCompare(cb, undefined, { sensitivity: "base" });
  });
  if (sorted.length === 0) return tabela;
  return {
    ...tabela,
    disciplinas: tabela.disciplinas.map((d) => {
      if (Array.isArray(d.questoes) && d.questoes.length > 0) return d;
      return {
        ...d,
        questoes: sorted.map((s, idx) => ({
          numero: idx + 1,
          habilidade: s.description || "",
          codigo_habilidade: s.code || s.id || "",
          question_id: s.id || String(idx + 1),
        })),
      };
    }),
  };
}

const mapDetailedStudentsToResults = (alunos: DetailedReport['alunos'] | undefined): StudentResult[] => {
  if (!alunos) return [];

  return alunos.map((aluno) => {
    const respostasMap: Record<string, boolean | null> = {};
    aluno.respostas?.forEach((resp) => {
      const key = `q${resp.questao_numero}`;
      if (resp.resposta_em_branco) {
        respostasMap[key] = null;
      } else {
        respostasMap[key] = resp.resposta_correta;
      }
    });

    return {
      id: aluno.id,
      nome: aluno.nome,
      turma: aluno.turma,
      nota: aluno.nota_final,
      proficiencia: aluno.proficiencia,
      classificacao: normalizeProficiencyLevelLabel(aluno.classificacao),
      acertos: aluno.total_acertos,
      erros: aluno.total_erros,
      questoes_respondidas: aluno.total_acertos + aluno.total_erros + aluno.total_em_branco,
      status: aluno.status === 'concluida' ? 'concluida' : 'pendente',
      respostas: respostasMap
    } as StudentResult;
  });
};

/** Conta chaves q1, q2, … no mapa de respostas (ignora metadados acidentais). */
const perQuestionRespostasCount = (r?: Record<string, boolean | null>): number =>
  r ? Object.keys(r).filter((k) => /^q\d+$/i.test(k)).length : 0;

const mapUnifiedStudents = (tabela: TabelaDetalhadaPorDisciplina): StudentResult[] => {
  const studentsMap = new Map<string, StudentResult>();

  const classifFromRow = (aluno: {
    nivel_proficiencia?: string;
    nivel_proficiencia_geral?: string;
    classificacao?: string;
  }): StudentResult["classificacao"] =>
    normalizeProficiencyLevelLabel(
      aluno.nivel_proficiencia_geral || aluno.nivel_proficiencia || aluno.classificacao || ""
    );

  tabela?.geral?.alunos?.forEach((aluno) => {
    const rowId = alunoRowId(aluno);
    if (!rowId) return;
    const totalQuestoes = aluno.total_questoes_geral ?? aluno.total_respondidas_geral ?? 0;
    const totalRespondidas = aluno.total_respondidas_geral ?? totalQuestoes;
    const totalAcertos = aluno.total_acertos_geral ?? 0;
    const totalEmBranco = aluno.total_em_branco_geral ?? Math.max(0, totalQuestoes - totalRespondidas);
    const totalErros = Math.max(0, totalRespondidas - totalAcertos - totalEmBranco);

    // Determinar status: verificar se participou (respondeu pelo menos uma questão)
    // Não apenas confiar em status_geral, mas também verificar se há respostas
    const statusFromField = (aluno.status_geral ?? "pendente") === "concluida";
    const participou = totalRespondidas > 0 || totalAcertos > 0 || totalErros > 0;
    const statusFinal = statusFromField || participou ? "concluida" : "pendente";

    studentsMap.set(rowId, {
      id: rowId,
      nome: aluno.nome,
      turma: aluno.turma || "",
      escola: aluno.escola,
      serie: aluno.serie,
      nota: Number(aluno.nota_geral ?? 0),
      proficiencia: Number(aluno.proficiencia_geral ?? 0),
      classificacao: classifFromRow(aluno),
      acertos: totalAcertos,
      erros: totalErros,
      questoes_respondidas: totalRespondidas || totalQuestoes,
      status: statusFinal,
      respostas: {},
    });
  });

  const geralIds = new Set(
    (tabela?.geral?.alunos ?? []).map((a) => alunoRowId(a)).filter(Boolean)
  );

  // Offset global por disciplina para numerar questões 1..N em todas as disciplinas (ex.: LP 1-20, MAT 21-40)
  let questionOffset = 0;

  tabela?.disciplinas?.forEach((disciplina) => {
    const numQuestoesDisc = disciplina.questoes?.length ?? 0;

    disciplina.alunos?.forEach((aluno) => {
      const rowId = alunoRowId(aluno);
      if (!rowId) return;

      let student = studentsMap.get(rowId);

      if (student) {
        if (aluno.escola && !student.escola) student.escola = aluno.escola;
        if (aluno.serie && !student.serie) student.serie = aluno.serie;
        if (aluno.turma && !student.turma) student.turma = aluno.turma;
      }

      const hasAnsweredAny =
        Array.isArray(aluno.respostas_por_questao) &&
        aluno.respostas_por_questao.some((r) => r.respondeu);
      const summarySemQuestoes =
        !hasAnsweredAny &&
        (Number(aluno.nota) > 0 ||
          Number(aluno.proficiencia) > 0 ||
          Boolean(aluno.classificacao));

      if (!student) {
        const totalQuestoesDisciplina =
          aluno.total_questoes_disciplina ?? aluno.respostas_por_questao?.length ?? 0;
        const totalRespondidas = aluno.total_respondidas ?? totalQuestoesDisciplina;
        const totalAcertos = aluno.total_acertos ?? 0;
        const totalEmBranco = Math.max(0, totalQuestoesDisciplina - totalRespondidas);
        const totalErros = aluno.total_erros ?? Math.max(0, totalRespondidas - totalAcertos - totalEmBranco);

        student = {
          id: rowId,
          nome: aluno.nome,
          turma: aluno.turma || "",
          escola: aluno.escola,
          serie: aluno.serie,
          nota: Number(aluno.nota ?? 0),
          proficiencia: Number(aluno.proficiencia ?? 0),
          classificacao: classifFromRow(aluno),
          acertos: totalAcertos,
          erros: totalErros,
          questoes_respondidas: totalRespondidas,
          status: hasAnsweredAny || summarySemQuestoes ? "concluida" : "pendente",
          respostas: {},
        };
        studentsMap.set(rowId, student);
      }

      const respostasMap = student.respostas || (student.respostas = {});

      aluno.respostas_por_questao?.forEach((resp) => {
        const numeroQuestao = Number(resp.questao);
        if (Number.isNaN(numeroQuestao) || numeroQuestao <= 0) return;
        const globalNumero = questionOffset + numeroQuestao;
        const key = `q${globalNumero}`;

        if (!resp.respondeu) {
          if (!(key in respostasMap)) {
            respostasMap[key] = null;
          }
        } else {
          respostasMap[key] = Boolean(resp.acertou);
        }
      });

      if (!geralIds.has(rowId)) {
        const totalQuestoesDisciplina =
          aluno.total_questoes_disciplina ?? aluno.respostas_por_questao?.length ?? 0;
        const totalRespondidas = aluno.total_respondidas ?? totalQuestoesDisciplina;
        const totalAcertos = aluno.total_acertos ?? 0;
        const totalEmBranco = Math.max(0, totalQuestoesDisciplina - totalRespondidas);
        const totalErros = aluno.total_erros ?? Math.max(0, totalRespondidas - totalAcertos - totalEmBranco);

        student.acertos += totalAcertos;
        student.erros += totalErros;
        student.questoes_respondidas += totalRespondidas || totalQuestoesDisciplina;

        // Marcar como concluida se participou
        if ((hasAnsweredAny || summarySemQuestoes) && student.status !== "concluida") {
          student.status = "concluida";
        }
        if (!student.classificacao || student.classificacao === "Abaixo do Básico") {
          student.classificacao = classifFromRow(aluno);
        }
        if (!student.nota) {
          student.nota = Number(aluno.nota ?? 0);
        }
        if (!student.proficiencia) {
          student.proficiencia = Number(aluno.proficiencia ?? 0);
        }
      } else {
        // Aluno está em geral.alunos - verificar se participou mesmo que status_geral não indique
        // Isso garante que alunos que participaram sejam marcados corretamente
        if ((hasAnsweredAny || summarySemQuestoes) && student.status !== "concluida") {
          student.status = "concluida";
        }
      }
    });

    questionOffset += numQuestoesDisc;
  });

  const mappedStudents = Array.from(studentsMap.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
  );

  return mappedStudents;
};

/** `opcoes_proximos_filtros` pode trazer escolas/séries/turmas com `nome` ou `name` (igual à rota opcoes-filtros). */
function normalizeOpcoesProximosFiltrosShape(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const mapArr = (arr: unknown) => {
    if (!Array.isArray(arr)) return arr;
    return arr.map((item: { id: string; nome?: string; name?: string }) => ({
      ...item,
      nome: item.nome ?? item.name ?? '',
    }));
  };
  return {
    ...raw,
    ...(raw.escolas !== undefined ? { escolas: mapArr(raw.escolas) } : {}),
    ...(raw.series !== undefined ? { series: mapArr(raw.series) } : {}),
    ...(raw.turmas !== undefined ? { turmas: mapArr(raw.turmas) } : {}),
  };
}

export type AcertoNiveisProps = {
  answerSheetsResultadosAgregados?: boolean;
};

export default function AcertoNiveis({ answerSheetsResultadosAgregados = false }: AcertoNiveisProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const isAnswerSheetAgregados = answerSheetsResultadosAgregados;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [states, setStates] = useState<Array<{ id: string; nome: string }>>([]);
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; nome: string }>>([]);
  const [evaluations, setEvaluations] = useState<Array<{ id: string; titulo: string; data_aplicacao?: string }>>([]);
  const [schools, setSchools] = useState<Array<{ id: string; nome: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: string; nome: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [asEstado, setAsEstado] = useState<string>("all");
  const [asMunicipio, setAsMunicipio] = useState<string>("all");
  const [asGabarito, setAsGabarito] = useState<string>("all");
  const [asEscola, setAsEscola] = useState<string>("all");
  const [asSerie, setAsSerie] = useState<string>("all");
  const [asTurma, setAsTurma] = useState<string>("all");
  const [asOpcoes, setAsOpcoes] = useState<{
    estados?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
    municipios?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
    gabaritos?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
    escolas?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
    series?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
    turmas?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
  }>({});
  const [isLoadingFiltersAg, setIsLoadingFiltersAg] = useState(false);
  const [isLoadingAgregadosData, setIsLoadingAgregadosData] = useState(false);

  const municipalityForAdmin = isAnswerSheetAgregados
    ? asMunicipio !== "all"
      ? asMunicipio
      : ""
    : selectedMunicipality;
  const adminCityIdQuery = useMemo(
    () => cityIdQueryParamForAdmin(user?.role, municipalityForAdmin || undefined),
    [user?.role, municipalityForAdmin]
  );

  /** Fora do modo agregados, esta página usa apenas cartões resposta (API com `report_entity_type`). */
  const reportEntityTypeParam = !isAnswerSheetAgregados ? REPORT_ENTITY_TYPE_ANSWER_SHEET : undefined;

  const asNorm = (o: { id: string; nome?: string; name?: string; titulo?: string }) =>
    o.nome ?? o.name ?? o.titulo ?? o.id;

  const allRequiredAgregadosFilters =
    asEstado !== "all" && asMunicipio !== "all" && asGabarito !== "all";

  // Estados para hierarquia do usuário
  const [userHierarchyContext, setUserHierarchyContext] = useState<UserHierarchyContext | null>(null);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(true);

  const [evaluationInfo, setEvaluationInfo] = useState<EvaluationInfo | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  // Estados para armazenar todos os dados carregados (sem filtros aplicados)
  const [allStudents, setAllStudents] = useState<StudentResult[]>([]);
  const [allTabelaDetalhada, setAllTabelaDetalhada] = useState<TabelaDetalhadaPorDisciplina>(null);
  const [detailedReport, setDetailedReport] = useState<DetailedReport | null>(null);
  const [skillsMapping, setSkillsMapping] = useState<Record<string, string>>({});
  const fallbackAnswersCache = React.useRef<Map<string, Map<number, boolean>>>(new Map());
  /** Habilidades da rota `/skills/evaluation/...` para sintetizar colunas em cartão-resposta. */
  const answerSheetSkillsRef = React.useRef<AnswerSheetSkillRow[]>([]);
  // Nova: tabela detalhada por disciplina do backend
  const [tabelaDetalhada, setTabelaDetalhada] = useState<TabelaDetalhadaPorDisciplina>(null);
  // Ref para debounce dos filtros
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showAbsentStudentsModal, setShowAbsentStudentsModal] = useState(false);
  // Cache de fetchEvaluationData para evitar requisições idênticas (mesma avaliação + filtros)
  type FetchEvaluationDataResult = {
    students: StudentResult[];
    report: DetailedReport | null;
    tabelaDetalhada: TabelaDetalhadaPorDisciplina | null;
    estatisticas: { [key: string]: unknown } | null;
    opcoesProximosFiltros: { [key: string]: unknown } | null;
  };
  const fetchEvaluationDataCacheRef = useRef<Map<string, FetchEvaluationDataResult>>(new Map());
  const fetchEvaluationDataInFlightRef = useRef<Map<string, Promise<FetchEvaluationDataResult>>>(new Map());
  // Estado para estatísticas gerais (similar ao apiData em Results.tsx)
  const [estatisticasGerais, setEstatisticasGerais] = useState<{
    serie?: string;
    escola?: string;
    municipio?: string;
    total_alunos?: number;
    alunos_participantes?: number;
    alunos_ausentes?: number;
    media_nota_geral?: number;
    media_proficiencia_geral?: number;
    [key: string]: unknown;
  } | null>(null);
  // Estado para opcoes_proximos_filtros (para obter série correta do endpoint)
  const [opcoesProximosFiltros, setOpcoesProximosFiltros] = useState<{
    series?: Array<{ id: string; name: string }>;
    [key: string]: unknown;
  } | null>(null);

  // Total de questões a partir da tabela (soma de todas as disciplinas: ex. 20 LP + 20 MAT = 40)
  const totalQuestoesFromTabela = React.useMemo(() => {
    const t = allTabelaDetalhada || tabelaDetalhada;
    if (!t?.disciplinas?.length) return 0;
    return t.disciplinas.reduce((acc, d) => acc + (d.questoes?.length ?? 0), 0);
  }, [allTabelaDetalhada, tabelaDetalhada]);

  // Utilitários para tratar habilidades
  const normalizeUUID = (value?: string) => (value || '').replace(/[{}]/g, '').trim().toLowerCase();

  const setAsEstadoAndReset = useCallback((v: string) => {
    setAsEstado(v);
    setAsMunicipio("all");
    setAsGabarito("all");
    setAsEscola("all");
    setAsSerie("all");
    setAsTurma("all");
    setAllStudents([]);
    setStudents([]);
    setAllTabelaDetalhada(null);
    setTabelaDetalhada(null);
    setEstatisticasGerais(null);
    setEvaluationInfo(null);
  }, []);

  const setAsMunicipioAndReset = useCallback((v: string) => {
    setAsMunicipio(v);
    setAsGabarito("all");
    setAsEscola("all");
    setAsSerie("all");
    setAsTurma("all");
    setAllStudents([]);
    setStudents([]);
    setAllTabelaDetalhada(null);
    setTabelaDetalhada(null);
    setEstatisticasGerais(null);
    setEvaluationInfo(null);
  }, []);

  const setAsGabaritoAndReset = useCallback((v: string) => {
    setAsGabarito(v);
    setAsEscola("all");
    setAsSerie("all");
    setAsTurma("all");
    setAllStudents([]);
    setStudents([]);
    setAllTabelaDetalhada(null);
    setTabelaDetalhada(null);
    setEstatisticasGerais(null);
    setEvaluationInfo(null);
  }, []);

  const setAsEscolaAndReset = useCallback((v: string) => {
    setAsEscola(v);
    setAsSerie("all");
    setAsTurma("all");
    setAllStudents([]);
    setStudents([]);
    setAllTabelaDetalhada(null);
    setTabelaDetalhada(null);
    setEstatisticasGerais(null);
    setEvaluationInfo(null);
  }, []);

  const setAsSerieAndReset = useCallback((v: string) => {
    setAsSerie(v);
    setAsTurma("all");
    setAllStudents([]);
    setStudents([]);
    setAllTabelaDetalhada(null);
    setTabelaDetalhada(null);
    setEstatisticasGerais(null);
    setEvaluationInfo(null);
  }, []);

  const fetchAsOpcoesFiltros = useCallback(async () => {
    if (!isAnswerSheetAgregados) return;
    const params = new URLSearchParams();
    if (asEstado && asEstado !== "all") params.set("estado", asEstado);
    if (asMunicipio && asMunicipio !== "all") params.set("municipio", asMunicipio);
    if (asGabarito && asGabarito !== "all") params.set("gabarito", asGabarito);
    if (asEscola && asEscola !== "all") params.set("escola", asEscola);
    if (asSerie && asSerie !== "all") params.set("serie", asSerie);
    if (asTurma && asTurma !== "all") params.set("turma", asTurma);
    const query = params.toString();
    try {
      setIsLoadingFiltersAg(true);
      const url = `/answer-sheets/opcoes-filtros-results${query ? `?${query}` : ""}`;
      const res = await api.get<{
        estados?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
        municipios?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
        gabaritos?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
        escolas?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
        series?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
        turmas?: Array<{ id: string; nome?: string; name?: string; titulo?: string }>;
      }>(url);
      const raw = res.data || {};
      const gabaritosFiltrados = await filtrarGabaritosOpcoesSomenteComHabilidadesVinculadas(
        (raw.gabaritos ?? []) as GabaritoOpcaoFiltrosResults[]
      );
      setAsOpcoes({ ...raw, gabaritos: gabaritosFiltrados });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os filtros de cartão resposta.",
        variant: "destructive",
      });
      setAsOpcoes({});
    } finally {
      setIsLoadingFiltersAg(false);
    }
  }, [
    isAnswerSheetAgregados,
    asEstado,
    asMunicipio,
    asGabarito,
    asEscola,
    asSerie,
    asTurma,
    toast,
  ]);

  useEffect(() => {
    if (isAnswerSheetAgregados) {
      void fetchAsOpcoesFiltros();
    }
  }, [isAnswerSheetAgregados, fetchAsOpcoesFiltros]);

  useEffect(() => {
    if (!isAnswerSheetAgregados || asGabarito === "all") return;
    const ids = (asOpcoes.gabaritos ?? []).map((g) => g.id);
    if (ids.length === 0) return;
    if (!ids.includes(asGabarito)) {
      setAsGabarito("all");
      setAsEscola("all");
      setAsSerie("all");
      setAsTurma("all");
      setAllStudents([]);
      setStudents([]);
      setAllTabelaDetalhada(null);
      setTabelaDetalhada(null);
      setEstatisticasGerais(null);
      setEvaluationInfo(null);
    }
  }, [isAnswerSheetAgregados, asGabarito, asOpcoes.gabaritos]);

  useEffect(() => {
    if (!isAnswerSheetAgregados || !allRequiredAgregadosFilters) {
      if (isAnswerSheetAgregados && !allRequiredAgregadosFilters) {
        answerSheetSkillsRef.current = [];
        setAllStudents([]);
        setStudents([]);
        setAllTabelaDetalhada(null);
        setTabelaDetalhada(null);
        setEstatisticasGerais(null);
        setDetailedReport(null);
        setEvaluationInfo(null);
      }
      return;
    }
    const load = async () => {
      try {
        setIsLoadingAgregadosData(true);

        const skills = await EvaluationResultsApiService.getSkillsByEvaluation(asGabarito, {
          report_entity_type: REPORT_ENTITY_TYPE_ANSWER_SHEET,
          cityId: asMunicipio,
          ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
        }).catch(() => []);

        answerSheetSkillsRef.current =
          Array.isArray(skills) ? (skills as AnswerSheetSkillRow[]).filter((s) => s?.id) : [];
        const newSkillsMapping: Record<string, string> = {};
        if (skills && Array.isArray(skills)) {
          skills.forEach((skill: { id?: string; code?: string }) => {
            const idNorm = skill?.id ? normalizeUUID(skill.id) : "";
            const code = (skill?.code || "").trim();
            if (idNorm && code) newSkillsMapping[idNorm] = code;
            if (code) newSkillsMapping[normalizeUUID(code)] = code;
          });
        }
        setSkillsMapping(newSkillsMapping);

        const params = new URLSearchParams();
        params.set("estado", asEstado);
        params.set("municipio", asMunicipio);
        params.set("gabarito", asGabarito);
        if (asEscola !== "all") params.set("escola", asEscola);
        if (asSerie !== "all") params.set("serie", asSerie);
        if (asTurma !== "all") params.set("turma", asTurma);
        const res = await api.get<AnswerSheetResultadosAgregadosRaw>(
          `/answer-sheets/resultados-agregados?${params.toString()}`
        );
        const rawTd = res.data?.tabela_detalhada;
        let tabelaDetalhadaNext: TabelaDetalhadaPorDisciplina | null =
          rawTd && Array.isArray(rawTd.disciplinas)
            ? ({
                disciplinas: rawTd.disciplinas.map((disciplina) => ({
                  ...disciplina,
                  alunos: [...(disciplina.alunos || [])].sort((a, b) =>
                    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
                  ),
                })),
                geral: rawTd.geral
                  ? {
                      alunos: [...(rawTd.geral.alunos || [])].sort((a, b) =>
                        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
                      ),
                    }
                  : undefined,
              } as TabelaDetalhadaPorDisciplina)
            : null;

        tabelaDetalhadaNext = enrichTabelaDetalhadaAnswerSheetSkills(
          tabelaDetalhadaNext,
          answerSheetSkillsRef.current,
          true
        );

        const mappedStudents = tabelaDetalhadaNext ? mapUnifiedStudents(tabelaDetalhadaNext) : [];
        setAllTabelaDetalhada(tabelaDetalhadaNext);
        setTabelaDetalhada(tabelaDetalhadaNext);
        setAllStudents(mappedStudents);
        setStudents(mappedStudents);
        setDetailedReport(null);

        const eg = res.data.estatisticas_gerais;
        if (eg) {
          setEstatisticasGerais(eg as unknown as { [key: string]: unknown });
        } else {
          setEstatisticasGerais(null);
        }

        const gabTitulo =
          (asOpcoes.gabaritos ?? []).find((g) => g.id === asGabarito)?.nome ??
          (asOpcoes.gabaritos ?? []).find((g) => g.id === asGabarito)?.titulo ??
          eg?.nome ??
          "Cartão resposta";

        const munNome =
          eg?.municipio ??
          asNorm((asOpcoes.municipios ?? []).find((m) => m.id === asMunicipio) ?? { id: asMunicipio });

        setEvaluationInfo({
          id: asGabarito,
          titulo: String(gabTitulo),
          disciplina: "",
          disciplinas: [],
          serie: eg?.serie ?? "",
          escola: eg?.escola ?? "",
          municipio: munNome,
          data_aplicacao: "",
          logo_url: undefined,
        });
      } catch {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os resultados agregados do cartão resposta.",
          variant: "destructive",
        });
        setAllStudents([]);
        setStudents([]);
        setAllTabelaDetalhada(null);
        setTabelaDetalhada(null);
        setEstatisticasGerais(null);
        setEvaluationInfo(null);
      } finally {
        setIsLoadingAgregadosData(false);
      }
    };
    void load();
  }, [
    isAnswerSheetAgregados,
    allRequiredAgregadosFilters,
    asEstado,
    asMunicipio,
    asGabarito,
    asEscola,
    asSerie,
    asTurma,
    toast,
    asOpcoes.gabaritos,
    adminCityIdQuery,
  ]);

  const looksLikeRealSkillCode = (value?: string) => {
    if (!value) return false;
    const v = value.trim().toUpperCase();
    // BNCC EFxxXXnn (ex.: EF02MA14, EF12LP01)
    if (/^EF\d+[A-Z]{2,}\d+[A-Z0-9]*$/.test(v)) return true;
    // Exemplos aceitos: LP9L1.2, 9N1.2, CN9L1.3, GE9L1.4, 9L1.1, 9S1.2, 9M1.1, 9 L 1.1, 9 N 1.2
    return /^(LP\d+L\d+\.\d+|\d+N\d\.\d+|[A-Z]{2}\d+L\d+\.\d+|\d+[LMSN]\d+\.\d+|\d+\s+[LMSN]\s+\d+\.\d+)$/.test(v);
  };


  const getStateFilterValue = React.useCallback(() => {
    if (!selectedState) return undefined;
    const stateObj = states.find((state) => state.id === selectedState);
    return stateObj?.nome || selectedState;
  }, [selectedState, states]);

  const buildUnifiedFilters = React.useCallback((
    evaluationId: string,
    overrides: { schoolId?: string; gradeId?: string; classId?: string } = {}
  ) => {
    const filters: {
      estado?: string;
      municipio?: string;
      avaliacao?: string;
      escola?: string;
      serie?: string;
      turma?: string;
      report_entity_type?: typeof REPORT_ENTITY_TYPE_ANSWER_SHEET;
      city_id?: string;
    } = {};

    const estadoValor = getStateFilterValue();
    if (estadoValor) filters.estado = estadoValor;
    if (selectedMunicipality) filters.municipio = selectedMunicipality;
    filters.avaliacao = evaluationId;
    if (overrides.schoolId) filters.escola = overrides.schoolId;
    if (overrides.gradeId) filters.serie = overrides.gradeId;
    if (overrides.classId) filters.turma = overrides.classId;
    if (!isAnswerSheetAgregados) filters.report_entity_type = REPORT_ENTITY_TYPE_ANSWER_SHEET;
    if (adminCityIdQuery) filters.city_id = adminCityIdQuery;

    return filters;
  }, [selectedMunicipality, getStateFilterValue, isAnswerSheetAgregados, adminCityIdQuery]);

  const fetchEvaluationData = React.useCallback(
    async (
      evaluationId: string,
      overrides: { schoolId?: string; gradeId?: string; classId?: string } = {}
    ): Promise<FetchEvaluationDataResult> => {
      const cacheKey = `${evaluationId}|${overrides.schoolId ?? ''}|${overrides.gradeId ?? ''}|${overrides.classId ?? ''}|${!isAnswerSheetAgregados ? 'as' : 'ev'}|${adminCityIdQuery ?? ''}`;

      // Reutilizar requisição já em andamento (evita duplicatas)
      const inFlight = fetchEvaluationDataInFlightRef.current.get(cacheKey);
      if (inFlight) return inFlight;

      // Retornar cache se existir (evita nova requisição idêntica)
      const cached = fetchEvaluationDataCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const doFetch = async (): Promise<FetchEvaluationDataResult> => {
        const filters = buildUnifiedFilters(evaluationId, overrides);
        try {
          const unifiedResponse = await EvaluationResultsApiService.getEvaluationsList(1, 1, filters);

          let tabelaDetalhada: TabelaDetalhadaPorDisciplina | null =
            unifiedResponse?.tabela_detalhada &&
              Array.isArray(unifiedResponse.tabela_detalhada.disciplinas)
              ? {
                ...unifiedResponse.tabela_detalhada,
                disciplinas: unifiedResponse.tabela_detalhada.disciplinas.map((disciplina) => ({
                  ...disciplina,
                  alunos: [...(disciplina.alunos || [])].sort((a, b) =>
                    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
                  )
                })),
                geral: unifiedResponse.tabela_detalhada.geral
                  ? {
                    alunos: [...(unifiedResponse.tabela_detalhada.geral.alunos || [])].sort((a, b) =>
                      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
                    )
                  }
                  : undefined
              }
              : null;

          tabelaDetalhada = enrichTabelaDetalhadaAnswerSheetSkills(
            tabelaDetalhada,
            !isAnswerSheetAgregados ? answerSheetSkillsRef.current : undefined,
            !isAnswerSheetAgregados
          );

          const studentsMapped = tabelaDetalhada ? mapUnifiedStudents(tabelaDetalhada) : [];

          const result: FetchEvaluationDataResult = {
            students: studentsMapped,
            report: null,
            tabelaDetalhada,
            estatisticas: unifiedResponse?.estatisticas_gerais
              ? (unifiedResponse.estatisticas_gerais as unknown as { [key: string]: unknown })
              : null,
            opcoesProximosFiltros: normalizeOpcoesProximosFiltrosShape(
              unifiedResponse?.opcoes_proximos_filtros
                ? (unifiedResponse.opcoes_proximos_filtros as Record<string, unknown>)
                : null
            )
          };
          fetchEvaluationDataCacheRef.current.set(cacheKey, result);
          return result;
        } catch (error) {
          return {
            students: [],
            report: null,
            tabelaDetalhada: null,
            estatisticas: null,
            opcoesProximosFiltros: null
          };
        } finally {
          fetchEvaluationDataInFlightRef.current.delete(cacheKey);
        }
      };

      const promise = doFetch();
      fetchEvaluationDataInFlightRef.current.set(cacheKey, promise);
      return promise;
    },
    [buildUnifiedFilters, isAnswerSheetAgregados, adminCityIdQuery]
  );

  // ✅ OTIMIZAÇÃO: Filtrar dados no frontend quando possível usando useMemo
  // Isso evita requisições desnecessárias à API quando apenas filtros locais mudam
  // ✅ OTIMIZAÇÃO: useMemo para calcular dados filtrados de forma eficiente
  // Ordem otimizada: filtrar por escola/série primeiro (reduz dataset), depois por turma (filtro simples)
  const filteredStudents = useMemo(() => {
    if (isAnswerSheetAgregados) {
      return allStudents;
    }

    if (!selectedSchoolId && !selectedGradeId && !selectedClassId) {
      return allStudents;
    }

    if (allStudents.length === 0) {
      return [];
    }

    let filtered = [...allStudents];

    // ✅ OTIMIZAÇÃO: Filtrar por escola e série primeiro (usando tabela detalhada)
    // Isso reduz o dataset antes de aplicar o filtro de turma (mais eficiente)
    if ((selectedSchoolId || selectedGradeId) && allTabelaDetalhada?.disciplinas) {
      const validIds = new Set<string>();

      // Pré-calcular valores de comparação para evitar múltiplos finds
      const selectedSchool = selectedSchoolId ? schools.find(s => s.id === selectedSchoolId) : null;
      const selectedGrade = selectedGradeId ? grades.find(g => g.id === selectedGradeId) : null;
      const escolaNome = selectedSchool?.nome;
      const serieNome = selectedGrade?.nome;

      // Otimização: iterar apenas uma vez sobre todas as disciplinas
      for (const disciplina of allTabelaDetalhada.disciplinas) {
        if (!disciplina.alunos) continue;

        for (const aluno of disciplina.alunos) {
          // Verificar escola
          if (selectedSchoolId) {
            if (escolaNome && aluno.escola !== escolaNome && aluno.escola !== selectedSchoolId) {
              continue; // Pular este aluno
            }
          }

          // Verificar série
          if (selectedGradeId) {
            if (serieNome && aluno.serie !== serieNome && aluno.serie !== selectedGradeId) {
              continue; // Pular este aluno
            }
          }

          const rid = alunoRowId(aluno);
          if (rid) validIds.add(rid);
        }
      }

      filtered = filtered.filter(s => validIds.has(s.id));
    }

    // ✅ OTIMIZAÇÃO: Filtrar por turma depois (filtro simples sobre dataset já reduzido)
    if (selectedClassId) {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) {
        filtered = filtered.filter(s => s.turma === selectedClass.nome);
      }
    }

    return filtered;
  }, [
    isAnswerSheetAgregados,
    allStudents,
    allTabelaDetalhada,
    selectedSchoolId,
    selectedGradeId,
    selectedClassId,
    schools,
    grades,
    classes,
  ]);

  /** Alinhado ao modal de AnswerSheetResults: não concluídos / pendentes. */
  const absentStudents = useMemo(
    () =>
      students
        .filter((s) => s.status === "pendente")
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [students]
  );

  // ✅ OTIMIZAÇÃO: Limpar timeout quando componente for desmontado
  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  // ✅ MODIFICADO: Usar apenas a proficiência do backend (tabela evaluation_results)
  // Removidas as funções de cálculo de proficiência por disciplina do frontend
  // Agora todas as tabelas usam a mesma proficiência calculada pelo backend

  // Carregar contexto hierárquico do usuário
  useEffect(() => {
    const loadUserHierarchy = async () => {
      if (!user?.id || !user?.role) {
        setIsLoadingHierarchy(false);
        return;
      }

      try {
        setIsLoadingHierarchy(true);
        const context = await getUserHierarchyContext(user.id, user.role);
        setUserHierarchyContext(context);

        // Pre-selecionar filtros baseado na hierarquia
        if (context.municipality) {
          setSelectedMunicipality(context.municipality.id);

          // Carregar estado baseado no município
          const statesResp = await EvaluationResultsApiService.getFilterStates(reportEntityTypeParam, adminCityIdQuery);
          setStates(statesResp);
          const userState = statesResp.find(
            (s) =>
              s.id === context.municipality!.state ||
              s.nome?.toLowerCase() === context.municipality!.state?.toLowerCase()
          );
          if (userState) {
            setSelectedState(userState.id);
            if (isAnswerSheetAgregados) {
              setAsEstado(userState.id);
              setAsMunicipio(context.municipality.id);
            }

            // Carregar municípios do estado pré-selecionado
            try {
              const mun = await EvaluationResultsApiService.getFilterMunicipalities(userState.id, reportEntityTypeParam, adminCityIdQuery);
              setMunicipalities(mun);
            } catch (error) {
              // Silenciar
            }

            if (!isAnswerSheetAgregados) {
              try {
                const avs = await EvaluationResultsApiService.getFilterEvaluations({
                  estado: userState.id,
                  municipio: context.municipality.id,
                  ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
                  ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
                });
                setEvaluations(avs);
              } catch (error) {
                // Silenciar
              }
            }
          }
        } else if (context.school && context.school.municipality_id) {
          try {
            const municipalityResponse = await api.get(`/city/${context.school.municipality_id}`);
            const municipalityData = municipalityResponse.data;

            setSelectedMunicipality(municipalityData.id);

            const statesResp = await EvaluationResultsApiService.getFilterStates(reportEntityTypeParam, adminCityIdQuery);
            setStates(statesResp);
            const userState = statesResp.find(
              (s) =>
                s.id === municipalityData.state ||
                s.nome?.toLowerCase() === municipalityData.state?.toLowerCase()
            );
            if (userState) {
              setSelectedState(userState.id);
              if (isAnswerSheetAgregados) {
                setAsEstado(userState.id);
                setAsMunicipio(municipalityData.id);
              }

              try {
                const mun = await EvaluationResultsApiService.getFilterMunicipalities(userState.id, reportEntityTypeParam, adminCityIdQuery);
                setMunicipalities(mun);
              } catch (error) {
                // Silenciar
              }

              if (!isAnswerSheetAgregados) {
                try {
                  const avs = await EvaluationResultsApiService.getFilterEvaluations({
                    estado: userState.id,
                    municipio: municipalityData.id,
                    ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
                    ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
                  });
                  setEvaluations(avs);
                } catch (error) {
                  // Silenciar
                }
              }
            }
          } catch (error) {
            // Silenciar
          }
        }

        if (context.school) {
          setSelectedSchoolId(context.school.id);
          if (isAnswerSheetAgregados) {
            setAsEscola(context.school.id);
          }
          // Adicionar escola na lista de escolas disponíveis
          setSchools([{
            id: context.school.id,
            nome: context.school.name
          }]);
        } else if (context.municipality && !context.school) {
          try {
            // Buscar escolas do município via API de escolas
            const schoolMeta = context.municipality?.id ? { meta: { cityId: context.municipality.id } } : {};
            const schoolsResponse = await api.get(`/school`, schoolMeta as any);
            const allSchools = Array.isArray(schoolsResponse.data)
              ? schoolsResponse.data
              : (schoolsResponse.data?.data || []);

            // Filtrar escolas do município
            const municipalitySchools = allSchools.filter(
              (school: { city_id?: string }) => school.city_id === context.municipality.id
            );

            // Converter para formato esperado pelo componente
            const schoolsFormatted = municipalitySchools.map((school: { id: string; name?: string; nome?: string }) => ({
              id: school.id,
              nome: school.name || school.nome
            }));

            setSchools(schoolsFormatted);
          } catch (error) {
            // Silenciar
          }
        }

        if (context.classes && context.classes.length > 0) {
          const uniqueSchools = Array.from(
            new Set(context.classes.map(c => ({ id: c.school_id, name: c.school_name })))
          ).map(s => ({ id: s.id, nome: s.name }));

          setSchools(uniqueSchools);

          if (uniqueSchools.length === 1) {
            setSelectedSchoolId(uniqueSchools[0].id);
          }
        }

      } catch (error) {
        toast({
          title: "Aviso",
          description: "Não foi possível carregar suas permissões. Algumas funcionalidades podem estar limitadas.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingHierarchy(false);
      }
    };

    loadUserHierarchy();
  }, [user?.id, user?.role, toast, reportEntityTypeParam, adminCityIdQuery, isAnswerSheetAgregados]);

  useEffect(() => {
    // Carregar lista de estados (apenas se for admin)
    const loadStates = async () => {
      if (isAnswerSheetAgregados) return;

      // Pular se já foi carregado no useEffect anterior
      if (states.length > 0) return;

      // Carregar apenas para admin
      if (user?.role !== 'admin' || states.length > 0) return;

      try {
        setIsLoading(true);
        const resp = await EvaluationResultsApiService.getFilterStates(reportEntityTypeParam, adminCityIdQuery);
        setStates(resp);
      } catch (e) {
        toast({ title: "Erro", description: "Não foi possível carregar estados", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (!isLoadingHierarchy) {
      loadStates();
    }
  }, [toast, user?.role, isLoadingHierarchy, states.length, reportEntityTypeParam, adminCityIdQuery, isAnswerSheetAgregados]);

  const handleChangeState = async (stateId: string) => {
    // Verificar se usuário pode alterar estado
    if (userHierarchyContext?.restrictions.canSelectState === false) {
      toast({
        title: "Acesso Restrito",
        description: "Você não pode alterar o estado. Este filtro está definido conforme suas permissões.",
        variant: "destructive"
      });
      return;
    }

    setSelectedState(stateId);
    setSelectedMunicipality("");
    setSelectedEvaluationId("");
    setMunicipalities([]);
    setEvaluations([]);
    setSchools([]);
    setGrades([]);
    setClasses([]);
    setSelectedSchoolId("");
    setSelectedGradeId("");
    setSelectedClassId("");
    setEvaluationInfo(null);
    setStudents([]);
    setDetailedReport(null);
    if (!stateId) return;
    try {
      setIsLoading(true);
      const mun = await EvaluationResultsApiService.getFilterMunicipalities(stateId, reportEntityTypeParam, adminCityIdQuery);
      setMunicipalities(mun);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar municípios", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeMunicipality = async (municipioId: string) => {
    // Verificar se usuário pode alterar município
    if (userHierarchyContext?.restrictions.canSelectMunicipality === false) {
      toast({
        title: "Acesso Restrito",
        description: "Você não pode alterar o município. Este filtro está definido conforme suas permissões.",
        variant: "destructive"
      });
      return;
    }

    setSelectedMunicipality(municipioId);
    setSelectedEvaluationId("");
    setEvaluations([]);
    setSchools([]);
    setGrades([]);
    setClasses([]);
    setSelectedSchoolId("");
    setSelectedGradeId("");
    setSelectedClassId("");
    setEvaluationInfo(null);
    setStudents([]);
    setDetailedReport(null);
    if (!selectedState || !municipioId) return;
    try {
      setIsLoading(true);
      const avs = await EvaluationResultsApiService.getFilterEvaluations({
        estado: selectedState,
        municipio: municipioId,
        ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
        ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
      });
      setEvaluations(avs);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar avaliações", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSchool = async (schoolId: string) => {
    // Verificar se usuário pode alterar escola
    if (userHierarchyContext?.restrictions.canSelectSchool === false) {
      toast({
        title: "Acesso Restrito",
        description: "Você não pode alterar a escola. Este filtro está definido conforme suas permissões.",
        variant: "destructive"
      });
      return;
    }

    // Para diretor/coordenador, validar se pode acessar esta escola
    if (user?.role === 'diretor' || user?.role === 'coordenador') {
      if (userHierarchyContext?.school && userHierarchyContext.school.id !== schoolId && schoolId !== "") {
        toast({
          title: "Acesso Negado",
          description: "Você só pode visualizar dados da sua escola.",
          variant: "destructive"
        });
        return;
      }
    }

    setSelectedSchoolId(schoolId || "");
    setSelectedGradeId("");
    setSelectedClassId("");
    setGrades([]);
    setClasses([]);

    // Se escola foi limpa (valor vazio), usar dados completos já carregados
    if (!schoolId || schoolId === "") {
      if (allStudents.length > 0 && allTabelaDetalhada) {
        // Usar dados completos já carregados
        setStudents(allStudents);
        setTabelaDetalhada(allTabelaDetalhada);
        return;
      }

      // Se não temos dados carregados, fazer requisição
      if (!selectedState || !selectedMunicipality || !selectedEvaluationId) return;
      try {
        setIsLoading(true);
        const { students: fetchedStudents, report, tabelaDetalhada: tabela, estatisticas, opcoesProximosFiltros: opcoes } = await fetchEvaluationData(
          selectedEvaluationId
        );
        setAllStudents(fetchedStudents);
        setAllTabelaDetalhada(tabela || null);
        setStudents(fetchedStudents);
        setDetailedReport(report || null);
        setTabelaDetalhada(tabela || null);
        if (estatisticas) setEstatisticasGerais(estatisticas as unknown as { [key: string]: unknown; serie?: string; escola?: string; municipio?: string; total_alunos?: number; alunos_participantes?: number; alunos_ausentes?: number; media_nota_geral?: number; media_proficiencia_geral?: number; } | null);
        if (opcoes) setOpcoesProximosFiltros(opcoes as unknown as { [key: string]: unknown; series?: Array<{ id: string; name: string }>; } | null);
      } catch (e) {
        toast({ title: "Erro", description: "Não foi possível recarregar os dados", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!selectedState || !selectedMunicipality || !selectedEvaluationId) return;

    // ✅ OTIMIZAÇÃO: Usar dados já carregados quando possível
    if (allStudents.length > 0 && allTabelaDetalhada) {
      // Filtrar dados localmente sem fazer nova requisição
      const selectedSchool = schools.find(s => s.id === schoolId);
      if (selectedSchool && allTabelaDetalhada?.disciplinas) {
        const escolaIds = new Set<string>();
        allTabelaDetalhada.disciplinas.forEach(disciplina => {
          disciplina.alunos?.forEach(aluno => {
            // Verificar se o aluno pertence à escola selecionada
            if (aluno.escola === selectedSchool.nome || aluno.escola === schoolId) {
              const rid = alunoRowId(aluno);
              if (rid) escolaIds.add(rid);
            }
          });
        });
        const filtered = allStudents.filter(s => escolaIds.has(s.id));
        setStudents(filtered);

        // ✅ OTIMIZAÇÃO: Tentar usar séries de opcoes_proximos_filtros primeiro
        // Se não estiver disponível, fazer requisição (requisição leve, apenas lista)
        // Fazer isso de forma assíncrona para não bloquear a UI
        (async () => {
          try {
            // Verificar se temos séries em opcoes_proximos_filtros que sejam relevantes
            // (geralmente opcoes_proximos_filtros vem da resposta da avaliação completa)
            // Mas séries específicas de uma escola podem não estar lá, então fazer requisição
            const series = await EvaluationResultsApiService.getFilterGradesByEvaluation({
              estado: selectedState,
              municipio: selectedMunicipality,
              avaliacao: selectedEvaluationId,
              escola: schoolId,
              ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
              ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
            });
            setGrades(series);
          } catch (e) {
            // Silenciar
          }
        })();

        return; // Não fazer requisição adicional
      }
    }

    // Se não temos dados carregados, fazer requisição
    try {
      setIsLoading(true);

      // Carregar séries para a escola selecionada
      const series = await EvaluationResultsApiService.getFilterGradesByEvaluation({
        estado: selectedState,
        municipio: selectedMunicipality,
        avaliacao: selectedEvaluationId,
        escola: schoolId,
        ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
        ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
      });
      setGrades(series);

      const { students: fetchedStudents, report, tabelaDetalhada: tabela, estatisticas, opcoesProximosFiltros: opcoes } = await fetchEvaluationData(
        selectedEvaluationId,
        { schoolId }
      );

      setAllStudents(fetchedStudents);
      setAllTabelaDetalhada(tabela || null);
      setStudents(fetchedStudents);
      setDetailedReport(report || null);
      setTabelaDetalhada(tabela || null);
      if (estatisticas) setEstatisticasGerais(estatisticas as unknown as { [key: string]: unknown; serie?: string; escola?: string; municipio?: string; total_alunos?: number; alunos_participantes?: number; alunos_ausentes?: number; media_nota_geral?: number; media_proficiencia_geral?: number; } | null);
      if (opcoes) setOpcoesProximosFiltros(opcoes as unknown as { [key: string]: unknown; series?: Array<{ id: string; name: string }>; } | null);

    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar dados da escola", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGrade = async (gradeId: string) => {
    setSelectedGradeId(gradeId || "");
    setSelectedClassId("");
    setClasses([]);

    // Se série foi limpa (valor vazio), usar dados já carregados
    if (!gradeId || gradeId === "") {
      if (allStudents.length > 0 && allTabelaDetalhada) {
        // Aplicar apenas filtro de escola se existir
        if (selectedSchoolId) {
          const selectedSchool = schools.find(s => s.id === selectedSchoolId);
          if (selectedSchool && allTabelaDetalhada?.disciplinas) {
            const escolaIds = new Set<string>();
            allTabelaDetalhada.disciplinas.forEach(disciplina => {
              disciplina.alunos?.forEach(aluno => {
                if (aluno.escola === selectedSchool.nome || aluno.escola === selectedSchoolId) {
                  const rid = alunoRowId(aluno);
                  if (rid) escolaIds.add(rid);
                }
              });
            });
            const filtered = allStudents.filter(s => escolaIds.has(s.id));
            setStudents(filtered);
          } else {
            setStudents(allStudents);
          }
        } else {
          setStudents(allStudents);
        }
        setTabelaDetalhada(allTabelaDetalhada);
      }
      return;
    }

    if (!selectedState || !selectedMunicipality || !selectedEvaluationId || !selectedSchoolId) return;

    // ✅ OTIMIZAÇÃO: Filtrar localmente primeiro (sem requisição)
    if (allStudents.length > 0 && allTabelaDetalhada) {
      const selectedSchool = schools.find(s => s.id === selectedSchoolId);
      const selectedGrade = grades.find(g => g.id === gradeId);

      if (selectedSchool && selectedGrade && allTabelaDetalhada?.disciplinas) {
        // Filtrar dados localmente imediatamente (sem esperar requisição)
        const validIds = new Set<string>();
        allTabelaDetalhada.disciplinas.forEach(disciplina => {
          disciplina.alunos?.forEach(aluno => {
            if ((aluno.escola === selectedSchool.nome || aluno.escola === selectedSchoolId) &&
              (aluno.serie === selectedGrade.nome || aluno.serie === gradeId)) {
              const rid = alunoRowId(aluno);
              if (rid) validIds.add(rid);
            }
          });
        });
        const filtered = allStudents.filter(s => validIds.has(s.id));
        setStudents(filtered);

        // Carregar turmas em paralelo (requisição leve, apenas lista)
        // Não bloquear a UI esperando isso
        EvaluationResultsApiService.getFilterClassesByEvaluation({
          estado: selectedState,
          municipio: selectedMunicipality,
          avaliacao: selectedEvaluationId,
          escola: selectedSchoolId,
          serie: gradeId,
          ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
          ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
        }).then(turmas => {
          setClasses(turmas);
        }).catch(() => {});

        return; // Não fazer requisição adicional
      }
    }

    // Se não temos dados carregados, fazer requisição completa
    try {
      setIsLoading(true);

      // Carregar turmas e dados em paralelo
      const [turmas, dataResult] = await Promise.all([
        EvaluationResultsApiService.getFilterClassesByEvaluation({
          estado: selectedState,
          municipio: selectedMunicipality,
          avaliacao: selectedEvaluationId,
          escola: selectedSchoolId,
          serie: gradeId,
          ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
          ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
        }),
        fetchEvaluationData(selectedEvaluationId, { schoolId: selectedSchoolId, gradeId })
      ]);

      setClasses(turmas);

      const { students: fetchedStudents, report, tabelaDetalhada: tabela, estatisticas, opcoesProximosFiltros: opcoes } = dataResult;

      setAllStudents(fetchedStudents);
      setAllTabelaDetalhada(tabela || null);
      setStudents(fetchedStudents);
      setDetailedReport(report || null);
      setTabelaDetalhada(tabela || null);
      if (estatisticas) setEstatisticasGerais(estatisticas as unknown as { [key: string]: unknown; serie?: string; escola?: string; municipio?: string; total_alunos?: number; alunos_participantes?: number; alunos_ausentes?: number; media_nota_geral?: number; media_proficiencia_geral?: number; } | null);
      if (opcoes) setOpcoesProximosFiltros(opcoes as unknown as { [key: string]: unknown; series?: Array<{ id: string; name: string }>; } | null);

    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar dados da série", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Removida lógica de proficiência por disciplina (manter apenas proficiência geral do backend)

  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId || "");

    // ✅ OTIMIZAÇÃO: Usar filteredStudents do useMemo (já calculado e memoizado)
    // Se turma foi limpa (valor vazio), usar dados já carregados
    if (!classId || classId === "") {
      if (allStudents.length > 0) {
        // O filteredStudents do useMemo já aplica filtros de escola e série automaticamente
        // Quando classId está vazio, o useMemo retorna os dados filtrados sem turma
        setStudents(filteredStudents);
        setTabelaDetalhada(allTabelaDetalhada);
      }
      return;
    }

    if (!selectedState || !selectedMunicipality || !selectedEvaluationId || !selectedSchoolId || !selectedGradeId) return;

    // ✅ OTIMIZAÇÃO: Usar filteredStudents do useMemo (já tem todos os filtros aplicados)
    // O useMemo já calcula os dados filtrados incluindo turma quando selectedClassId muda
    if (allStudents.length > 0 && classes.length > 0) {
      const selectedClass = classes.find(c => c.id === classId);
      if (selectedClass) {
        // O filteredStudents do useMemo já aplica todos os filtros (escola, série e turma)
        // Apenas usar o resultado memoizado - muito mais rápido!
        setStudents(filteredStudents);
        return;
      }
    }

    // Caso contrário, buscar da API (só acontece se dados não estiverem carregados)
    try {
      setIsLoading(true);

      // Obter nome da turma a partir do ID para passar ao filtro
      const selectedClass = classes.find(c => c.id === classId);
      const className = selectedClass?.nome || classId;

      // Recarregar dados com filtro de turma (usando nome da turma)
      const { students: fetchedStudents, report, tabelaDetalhada: tabela, estatisticas, opcoesProximosFiltros: opcoes } = await fetchEvaluationData(
        selectedEvaluationId,
        { schoolId: selectedSchoolId, gradeId: selectedGradeId, classId: className }
      );

      setAllStudents(fetchedStudents);
      setAllTabelaDetalhada(tabela || null);
      setStudents(fetchedStudents);
      setDetailedReport(report || null);
      setTabelaDetalhada(tabela || null);
      if (estatisticas) setEstatisticasGerais(estatisticas as unknown as { [key: string]: unknown; serie?: string; escola?: string; municipio?: string; total_alunos?: number; alunos_participantes?: number; alunos_ausentes?: number; media_nota_geral?: number; media_proficiencia_geral?: number; } | null);
      if (opcoes) setOpcoesProximosFiltros(opcoes as unknown as { [key: string]: unknown; series?: Array<{ id: string; name: string }>; } | null);

    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar dados da turma", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvaluation = async (evaluationId: string) => {
    setSelectedEvaluationId(evaluationId);
    setSelectedSchoolId("");
    setSelectedGradeId("");
    setSelectedClassId("");
    setSchools([]);
    setGrades([]);
    setClasses([]);
    setEstatisticasGerais(null);
    setOpcoesProximosFiltros(null);
    // Limpar cache ao trocar de avaliação para não reutilizar dados de outra avaliação
    fetchEvaluationDataCacheRef.current.clear();
    fetchEvaluationDataInFlightRef.current.clear();

    if (!evaluationId) {
      answerSheetSkillsRef.current = [];
      setIsLoadingSchools(false);
      return;
    }

    // ✅ Indicador de carregamento de escolas - ATIVAR IMEDIATAMENTE com flushSync para renderização síncrona
    flushSync(() => {
      setIsLoadingSchools(true);
    });

    try {
      setIsLoading(true);

      // Buscar dados da avaliação em paralelo
      const [info, skills] = await Promise.all([
        EvaluationResultsApiService.getEvaluationById(evaluationId, {
          ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
          ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
          ...(selectedMunicipality ? { metaCityId: selectedMunicipality } : {}),
        }),
        EvaluationResultsApiService.getSkillsByEvaluation(evaluationId, {
          ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
          ...(selectedMunicipality ? { cityId: selectedMunicipality } : {}),
          ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
        }).catch(() => [])
      ]);

      if (!info) throw new Error("Avaliação não encontrada");

      answerSheetSkillsRef.current =
        Array.isArray(skills)
          ? (skills as AnswerSheetSkillRow[]).filter((s) => s?.id)
          : [];

      // Processar informações da avaliação primeiro
      const evaluationData = info as unknown as Record<string, unknown>;

      // ✅ OTIMIZAÇÃO: Carregar escolas em paralelo com fetchEvaluationData
      const [fetchDataResult, escolasFromApi] = await Promise.all([
        fetchEvaluationData(evaluationId),
        (selectedState && selectedMunicipality && evaluationId)
          ? EvaluationResultsApiService.getFilterSchoolsByEvaluation({
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacao: evaluationId,
            ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
            ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
          }).catch(() => [])
          : Promise.resolve([])
      ]);

      const { students: unifiedStudents, report, tabelaDetalhada: tabelaDetalhadaUnificada, estatisticas, opcoesProximosFiltros: opcoes } = fetchDataResult;

      // ✅ OTIMIZAÇÃO: Popular escolas imediatamente - priorizar opcoes, senão usar API
      if (opcoes?.escolas && Array.isArray(opcoes.escolas) && opcoes.escolas.length > 0) {
        const escolasFromOpcoes = opcoes.escolas.map((esc: { id: string; nome?: string; name?: string }) => ({
          id: esc.id,
          nome: esc.nome ?? esc.name ?? ""
        }));
        setSchools(escolasFromOpcoes);
      } else if (Array.isArray(escolasFromApi) && escolasFromApi.length > 0) {
        setSchools(escolasFromApi);
      }

      setIsLoadingSchools(false);

      // ✅ OTIMIZAÇÃO: Armazenar todos os dados carregados para filtragem no frontend
      setAllStudents(unifiedStudents);
      setAllTabelaDetalhada(tabelaDetalhadaUnificada);

      // Armazenar estatísticas gerais e opcoes_proximos_filtros para uso na exibição
      if (estatisticas) {
        setEstatisticasGerais(estatisticas as unknown as { [key: string]: unknown; serie?: string; escola?: string; municipio?: string; total_alunos?: number; alunos_participantes?: number; alunos_ausentes?: number; media_nota_geral?: number; media_proficiencia_geral?: number; } | null);
      }
      if (opcoes) {
        setOpcoesProximosFiltros(opcoes as unknown as { [key: string]: unknown; series?: Array<{ id: string; name: string }>; } | null);
      }

      // Priorizar série do endpoint antes de usar extractSerie
      let serieExtraida = 'N/A';

      // 1. Tentar obter série das estatísticas gerais do endpoint
      if (estatisticas?.serie != null && estatisticas.serie !== 'N/A' && String(estatisticas.serie) !== '') {
        serieExtraida = String(estatisticas.serie);
      }
      // 2. Tentar obter série de opcoes_proximos_filtros (se houver apenas uma série)
      else if (opcoes && Array.isArray(opcoes.series) && opcoes.series.length === 1) {
        const s0 = opcoes.series[0] as { nome?: string; name?: string };
        serieExtraida = s0.nome ?? s0.name ?? 'N/A';
      }
      // 3. Se não houver série do endpoint, usar extractSerie como fallback
      else {
        // Função para extrair série de diferentes fontes (NÃO priorizar título)
        const extractSerie = (data: Record<string, unknown>): string => {
          // 1. Tentar campo série direto (prioridade máxima - série específica)
          if (data.serie && data.serie !== 'N/A' && data.serie !== '') {
            const serie = data.serie as string;
            // Se a série contém um número específico (ex: "4º ano"), usar ela
            if (serie.match(/\d+º|\d+º ano|\d+ ano/i)) {
              return serie;
            }
          }

          // 2. Tentar campo grade ou nível (prioridade sobre título)
          if (data.grade && data.grade !== 'N/A' && data.grade !== '') {
            const grade = data.grade as string;
            if (grade.match(/\d+º|\d+º ano|\d+ ano/i)) {
              return grade;
            }
          }
          if (data.nivel && data.nivel !== 'N/A' && data.nivel !== '') {
            const nivel = data.nivel as string;
            if (nivel.match(/\d+º|\d+º ano|\d+ ano/i)) {
              return nivel;
            }
          }

          // 3. Título da avaliação como ÚLTIMO recurso (pode conter números que não correspondem à série real)
          // Exemplo: "4° avalie teotonio" pode ser para 5° ano
          if (data.titulo) {
            const titulo = data.titulo as string;
            const serieMatch = titulo.match(/(\d+º|\d+º ano|\d+ ano)/i);
            if (serieMatch) return serieMatch[1];
          }

          // 4. NÃO usar campo curso como fallback genérico (retorna "1º ao 5º ano" que é muito genérico)
          // Retornar 'N/A' para que seja extraído de outras fontes (alunos, escolas, estatisticas_gerais) depois

          return 'N/A';
        };

        serieExtraida = extractSerie(evaluationData);
      }

      // Criar mapeamento robusto de skills (UUID normalizado -> código real)
      const newSkillsMapping: Record<string, string> = {};
      if (skills && Array.isArray(skills)) {
        skills.forEach((skill: { id?: string; code?: string }) => {
          const idNorm = skill?.id ? normalizeUUID(skill.id) : '';
          const code = (skill?.code || '').trim();
          if (idNorm && code) newSkillsMapping[idNorm] = code;
          // Também mapear o próprio code normalizado para si mesmo (cobre casos onde o código chega como UUID)
          if (code) newSkillsMapping[normalizeUUID(code)] = code;
        });
      }
      setSkillsMapping(newSkillsMapping);

      // Tentar extrair série das escolas se não estiver na avaliação
      const escolasAtuais =
        schools.length > 0
          ? schools
          : Array.isArray(opcoes?.escolas)
            ? opcoes.escolas.map((esc: { id: string; nome?: string; name?: string }) => ({
                id: esc.id,
                nome: esc.nome ?? esc.name ?? ""
              }))
            : [];
      if (serieExtraida === 'N/A' && escolasAtuais.length > 0) {
        const escolaComSerie = escolasAtuais.find(esc => esc.nome && (esc.nome.includes('º') || esc.nome.includes('ano')));
        if (escolaComSerie) {
          const serieMatch = escolaComSerie.nome.match(/(\d+º|\d+º ano|\d+ ano)/i);
          if (serieMatch) {
            serieExtraida = serieMatch[1];
          }
        }
      }

      setEvaluationInfo({
        id: info.id,
        titulo: (evaluationData.titulo as string) || 'Cartão resposta',
        disciplina: (evaluationData.disciplina as string) || 'N/A',
        disciplinas: (evaluationData.disciplinas as string[]) || [(evaluationData.disciplina as string)].filter(Boolean),
        serie: serieExtraida,
        escola: (evaluationData.escola as string) || 'N/A',
        municipio: (evaluationData.municipio as string) || 'N/A',
        data_aplicacao: (evaluationData.data_aplicacao as string) || '',
        logo_url: evaluationData.logo_url as string | undefined
      });

      setStudents(unifiedStudents);
      setDetailedReport(report || null);
      setTabelaDetalhada(tabelaDetalhadaUnificada || null);

      // Tentar extrair série dos alunos se não estiver na avaliação
      if (serieExtraida === 'N/A' && unifiedStudents.length > 0) {
        const alunosComSerie = unifiedStudents.filter(
          (s) => s.turma && (s.turma.includes('º') || s.turma.includes('ano'))
        );
        if (alunosComSerie.length > 0) {
          const turma = alunosComSerie[0].turma;
          const serieMatch = turma.match(/(\d+º|\d+º ano|\d+ ano)/i);
          if (serieMatch) {
            serieExtraida = serieMatch[1];
          }
        }
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao carregar dados da avaliação", variant: "destructive" });
      setIsLoadingSchools(false); // Garantir que o loading seja resetado em caso de erro
    } finally {
      setIsLoading(false);
      setIsLoadingSchools(false); // Garantir que o loading seja resetado
    }
  };

  const generateHabilidadeCode = (
    questao: {
      codigo_habilidade?: string;
      habilidade?: string;
      numero?: number;
    },
    mapping: Record<string, string>
  ): string => {
    const raw = (questao.codigo_habilidade || '').trim();
    // 1) Se já parece um código real, retornar
    if (looksLikeRealSkillCode(raw)) return raw.toUpperCase();

    // 2) Tentar via mapeamento por UUID normalizado
    const idNorm = normalizeUUID(raw);
    if (idNorm && mapping[idNorm]) return mapping[idNorm].toUpperCase();

    // 3) Tentar extrair do texto da habilidade com regex (incluindo novos padrões)
    const fromText = (questao.habilidade || '').toUpperCase();
    const match = fromText.match(/(LP\d+L\d+\.\d+|\d+N\d\.\d+|[A-Z]{2}\d+L\d+\.\d+|\d+[LMSN]\d+\.\d+|\d+\s+[LMSN]\s+\d+\.\d+)/);
    if (match && match[1]) return match[1].toUpperCase();

    // 4) Fallback neutro (sem inferir disciplina)
    const numero = questao.numero || 1;
    return `Q${numero}`;
  };

  const handleGeneratePDF = async () => {
    if (!evaluationInfo) {
      toast({
        title: "Atenção",
        description: "Selecione um cartão resposta.",
        variant: "destructive",
      });
      return;
    }

    // Professor só pode imprimir quando tiver turma selecionada
    if (user?.role === "professor" && (isAnswerSheetAgregados ? asTurma === "all" : !selectedClassId)) {
      toast({
        title: "Turma obrigatória",
        description: "Selecione uma turma para imprimir o relatório.",
        variant: "destructive"
      });
      return;
    }

    // Verificação mais robusta: checar múltiplas fontes de dados
    let hasStudentsInState = students.length > 0;
    const hasStudentsInDetailed = detailedReport?.alunos && detailedReport.alunos.length > 0;
    const hasStudentsInTabela = tabelaDetalhada?.geral?.alunos && tabelaDetalhada.geral.alunos.length > 0;
    const hasStudentsInDisciplinas = tabelaDetalhada?.disciplinas?.some(d => d.alunos && d.alunos.length > 0);

    // Se students estiver vazio mas tabelaDetalhada tiver dados, reconstruir students
    if (!hasStudentsInState && tabelaDetalhada && (hasStudentsInTabela || hasStudentsInDisciplinas)) {
      const reconstructedStudents = mapUnifiedStudents(tabelaDetalhada);
      if (reconstructedStudents.length > 0) {
        setStudents(reconstructedStudents);
        hasStudentsInState = true;
      }
    }

    const hasAnyStudents = hasStudentsInState || hasStudentsInDetailed || hasStudentsInTabela || hasStudentsInDisciplinas;

    if (!hasAnyStudents) {
      toast({
        title: "Atenção",
        description: "Nenhum aluno encontrado para os filtros selecionados. Tente remover alguns filtros.",
        variant: "destructive"
      });
      return;
    }

    // Validar acesso baseado na hierarquia
    if (userHierarchyContext && user?.role) {
      const validation = validateReportAccess(
        user.role,
        isAnswerSheetAgregados
          ? {
              state: asEstado,
              municipality: asMunicipio,
              school: asEscola !== "all" ? asEscola : "",
              grade: asSerie !== "all" ? asSerie : "",
              class: asTurma !== "all" ? asTurma : "",
            }
          : {
              state: selectedState,
              municipality: selectedMunicipality,
              school: selectedSchoolId,
              grade: selectedGradeId,
              class: selectedClassId,
            },
        userHierarchyContext
      );

      if (!validation.isValid) {
        toast({
          title: "Acesso Negado",
          description: validation.reason || "Você não tem permissão para gerar este relatório.",
          variant: "destructive"
        });
        return;
      }
    }

    // Relatório detalhado para o PDF: cartão via evaluations list — refetch; cartão agregados usa só tabela_detalhada.
    let reportParaPdf: DetailedReport | null = detailedReport;
    const mustRefetchDetailedForPdf =
      !isAnswerSheetAgregados &&
      (reportEntityTypeParam === REPORT_ENTITY_TYPE_ANSWER_SHEET || !reportParaPdf);
    if (mustRefetchDetailedForPdf) {
      try {
        setIsLoading(true);
        const fresh = await EvaluationResultsApiService.getDetailedReport(evaluationInfo.id, {
          ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
          ...(selectedMunicipality ? { cityId: selectedMunicipality } : {}),
          ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
        });
        if (fresh) {
          reportParaPdf = fresh;
          setDetailedReport(fresh);
        }
      } catch {
        // Continuar com dados básicos / cache anterior
      } finally {
        setIsLoading(false);
      }
    }
    try {
      // Garantir que a tabela detalhada foi carregada quando possível (evitar requisição extra se já temos allTabelaDetalhada ou tabelaDetalhada)
      const jaTemTabela = tabelaDetalhada ?? allTabelaDetalhada;
      if (
        !isAnswerSheetAgregados &&
        !jaTemTabela &&
        selectedState &&
        selectedMunicipality &&
        selectedEvaluationId
      ) {
        try {
          setIsLoading(true);
          const resp = await EvaluationResultsApiService.getEvaluationsList(1, 10, {
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacao: selectedEvaluationId,
            ...(reportEntityTypeParam ? { report_entity_type: reportEntityTypeParam } : {}),
            ...(adminCityIdQuery ? { city_id: adminCityIdQuery } : {}),
          });
          const tdResp = resp as unknown as { tabela_detalhada?: TabelaDetalhadaPorDisciplina };
          const td = (tdResp && tdResp.tabela_detalhada && Array.isArray(tdResp.tabela_detalhada.disciplinas))
            ? tdResp.tabela_detalhada
            : null;
          setTabelaDetalhada(td);
        } catch (_) {
          // silencioso
        } finally {
          setIsLoading(false);
        }
      }

      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      // Carregar logo com uma única requisição: fetch -> blob -> dimensões (Image) + DataURL (FileReader)
      let logoDataUrl = '';
      let logoWidth = 0;
      let logoHeight = 0;
      try {
        const logoPath = '/LOGO-1-menor.png';
        const response = await fetch(logoPath);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const logoImg = new Image();
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = reject;
          logoImg.src = objectUrl;
        });
        URL.revokeObjectURL(objectUrl);
        logoWidth = logoImg.width;
        logoHeight = logoImg.height;
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        // Continuar sem logo
      }

      // Documento começa em landscape para a capa inicial
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Paleta de cores institucional (baseada em institutional_test_hybrid.html)
      const COLORS = {
        primary: [124, 62, 237] as [number, number, number],      // #7c3aed - roxo principal
        textDark: [31, 41, 55] as [number, number, number],        // #1f2937 - preto texto
        textGray: [107, 114, 128] as [number, number, number],     // #6b7280 - cinza texto
        borderLight: [229, 231, 235] as [number, number, number],  // #e5e7eb - cinza borda
        bgLight: [250, 250, 250] as [number, number, number],      // #fafafa - fundo claro
        white: [255, 255, 255] as [number, number, number]         // branco
      };

      let pageCount = 0;
      const margin = 15;
      let pageWidth = doc.internal.pageSize.getWidth();
      let pageHeight = doc.internal.pageSize.getHeight();

      // Utilitário: extrair série a partir do nome da turma
      const extractSerieFromTurma = (turma?: string): string | null => {
        if (!turma) return null;
        const match = turma.match(/(\d+º(?:\s*ano)?)/i);
        return match ? match[1] : null;
      };

      // Utilitário: obter texto de série confiável (recebe lista de alunos como parâmetro)
      const getHeaderSerieText = (alunosRef: StudentResult[] = students): string | null => {
        if (isAnswerSheetAgregados && asSerie !== "all") {
          return asNorm((asOpcoes.series ?? []).find((s) => s.id === asSerie) ?? { id: asSerie });
        }
        if (selectedGradeId) {
          const g = grades.find((gr) => gr.id === selectedGradeId)?.nome;
          if (g) return g;
        }
        const fromAlunoSerie = new Set<string>();
        alunosRef.forEach((s) => {
          const t = (s.serie || "").trim();
          if (t) fromAlunoSerie.add(t);
        });
        if (fromAlunoSerie.size === 1) return Array.from(fromAlunoSerie)[0];
        const inferred = new Set<string>();
        alunosRef.forEach((s) => {
          const ser = extractSerieFromTurma(s.turma);
          if (ser) inferred.add(ser);
        });
        if (inferred.size === 1) return Array.from(inferred)[0];
        const eg = (evaluationInfo?.serie || "").trim();
        if (eg && eg !== "N/A") return eg;
        return null;
      };

      const resolveSerieDisplayForPdf = (alunosRef: StudentResult[]): string =>
        getHeaderSerieText(alunosRef) ?? "N/A";

      const getPdfEscolaDisplayText = (): string =>
        isAnswerSheetAgregados
          ? asEscola !== "all"
            ? asNorm((asOpcoes.escolas ?? []).find((e) => e.id === asEscola) ?? { id: asEscola })
            : "Todas as Escolas"
          : selectedSchoolId
            ? schools.find((s) => s.id === selectedSchoolId)?.nome || "Escola Selecionada"
            : "Todas as Escolas";

      // Função para adicionar capa inicial
      const addInitialCover = () => {
        // Garantir fundo branco limpo - desenhar primeiro e cobrir toda a página
        doc.setFillColor(...COLORS.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        const centerX = pageWidth / 2;
        let y = 20;

        // Logo AFIRME PLAY (imagem) - mantendo proporção real
        if (logoDataUrl && logoWidth > 0 && logoHeight > 0) {
          // Largura desejada em mm
          const desiredLogoWidth = 50;
          // Calcular altura proporcional baseada nas dimensões reais
          const desiredLogoHeight = (logoHeight * desiredLogoWidth) / logoWidth;
          const logoX = centerX - desiredLogoWidth / 2;
          doc.addImage(logoDataUrl, 'PNG', logoX, y, desiredLogoWidth, desiredLogoHeight);
          y += desiredLogoHeight + 8;
        } else {
          // Fallback: texto "AFIRME PLAY"
          doc.setFontSize(20);
          doc.setTextColor(...COLORS.primary);
          doc.setFont('helvetica', 'bold');
          doc.text('AFIRME PLAY', centerX, y, { align: 'center' });
          y += 15;
        }

        y += 8;

        // Município - Estado
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.primary); // Roxo institucional
        doc.setFont('helvetica', 'bold');
        const locationText = `${evaluationInfo.municipio?.toUpperCase() || 'MUNICÍPIO'} - ALAGOAS`;
        doc.text(locationText, centerX, y, { align: 'center' });

        y += 8;

        // Secretaria
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.textGray); // Cinza
        doc.setFont('helvetica', 'normal');
        doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', centerX, y, { align: 'center' });

        y += 18;

        // Título principal 1
        doc.setFontSize(24);
        doc.setTextColor(...COLORS.textDark); // Preto
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO DE DESEMPENHO', centerX, y, { align: 'center' });

        y += 12;

        // Título principal 2
        doc.setFontSize(18);
        doc.setTextColor(...COLORS.textDark); // Preto
        doc.setFont('helvetica', 'bold');
        doc.text('ACERTO E NÍVEIS DE PROFICIÊNCIA', centerX, y, { align: 'center' });

        y += 20;

        // Card de informações - tamanho reduzido
        const cardWidth = pageWidth - 120; // Reduzido: mais estreito
        const cardHeight = 68;
        const cardX = (pageWidth - cardWidth) / 2;

        // Centralizar verticalmente melhor na página
        const availableHeight = pageHeight - y - 20;
        if (cardHeight < availableHeight) {
          y = (pageHeight - cardHeight) / 2;
        }

        // Fundo do card
        doc.setFillColor(...COLORS.bgLight);
        doc.rect(cardX, y, cardWidth, cardHeight, 'F');

        // Borda do card
        doc.setDrawColor(...COLORS.borderLight);
        doc.setLineWidth(0.5);
        doc.rect(cardX, y, cardWidth, cardHeight, 'S');

        // Conteúdo do card
        let cardY = y + 9;

        // Título do card
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary); // Roxo
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES DO CARTÃO RESPOSTA', centerX, cardY, { align: 'center' });

        cardY += 9;

        // Informações em formato tabular (label: valor)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        const leftColX = cardX + 12;
        const labelWidth = 32; // Espaçamento adequado para evitar sobreposição

        // CARTÃO RESPOSTA
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary); // Labels em roxo
        doc.text('CARTÃO:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark); // Valores em preto
        const avaliacaoText = evaluationInfo.titulo || 'N/A';
        const avaliacaoLines = doc.splitTextToSize(avaliacaoText, cardWidth - labelWidth - 24);
        doc.text(avaliacaoLines, leftColX + labelWidth, cardY);
        cardY += Math.max(5, avaliacaoLines.length * 4);

        // MUNICÍPIO
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('MUNICÍPIO:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(evaluationInfo.municipio || 'N/A', leftColX + labelWidth, cardY);
        cardY += 5;

        // ESCOLA
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('ESCOLA:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        const escolaText = getPdfEscolaDisplayText();
        const escolaLines = doc.splitTextToSize(escolaText.toUpperCase(), cardWidth - labelWidth - 24);
        doc.text(escolaLines, leftColX + labelWidth, cardY);
        cardY += Math.max(5, escolaLines.length * 4);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('SÉRIE:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(resolveSerieDisplayForPdf(studentsToUse), leftColX + labelWidth, cardY);
        cardY += 5;

        // DATA
        if (evaluationInfo.data_aplicacao) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text('DATA:', leftColX, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          doc.text(new Date(evaluationInfo.data_aplicacao).toLocaleDateString('pt-BR'), leftColX + labelWidth, cardY);
          cardY += 5;
        }

        // TOTAL DE TURMAS
        const turmasMapInitial = new Map<string, StudentResult[]>();
        studentsToUse.forEach(s => {
          const turma = s.turma || 'Sem Turma';
          if (!turmasMapInitial.has(turma)) {
            turmasMapInitial.set(turma, []);
          }
          turmasMapInitial.get(turma)!.push(s);
        });
        const totalTurmas = turmasMapInitial.size;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('TOTAL DE TURMAS:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(`${totalTurmas}`, leftColX + labelWidth, cardY);
      };

      // Função para adicionar capa de faltosos
      const addFaltososCover = (turmaName: string | null, totalFaltosos: number, alunosParaSerie: StudentResult[]) => {
        // Garantir fundo branco limpo - desenhar primeiro e cobrir toda a página
        doc.setFillColor(...COLORS.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        const centerX = pageWidth / 2;
        let y = 20;

        // Logo AFIRME PLAY (imagem) - mantendo proporção real
        if (logoDataUrl && logoWidth > 0 && logoHeight > 0) {
          // Largura desejada em mm
          const desiredLogoWidth = 50;
          // Calcular altura proporcional baseada nas dimensões reais
          const desiredLogoHeight = (logoHeight * desiredLogoWidth) / logoWidth;
          const logoX = centerX - desiredLogoWidth / 2;
          doc.addImage(logoDataUrl, 'PNG', logoX, y, desiredLogoWidth, desiredLogoHeight);
          y += desiredLogoHeight + 8;
        } else {
          // Fallback: texto "AFIRME PLAY"
          doc.setFontSize(20);
          doc.setTextColor(...COLORS.primary);
          doc.setFont('helvetica', 'bold');
          doc.text('AFIRME PLAY', centerX, y, { align: 'center' });
          y += 15;
        }

        y += 8;

        // Município - Estado
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.primary); // Roxo institucional
        doc.setFont('helvetica', 'bold');
        const locationText = `${evaluationInfo.municipio?.toUpperCase() || 'MUNICÍPIO'} - ALAGOAS`;
        doc.text(locationText, centerX, y, { align: 'center' });

        y += 8;

        // Secretaria
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.textGray); // Cinza
        doc.setFont('helvetica', 'normal');
        doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', centerX, y, { align: 'center' });

        y += 20;

        // Título (mesmo título do modal em AnswerSheetResults)
        doc.setFontSize(24);
        doc.setTextColor(...COLORS.textDark); // Preto
        doc.setFont('helvetica', 'bold');
        doc.text('FALTOSOS / PENDENTES', centerX, y, { align: 'center' });

        y += 20;

        // Nome da turma (se especificada) ou texto geral
        if (turmaName) {
          doc.setFontSize(48);
          doc.setTextColor(...COLORS.primary); // Roxo para destaque
          doc.setFont('helvetica', 'bold');
          doc.text(turmaName.toUpperCase(), centerX, y, { align: 'center' });
          y += 25;
        } else {
          y += 5;
        }

        // Card de estatísticas - tamanho reduzido
        const cardWidth = pageWidth - 120; // Reduzido: mais estreito
        const cardHeight = 48;
        const cardX = (pageWidth - cardWidth) / 2;

        // Garantir que o card não fique muito próximo do final da página
        const minSpaceAtBottom = 20;
        const maxCardY = pageHeight - cardHeight - minSpaceAtBottom;

        // Apenas ajustar se realmente necessário (card muito próximo do final)
        if (y + cardHeight > maxCardY) {
          y = maxCardY;
        }

        // Fundo do card
        doc.setFillColor(...COLORS.bgLight);
        doc.rect(cardX, y, cardWidth, cardHeight, 'F');

        // Borda do card
        doc.setDrawColor(...COLORS.borderLight);
        doc.setLineWidth(0.5);
        doc.rect(cardX, y, cardWidth, cardHeight, 'S');

        // Conteúdo do card
        let cardY = y + 9;

        // Título do card
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary); // Roxo
        doc.setFont('helvetica', 'bold');
        doc.text('ESTATÍSTICAS', centerX, cardY, { align: 'center' });

        cardY += 9;

        // Estatísticas em formato tabular (label: valor)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        const leftColX = cardX + 12;
        const labelWidth = 48; // Padronizado: mesmo espaçamento

        // TOTAL DE FALTOSOS
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary); // Labels em roxo
        doc.text('TOTAL DE FALTOSOS:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark); // Valores em preto
        doc.text(`${totalFaltosos}`, leftColX + labelWidth, cardY);
        cardY += 5;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('SÉRIE:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(resolveSerieDisplayForPdf(alunosParaSerie), leftColX + labelWidth, cardY);

        const cardBottom = y + cardHeight;
        let noteY = cardBottom + 8;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textGray);
        const avisoFaltosos =
          'Estes alunos ainda não entregaram ou não tiveram o cartão resposta corrigido.';
        const splitAviso = doc.splitTextToSize(avisoFaltosos, cardWidth - 24);
        doc.text(splitAviso, centerX, noteY, { align: 'center', maxWidth: cardWidth - 24 });
      };

      // Função para adicionar capa de turma
      const addTurmaCover = (turmaName: string, alunosTurma: StudentResult[], totalQuestoes?: number) => {
        // Garantir fundo branco limpo - desenhar primeiro e cobrir toda a página
        doc.setFillColor(...COLORS.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        const centerX = pageWidth / 2;
        let y = 25;

        // Logo AFIRME PLAY (imagem) - mantendo proporção real
        if (logoDataUrl && logoWidth > 0 && logoHeight > 0) {
          // Largura desejada em mm
          const desiredLogoWidth = 50;
          // Calcular altura proporcional baseada nas dimensões reais
          const desiredLogoHeight = (logoHeight * desiredLogoWidth) / logoWidth;
          const logoX = centerX - desiredLogoWidth / 2;
          doc.addImage(logoDataUrl, 'PNG', logoX, y, desiredLogoWidth, desiredLogoHeight);
          y += desiredLogoHeight + 8;
        } else {
          // Fallback: texto "AFIRME PLAY"
          doc.setFontSize(20);
          doc.setTextColor(...COLORS.primary);
          doc.setFont('helvetica', 'bold');
          doc.text('AFIRME PLAY', centerX, y, { align: 'center' });
          y += 15;
        }

        y += 20;

        // Título "ANÁLISE POR TURMA"
        doc.setFontSize(24);
        doc.setTextColor(...COLORS.textDark); // Preto
        doc.setFont('helvetica', 'bold');
        doc.text('ANÁLISE POR TURMA', centerX, y, { align: 'center' });

        y += 20;

        // Nome da turma (fonte menor para textos longos como "VISÃO GERAL (TODAS AS TURMAS)")
        const len = (turmaName || '').length;
        const subtitleSize = len > 28 ? 14 : len > 20 ? 18 : len > 12 ? 22 : 26;
        doc.setFontSize(subtitleSize);
        doc.setTextColor(...COLORS.primary); // Roxo para destaque
        doc.setFont('helvetica', 'bold');
        const maxWidth = pageWidth - 40;
        const lines = doc.splitTextToSize(turmaName.toUpperCase(), maxWidth);
        lines.forEach((line: string, i: number) => {
          doc.text(line, centerX, y + i * (subtitleSize * 0.5), { align: 'center' });
        });
        y += Math.max(18, lines.length * subtitleSize * 0.5) + 8;

        // Card compacto: largura fixa, altura pelo conteúdo, coluna de valores alinhada
        const cardWidth = 148;
        const cardX = (pageWidth - cardWidth) / 2;
        const inset = 7;
        const labelW = 46;
        const valueX = cardX + inset + labelW;
        const valueMaxW = cardWidth - inset * 2 - labelW;
        const rowStep = 3.35;
        const padTop = 4.5;
        const padBottom = 5;

        const escolaCapLines = doc.splitTextToSize(getPdfEscolaDisplayText(), valueMaxW);
        const turmaCapLines = doc.splitTextToSize(turmaName || '—', valueMaxW);

        const concluidos = alunosTurma.filter((s) => s.status === 'concluida');
        const totalAlunos = alunosTurma.length;
        const mediaNota =
          concluidos.length > 0
            ? (concluidos.reduce((sum, s) => sum + s.nota, 0) / concluidos.length).toFixed(1)
            : '0.0';
        const mediaProficiencia =
          concluidos.length > 0
            ? (concluidos.reduce((sum, s) => sum + s.proficiencia, 0) / concluidos.length).toFixed(1)
            : '0.0';
        const taxaParticipacao =
          totalAlunos > 0 ? ((concluidos.length / totalAlunos) * 100).toFixed(1) : '0.0';

        const bodyH =
          padTop +
          5.5 +
          2 +
          escolaCapLines.length * rowStep +
          rowStep +
          turmaCapLines.length * rowStep +
          1.5 +
          6 * rowStep +
          padBottom;
        const cardHeight = bodyH;

        const minSpaceAtBottom = 20;
        let cardTopY = y;
        const maxCardY = pageHeight - cardHeight - minSpaceAtBottom;
        if (cardTopY + cardHeight > maxCardY) {
          cardTopY = maxCardY;
        }

        doc.setFillColor(...COLORS.bgLight);
        doc.rect(cardX, cardTopY, cardWidth, cardHeight, 'F');
        doc.setDrawColor(...COLORS.borderLight);
        doc.setLineWidth(0.35);
        doc.rect(cardX, cardTopY, cardWidth, cardHeight, 'S');

        const lx = cardX + inset;
        let cardY = cardTopY + padTop;

        doc.setFontSize(9);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('ESTATÍSTICAS DA TURMA', centerX, cardY, { align: 'center' });
        cardY += 5.5 + 2;

        doc.setFontSize(7);
        const drawLabeledBlock = (label: string, valueLines: string[]) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text(label, lx, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          valueLines.forEach((line, i) => {
            doc.text(line, valueX, cardY + i * rowStep);
          });
          cardY += Math.max(rowStep, valueLines.length * rowStep);
        };

        drawLabeledBlock('ESCOLA:', escolaCapLines);
        drawLabeledBlock('SÉRIE:', [resolveSerieDisplayForPdf(alunosTurma)]);
        drawLabeledBlock('TURMA:', turmaCapLines);

        cardY += 1.5;

        const drawStatRow = (label: string, value: string) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text(label, lx, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          doc.text(value, valueX, cardY);
          cardY += rowStep;
        };

        drawStatRow('TOTAL DE ALUNOS:', `${totalAlunos}`);
        drawStatRow('ALUNOS CONCLUÍRAM:', `${concluidos.length}`);
        drawStatRow('MÉDIA DE NOTA:', `${mediaNota}`);
        drawStatRow('MÉDIA PROFICIÊNCIA:', `${mediaProficiencia}`);
        drawStatRow('TAXA DE PARTICIPAÇÃO:', `${taxaParticipacao}%`);
        drawStatRow('TOTAL DE QUESTÕES:', typeof totalQuestoes === 'number' ? `${totalQuestoes}` : '—');
      };

      // Função para adicionar rodapé
      const addFooter = (pageNum: number) => {
        const centerX = pageWidth / 2;
        const footerY = pageHeight - 10;

        // Linha sutil acima do rodapé
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        // Configuração de texto do rodapé
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);

        // Esquerda: Nome da empresa
        doc.text('Afirme Play Soluções Educativas', margin, footerY);

        // Centro: Número da página
        doc.text(`Página ${pageNum}`, centerX, footerY, { align: 'center' });

        // Direita: Data e hora formatada
        const now = new Date();
        const dateTimeStr = now.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        doc.text(dateTimeStr, pageWidth - margin, footerY, { align: 'right' });
      };

      // Função para adicionar cabeçalho
      const addHeader = (title: string, turmaOverride?: string, alunosParaSerie?: StudentResult[]): number => {
        const centerX = pageWidth / 2;
        let y = 20;

        // Título da prefeitura
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...COLORS.textDark); // Preto institucional
        doc.text(`PREFEITURA DE ${evaluationInfo.municipio?.toUpperCase() || 'MUNICÍPIO'}`, centerX, y, { align: 'center' });
        y += 10;

        // Informações da escola, série e turma em linhas separadas
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.textGray); // Cinza institucional

        doc.text(`Escola: ${getPdfEscolaDisplayText()}`, centerX, y, { align: 'center' });
        y += 5;

        const alunosSerieRef = alunosParaSerie ?? studentsToUse;
        doc.text(`Série: ${resolveSerieDisplayForPdf(alunosSerieRef)}`, centerX, y, { align: 'center' });
        y += 5;

        const turmaText =
          turmaOverride !== undefined
            ? turmaOverride
            : isAnswerSheetAgregados && asTurma !== "all"
              ? asNorm((asOpcoes.turmas ?? []).find((t) => t.id === asTurma) ?? { id: asTurma })
              : selectedClassId
                ? classes.find((c) => c.id === selectedClassId)?.nome || "Selecionada"
                : studentsToUse[0]?.turma || "Todas";
        doc.text(`Turma: ${turmaText}`, centerX, y, { align: 'center' });
        y += 10;

        // Título da seção
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.textDark); // Preto institucional
        doc.text(title, centerX, y, { align: 'center' });

        return y + 10;
      };

      // Tipo mínimo de questão para o PDF (id, dificuldade, habilidade, tipo, % acertos/erros) — reduz memória e processamento
      type QuestaoMinima = {
        id: string;
        numero: number;
        dificuldade: 'Fácil' | 'Médio' | 'Difícil';
        habilidade: string;
        codigo_habilidade: string;
        tipo: 'multipleChoice' | 'open' | 'trueFalse';
        porcentagem_acertos: number;
        porcentagem_erros: number;
      };
      const normalizeReportQuestionTipo = (raw: unknown): QuestaoMinima['tipo'] => {
        const t = String(raw ?? '')
          .toLowerCase()
          .replace(/-/g, '_');
        if (t === 'multiple_choice' || t === 'multiplechoice') return 'multipleChoice';
        if (t === 'true_false' || t === 'truefalse') return 'trueFalse';
        if (t === 'open') return 'open';
        return 'multipleChoice';
      };
      const mapToMinimal = (q: NonNullable<DetailedReport['questoes']>[number]): QuestaoMinima => ({
        id: q.id,
        numero: q.numero,
        dificuldade: q.dificuldade,
        habilidade: q.habilidade,
        codigo_habilidade: q.codigo_habilidade,
        tipo: normalizeReportQuestionTipo(q.tipo),
        porcentagem_acertos: q.porcentagem_acertos,
        porcentagem_erros: q.porcentagem_erros
      });

      const sortQuestoes = (qs: QuestaoMinima[]) =>
        [...(qs || [])].sort((a, b) => (a?.numero || 0) - (b?.numero || 0));

      const buildQuestoesFallback = (): QuestaoMinima[] => {
        // Unificar questões de todas as disciplinas com numero global (1..N), evitando colisão quando LP e MAT têm 1-20 cada
        const list: QuestaoMinima[] = [];
        let globalNumero = 0;
        const tabelaQuestoesFonte = allTabelaDetalhada ?? tabelaDetalhada;
        tabelaQuestoesFonte?.disciplinas?.forEach(disc => {
          const sorted = [...(disc.questoes || [])].sort((a, b) => (a?.numero ?? 0) - (b?.numero ?? 0));
          sorted.forEach(q => {
            globalNumero += 1;
            list.push({
              id: q.question_id || String(globalNumero),
              numero: globalNumero,
              habilidade: q.habilidade || '',
              codigo_habilidade: q.codigo_habilidade || '',
              tipo: 'multipleChoice',
              dificuldade: 'Médio',
              porcentagem_acertos: 0,
              porcentagem_erros: 0
            });
          });
        });
        return list;
      };

      const questoesParaUsar: QuestaoMinima[] =
        reportParaPdf?.questoes?.length
          ? reportParaPdf.questoes.map(mapToMinimal)
          : buildQuestoesFallback();

      // Total de questões para fallback determinístico
      const totalQuestionsAll = questoesParaUsar.length;

      const respostaKey = (questionNumber: number) => `q${questionNumber}`;

      // Fallback sintético só quando não há mapa por questão (ex.: dados antigos sem `respostas`)
      const getAnswerSynthetic = (student: StudentResult, questionNumber: number): boolean => {
        let cache = fallbackAnswersCache.current.get(student.id);
        if (!cache) {
          cache = new Map<number, boolean>();
          const totalQ = Math.max(1, totalQuestionsAll);
          let seed = 0;
          for (let i = 0; i < student.id.length; i++) seed = (seed * 31 + student.id.charCodeAt(i)) >>> 0;
          const order = Array.from({ length: totalQ }, (_, i) => i + 1);
          for (let i = order.length - 1; i > 0; i--) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const j = seed % (i + 1);
            [order[i], order[j]] = [order[j], order[i]];
          }
          const correctSet = new Set(order.slice(0, Math.max(0, Math.min(student.acertos || 0, totalQ))));
          for (let k = 1; k <= totalQ; k++) cache.set(k, correctSet.has(k));
          fallbackAnswersCache.current.set(student.id, cache);
        }
        return cache.get(questionNumber) ?? false;
      };

      /** Acerto para gráficos / % turma: cartão com `null` = em branco → não conta como acerto. */
      const getAnswer = (student: StudentResult, questionNumber: number): boolean => {
        const key = respostaKey(questionNumber);
        const map = student.respostas;
        if (map && Object.prototype.hasOwnProperty.call(map, key)) {
          const direct = map[key];
          if (direct === true) return true;
          if (direct === false || direct === null) return false;
        }
        return getAnswerSynthetic(student, questionNumber);
      };

      /** Célula da tabela detalhada: em branco não vira ✗ (cartão resposta / agregados). */
      const getAnswerMarkForPdf = (student: StudentResult, questionNumber: number): string => {
        const key = respostaKey(questionNumber);
        const map = student.respostas;
        if (map && Object.prototype.hasOwnProperty.call(map, key)) {
          const direct = map[key];
          if (direct === true) return "\u2713";
          if (direct === false) return "\u2717";
          if (direct === null) return "";
        }
        return getAnswerSynthetic(student, questionNumber) ? "\u2713" : "\u2717";
      };

      const countCorrectFor = (student: StudentResult, qs: QuestaoMinima[]): number => {
        if (!qs || qs.length === 0) return 0;
        let count = 0;
        qs.forEach((q) => {
          const key = respostaKey(q.numero);
          const map = student.respostas;
          if (map && Object.prototype.hasOwnProperty.call(map, key)) {
            if (map[key] === true) count++;
            return;
          }
          if (getAnswerSynthetic(student, q.numero)) count++;
        });
        return count;
      };

      // ===== Funções de gráficos =====
      const drawClassificationChart = (
        x: number,
        y: number,
        w: number,
        h: number,
        studentsToUse: StudentResult[] = students
      ) => {
        const categorias: ReportProficiencyLabel[] = [
          'Abaixo do Básico',
          'Básico',
          'Adequado',
          'Avançado',
        ];
        const concluidos = studentsToUse.filter(s => s.status === 'concluida');
        const counts = categorias.map((c) =>
          concluidos.filter((s) => normalizeProficiencyLevelLabel(s.classificacao) === c).length
        );
        const total = Math.max(1, concluidos.length);
        const barAreaW = w - 80; // espaço para labels e números
        const topPadding = 10;
        const availableH = Math.max(1, h - topPadding);
        const rowStep = availableH / categorias.length;
        const gap = Math.min(5, Math.max(2, rowStep * 0.2));
        const barH = Math.max(4, rowStep - gap);
        doc.setFontSize(9);
        categorias.forEach((cat, i) => {
          const count = counts[i];
          const perc = Math.round((count / total) * 100);
          const yRow = y + topPadding + i * (barH + gap);
          // Label
          doc.setTextColor(60);
          doc.text(cat, x, yRow + barH / 2, { align: 'left' } as unknown as Record<string, unknown>);
          // Barra
          const len = barAreaW * (count / Math.max(...counts, 1));
          const [r, g, b] = getProficiencyLevelRgb(cat);
          doc.setFillColor(r, g, b);
          doc.rect(x + 70, yRow, Math.max(1, len), barH, 'F');
          // Valor
          doc.setTextColor(30);
          doc.text(`${count} (${perc}%)`, x + 72 + Math.max(20, len), yRow + barH / 2, {} as unknown as Record<string, unknown>);
        });
        // Título do gráfico
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Distribuição por Classificação', x, y - 3);
      };

      const drawQuestionAccuracyChart = (
        x: number,
        y: number,
        w: number,
        h: number,
        qs: QuestaoMinima[],
        studentsToUse: StudentResult[] = students
      ) => {
        if (!qs || qs.length === 0) return;
        // Recalcular % de acerto usando a mesma regra dos ícones (getAnswer)
        const completed = studentsToUse.filter(s => s.status === 'concluida');
        const denom = Math.max(1, completed.length);
        // counts: número absoluto de acertos por questão; values: percentual
        const counts = qs.map(q => {
          let correct = 0;
          completed.forEach(s => { if (getAnswer(s, q.numero)) correct++; });
          return correct;
        });
        const values = counts.map(c => Math.round((c / denom) * 100));
        // Com muitas questões: garantir altura mínima por linha e largura mínima por barra
        const minRowHeight = 14;
        const minBarWidth = 5;
        const barGap = 2;
        const areaW = w - 20;
        const areaH = h - 20;
        const maxRows = Math.max(1, Math.floor(areaH / minRowHeight));
        const maxBarsPerRowByHeight = Math.ceil(values.length / maxRows);
        const maxBarsPerRowByWidth = Math.floor(areaW / (minBarWidth + barGap));
        const maxBarsPerRow = Math.min(
          Math.max(8, maxBarsPerRowByHeight),
          Math.max(8, maxBarsPerRowByWidth)
        );
        const chunks: number[][] = [];
        for (let i = 0; i < values.length; i += maxBarsPerRow) {
          chunks.push(values.slice(i, i + maxBarsPerRow));
        }
        const numChunks = chunks.length;
        const rowH = numChunks > 0 ? areaH / numChunks : areaH;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Acerto por Questão (%)', x, y - 3);
        chunks.forEach((vals, rowIndex) => {
          const chartTop = y + rowIndex * rowH;
          const chartBottom = chartTop + rowH - 6;
          const chartHeight = Math.max(4, chartBottom - chartTop - 10);
          const barW = Math.max(4, Math.min(16, Math.floor(areaW / vals.length) - barGap));
          // Grid
          doc.setDrawColor(220);
          [0, 50, 100].forEach(p => {
            const yy = chartBottom - (p / 100) * chartHeight;
            doc.line(x + 8, yy, x + w - 8, yy);
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text(`${p}%`, x + 2, yy + 2);
          });
          // Barras
          vals.forEach((v, idx) => {
            const barX = x + 10 + idx * (barW + barGap);
            const barH = (v / 100) * chartHeight;
            const yy = chartBottom - barH;
            const color = v >= 60 ? [22, 163, 74] : [239, 68, 68];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(barX, yy, barW, barH, 'F');
            const globalIndex = rowIndex * maxBarsPerRow + idx;
            const qNum = qs[globalIndex]?.numero ?? globalIndex + 1;
            doc.setFontSize(7);
            doc.setTextColor(60);
            doc.text(`Q${qNum}`, barX + barW / 2, chartBottom + 4, { align: 'center' });
            const absoluteCorrect = counts[globalIndex] ?? 0;
            doc.setTextColor(30);
            doc.text(String(absoluteCorrect), barX + barW / 2, Math.max(chartTop + 2, yy - 1), { align: 'center' });
          });
        });
      };

      // Função para gerar página de resumo para uma turma específica
      const renderSummaryPageForTurma = (turmaName: string, alunosTurma: StudentResult[], isFirstTurma: boolean = false) => {
        if (alunosTurma.length === 0) return;

        doc.addPage('landscape');
        pageCount++;

        const title = `RELATÓRIO DE DESEMPENHO GERAL`;
        const questoes: QuestaoMinima[] = sortQuestoes(questoesParaUsar);

        const startY = addHeader(title, turmaName, alunosTurma);
        const availableWidth = pageWidth - (2 * margin);
        const MIN_NIVEL_MM = 40;
        const nameWidth = Math.min(140, availableWidth * 0.5);
        const restWidth = availableWidth - nameWidth - MIN_NIVEL_MM;
        const otherWidth = Math.max(20, restWidth / 2);

        // Preparar dados da tabela (usando sempre a mesma regra de acerto)
        const bodyRows: (string | number)[][] = [];
        const completedStudents = alunosTurma.filter(s => s.status === 'concluida');

        completedStudents.forEach((s, i) => {
          const subset = questoes;
          const acertos = countCorrectFor(s, subset);
          const total = subset.length;

          const row = [
            `${i + 1}. ${s.nome}`,
            `${acertos}/${total}`,
            s.proficiencia.toFixed(1),
            normalizeProficiencyLevelLabel(s.classificacao),
          ];
          bodyRows.push(row);
        });

        // Gerar tabela
        autoTable(doc, {
          startY: startY,
          head: [["Aluno", "Acertos", "Proficiência", "Nível"]],
          body: bodyRows,
          theme: 'grid',
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 2.5,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            valign: 'middle'
          },
          headStyles: {
            fillColor: [230, 230, 230],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9,
            cellPadding: 2.5,
          },
          bodyStyles: { textColor: [33, 33, 33] },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: {
            0: { cellWidth: nameWidth, halign: 'left' },
            1: { cellWidth: otherWidth, halign: 'center' },
            2: { cellWidth: otherWidth, halign: 'center' },
            3: { cellWidth: MIN_NIVEL_MM, halign: 'center' }
          },
          didParseCell: (data: CellHookData) => {
            if (data.section === 'body' && data.column.index === 3) {
              data.cell.styles.minCellHeight = 16;
            }
          },
          didDrawCell: (data: CellHookData) => {
            if (data.section !== 'body' || data.column.index !== 3) return;

            const textValue = (Array.isArray(data.cell.text) ? data.cell.text[0] : data.cell.text || '')
              .toString()
              .trim();
            drawProficiencyNivelInPdfCell(data.doc as jsPDF, data.cell, textValue, 9);
          }
        });

        addFooter(pageCount);
      };

      // Uma única página por tabela: todas as questões na mesma página, com fonte e colunas adaptáveis
      // Função para gerar página detalhada (landscape) para uma turma específica — todas as questões em uma página
      const renderDetailedPageForTurma = (subtitle: string, turmaName: string, alunosTurma: StudentResult[], questoes: QuestaoMinima[]) => {
        const completedStudentsLocal = alunosTurma.filter(s => s.status === 'concluida');
        if (!questoes || questoes.length === 0 || completedStudentsLocal.length === 0) return;
        questoes = sortQuestoes(questoes);

        const landscapeWidth = 297;
        const landscapeHeight = 210;
        const landscapeMargin = 10;
        const denomLocal = Math.max(1, completedStudentsLocal.length);
        const totalQuestoes = questoes.length;
        const acertosPorAluno = completedStudentsLocal.map(s => countCorrectFor(s, questoes));

        const drawTableChunk = (
          chunk: typeof questoes,
          isLastChunk: boolean,
          startY: number
        ) => {
          const headerRow1 = ["Aluno"];
          const headerRow2 = ["Habilidade"];
          const headerRow3 = ["% Turma"];
          chunk.forEach(q => {
            headerRow1.push(`Q${q.numero}`);
            headerRow2.push(generateHabilidadeCode(q, skillsMapping));
            let correct = 0;
            completedStudentsLocal.forEach(s => { if (getAnswer(s, q.numero)) correct++; });
            headerRow3.push(`${Math.round((correct / denomLocal) * 100)}%`);
          });
          if (isLastChunk) {
            headerRow1.push("Total de acertos", "Proficiência", "Nível");
            headerRow2.push("", "", "");
            headerRow3.push("", "", "");
          }

          const bodyRows: (string | number)[][] = [];
          completedStudentsLocal.forEach((s, idx) => {
            const row: (string | number)[] = [s.nome];
            chunk.forEach(q => {
              row.push(getAnswerMarkForPdf(s, q.numero));
            });
            if (isLastChunk) {
              row.push(`${acertosPorAluno[idx]}/${totalQuestoes}`);
              row.push(s.proficiencia.toFixed(1));
              row.push(normalizeProficiencyLevelLabel(s.classificacao));
            }
            bodyRows.push(row);
          });

          const availableWidth = landscapeWidth - (2 * landscapeMargin);
          const nameColWidth = Math.min(45, Math.max(25, availableWidth * (chunk.length > 28 ? 0.10 : 0.15)));
          const MIN_NIVEL_WIDTH_MM = 20;
          const colTotalAcertos = chunk.length > 28 ? 8 : 11;
          const colProficiencia = chunk.length > 28 ? 9 : 14;
          const colNivel = Math.max(MIN_NIVEL_WIDTH_MM, chunk.length > 28 ? 17 : 21);
          const finalColsWidth = isLastChunk ? (colTotalAcertos + colProficiencia + colNivel) : 0;

          const numCols = Math.max(1, chunk.length);
          const spaceForQuestions = Math.max(0, availableWidth - nameColWidth - finalColsWidth);
          const questionColWidth = spaceForQuestions / numCols;

          const dynamicFontSize = PDF_BULK_LANDSCAPE_FONT(numCols);
          const bulkPadH = PDF_BULK_LANDSCAPE_CELL_PAD_H(numCols);
          const bulkPadV = PDF_BULK_LANDSCAPE_CELL_PAD_V(numCols);
          const nameColFont = Math.max(0.78, dynamicFontSize * PDF_BULK_NAME_COL_FONT_MUL);
          const namePadV = bulkPadV * PDF_BULK_NAME_COL_PAD_V_MUL;
          const bodyRowHeightMm = pdfBulkBodyRowHeightToMatchNameMm(nameColFont, namePadV);

          const columnStyles: Record<string, Partial<Styles>> = {
            '0': { cellWidth: nameColWidth, halign: 'left', overflow: 'ellipsize' },
          };
          for (let i = 1; i <= chunk.length; i++) {
            columnStyles[String(i)] = { cellWidth: questionColWidth, halign: 'center' };
          }

          if (isLastChunk) {
            columnStyles[String(chunk.length + 1)] = { cellWidth: colTotalAcertos, halign: 'center' };
            columnStyles[String(chunk.length + 2)] = { cellWidth: colProficiencia, halign: 'center' };
            columnStyles[String(chunk.length + 3)] = {
              cellWidth: colNivel,
              halign: 'center',
              overflow: 'ellipsize',
            };
          }

          const numQuestoesThisChunk = chunk.length;
          autoTable(doc, {
            startY: startY,
            head: [headerRow1, headerRow2, headerRow3],
            body: bodyRows,
            theme: 'grid',
            margin: { left: landscapeMargin, right: landscapeMargin },
            tableWidth: 'auto',
            showHead: 'everyPage',
            styles: {
              fontSize: dynamicFontSize,
              cellPadding: { vertical: bulkPadV, horizontal: bulkPadH },
              lineColor: [200, 200, 200],
              lineWidth: 0.05,
              overflow: 'linebreak',
              valign: 'middle',
              halign: 'center'
            },
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              halign: 'center',
              fontSize: dynamicFontSize,
              cellPadding: PDF_BULK_HEAD_CELL_PAD,
            },
            columnStyles: columnStyles,
            bodyStyles: { textColor: [33, 33, 33] },
            alternateRowStyles: { fillColor: [252, 252, 252] },
            didParseCell: (data: CellHookData) => {
              if (data.section === 'body') {
                data.cell.styles.minCellHeight = bodyRowHeightMm;
                if (data.column.index === 0) {
                  data.cell.styles.fontSize = nameColFont;
                  data.cell.styles.cellPadding = { vertical: namePadV, horizontal: bulkPadH };
                }
              }
              if (data.section === 'head') {
                data.cell.styles.cellPadding = PDF_BULK_HEAD_CELL_PAD;
                const fs = dynamicFontSize;
                if (data.row.index === 0) {
                  data.cell.styles.fontSize = Math.max(1.05, fs * 0.72);
                } else if (data.row.index === 1) {
                  data.cell.styles.fontSize = Math.max(1.02, fs - 0.82);
                  data.cell.styles.fontStyle = 'normal';
                  data.cell.styles.font = 'courier';
                } else if (data.row.index === 2) {
                  data.cell.styles.fontSize = Math.max(1.08, fs - 0.32);
                }
              }
            },
            didDrawCell: (data: CellHookData) => {
              const { doc: d, cell, column, section, row } = data;
              const val = Array.isArray(cell.text) ? cell.text[0] : cell.text;

              if (section === 'body' && column.index > 0 && column.index <= numQuestoesThisChunk) {
                const valStr = String(val);
                if (valStr === '✓' || valStr === '\u2713' || valStr === '✗' || valStr === '\u2717') {
                  const centerX = cell.x + cell.width / 2;
                  const centerY = cell.y + cell.height / 2;
                  const fillColor = row.index % 2 === 0 ? [255, 255, 255] : [252, 252, 252];
                  d.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                  d.rect(cell.x, cell.y, cell.width, cell.height, 'F');
                  const iconSize = pdfBulkQuestionMarkIconHalfExtentMm(cell.width, cell.height);
                  const isCorrect = (valStr as string) === '✓' || (valStr as string) === '\u2713';
                  if (isCorrect) {
                    d.setDrawColor(22, 163, 74);
                    d.setLineWidth(Math.max(0.18, Math.min(0.38, iconSize * 0.13)));
                    d.line(centerX - iconSize, centerY, centerX - iconSize / 2, centerY + iconSize);
                    d.line(centerX - iconSize / 2, centerY + iconSize, centerX + iconSize, centerY - iconSize);
                  } else {
                    d.setDrawColor(239, 68, 68);
                    d.setLineWidth(Math.max(0.18, Math.min(0.38, iconSize * 0.13)));
                    d.line(centerX - iconSize, centerY - iconSize, centerX + iconSize, centerY + iconSize);
                    d.line(centerX + iconSize, centerY - iconSize, centerX - iconSize, centerY + iconSize);
                  }
                  d.setDrawColor(200, 200, 200);
                  d.setLineWidth(0.05);
                  d.rect(cell.x, cell.y, cell.width, cell.height);
                }
              }
              if (section === 'head' && row.index === 1) {
                cell.styles.fillColor = [219, 234, 254];
                cell.styles.fontSize = Math.max(1.02, dynamicFontSize - 0.82);
                cell.styles.fontStyle = 'normal';
                cell.styles.font = 'courier';
              }
              if (section === 'head' && row.index === 2 && column.index > 0 && column.index <= numQuestoesThisChunk) {
                const textValue = Array.isArray(cell.text) ? cell.text[0] || '' : cell.text || '';
                const pct = parseInt(String(textValue).replace(/[^0-9]/g, ''));
                if (!isNaN(pct)) {
                  cell.styles.fillColor = pct >= 60 ? [220, 252, 231] : [254, 226, 226];
                  cell.styles.textColor = pct >= 60 ? [22, 163, 74] : [239, 68, 68];
                  cell.styles.fontStyle = 'bold';
                  cell.styles.fontSize = Math.max(1.08, dynamicFontSize - 0.32);
                }
              }
              if (isLastChunk && section === 'body' && column.index === chunk.length + 3) {
                const raw = (Array.isArray(cell.text) ? cell.text[0] : cell.text ?? '').toString().trim();
                drawProficiencyNivelInPdfCell(d as jsPDF, cell, raw || '—', Math.max(1.2, dynamicFontSize * 0.82), {
                  compact: true,
                });
              }
            },
          });
        };

        doc.addPage('landscape');
        pageCount++;

        let y = 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${evaluationInfo.titulo} - ${subtitle}`, landscapeWidth / 2, y, { align: 'center' });
        y += 2.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const metaDetalheGeral = `Escola: ${getPdfEscolaDisplayText()}  •  Série: ${resolveSerieDisplayForPdf(alunosTurma)}  •  Turma: ${turmaName}`;
        const metaDetalheLines = doc.splitTextToSize(metaDetalheGeral, landscapeWidth - 2 * landscapeMargin);
        metaDetalheLines.forEach((ln: string, i: number) => {
          doc.text(ln, landscapeWidth / 2, y + i * 3.2, { align: 'center' });
        });
        y += Math.max(3.2, metaDetalheLines.length * 3.2);
        doc.setFont('helvetica', 'bold');

        drawTableChunk(questoes, true, y);

        const finalY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y) + 1.2;
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        let legendX = landscapeMargin;
        doc.setDrawColor(22, 163, 74);
        doc.setLineWidth(0.28);
        const iconSize = 1.05;
        const legendY = finalY + 1.1;
        const legendTextY = finalY + 1.85;
        doc.line(legendX - iconSize, legendY, legendX - iconSize / 2, legendY + iconSize);
        doc.line(legendX - iconSize / 2, legendY + iconSize, legendX + iconSize, legendY - iconSize);
        doc.setTextColor(90, 90, 90);
        doc.text('Correto', legendX + 3.2, legendTextY);
        legendX += 16;
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(0.28);
        doc.line(legendX - iconSize, legendY - iconSize, legendX + iconSize, legendY + iconSize);
        doc.line(legendX + iconSize, legendY - iconSize, legendX - iconSize, legendY + iconSize);
        doc.setTextColor(90, 90, 90);
        doc.text('Incorretas', legendX + 3.2, legendTextY);

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Afirme Play Soluções Educativas', landscapeMargin, landscapeHeight - 8);
        doc.text(`Página ${pageCount}`, landscapeWidth / 2, landscapeHeight - 8, { align: 'center' });
        doc.text(new Date().toLocaleString('pt-BR'), landscapeWidth - landscapeMargin, landscapeHeight - 8, { align: 'right' });
      };

      // Função para renderizar gráficos para uma turma específica
      const renderChartsForTurma = (turmaName: string, alunosTurma: StudentResult[]) => {
        if (alunosTurma.length === 0) return;

        doc.addPage('landscape');
        pageCount++;
        const yCharts = addHeader('VISÃO GRÁFICA DOS RESULTADOS', turmaName, alunosTurma);
        const chartsTop = yCharts + 2;
        const chartsLeft = margin;
        const chartsWidth = pageWidth - 2 * margin;
        const chartsHeight = pageHeight - chartsTop - margin - 6;
        const classificationChartMinH = 40;
        const classificationChartH = Math.max(classificationChartMinH, Math.floor(chartsHeight * 0.38));
        const questionChartStartY = chartsTop + classificationChartH + 4;
        const questionChartH = Math.max(20, pageHeight - questionChartStartY - margin - 6);
        drawClassificationChart(chartsLeft, chartsTop, chartsWidth, classificationChartH, alunosTurma);
        const qsAll = sortQuestoes(questoesParaUsar);
        drawQuestionAccuracyChart(chartsLeft, questionChartStartY, chartsWidth, questionChartH, qsAll, alunosTurma);
        addFooter(pageCount);
      };

      // ====== Páginas por disciplina (consumindo diretamente tabela_detalhada) ======
      const renderDisciplineTablesPagesForTurma = (turmaName: string, alunosTurma: StudentResult[], customTabela?: typeof tabelaDetalhada) => {
        const activeTabela = customTabela !== undefined ? customTabela : (allTabelaDetalhada || tabelaDetalhada);
        if (!activeTabela || !Array.isArray(activeTabela.disciplinas)) return;
        const disciplinas = activeTabela.disciplinas;

        disciplinas.forEach((disc) => {
          if (!Array.isArray(disc.questoes) || disc.questoes.length === 0) return;

          // Filtrar alunos da disciplina para incluir apenas os da turma específica
          const alunosTurmaDisciplina = (disc.alunos || []).filter(al => al.turma === turmaName);
          if (alunosTurmaDisciplina.length === 0) return; // Pular se não houver alunos desta turma nesta disciplina

          // Ordenar questões por número
          const qs = [...disc.questoes].sort((a, b) => (a?.numero || 0) - (b?.numero || 0));
          const totalQuestoesDisc = qs.length;

          const landscapeWidth = 297;
          const landscapeHeight = 210;
          const landscapeMargin = 10;
          const escolaText = isAnswerSheetAgregados
            ? asEscola !== "all"
              ? asNorm((asOpcoes.escolas ?? []).find((e) => e.id === asEscola) ?? { id: asEscola })
              : "Todas as Escolas"
            : selectedSchoolId
              ? schools.find((s) => s.id === selectedSchoolId)?.nome || ""
              : "Todas as Escolas";
          const alunosParticipantes = alunosTurmaDisciplina.filter(al => Array.isArray(al.respostas_por_questao) && al.respostas_por_questao.some(r => r.respondeu));
          const serieHeuristicaGlobal = getHeaderSerieText(studentsToUse);
          let serieText =
            isAnswerSheetAgregados && asSerie !== "all"
              ? asNorm((asOpcoes.series ?? []).find((s) => s.id === asSerie) ?? { id: asSerie })
              : selectedGradeId
                ? grades.find((g) => g.id === selectedGradeId)?.nome || ""
                : serieHeuristicaGlobal || "";
          if (!serieText) {
            const setSeries = new Set<string>();
            (alunosParticipantes || []).forEach(a => {
              const ser = extractSerieFromTurma(a.turma);
              if (ser) setSeries.add(ser);
            });
            if (setSeries.size === 1) serieText = Array.from(setSeries)[0];
            else if (evaluationInfo?.serie && evaluationInfo.serie !== 'N/A') serieText = evaluationInfo.serie;
          }
          const denomLocal = Math.max(1, alunosParticipantes.length);

          // Uma única página por disciplina: todas as questões na mesma página, tabela adaptável
          const chunk = qs;
          const isLastChunk = true;

          doc.addPage('landscape');
          pageCount++;

          let y = 8;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          const headerDisc = `DISCIPLINA: ${disc.nome || 'N/A'}`;
          doc.text(`${evaluationInfo?.titulo || 'Cartão resposta'} - ${headerDisc}`, landscapeWidth / 2, y, { align: 'center' });
          y += 2.5;
          doc.setFontSize(8);
          doc.text(`Escola: ${escolaText}  •  Série: ${serieText || 'N/A'}  •  Turma: ${turmaName}`, landscapeWidth / 2, y, { align: 'center' });
          y += 2;

            const headerRow1 = ['Aluno'];
            const headerRow2 = ['Habilidade'];
            const headerRow3 = ['% Turma'];
            chunk.forEach(q => {
              headerRow1.push(`Q${q.numero}`);
              headerRow2.push((q.codigo_habilidade || q.habilidade || '').toString());
              let correct = 0;
              alunosParticipantes.forEach(s => {
                const r = (s.respostas_por_questao || []).find(rr => rr.questao === q.numero);
                if (r && r.respondeu && r.acertou) correct++;
              });
              headerRow3.push(`${Math.round((correct / denomLocal) * 100)}%`);
            });
            if (isLastChunk) {
              headerRow1.push('Total de acertos', 'Nota', 'Proficiência', 'Nível');
              headerRow2.push('', '', '', '');
              headerRow3.push('', '', '', '');
            }

            const bodyRows: (string | number)[][] = [];
            alunosTurmaDisciplina.forEach(al => {
              const hasAnsweredAny = Array.isArray(al.respostas_por_questao) && al.respostas_por_questao.some(r => r.respondeu);
              if (!hasAnsweredAny) return;
              const row: (string | number)[] = [al.nome];
              let acertosChunk = 0;
              chunk.forEach(q => {
                const resp = (al.respostas_por_questao || []).find(r => r.questao === q.numero);
                if (!resp) { row.push(''); return; }
                if (resp.respondeu) {
                  if (resp.acertou) { row.push('\u2713'); acertosChunk++; }
                  else row.push('\u2717');
                } else row.push('');
              });
              if (isLastChunk) {
                row.push(`${al.total_acertos ?? 0}/${totalQuestoesDisc}`);
                row.push(Number(al.nota ?? 0).toFixed(1));
                row.push(Number(al.proficiencia ?? 0).toFixed(1));
                row.push(normalizeProficiencyLevelLabel(al.nivel_proficiencia));
              }
              bodyRows.push(row);
            });

            const availableWidth = landscapeWidth - (2 * landscapeMargin);
            const nameColWidth = Math.min(45, Math.max(25, availableWidth * (chunk.length > 28 ? 0.10 : 0.15)));
            const MIN_NIVEL_WIDTH_MM_DISC = 20;
            const colTotalAcertosDisc = chunk.length > 28 ? 8 : 11;
            const colNotaDisc = chunk.length > 28 ? 8 : 11;
            const colProficienciaDisc = chunk.length > 28 ? 9 : 12;
            const colNivelDisc = Math.max(MIN_NIVEL_WIDTH_MM_DISC, chunk.length > 28 ? 17 : 21);
            const finalColsWidth = isLastChunk ? (colTotalAcertosDisc + colNotaDisc + colProficienciaDisc + colNivelDisc) : 0;

            const numColsDisc = Math.max(1, chunk.length);
            const spaceForQuestionsDisc = Math.max(0, availableWidth - nameColWidth - finalColsWidth);
            const questionColWidth = spaceForQuestionsDisc / numColsDisc;

            // Escala fontes para caber em uma página com todas as questões
            const dynamicFontSize = PDF_BULK_LANDSCAPE_FONT(numColsDisc);
            const bulkPadHDisc = PDF_BULK_LANDSCAPE_CELL_PAD_H(numColsDisc);
            const bulkPadVDisc = PDF_BULK_LANDSCAPE_CELL_PAD_V(numColsDisc);
            const nameColFontDisc = Math.max(0.78, dynamicFontSize * PDF_BULK_NAME_COL_FONT_MUL);
            const namePadVDisc = bulkPadVDisc * PDF_BULK_NAME_COL_PAD_V_MUL;
            const bodyRowHeightMmDisc = pdfBulkBodyRowHeightToMatchNameMm(nameColFontDisc, namePadVDisc);

            const columnStyles: Record<string, Partial<Styles>> = {
              '0': { cellWidth: nameColWidth, halign: 'left', overflow: 'ellipsize' },
            };
            for (let i = 1; i <= chunk.length; i++) {
              columnStyles[String(i)] = { cellWidth: questionColWidth, halign: 'center' };
            }
            if (isLastChunk) {
              columnStyles[String(chunk.length + 1)] = { cellWidth: colTotalAcertosDisc, halign: 'center' };
              columnStyles[String(chunk.length + 2)] = { cellWidth: colNotaDisc, halign: 'center' };
              columnStyles[String(chunk.length + 3)] = { cellWidth: colProficienciaDisc, halign: 'center' };
              columnStyles[String(chunk.length + 4)] = {
                cellWidth: colNivelDisc,
                halign: 'center',
                overflow: 'ellipsize',
              };
            }
            const numQuestoesThisChunk = chunk.length;

            autoTable(doc, {
              startY: y,
              head: [headerRow1, headerRow2, headerRow3],
              body: bodyRows,
              theme: 'grid',
              margin: { left: landscapeMargin, right: landscapeMargin },
              tableWidth: 'auto',
              showHead: 'everyPage',
              styles: {
                fontSize: dynamicFontSize,
                cellPadding: { vertical: bulkPadVDisc, horizontal: bulkPadHDisc },
                lineColor: [200, 200, 200],
                lineWidth: 0.05,
                overflow: 'linebreak',
                valign: 'middle',
                halign: 'center'
              },
              headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: dynamicFontSize,
                cellPadding: PDF_BULK_HEAD_CELL_PAD,
              },
              columnStyles: columnStyles,
              bodyStyles: { textColor: [33, 33, 33] },
              alternateRowStyles: { fillColor: [252, 252, 252] },
              didParseCell: (data: CellHookData) => {
                if (data.section === 'body') {
                  data.cell.styles.minCellHeight = bodyRowHeightMmDisc;
                  if (data.column.index === 0) {
                    data.cell.styles.fontSize = nameColFontDisc;
                    data.cell.styles.cellPadding = { vertical: namePadVDisc, horizontal: bulkPadHDisc };
                  }
                }
                if (data.section === 'head') {
                  data.cell.styles.cellPadding = PDF_BULK_HEAD_CELL_PAD;
                  const fs = dynamicFontSize;
                  if (data.row.index === 0) {
                    data.cell.styles.fontSize = Math.max(1.05, fs * 0.72);
                  } else if (data.row.index === 1) {
                    data.cell.styles.fontSize = Math.max(1.02, fs - 0.82);
                    data.cell.styles.fontStyle = 'normal';
                    data.cell.styles.font = 'courier';
                  } else if (data.row.index === 2) {
                    data.cell.styles.fontSize = Math.max(1.08, fs - 0.32);
                  }
                }
              },
              didDrawCell: (data: CellHookData) => {
                const { doc: d, cell, column, section, row } = data;
                const val = Array.isArray(cell.text) ? cell.text[0] : cell.text;
                if (section === 'body' && column.index > 0 && column.index <= numQuestoesThisChunk) {
                  const valStr = String(val);
                  if (valStr === '✓' || valStr === '\u2713' || valStr === '✗' || valStr === '\u2717') {
                    const centerX = cell.x + cell.width / 2;
                    const centerY = cell.y + cell.height / 2;
                    const fillColor = row.index % 2 === 0 ? [255, 255, 255] : [252, 252, 252];
                    d.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                    d.rect(cell.x, cell.y, cell.width, cell.height, 'F');
                    const iconSize = pdfBulkQuestionMarkIconHalfExtentMm(cell.width, cell.height);
                    const isCorrect = (valStr as string) === '✓' || (valStr as string) === '\u2713';
                    if (isCorrect) {
                      d.setDrawColor(22, 163, 74);
                      d.setLineWidth(Math.max(0.18, Math.min(0.38, iconSize * 0.13)));
                      d.line(centerX - iconSize, centerY, centerX - iconSize / 2, centerY + iconSize);
                      d.line(centerX - iconSize / 2, centerY + iconSize, centerX + iconSize, centerY - iconSize);
                    } else {
                      d.setDrawColor(239, 68, 68);
                      d.setLineWidth(Math.max(0.18, Math.min(0.38, iconSize * 0.13)));
                      d.line(centerX - iconSize, centerY - iconSize, centerX + iconSize, centerY + iconSize);
                      d.line(centerX + iconSize, centerY - iconSize, centerX - iconSize, centerY + iconSize);
                    }
                    d.setDrawColor(200, 200, 200);
                    d.setLineWidth(0.05);
                    d.rect(cell.x, cell.y, cell.width, cell.height);
                  }
                }
                if (isLastChunk && section === 'body' && column.index === chunk.length + 4) {
                  const raw = (Array.isArray(cell.text) ? cell.text[0] : cell.text ?? '').toString().trim();
                  drawProficiencyNivelInPdfCell(d as jsPDF, cell, raw || '—', Math.max(1.2, dynamicFontSize * 0.82), {
                    compact: true,
                  });
                }
                if (section === 'head' && row.index === 1) {
                  cell.styles.fillColor = [219, 234, 254];
                  cell.styles.fontSize = Math.max(1.02, dynamicFontSize - 0.82);
                  cell.styles.fontStyle = 'normal';
                  cell.styles.font = 'courier';
                }
                if (section === 'head' && row.index === 2 && column.index > 0 && column.index <= numQuestoesThisChunk) {
                  const textValue = Array.isArray(cell.text) ? cell.text[0] || '' : cell.text || '';
                  const pct = parseInt(String(textValue).replace(/[^0-9]/g, ''));
                  if (!isNaN(pct)) {
                    cell.styles.fillColor = pct >= 60 ? [220, 252, 231] : [254, 226, 226];
                    cell.styles.textColor = pct >= 60 ? [22, 163, 74] : [239, 68, 68];
                    cell.styles.fontStyle = 'bold';
                    cell.styles.fontSize = Math.max(1.08, dynamicFontSize - 0.32);
                  }
                }
              },
            });

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Afirme Play Soluções Educativas', landscapeMargin, landscapeHeight - 8);
            doc.text(`Página ${pageCount}`, landscapeWidth / 2, landscapeHeight - 8, { align: 'center' });
            doc.text(new Date().toLocaleString('pt-BR'), landscapeWidth - landscapeMargin, landscapeHeight - 8, { align: 'right' });
        });
      };

      // ====== ESTRUTURA PRINCIPAL: Reorganizar por turma ======
      // Usar students ou reconstruir a partir de tabelaDetalhada se necessário
      // IMPORTANTE: Usar allTabelaDetalhada para obter TODOS os alunos, incluindo faltosos
      let studentsToUse = students;
      const tabelaParaUsar = allTabelaDetalhada || tabelaDetalhada;

      // Se não temos alunos ou precisamos incluir faltosos, reconstruir a partir de allTabelaDetalhada
      if (studentsToUse.length === 0 && tabelaParaUsar) {
        studentsToUse = mapUnifiedStudents(tabelaParaUsar);
      }

      const detailedStudentsForMerge =
        reportParaPdf?.alunos?.length ? mapDetailedStudentsToResults(reportParaPdf.alunos) : [];
      if (detailedStudentsForMerge.length > 0) {
        const byId = new Map(detailedStudentsForMerge.map((s) => [s.id, s]));
        studentsToUse = studentsToUse.map((s) => {
          const d = byId.get(s.id);
          if (!d) return s;
          const baseCount = perQuestionRespostasCount(s.respostas);
          const detCount = perQuestionRespostasCount(d.respostas);
          if (detCount > 0 && detCount >= baseCount) {
            return { ...s, respostas: d.respostas };
          }
          return s;
        });
      }

      if (studentsToUse.length === 0 && reportParaPdf?.alunos) {
        studentsToUse = mapDetailedStudentsToResults(reportParaPdf.alunos);
      }

      // Função auxiliar para normalizar nome de turma (case-insensitive, trim)
      const normalizeTurmaName = (nome: string | undefined): string => {
        return (nome || '').trim().toUpperCase();
      };

      // Construir mapa turma -> alunos uma única vez (evita N chamadas a obterTodosAlunosTurma)
      const alunosPorTurmaMap = new Map<string, StudentResult[]>();
      if (tabelaParaUsar) {
        const idsByTurma = new Map<string, Set<string>>();
        const addToMap = (turmaNorm: string, aluno: StudentResult) => {
          if (!turmaNorm) return;
          let list = alunosPorTurmaMap.get(turmaNorm);
          let ids = idsByTurma.get(turmaNorm);
          if (!list) {
            list = [];
            ids = new Set<string>();
            alunosPorTurmaMap.set(turmaNorm, list);
            idsByTurma.set(turmaNorm, ids);
          }
          if (!ids!.has(aluno.id)) {
            ids!.add(aluno.id);
            list.push(aluno);
          }
        };
        tabelaParaUsar.geral?.alunos?.forEach(aluno => {
          const rowId = alunoRowId(aluno);
          if (!rowId) return;
          const turmaNorm = normalizeTurmaName(aluno.turma);
          const totalQuestoes = aluno.total_questoes_geral ?? aluno.total_respondidas_geral ?? 0;
          const totalRespondidas = aluno.total_respondidas_geral ?? totalQuestoes;
          const totalAcertos = aluno.total_acertos_geral ?? 0;
          const totalEmBranco = aluno.total_em_branco_geral ?? Math.max(0, totalQuestoes - totalRespondidas);
          const totalErros = Math.max(0, totalRespondidas - totalAcertos - totalEmBranco);
          const participou =
            totalRespondidas > 0 || totalAcertos > 0 || totalErros > 0 ||
            Number(aluno.nota_geral) > 0 || Number(aluno.proficiencia_geral) > 0 ||
            Boolean(aluno.nivel_proficiencia_geral && String(aluno.nivel_proficiencia_geral).trim());
          addToMap(turmaNorm, {
            id: rowId,
            nome: aluno.nome,
            turma: aluno.turma || '',
            nota: Number(aluno.nota_geral ?? 0),
            proficiencia: Number(aluno.proficiencia_geral ?? 0),
            classificacao: normalizeProficiencyLevelLabel(
              aluno.nivel_proficiencia_geral || aluno.classificacao || ""
            ),
            acertos: totalAcertos,
            erros: totalErros,
            questoes_respondidas: totalRespondidas || totalQuestoes,
            status: participou ? 'concluida' : 'pendente',
            respostas: {}
          });
        });
        tabelaParaUsar.disciplinas?.forEach(disciplina => {
          disciplina.alunos?.forEach(aluno => {
            const rowId = alunoRowId(aluno);
            if (!rowId) return;
            const turmaNorm = normalizeTurmaName(aluno.turma);
            const totalQuestoesDisciplina = aluno.total_questoes_disciplina ?? aluno.respostas_por_questao?.length ?? 0;
            const totalRespondidas = aluno.total_respondidas ?? totalQuestoesDisciplina;
            const totalAcertos = aluno.total_acertos ?? 0;
            const totalEmBranco = Math.max(0, totalQuestoesDisciplina - totalRespondidas);
            const totalErros = aluno.total_erros ?? Math.max(0, totalRespondidas - totalAcertos - totalEmBranco);
            const hasAnsweredAny = Array.isArray(aluno.respostas_por_questao) && aluno.respostas_por_questao.some(r => r.respondeu);
            const summarySemQuestoes =
              !hasAnsweredAny &&
              (Number(aluno.nota) > 0 ||
                Number(aluno.proficiencia) > 0 ||
                Boolean(aluno.classificacao));
            const participou = hasAnsweredAny || summarySemQuestoes;
            addToMap(turmaNorm, {
              id: rowId,
              nome: aluno.nome,
              turma: aluno.turma || '',
              nota: Number(aluno.nota ?? 0),
              proficiencia: Number(aluno.proficiencia ?? 0),
              classificacao: normalizeProficiencyLevelLabel(
                aluno.nivel_proficiencia || aluno.classificacao || ""
              ),
              acertos: totalAcertos,
              erros: totalErros,
              questoes_respondidas: totalRespondidas,
              status: participou ? 'concluida' : 'pendente',
              respostas: {}
            });
          });
        });
      }

      const obterTodosAlunosTurma = (turmaNome: string): StudentResult[] => {
        return alunosPorTurmaMap.get(normalizeTurmaName(turmaNome)) ?? [];
      };

      // Aplicar filtros de escola e série: construir Set de ids que passam em uma única passagem
      if ((selectedSchoolId || selectedGradeId) && tabelaParaUsar) {
        const selectedSchool = selectedSchoolId ? schools.find(s => s.id === selectedSchoolId) : null;
        const selectedGrade = selectedGradeId ? grades.find(g => g.id === selectedGradeId) : null;
        const escolaNome = selectedSchool?.nome;
        const serieNome = selectedGrade?.nome;
        const idsPassamFiltro = new Set<string>();
        tabelaParaUsar.disciplinas?.forEach(disciplina => {
          disciplina.alunos?.forEach(aluno => {
            const passaEscola = !selectedSchoolId || !escolaNome || aluno.escola === escolaNome || aluno.escola === selectedSchoolId;
            const passaSerie = !selectedGradeId || !serieNome || aluno.serie === serieNome || aluno.serie === selectedGradeId;
            if (passaEscola && passaSerie) {
              const rid = alunoRowId(aluno);
              if (rid) idsPassamFiltro.add(rid);
            }
          });
        });
        studentsToUse = studentsToUse.filter(s => idsPassamFiltro.has(s.id));
      }

      // Aplicar filtro de turma se uma turma foi selecionada
      if (selectedClassId) {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (selectedClass) {
          const turmaSelecionadaNormalizada = normalizeTurmaName(selectedClass.nome);

          // Filtrar com comparação normalizada (otimizado: normalizar uma vez e comparar)
          studentsToUse = studentsToUse.filter(s => {
            const turmaAlunoNormalizada = normalizeTurmaName(s.turma);
            return turmaAlunoNormalizada === turmaSelecionadaNormalizada;
          });

          // Se não encontrou alunos em studentsToUse, buscar TODOS os alunos da turma (incluindo faltosos)
          if (studentsToUse.length === 0 && tabelaParaUsar) {
            studentsToUse = obterTodosAlunosTurma(selectedClass.nome);
          }
        }
      }

      // Não bloquear geração de PDF mesmo se não houver alunos participantes
      // Turmas com todos os alunos faltosos ainda devem aparecer no relatório

      // Agrupar alunos por turma (incluindo turmas com apenas faltosos)
      const turmasMap = new Map<string, StudentResult[]>();
      studentsToUse.forEach(s => {
        const turma = s.turma || 'Sem Turma';
        if (!turmasMap.has(turma)) {
          turmasMap.set(turma, []);
        }
        turmasMap.get(turma)!.push(s);
      });

      // Se uma turma específica foi selecionada e não encontramos alunos em studentsToUse,
      // mas a turma existe na lista de turmas, garantir que ela apareça no relatório
      if (selectedClassId && studentsToUse.length === 0) {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (selectedClass && tabelaParaUsar) {
          const alunosTurma = obterTodosAlunosTurma(selectedClass.nome);
          if (alunosTurma.length > 0) {
            studentsToUse = alunosTurma;
            const turma = selectedClass.nome || 'Sem Turma';
            turmasMap.set(turma, alunosTurma);
          }
        }
      }

      // IMPORTANTE: Quando filtro "todos" está ativo, garantir que TODAS as turmas sejam incluídas,
      // mesmo as que têm apenas faltosos (sem participantes)
      if (!selectedClassId && tabelaParaUsar) {
        const todasTurmas = new Set<string>();
        const _school = selectedSchoolId ? schools.find(s => s.id === selectedSchoolId) : null;
        const _grade = selectedGradeId ? grades.find(g => g.id === selectedGradeId) : null;

        const passaFiltrosAluno = (aluno: { escola?: string; serie?: string; turma?: string }) => {
          if (!aluno.turma) return false;
          if (selectedSchoolId && _school && aluno.escola !== _school.nome && aluno.escola !== selectedSchoolId) return false;
          if (selectedGradeId && _grade && aluno.serie !== _grade.nome && aluno.serie !== selectedGradeId) return false;
          return true;
        };

        tabelaParaUsar.geral?.alunos?.forEach(aluno => {
          if (passaFiltrosAluno(aluno)) todasTurmas.add(aluno.turma!);
        });
        tabelaParaUsar.disciplinas?.forEach(disciplina => {
          disciplina.alunos?.forEach(aluno => {
            if (passaFiltrosAluno(aluno)) todasTurmas.add(aluno.turma!);
          });
        });

        // Garantir que todas as turmas estejam no turmasMap
        todasTurmas.forEach(turmaNome => {
          if (!turmasMap.has(turmaNome)) {
            // Se a turma não está no mapa, obter todos os alunos dela (incluindo faltosos)
            const alunosTurma = obterTodosAlunosTurma(turmaNome);
            if (alunosTurma.length > 0) {
              turmasMap.set(turmaNome, alunosTurma);
            } else {
              // Mesmo sem alunos, adicionar a turma vazia para garantir que apareça
              turmasMap.set(turmaNome, []);
            }
          }
        });
      }


      // Ordenar turmas alfabeticamente
      const turmasOrdenadas = Array.from(turmasMap.keys()).sort((a, b) => a.localeCompare(b));

      // Adicionar capa inicial (já em landscape)
      addInitialCover();
      pageCount++;

      // === SEÇÃO GERAL (Todas as Escolas / Turmas) ===
      // Renderiza um consolidado geral se o usuário não filtrou por uma turma específica
      // e há alunos participantes no total.
      const todosAlunosParticipantes = studentsToUse.filter(s => s.status === 'concluida');

      if (!selectedClassId && todosAlunosParticipantes.length > 0 && questoesParaUsar.length > 0) {
        // Adicionar capa da seção Geral
        doc.addPage('landscape');
        pageWidth = doc.internal.pageSize.getWidth();
        pageHeight = doc.internal.pageSize.getHeight();
        doc.setFillColor(...COLORS.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addTurmaCover('VISÃO GERAL (TODAS AS TURMAS)', studentsToUse, questoesParaUsar.length);
        pageCount++;

        // 1. Resumo Geral
        renderSummaryPageForTurma('VISÃO GERAL', todosAlunosParticipantes, true);

        // 2. Gráficos Gerais
        renderChartsForTurma('VISÃO GERAL', todosAlunosParticipantes);

        // 3. Tabela Detalhada Geral
        renderDetailedPageForTurma('GERAL', 'VISÃO GERAL', todosAlunosParticipantes, questoesParaUsar);

        // 4. Resultado por disciplina Geral
        if (tabelaParaUsar && Array.isArray(tabelaParaUsar.disciplinas) && tabelaParaUsar.disciplinas.length > 0) {
          const fakeTurmaName = 'VISÃO GERAL';
          // Create a temporary mapping so the discipline render function works
          const previousDisciplinas = tabelaParaUsar.disciplinas.map(d => ({
            ...d,
            alunos: d.alunos?.map(a => ({ ...a, originalTurma: a.turma, turma: fakeTurmaName }))
          }));
          const temporarioTabelaDetalhada = { ...tabelaParaUsar, disciplinas: previousDisciplinas };
          const alunosParticipantesCopiados = todosAlunosParticipantes.map(a => ({ ...a, turma: fakeTurmaName }));

          renderDisciplineTablesPagesForTurma(fakeTurmaName, alunosParticipantesCopiados, temporarioTabelaDetalhada as any);
        }
      }

      // Para cada turma, renderizar todas as seções na ordem correta
      // IMPORTANTE: Incluir turmas mesmo quando todos os alunos são faltosos
      turmasOrdenadas.forEach((turmaName, turmaIndex) => {
        const alunosTurma = turmasMap.get(turmaName) || [];
        // Remover verificação que impedia turmas vazias - agora incluímos turmas com todos os alunos faltosos
        // if (alunosTurma.length === 0) return;

        // Filtrar alunos participantes uma única vez
        const alunosParticipantesTurma = alunosTurma.filter(s => s.status === 'concluida');

        // Adicionar capa da turma (em landscape)
        doc.addPage('landscape');
        pageWidth = doc.internal.pageSize.getWidth();
        pageHeight = doc.internal.pageSize.getHeight();
        // Garantir fundo branco limpo na nova página antes de desenhar a capa
        doc.setFillColor(...COLORS.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addTurmaCover(turmaName, alunosTurma, questoesParaUsar.length);
        pageCount++;

        // 1. RELATÓRIO DE DESEMPENHO GERAL (resumo)
        // Renderizar resumo apenas se houver alunos participantes
        if (questoesParaUsar.length > 0 && alunosParticipantesTurma.length > 0) {
          renderSummaryPageForTurma(turmaName, alunosParticipantesTurma, false);
        }

        // 2. VISÃO GRÁFICA DOS RESULTADOS (gráficos)
        // Renderizar gráficos apenas se houver alunos participantes
        if (alunosParticipantesTurma.length > 0) {
          renderChartsForTurma(turmaName, alunosParticipantesTurma);
        }

        // 3. Resultado geral (tabela detalhada landscape)
        // Renderizar apenas se houver alunos participantes
        if (questoesParaUsar.length > 0 && alunosParticipantesTurma.length > 0) {
          renderDetailedPageForTurma('GERAL', turmaName, alunosParticipantesTurma, questoesParaUsar);
        }

        // 4. Resultado por disciplina (tabelas por disciplina)
        // Renderizar apenas se houver alunos participantes
        if (tabelaParaUsar && Array.isArray(tabelaParaUsar.disciplinas) && tabelaParaUsar.disciplinas.length > 0 && alunosParticipantesTurma.length > 0) {
          renderDisciplineTablesPagesForTurma(turmaName, alunosParticipantesTurma);
        }

        // 5. ALUNOS FALTOSOS DA TURMA
        // Renderizar faltosos desta turma específica
        const renderFaltososTurma = () => {
          if (!tabelaParaUsar) return;

          // Obter faltosos apenas desta turma
          const faltososTurma: Array<{ nome: string; turma: string; escola?: string; serie?: string }> = [];
          const alunosIdsProcessados = new Set<string>();
          const turmaNormalizada = normalizeTurmaName(turmaName);

          // Função auxiliar para verificar se aluno passa nos filtros
          const passaFiltros = (aluno: { escola?: string; serie?: string; turma?: string }): boolean => {
            const alunoTurmaNormalizada = normalizeTurmaName(aluno.turma);
            if (alunoTurmaNormalizada !== turmaNormalizada) return false;

            if (selectedSchoolId) {
              const selectedSchool = schools.find(s => s.id === selectedSchoolId);
              if (selectedSchool && aluno.escola !== selectedSchool.nome && aluno.escola !== selectedSchoolId) {
                return false;
              }
            }

            if (selectedGradeId) {
              const selectedGrade = grades.find(g => g.id === selectedGradeId);
              if (selectedGrade && aluno.serie !== selectedGrade.nome && aluno.serie !== selectedGradeId) {
                return false;
              }
            }

            return true;
          };

          // Buscar faltosos em geral.alunos
          tabelaParaUsar.geral?.alunos?.forEach(aluno => {
            const rowId = alunoRowId(aluno);
            if (!rowId || !passaFiltros(aluno) || alunosIdsProcessados.has(rowId)) return;

            const totalQuestoes = aluno.total_questoes_geral ?? aluno.total_respondidas_geral ?? 0;
            const totalRespondidas = aluno.total_respondidas_geral ?? totalQuestoes;
            const totalAcertos = aluno.total_acertos_geral ?? 0;
            const totalErros = Math.max(0, totalRespondidas - totalAcertos);
            const participou =
              totalRespondidas > 0 || totalAcertos > 0 || totalErros > 0 ||
              Number(aluno.nota_geral) > 0 || Number(aluno.proficiencia_geral) > 0 ||
              Boolean(aluno.nivel_proficiencia_geral && String(aluno.nivel_proficiencia_geral).trim());

            if (!participou && aluno.turma) {
              alunosIdsProcessados.add(rowId);
              faltososTurma.push({
                nome: aluno.nome,
                turma: aluno.turma,
                escola: aluno.escola,
                serie: aluno.serie,
              });
            }
          });

          // Buscar faltosos em disciplinas
          tabelaParaUsar.disciplinas?.forEach(disciplina => {
            disciplina.alunos?.forEach(aluno => {
              const rowId = alunoRowId(aluno);
              if (!rowId || !passaFiltros(aluno) || alunosIdsProcessados.has(rowId)) return;

              const hasAnsweredAny = Array.isArray(aluno.respostas_por_questao) &&
                aluno.respostas_por_questao.some(r => r.respondeu);
              const summarySemQuestoes =
                !hasAnsweredAny &&
                (Number(aluno.nota) > 0 ||
                  Number(aluno.proficiencia) > 0 ||
                  Boolean(aluno.classificacao));
              const participou = hasAnsweredAny || summarySemQuestoes;

              if (!participou && aluno.turma) {
                alunosIdsProcessados.add(rowId);
                faltososTurma.push({
                  nome: aluno.nome,
                  turma: aluno.turma,
                  escola: aluno.escola,
                  serie: aluno.serie,
                });
              }
            });
          });

          if (faltososTurma.length === 0) return;

          // Adicionar capa de faltosos da turma
          doc.addPage('landscape');
          pageCount++;
          pageWidth = doc.internal.pageSize.getWidth();
          pageHeight = doc.internal.pageSize.getHeight();
          addFaltososCover(turmaName, faltososTurma.length, alunosTurma);

          // Nova página para a tabela
          doc.addPage('portrait');
          pageCount++;
          pageWidth = doc.internal.pageSize.getWidth();
          pageHeight = doc.internal.pageSize.getHeight();

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          const metaFaltososTbl = `Escola: ${getPdfEscolaDisplayText()}  •  Série: ${resolveSerieDisplayForPdf(alunosTurma)}  •  Turma: ${turmaName}`;
          const metaFaltososLines = doc.splitTextToSize(metaFaltososTbl, pageWidth - 2 * margin);
          const metaTop = 14;
          metaFaltososLines.forEach((ln: string, i: number) => {
            doc.text(ln, pageWidth / 2, metaTop + i * 3.8, { align: 'center' });
          });
          let y = metaTop + metaFaltososLines.length * 3.8 + 4;
          doc.setTextColor(0, 0, 0);

          // Preparar dados da tabela
          const bodyRows: string[][] = faltososTurma
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
            .map((faltoso) => [
              faltoso.nome,
              formatAlunoEscolaTurmaSerie(faltoso),
              'Pendente',
            ]);

          // Gerar tabela (colunas: Nome | localização | Situação — como modal AnswerSheetResults)
          autoTable(doc, {
            startY: y,
            head: [['Nome do aluno', 'Escola · Turma · Série', 'Situação']],
            body: bodyRows,
            theme: 'grid',
            margin: { left: margin, right: margin },
            styles: {
              fontSize: 7,
              cellPadding: 1.15,
              lineColor: [200, 200, 200],
              lineWidth: 0.1,
              valign: 'middle',
            },
            headStyles: {
              fillColor: [230, 230, 230],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              halign: 'center',
              fontSize: 7,
              cellPadding: 1.15,
            },
            bodyStyles: { textColor: [33, 33, 33] },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            columnStyles: {
              0: { halign: 'left', cellWidth: (pageWidth - 2 * margin) * 0.34 },
              1: { halign: 'left', cellWidth: (pageWidth - 2 * margin) * 0.46 },
              2: { halign: 'center', cellWidth: (pageWidth - 2 * margin) * 0.2 }
            }
          });

          // Rodapé
          addFooter(pageCount);
        };

        // Renderizar faltosos desta turma
        renderFaltososTurma();
      });


      // Salvar PDF
      const fileName = `relatorio-${evaluationInfo.titulo?.replace(/[^a-zA-Z0-9]/g, '-') || 'cartao-resposta'}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF gerado com sucesso!', description: `Relatório salvo como ${fileName}` });

    } catch (error) {
      toast({ title: 'Erro ao gerar PDF', description: 'Não foi possível gerar o relatório', variant: 'destructive' });
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
            <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
            Acerto e Níveis — Cartão resposta
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Dados agregados do cartão resposta. Selecione estado, município e cartão para exportar o PDF.
          </p>
          {user?.role && (
            <p className="text-sm text-blue-600 mt-1">
              {getRestrictionMessage(user.role)}
            </p>
          )}
        </div>
        <div className="flex justify-center w-full sm:w-auto sm:justify-end">
          <Badge variant="outline" className="text-sm">
            {user?.role === 'admin' ? 'Administrador' :
              user?.role === 'professor' ? 'Professor' :
                user?.role === 'diretor' ? 'Diretor' :
                  user?.role === 'coordenador' ? 'Coordenador' : 'Técnico Administrativo'}
          </Badge>
        </div>
      </div>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Estado, município e cartão resposta são obrigatórios. Escola, série e turma refinam o recorte.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 w-full min-w-0">
            <div className="space-y-2">
              <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                Estado
                {!isAnswerSheetAgregados && userHierarchyContext?.restrictions.canSelectState === false && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Pré-selecionado
                  </Badge>
                )}
              </div>
              {isAnswerSheetAgregados ? (
                <Select value={asEstado} onValueChange={setAsEstadoAndReset} disabled={isLoadingFiltersAg}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(asOpcoes.estados ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {asNorm(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedState}
                  onValueChange={handleChangeState}
                  disabled={isLoading || userHierarchyContext?.restrictions.canSelectState === false}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                Município
                {!isAnswerSheetAgregados && userHierarchyContext?.restrictions.canSelectMunicipality === false && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Pré-selecionado
                  </Badge>
                )}
              </div>
              {isAnswerSheetAgregados ? (
                <Select
                  value={asMunicipio}
                  onValueChange={setAsMunicipioAndReset}
                  disabled={isLoadingFiltersAg || asEstado === "all"}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Selecione o município" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(asOpcoes.municipios ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {asNorm(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedMunicipality}
                  onValueChange={handleChangeMunicipality}
                  disabled={
                    isLoading ||
                    !selectedState ||
                    userHierarchyContext?.restrictions.canSelectMunicipality === false
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue
                      placeholder={
                        selectedState ? "Selecione o município" : "Primeiro selecione um estado"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {municipalities.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cartão resposta
              </label>
              {isAnswerSheetAgregados ? (
                <Select
                  value={asGabarito}
                  onValueChange={setAsGabaritoAndReset}
                  disabled={isLoadingFiltersAg || asMunicipio === "all"}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Selecione o cartão resposta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(asOpcoes.gabaritos ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {asNorm(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedEvaluationId}
                  onValueChange={handleSelectEvaluation}
                  disabled={!selectedMunicipality}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue
                      placeholder={
                        selectedMunicipality
                          ? "Selecione o cartão resposta"
                          : "Primeiro selecione um município"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-w-md">
                    {evaluations.map((ev) => {
                      const dataStr = ev.data_aplicacao
                        ? new Date(ev.data_aplicacao).toLocaleDateString("pt-BR")
                        : "";
                      const titleHint = dataStr ? `${ev.titulo} — ${dataStr}` : ev.titulo;
                      return (
                        <SelectItem key={ev.id} value={ev.id} title={titleHint}>
                          {ev.titulo}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                Escola
                {!isAnswerSheetAgregados && userHierarchyContext?.restrictions.canSelectSchool === false && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Pré-selecionado
                  </Badge>
                )}
              </div>
              {isAnswerSheetAgregados ? (
                <Select
                  value={asEscola}
                  onValueChange={setAsEscolaAndReset}
                  disabled={isLoadingFiltersAg || asGabarito === "all"}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {(asOpcoes.escolas ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {asNorm(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedSchoolId || "all"}
                  onValueChange={(value) => handleSelectSchool(value === "all" ? "" : value)}
                  disabled={
                    !selectedEvaluationId ||
                    isLoadingSchools ||
                    userHierarchyContext?.restrictions.canSelectSchool === false
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    {isLoadingSchools && selectedEvaluationId ? (
                      <div className="flex items-center gap-2 text-muted-foreground w-full min-w-0">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span className="truncate">Carregando escolas…</span>
                      </div>
                    ) : (
                      <SelectValue
                        placeholder={
                          selectedEvaluationId
                            ? "Todas as escolas"
                            : "Primeiro selecione um cartão resposta"
                        }
                      />
                    )}
                  </SelectTrigger>
                  {!isLoadingSchools && (
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {schools.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>
                          {sc.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  )}
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Série</label>
              {isAnswerSheetAgregados ? (
                <Select
                  value={asSerie}
                  onValueChange={setAsSerieAndReset}
                  disabled={isLoadingFiltersAg || asEscola === "all"}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {(asOpcoes.series ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {asNorm(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedGradeId || "all"}
                  onValueChange={(value) => handleSelectGrade(value === "all" ? "" : value)}
                  disabled={!selectedSchoolId}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue
                      placeholder={
                        selectedSchoolId ? "Todas as séries" : "Primeiro selecione uma escola"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {grades.map((gr) => (
                      <SelectItem key={gr.id} value={gr.id}>
                        {gr.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Turma</label>
              {isAnswerSheetAgregados ? (
                <Select
                  value={asTurma}
                  onValueChange={(v) => {
                    setAsTurma(v);
                    setAllStudents([]);
                    setStudents([]);
                    setAllTabelaDetalhada(null);
                    setTabelaDetalhada(null);
                    setEstatisticasGerais(null);
                    setEvaluationInfo(null);
                  }}
                  disabled={isLoadingFiltersAg || asSerie === "all"}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {(asOpcoes.turmas ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {asNorm(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedClassId || "all"}
                  onValueChange={(value) => handleSelectClass(value === "all" ? "" : value)}
                  disabled={!selectedGradeId}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue
                      placeholder={
                        selectedGradeId ? "Todas as turmas" : "Primeiro selecione uma série"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {!isAnswerSheetAgregados &&
            selectedEvaluationId &&
            (selectedSchoolId || selectedGradeId || selectedClassId) && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={async () => {
                    setSelectedSchoolId("");
                    setSelectedGradeId("");
                    setSelectedClassId("");

                    if (allStudents.length > 0 && allTabelaDetalhada) {
                      setStudents(allStudents);
                      setTabelaDetalhada(allTabelaDetalhada);
                    } else if (selectedEvaluationId) {
                      try {
                        setIsLoading(true);
                        const {
                          students: fetchedStudents,
                          report,
                          tabelaDetalhada: tabela,
                          estatisticas,
                          opcoesProximosFiltros: opcoes,
                        } = await fetchEvaluationData(selectedEvaluationId);
                        setAllStudents(fetchedStudents);
                        setAllTabelaDetalhada(tabela || null);
                        setStudents(fetchedStudents);
                        setDetailedReport(report || null);
                        setTabelaDetalhada(tabela || null);
                        if (estatisticas)
                          setEstatisticasGerais(
                            estatisticas as unknown as {
                              [key: string]: unknown;
                              serie?: string;
                              escola?: string;
                              municipio?: string;
                              total_alunos?: number;
                              alunos_participantes?: number;
                              alunos_ausentes?: number;
                              media_nota_geral?: number;
                              media_proficiencia_geral?: number;
                            } | null
                          );
                        if (opcoes)
                          setOpcoesProximosFiltros(
                            opcoes as unknown as {
                              [key: string]: unknown;
                              series?: Array<{ id: string; name: string }>;
                            } | null
                          );
                      } catch {
                        toast({
                          title: "Erro",
                          description: "Não foi possível recarregar os dados",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }
                  }}
                >
                  Limpar escola, série e turma
                </Button>
              </div>
            )}

          <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 text-sm leading-relaxed">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 shrink-0" />
              <div>
                <span className="font-semibold">Ordem dos filtros:</span>{" "}
                {isAnswerSheetAgregados ? (
                  <>
                    Estado → Município → Cartão resposta → Escola → Série → Turma. Os três últimos são opcionais
                    (mesma API que Resultados / Relatório Escolar Cartão).
                  </>
                ) : (
                  <>
                    Estado → Município → Cartão resposta → Escola → Série → Turma. Escola, série e turma são
                    opcionais para refinar os resultados.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Botão de Geração */}
          <div className="mt-6 flex flex-col items-end gap-2">
            {user?.role === "professor" && (isAnswerSheetAgregados ? asTurma === "all" : !selectedClassId) && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Selecione uma turma para imprimir o relatório.
              </p>
            )}
            <Button
              onClick={handleGeneratePDF}
              disabled={
                isAnswerSheetAgregados
                  ? !allRequiredAgregadosFilters ||
                    isLoadingAgregadosData ||
                    isLoading ||
                    (!allTabelaDetalhada && !detailedReport && allStudents.length === 0) ||
                    (user?.role === "professor" && asTurma === "all")
                  : !selectedEvaluationId ||
                    isLoading ||
                    (!allTabelaDetalhada && !detailedReport && allStudents.length === 0) ||
                    (user?.role === "professor" && !selectedClassId)
              }
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Gerar Relatório PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAnswerSheetAgregados && !allRequiredAgregadosFilters && !isLoadingAgregadosData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
              <Filter className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">Selecione os filtros obrigatórios</h3>
            <p className="text-muted-foreground text-center max-w-md text-sm">
              Escolha <strong>Estado</strong>, <strong>Município</strong> e <strong>Cartão resposta</strong>.{" "}
              <strong>Escola</strong>, <strong>Série</strong> e <strong>Turma</strong> refinam o recorte.
            </p>
          </CardContent>
        </Card>
      )}

      {isAnswerSheetAgregados && allRequiredAgregadosFilters && isLoadingAgregadosData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-muted-foreground">Carregando resultados agregados…</p>
          </CardContent>
        </Card>
      )}

      {evaluationInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
              Resumo do cartão resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Cartão resposta
                </span>
                <div className="font-semibold text-foreground mt-1">{evaluationInfo.titulo}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Escola</span>
                <div className="font-semibold text-foreground mt-1">
                  {isAnswerSheetAgregados
                    ? asEscola !== "all"
                      ? asNorm((asOpcoes.escolas ?? []).find((e) => e.id === asEscola) ?? { id: asEscola })
                      : "Todas as Escolas"
                    : selectedSchoolId
                      ? schools.find((s) => s.id === selectedSchoolId)?.nome || "Escola Selecionada"
                      : "Todas as Escolas"}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Município</span>
                <div className="font-semibold text-foreground mt-1">{evaluationInfo.municipio}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Série</span>
                <div className="font-semibold text-foreground mt-1">
                  {estatisticasGerais?.serie ||
                    (opcoesProximosFiltros?.series?.length === 1
                      ? ((r: { nome?: string; name?: string }) => r.nome ?? r.name)(
                          opcoesProximosFiltros.series[0] as { nome?: string; name?: string }
                        )
                      : null) ||
                    evaluationInfo?.serie ||
                    (isAnswerSheetAgregados && asSerie !== "all"
                      ? asNorm((asOpcoes.series ?? []).find((s) => s.id === asSerie) ?? { id: asSerie })
                      : null) ||
                    (selectedGradeId ? grades.find(g => g.id === selectedGradeId)?.nome : null) ||
                    'Série não informada'}
                </div>
              </div>
            </div>

            {/* Estatísticas do cartão resposta — único bloco de cards (sem repetir Informações Gerais) */}
            {(detailedReport || students.length > 0 || estatisticasGerais) && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Estatísticas do cartão resposta
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                    <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                      {totalQuestoesFromTabela || detailedReport?.questoes?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total de Questões</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {students.length > 0
                        ? students.length
                        : (typeof estatisticasGerais?.total_alunos === 'number' ? estatisticasGerais.total_alunos : 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total de Alunos</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {students.length > 0
                        ? students.filter(s => s.status === 'concluida').length
                        : (typeof estatisticasGerais?.alunos_participantes === 'number' ? estatisticasGerais.alunos_participantes : 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Participantes</div>
                  </div>
                  <div
                    role="button"
                    tabIndex={evaluationInfo ? 0 : -1}
                    onClick={() => {
                      if (evaluationInfo) setShowAbsentStudentsModal(true);
                    }}
                    onKeyDown={(e) => {
                      if (!evaluationInfo) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setShowAbsentStudentsModal(true);
                      }
                    }}
                    className={
                      evaluationInfo
                        ? "text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg cursor-pointer hover:bg-red-100/80 dark:hover:bg-red-950/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        : "text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg"
                    }
                    aria-label="Ver faltosos e pendentes"
                  >
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {students.length > 0
                        ? absentStudents.length
                        : typeof estatisticasGerais?.alunos_ausentes === "number"
                          ? estatisticasGerais.alunos_ausentes
                          : 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Faltosos</div>
                    {evaluationInfo && (
                      <div className="text-xs text-muted-foreground mt-1.5">Clique para ver a lista</div>
                    )}
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {(() => {
                        const totalAlunos = typeof estatisticasGerais?.total_alunos === 'number' ? estatisticasGerais.total_alunos : (students.length || 0);
                        const participantes = typeof estatisticasGerais?.alunos_participantes === 'number' ? estatisticasGerais.alunos_participantes : (students.filter(s => s.status === 'concluida').length || 0);
                        return totalAlunos > 0 ? ((participantes / totalAlunos) * 100).toFixed(1) : '0';
                      })()}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Taxa de Participação</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {Number(estatisticasGerais?.media_nota_geral ?? 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Nota Geral</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {Number(estatisticasGerais?.media_proficiencia_geral ?? 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Proficiência</div>
                  </div>
                </div>

                {(isAnswerSheetAgregados
                  ? asEscola !== "all" || asSerie !== "all" || asTurma !== "all"
                  : selectedSchoolId || selectedGradeId || selectedClassId) && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Filtros Aplicados:</h4>
                    <div className="flex flex-wrap gap-2">
                      {isAnswerSheetAgregados ? (
                        <>
                          {asEscola !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Escola:{" "}
                              {asNorm((asOpcoes.escolas ?? []).find((e) => e.id === asEscola) ?? { id: asEscola })}
                            </Badge>
                          )}
                          {asSerie !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Série:{" "}
                              {asNorm((asOpcoes.series ?? []).find((s) => s.id === asSerie) ?? { id: asSerie })}
                            </Badge>
                          )}
                          {asTurma !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Turma:{" "}
                              {asNorm((asOpcoes.turmas ?? []).find((t) => t.id === asTurma) ?? { id: asTurma })}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          {selectedSchoolId && (
                            <Badge variant="secondary" className="text-xs">
                              Escola: {schools.find(s => s.id === selectedSchoolId)?.nome || 'Selecionada'}
                            </Badge>
                          )}
                          {selectedGradeId && (
                            <Badge variant="secondary" className="text-xs">
                              Série: {grades.find(g => g.id === selectedGradeId)?.nome || 'Selecionada'}
                            </Badge>
                          )}
                          {selectedClassId && (
                            <Badge variant="secondary" className="text-xs">
                              Turma: {classes.find(c => c.id === selectedClassId)?.nome || 'Selecionada'}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showAbsentStudentsModal} onOpenChange={setShowAbsentStudentsModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-600" />
              Faltosos / Pendentes
              {evaluationInfo?.titulo && (
                <span className="text-sm font-normal text-muted-foreground ml-1">· {evaluationInfo.titulo}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 py-2">
            {absentStudents.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full shrink-0" />
                    <span className="font-semibold text-red-800 dark:text-red-400">
                      {absentStudents.length} {absentStudents.length === 1 ? "aluno" : "alunos"} pendente(s)
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Estes alunos ainda não entregaram ou não tiveram o cartão resposta corrigido.
                  </p>
                </div>
                <div className="grid gap-3">
                  {absentStudents.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                            {a.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{a.nome}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {formatAlunoEscolaTurmaSerie(a)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 shrink-0">
                        Pendente
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum faltoso</h3>
                <p className="text-muted-foreground">
                  Todos os alunos do escopo já têm resultado ou estão como participantes.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowAbsentStudentsModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}