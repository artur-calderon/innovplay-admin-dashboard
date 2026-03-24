import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Medal, Trophy, TrendingUp, Users, X, Download, BarChart3, Table2, PieChart, School, MapPin, Target, Award, CheckCircle2, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EvaluationResultsApiService } from '@/services/evaluation/evaluationResultsApi';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import { ResultsCharts } from '@/components/evaluations/results/ResultsCharts';
import { DisciplineTables } from '@/components/evaluations/results/DisciplineTables';
import { ClassStatistics } from '@/components/evaluations/results/ClassStatistics';
import { StudentRanking } from '@/components/evaluations/student/StudentRanking';
import type { NovaRespostaAPI } from '@/services/evaluation/evaluationResultsApi';

interface OlimpiadaResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  olimpiadaId: string;
  /** Série/grade para cálculo de proficiência quando o relatório e getOlimpiada não trazem */
  initialSerie?: string;
}

type StageGroup = "group1" | "group2";

interface EvaluationInfoSummary {
  id: string;
  titulo: string;
  disciplina?: string;
  disciplinas?: string[];
  serie?: string;
  escola?: string;
  municipio?: string;
  data_aplicacao?: string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
}

export function OlimpiadaResultsModal({
  isOpen,
  onClose,
  olimpiadaId,
  initialSerie,
}: OlimpiadaResultsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<NovaRespostaAPI | null>(null);
  const [evaluationInfo, setEvaluationInfo] = useState<EvaluationInfoSummary | null>(null);

  useEffect(() => {
    if (isOpen && olimpiadaId) {
      loadResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, olimpiadaId]);

  // Função para mapear DetailedReport para NovaRespostaAPI
  const mapDetailedReportToApiData = useCallback((
    report: any, 
    skillDescriptionMap?: Record<string, string>,
    skillCodeMap?: Record<string, string>,
    skillsByIndex?: Array<{ code: string; description: string }>
  ): NovaRespostaAPI => {
    const alunos = report.alunos || [];
    const alunosConcluidos = alunos.filter((a: any) => a.status === 'concluida');
    
    const total_alunos = alunos.length;
    const alunos_participantes = alunosConcluidos.length;
    const media_nota = alunos_participantes > 0
      ? alunosConcluidos.reduce((sum: number, a: any) => sum + (a.nota_final || 0), 0) / alunos_participantes
      : 0;
    const media_proficiencia = alunos_participantes > 0
      ? alunosConcluidos.reduce((sum: number, a: any) => sum + (a.proficiencia || 0), 0) / alunos_participantes
      : 0;
      
    const distribuicao = {
      abaixo_do_basico: alunosConcluidos.filter((a: any) => a.classificacao === 'Abaixo do Básico').length,
      basico: alunosConcluidos.filter((a: any) => a.classificacao === 'Básico').length,
      adequado: alunosConcluidos.filter((a: any) => a.classificacao === 'Adequado').length,
      avancado: alunosConcluidos.filter((a: any) => a.classificacao === 'Avançado').length,
    };

    // Extrair disciplina(s) da olimpíada
    const disciplinaStr = report.avaliacao?.disciplina || 'Multidisciplinar';
    const disciplinas = disciplinaStr.split(',').map((d: string) => d.trim());

    // Série pode vir em campos diferentes do backend (serie, serie_nome, grade_name ou do primeiro aluno)
    const serieFromReport =
      report.avaliacao?.serie ??
      report.avaliacao?.serie_nome ??
      (report.avaliacao as any)?.grade_name ??
      report.alunos?.[0]?.serie ??
      '';

    // Verificar se parece UUID (preferir não exibir como código, mas não esconder se for o único dado)
    const looksLikeUuid = (s: string) =>
      !s || s.length > 30 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s).trim());

    // Remover chaves {} se o backend retornar UUID como "{uuid}" em vez de "uuid"
    const cleanBraces = (s: string) => s.replace(/^\{|\}$/g, '');

    // Coletar todos os valores possíveis da questão (backend pode usar nomes diferentes ou objeto aninhado)
    const getQuestionSkillValues = (q: any) => {
      const skillObj = q.skill ?? q.ability ?? q.habilidade_obj;
      const code = cleanBraces(String(
        q.codigo_habilidade ?? q.ability_code ?? q.skill_code ?? skillObj?.code ?? ''
      ).trim());
      const hab = cleanBraces(String(
        q.habilidade ?? q.description ?? q.skill_description ?? skillObj?.description ?? ''
      ).trim());
      const skillId = cleanBraces(String(
        q.skill_id ?? q.ability_id ?? q.habilidade_id ?? skillObj?.id ?? ''
      ).trim()) || hab;
      const questionId = String(q.id ?? '').trim();
      return { code, hab, skillId, questionId };
    };

    // Resolver código da habilidade (exibido na tabela): preferir código real; senão map; senão qualquer valor disponível
    const getSkillCode = (q: any) => {
      const { code, hab, skillId, questionId } = getQuestionSkillValues(q);

      if (code && !looksLikeUuid(code)) return code;

      if (skillCodeMap && Object.keys(skillCodeMap).length > 0) {
        const fromMap =
          skillCodeMap[skillId] ||
          skillCodeMap[hab] ||
          skillCodeMap[questionId] ||
          (code ? skillCodeMap[code] : '');
        if (fromMap) return fromMap;
      }

      if (hab && hab.length <= 20 && !hab.includes('-')) return hab;
      if (code) return code;
      if (hab) return hab;
      if (questionId) return questionId;
      return '—';
    };

    // Resolver descrição da habilidade (tooltip): preferir descrição do map; senão qualquer texto disponível
    const getSkillDescription = (q: any) => {
      const { code, hab, skillId, questionId } = getQuestionSkillValues(q);

      if (skillDescriptionMap && Object.keys(skillDescriptionMap).length > 0) {
        const fromMap =
          skillDescriptionMap[code] ||
          skillDescriptionMap[skillId] ||
          skillDescriptionMap[hab] ||
          skillDescriptionMap[questionId];
        if (fromMap) return fromMap;
      }

      if (hab && !looksLikeUuid(hab)) return hab;
      if (code && !looksLikeUuid(code)) return code;
      if (hab) return hab;
      if (code) return code;
      if (questionId) return questionId;
      return '—';
    };

    return {
      estatisticas_gerais: {
        tipo: 'avaliacao' as const,
        nome: report.avaliacao?.titulo || 'Olimpíada',
        estado: '',
        total_avaliacoes: 1,
        total_alunos,
        alunos_participantes,
        alunos_pendentes: total_alunos - alunos_participantes,
        alunos_ausentes: total_alunos - alunos_participantes,
        media_nota_geral: media_nota,
        media_proficiencia_geral: media_proficiencia,
        distribuicao_classificacao_geral: distribuicao,
        escola: report.avaliacao?.escola,
        municipio: report.avaliacao?.municipio,
        serie: serieFromReport || undefined,
      },
      resultados_por_disciplina: disciplinas.map(disc => ({
        disciplina: disc,
        media_nota: media_nota,
        media_proficiencia: media_proficiencia,
        distribuicao_classificacao: distribuicao,
      })),
      tabela_detalhada: {
        disciplinas: disciplinas.map((discNome: string, discIndex: number) => {
          // Mapear questões: codigo_habilidade = código exibido na tabela, habilidade = descrição tooltip
          // Fallback por índice: skills da API podem vir na ordem das questões; quando faltar, usar último disponível
          const questoes = (report.questoes || []).map((q: any, qIndex: number) => {
            let codigo = getSkillCode(q);
            let descricao = getSkillDescription(q);

            const skillByIndex = skillsByIndex?.length
              ? skillsByIndex[Math.min(qIndex, skillsByIndex.length - 1)]
              : undefined;
            if ((!codigo || codigo === '—') && skillByIndex?.code) {
              codigo = skillByIndex.code;
            }
            if ((!descricao || descricao === '—') && skillByIndex?.description) {
              descricao = skillByIndex.description;
            }

            return {
              numero: q.numero ?? qIndex + 1,
              habilidade: descricao || '—',
              codigo_habilidade: codigo || '—',
              question_id: String(q.id ?? q.numero ?? qIndex)
            };
          });

          // Mapear alunos com suas respostas por questão
          const alunosDisciplina = alunos.map((a: any) => {
            // Mapear respostas por questão
            const respostas_por_questao = (report.questoes || []).map((q: any) => {
              const resposta = (a.respostas || []).find((r: any) => r.questao_id === q.id);
              return {
                questao: q.numero || 0,
                acertou: resposta ? resposta.resposta_correta : false,
                respondeu: resposta ? !resposta.resposta_em_branco : false,
                resposta: resposta ? (resposta.resposta || '') : ''
              };
            });

            return {
              id: a.id,
              nome: a.nome,
              escola: report.avaliacao?.escola || '',
              serie: report.avaliacao?.serie || '',
              turma: a.turma,
              respostas_por_questao,
              total_acertos: a.total_acertos || 0,
              total_erros: a.total_erros || 0,
              total_respondidas: (a.total_acertos || 0) + (a.total_erros || 0),
              total_questoes_disciplina: report.avaliacao?.total_questoes || 0,
              nivel_proficiencia: a.classificacao || 'Abaixo do Básico',
              nota: a.nota_final || 0,
              proficiencia: a.proficiencia || 0
            };
          });

          return {
            id: `disciplina-${discIndex}`,
            nome: discNome,
            questoes,
            alunos: alunosDisciplina
          };
        }),
        geral: {
          alunos: alunos.map((a: any) => ({
            id: a.id,
            nome: a.nome,
            escola: report.avaliacao?.escola || '',
            serie: report.avaliacao?.serie || '',
            turma: a.turma,
            nota_geral: a.nota_final || 0,
            proficiencia_geral: a.proficiencia || 0,
            nivel_proficiencia_geral: a.classificacao || 'Abaixo do Básico',
            total_acertos_geral: a.total_acertos || 0,
            total_erros_geral: a.total_erros || 0,
            total_questoes_geral: report.avaliacao?.total_questoes || 0,
            total_respondidas_geral: (a.total_acertos || 0) + (a.total_erros || 0),
            total_em_branco_geral: a.total_em_branco || 0,
            percentual_acertos_geral: report.avaliacao?.total_questoes > 0 
              ? ((a.total_acertos || 0) / report.avaliacao.total_questoes) * 100 
              : 0,
            status_geral: a.status || 'pendente'
          }))
        }
      },
      ranking: [],
      nivel_granularidade: 'avaliacao' as const,
      filtros_aplicados: {
        estado: '',
        municipio: '',
        escola: null,
        serie: null,
        turma: null,
        avaliacao: olimpiadaId
      },
      resultados_detalhados: {
        avaliacoes: [],
        paginacao: {
          page: 1,
          per_page: 1000,
          total: 1,
          total_pages: 1
        }
      }
    } as NovaRespostaAPI;
  }, [olimpiadaId]);

  const loadResults = async () => {
    setLoading(true);
    setError(null);

    try {
      // Chamadas em paralelo para reduzir tempo de carregamento; allSettled evita que falha em uma (ex.: getOlimpiada) quebre as outras
      const [appliedResult, reportResult, skillsResult, olimpiadaResult] = await Promise.allSettled([
        OlimpiadasApiService.getIndividualAppliedStudents(olimpiadaId),
        EvaluationResultsApiService.getDetailedReport(olimpiadaId),
        EvaluationResultsApiService.getSkillsByEvaluation(olimpiadaId),
        OlimpiadasApiService.getOlimpiada(olimpiadaId),
      ]);

      const individualStudentIds: string[] =
        appliedResult.status === 'fulfilled' ? appliedResult.value : [];
      const hasIndividualStudents = individualStudentIds.length > 0;

      if (reportResult.status === 'rejected') {
        throw reportResult.reason ?? new Error('Falha ao carregar relatório detalhado.');
      }
      let detailedReport: any = reportResult.value;

      let alunosFiltrados: any[] = [];

      if (detailedReport?.alunos && Array.isArray(detailedReport.alunos)) {
        if (hasIndividualStudents) {
          alunosFiltrados = detailedReport.alunos.filter((aluno: any) => {
            const alunoId = String(aluno.id || aluno.student_id || '');
            return individualStudentIds.some((selectedId) => {
              const n1 = String(selectedId).toLowerCase().replace(/-/g, '');
              const n2 = alunoId.toLowerCase().replace(/-/g, '');
              return n1 === n2 || String(selectedId) === alunoId;
            });
          });
        } else {
          const alunosIndividuais = detailedReport.alunos.filter((aluno: any) =>
            aluno.application_info?.student_test_olimpics_id ||
            aluno.student_test_olimpics_id ||
            (aluno.application_info && !aluno.application_info.class_test_id)
          );
          alunosFiltrados = alunosIndividuais.length > 0 ? alunosIndividuais : detailedReport.alunos;
        }
      }

      // Olimpíada individual: relatório detalhado não traz alunos (só class_test). Buscar por aluno.
      if (hasIndividualStudents && alunosFiltrados.length === 0) {
        const resultsPerStudent = await Promise.all(
          individualStudentIds.map((studentId) =>
            EvaluationResultsApiService.getStudentDetailedResults(olimpiadaId, studentId)
          )
        );
        const alunosFromIndividual = resultsPerStudent
          .filter((r): r is NonNullable<typeof r> => r != null)
          .map((r) => ({
            id: r.student_id,
            nome: r.student_name ?? 'Aluno',
            turma: '',
            nota_final: r.grade ?? 0,
            proficiencia: r.proficiencia ?? 0,
            classificacao: r.classificacao ?? 'Abaixo do Básico',
            status: r.status === 'concluida' ? 'concluida' : 'nao_respondida',
            total_acertos: r.correct_answers ?? 0,
            total_erros: (r.total_questions ?? 0) - (r.correct_answers ?? 0),
            total_em_branco: 0,
            respostas: (r.answers ?? []).map((a: any) => ({
              questao_id: a.question_id,
              questao_numero: a.question_number,
              resposta_correta: a.is_correct,
              resposta_em_branco: false,
              tempo_gasto: 0,
            })),
          }));
        if (alunosFromIndividual.length > 0) {
          const tituloOlimpiada = detailedReport?.avaliacao?.titulo ?? 'Olimpíada';
          detailedReport = {
            avaliacao: {
              id: olimpiadaId,
              titulo: tituloOlimpiada,
              disciplina: detailedReport?.avaliacao?.disciplina ?? '',
              total_questoes: alunosFromIndividual[0] ? (alunosFromIndividual[0].total_acertos + (alunosFromIndividual[0].total_erros || 0)) : 0,
            },
            questoes: detailedReport?.questoes ?? [],
            alunos: alunosFromIndividual,
          };
          alunosFiltrados = alunosFromIndividual;
        }
      }

      // Se o relatório trouxe alunos mas o filtro ficou vazio (ex.: olimpíada por turma), usar todos os alunos
      if (alunosFiltrados.length === 0 && detailedReport?.alunos?.length > 0) {
        alunosFiltrados = detailedReport.alunos;
      }

      if (!detailedReport || alunosFiltrados.length === 0) {
        if (hasIndividualStudents && individualStudentIds.length > 0) {
          throw new Error('Nenhum resultado encontrado para os alunos aplicados individualmente. Os alunos já fizeram a prova?');
        }
        throw new Error('A olimpíada ainda não possui resultados disponíveis.');
      }

      // Montar mapas de skills e lista por índice (API retorna na mesma ordem das questões)
      let skillDescriptionMap: Record<string, string> = {};
      let skillCodeMap: Record<string, string> = {};
      let skillsByIndex: Array<{ code: string; description: string }> = [];
      if (skillsResult.status === 'fulfilled' && skillsResult.value != null) {
        const raw = skillsResult.value as unknown;
        const fromObj = raw as Record<string, unknown>;
        const skillsList: Array<{ id?: string | null; code?: string; description?: string }> = Array.isArray(raw)
          ? raw
          : (Array.isArray(fromObj.data) ? fromObj.data : null) ??
            (Array.isArray(fromObj.skills) ? fromObj.skills : null) ??
            (Array.isArray(fromObj.results) ? fromObj.results : null) ??
            (Array.isArray(fromObj.items) ? fromObj.items : null) ??
            [];

        skillsList.forEach((s: { id?: string | null; code?: string; description?: string }) => {
          if (s && typeof s === 'object') {
            if (s.description) {
              if (s.code) skillDescriptionMap[String(s.code)] = s.description;
              if (s.id) skillDescriptionMap[String(s.id)] = s.description;
            }
            if (s.id != null && s.code) skillCodeMap[String(s.id)] = String(s.code);
            if (s.code) skillCodeMap[String(s.code)] = String(s.code);
          }
        });
        skillsByIndex = skillsList
          .filter((s): s is Record<string, unknown> => s != null && typeof s === 'object')
          .map((s) => ({
            code: String((s as { code?: string }).code ?? ''),
            description: String((s as { description?: string }).description ?? '')
          }));
      }

      // Série: relatório → resultado de getOlimpiada do batch → initialSerie
      let serieFromReport: string | undefined =
        detailedReport.avaliacao?.serie ??
        detailedReport.avaliacao?.serie_nome ??
        (detailedReport.avaliacao as any)?.grade_name ??
        detailedReport.alunos?.[0]?.serie;

      if (!serieFromReport || !serieFromReport.trim()) {
        const olimpiada = olimpiadaResult.status === 'fulfilled' ? olimpiadaResult.value : null;
        const gradeName = olimpiada
          ? (olimpiada as any).grade?.name ?? (olimpiada as any).serie
          : undefined;
        if (gradeName && String(gradeName).trim()) {
          serieFromReport = String(gradeName).trim();
        } else if (initialSerie && String(initialSerie).trim()) {
          serieFromReport = String(initialSerie).trim();
        }
      }

      // Município: relatório → resultado de getOlimpiada do batch
      let municipioFromReport: string | undefined =
        detailedReport.avaliacao?.municipio ??
        detailedReport.alunos?.[0]?.municipio;

      if (!municipioFromReport || !municipioFromReport.trim()) {
        const olimpiada = olimpiadaResult.status === 'fulfilled' ? olimpiadaResult.value : null;
        const municipioName = olimpiada
          ? (olimpiada as any).municipalities?.[0]?.name ?? 
            (olimpiada as any).municipality?.name ?? 
            (olimpiada as any).municipio?.name ??
            (olimpiada as any).municipio ??
            (olimpiada as any).city?.name
          : undefined;
        
        if (municipioName && String(municipioName).trim()) {
          municipioFromReport = String(municipioName).trim();
        }
      }

      // Relatório com alunos filtrados e série preenchida (para inferência de group1/group2)
      const filteredReport = {
        ...detailedReport,
        alunos: alunosFiltrados,
        avaliacao: {
          ...detailedReport.avaliacao,
          serie: serieFromReport || detailedReport.avaliacao?.serie,
        },
      };

      const mappedData = mapDetailedReportToApiData(
        filteredReport,
        Object.keys(skillDescriptionMap).length > 0 ? skillDescriptionMap : undefined,
        Object.keys(skillCodeMap).length > 0 ? skillCodeMap : undefined,
        skillsByIndex.length > 0 ? skillsByIndex : undefined
      );
      setApiData(mappedData);

      const resumo: EvaluationInfoSummary = {
        id: olimpiadaId,
        titulo: detailedReport.avaliacao?.titulo || 'Olimpíada',
        total_alunos: alunosFiltrados.length,
        alunos_participantes: alunosFiltrados.filter((a: any) => a.status === 'concluida').length,
        alunos_ausentes: alunosFiltrados.length - alunosFiltrados.filter((a: any) => a.status === 'concluida').length,
        media_nota: mappedData.estatisticas_gerais.media_nota_geral || 0,
        media_proficiencia: mappedData.estatisticas_gerais.media_proficiencia_geral || 0,
        escola: detailedReport.avaliacao?.escola,
        municipio: municipioFromReport,
        serie: serieFromReport,
        disciplina: detailedReport.avaliacao?.disciplina,
        disciplinas: detailedReport.avaliacao?.disciplina ? [detailedReport.avaliacao.disciplina] : [],
      };

      setEvaluationInfo(resumo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados';
      console.error('Erro ao carregar resultados da olimpíada:', {
        olimpiadaId,
        error: errorMessage
      });
      
      setError(errorMessage);
      setApiData(null);
      setEvaluationInfo(null);
      
      toast({
        title: 'Erro ao carregar resultados',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para determinar se é matemática
  const isMath = useCallback((name?: string) => (name || "").toLowerCase().includes("matem"), []);

  // Função para inferir grupo de série (group1 = Anos Iniciais/EI/AI/EJA/Especial, group2 = Anos Finais/EM)
  const inferStageGroup = useCallback((): StageGroup => {
    const names: string[] = [
      apiData?.estatisticas_gerais?.serie,
      evaluationInfo?.serie,
      apiData?.resultados_detalhados?.avaliacoes?.[0]?.serie,
      apiData?.estatisticas_gerais?.nome,
      evaluationInfo?.titulo,
    ]
      .filter(Boolean)
      .map((s) => (s as string).toLowerCase());

    const has = (re: RegExp) => names.some(n => re.test(n));

    // group1: Infantil, Anos Iniciais (1º-5º), EJA, Especial (inclui título da avaliação, ex: "Olimpíada Anos Iniciais")
    if (has(/infantil|iniciais|eja|especial/)) return "group1";
    if (has(/\b(1º|1o|1°|1)\s*ano\b|\b(2º|2o|2°|2)\s*ano\b|\b(3º|3o|3°|3)\s*ano\b|\b(4º|4o|4°|4)\s*ano\b|\b(5º|5o|5°|5)\s*ano\b/) && !has(/m[eé]dio/)) {
      return "group1";
    }
    // group2: Anos Finais, Ensino Médio
    return "group2";
  }, [apiData, evaluationInfo]);

  // Função para obter máximo de proficiência por disciplina
  const getMaxForDiscipline = useCallback((discipline: string, group: StageGroup) => {
    if (group === "group1") return isMath(discipline) ? 375 : 350;
    return isMath(discipline) ? 425 : 400;
  }, [isMath]);

  // Valor máximo de proficiência para exibição (baseado em disciplina e série)
  const maxProficiency = useMemo(() => {
    const discipline = evaluationInfo?.disciplina || evaluationInfo?.disciplinas?.[0] || 'Outras';
    const group = inferStageGroup();
    return getMaxForDiscipline(discipline, group);
  }, [evaluationInfo?.disciplina, evaluationInfo?.disciplinas, inferStageGroup, getMaxForDiscipline]);

  // Preparar dados para StudentRanking - MOVER ANTES DO handleExportResults
  const rankedStudents = useMemo(() => {
    if (!apiData?.tabela_detalhada?.geral?.alunos) return [];

    return apiData.tabela_detalhada.geral.alunos
      .filter((aluno) => aluno.status_geral === 'concluida')
      .map((aluno) => ({
        id: aluno.id,
        nome: aluno.nome,
        turma: aluno.turma,
        nota: aluno.nota_geral || 0,
        proficiencia: aluno.proficiencia_geral || 0,
        classificacao: aluno.nivel_proficiencia_geral || 'Abaixo do Básico',
        status: 'concluida' as const,
      }))
      .sort((a, b) => b.proficiencia - a.proficiencia);
  }, [apiData]);

  // Handlers para visualização de detalhes do aluno
  const handleViewStudentDetails = useCallback((studentId: string) => {
    window.open(`/app/olimpiada-resultado/${olimpiadaId}/${studentId}`, '_blank');
  }, [olimpiadaId]);

  const handleOpenInNewTab = useCallback((studentId: string) => {
    window.open(`/app/olimpiada-resultado/${olimpiadaId}/${studentId}`, '_blank');
  }, [olimpiadaId]);

  // Handler para exportar resultados em PDF (padrão AcertoNiveis/Evolution: capa, logo, rodapé)
  const handleExportResults = useCallback(async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      if (!apiData || !evaluationInfo) {
        toast({
          title: 'Nenhum dado para exportar',
          description: 'Não há dados disponíveis para gerar o PDF',
          variant: 'destructive',
        });
        return;
      }

      // Carregar logo (padrão AcertoNiveis)
      let logoDataUrl = '';
      let logoWidth = 0;
      let logoHeight = 0;
      try {
        const logoPath = '/LOGO-1-menor.png';
        const logoImg = new Image();
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = reject;
          logoImg.src = logoPath;
        });
        logoWidth = logoImg.width;
        logoHeight = logoImg.height;
        const response = await fetch(logoPath);
        const blob = await response.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        // continuar sem logo
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      let pageWidth = doc.internal.pageSize.getWidth();
      let pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      const COLORS = {
        primary: [124, 62, 237] as [number, number, number],
        textDark: [31, 41, 55] as [number, number, number],
        textGray: [107, 114, 128] as [number, number, number],
        borderLight: [229, 231, 235] as [number, number, number],
        bgLight: [250, 250, 250] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
      };

      const trunc = (s: string, max: number) =>
        (s || '').length > max ? (s || '').slice(0, max - 1) + '…' : (s || '');

      // Capa inicial (padrão AcertoNiveis)
      const addInitialCover = () => {
        doc.setFillColor(...COLORS.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        const centerX = pageWidth / 2;
        let y = 20;

        if (logoDataUrl && logoWidth > 0 && logoHeight > 0) {
          const desiredLogoWidth = 50;
          const desiredLogoHeight = (logoHeight * desiredLogoWidth) / logoWidth;
          doc.addImage(logoDataUrl, 'PNG', centerX - desiredLogoWidth / 2, y, desiredLogoWidth, desiredLogoHeight);
          y += desiredLogoHeight + 8;
        } else {
          doc.setFontSize(20);
          doc.setTextColor(...COLORS.primary);
          doc.setFont('helvetica', 'bold');
          doc.text('AFIRME PLAY', centerX, y, { align: 'center' });
          y += 15;
        }
        y += 8;

        doc.setFontSize(14);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(`${(evaluationInfo.municipio || 'MUNICÍPIO').toUpperCase()} - ALAGOAS`, centerX, y, { align: 'center' });
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.textGray);
        doc.setFont('helvetica', 'normal');
        doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', centerX, y, { align: 'center' });
        y += 18;

        doc.setFontSize(24);
        doc.setTextColor(...COLORS.textDark);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO DE RESULTADOS', centerX, y, { align: 'center' });
        y += 12;
        doc.setFontSize(18);
        doc.text('OLIMPÍADA', centerX, y, { align: 'center' });
        y += 20;

        const cardWidth = pageWidth - 120;
        const cardHeight = 72;
        const cardX = (pageWidth - cardWidth) / 2;
        if (y + cardHeight > pageHeight - 20) y = pageHeight - cardHeight - 20;

        doc.setFillColor(...COLORS.bgLight);
        doc.rect(cardX, y, cardWidth, cardHeight, 'F');
        doc.setDrawColor(...COLORS.borderLight);
        doc.setLineWidth(0.5);
        doc.rect(cardX, y, cardWidth, cardHeight, 'S');

        let cardY = y + 9;
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES DA OLIMPÍADA', centerX, cardY, { align: 'center' });
        cardY += 9;

        const leftColX = cardX + 12;
        const labelWidth = 38;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('AVALIAÇÃO:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        const avLines = doc.splitTextToSize(evaluationInfo.titulo || 'N/A', cardWidth - labelWidth - 24);
        doc.text(avLines, leftColX + labelWidth, cardY);
        cardY += Math.max(5, avLines.length * 4);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('DISCIPLINAS:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(evaluationInfo.disciplinas?.join(', ') || 'N/A', leftColX + labelWidth, cardY);
        cardY += 5;

        if (evaluationInfo.serie) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text('SÉRIE:', leftColX, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          doc.text(evaluationInfo.serie, leftColX + labelWidth, cardY);
          cardY += 5;
        }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('MUNICÍPIO:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(evaluationInfo.municipio || 'N/A', leftColX + labelWidth, cardY);
        cardY += 5;
        if (evaluationInfo.escola) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text('ESCOLA:', leftColX, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          doc.text(trunc(evaluationInfo.escola, 50), leftColX + labelWidth, cardY);
          cardY += 5;
        }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('DATA:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(new Date().toLocaleDateString('pt-BR'), leftColX + labelWidth, cardY);
        cardY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('TOTAL DE ALUNOS:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(String(evaluationInfo.total_alunos ?? 0), leftColX + labelWidth, cardY);
        cardY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('PARTICIPANTES:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(String(evaluationInfo.alunos_participantes ?? 0), leftColX + labelWidth, cardY);
      };

      addInitialCover();

      doc.addPage('landscape');
      pageWidth = doc.internal.pageSize.getWidth();
      pageHeight = doc.internal.pageSize.getHeight();

      // Rodapé em todas as páginas (padrão AcertoNiveis)
      const addFooter = (pageNum: number) => {
        const footerY = pageHeight - 10;
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Afirme Play Soluções Educativas', margin, footerY);
        doc.text(`Página ${pageNum}`, pageWidth / 2, footerY, { align: 'center' });
        const dateTimeStr = new Date().toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
        doc.text(dateTimeStr, pageWidth - margin, footerY, { align: 'right' });
      };

      // Cabeçalho da página de conteúdo
      const contentTop = 35;
      let y = contentTop;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.textDark);
      doc.text(`PREFEITURA DE ${(evaluationInfo.municipio || 'MUNICÍPIO').toUpperCase()}`, pageWidth / 2, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.textGray);
      doc.text(`Resultados da Olimpíada — ${trunc(evaluationInfo.titulo || 'Relatório', 60)}`, pageWidth / 2, 26, { align: 'center' });
      doc.setDrawColor(...COLORS.borderLight);
      doc.setLineWidth(0.3);
      doc.line(margin, 30, pageWidth - margin, 30);

      const dist = apiData.estatisticas_gerais?.distribuicao_classificacao_geral ?? apiData.estatisticas_gerais?.distribuicao_classificacao ?? {};
      const totalPart = evaluationInfo.alunos_participantes || 1;
      const pct = (n: number) => (totalPart > 0 ? ((n / totalPart) * 100).toFixed(1) : '0');
      const distData = [
        ['Abaixo do Básico', String(dist.abaixo_do_basico ?? 0), `${pct(dist.abaixo_do_basico ?? 0)}%`],
        ['Básico', String(dist.basico ?? 0), `${pct(dist.basico ?? 0)}%`],
        ['Adequado', String(dist.adequado ?? 0), `${pct(dist.adequado ?? 0)}%`],
        ['Avançado', String(dist.avancado ?? 0), `${pct(dist.avancado ?? 0)}%`],
      ];

      doc.setFontSize(12);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('Distribuição por nível de proficiência', margin, y);
      y += 6;

      autoTable(doc, {
        head: [['Nível', 'Quantidade', 'Percentual']],
        body: distData,
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 10 },
        bodyStyles: { halign: 'center', fontSize: 10 },
        styles: { cellPadding: 4, font: 'helvetica', fontSize: 10 },
        margin: { left: margin, right: margin },
      });

      y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 12;
      const contentBottom = pageHeight - 18;
      if (y > contentBottom - 25) {
        doc.addPage('landscape');
        pageWidth = doc.internal.pageSize.getWidth();
        pageHeight = doc.internal.pageSize.getHeight();
        y = margin + 10;
      }

      doc.setFontSize(12);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('Ranking dos alunos', margin, y);
      y += 6;

      const rankingData = rankedStudents.map((student, index) => [
        String(index + 1),
        trunc(student.nome || '', 38),
        trunc(student.turma || '', 18),
        (student.nota ?? 0).toFixed(2),
        (student.proficiencia ?? 0).toFixed(1),
        trunc(student.classificacao || '', 20),
      ]);

      autoTable(doc, {
        head: [['Pos.', 'Nome', 'Turma', 'Nota', 'Proficiência', 'Classificação']],
        body: rankingData,
        startY: y,
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 9 },
        bodyStyles: { halign: 'center', fontSize: 9 },
        styles: { cellPadding: 3, font: 'helvetica', fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'center', minCellWidth: 12 },
          1: { cellWidth: 'auto', halign: 'left', minCellWidth: 40 },
          2: { cellWidth: 'auto', halign: 'center', minCellWidth: 18 },
          3: { cellWidth: 'auto', halign: 'center', minCellWidth: 15 },
          4: { cellWidth: 'auto', halign: 'center', minCellWidth: 20 },
          5: { cellWidth: 'auto', halign: 'center', minCellWidth: 30 },
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [252, 252, 252] },
      });

      const totalPagesNum = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages?.() ?? 1;
      for (let p = 1; p <= totalPagesNum; p++) {
        doc.setPage(p);
        addFooter(p);
      }

      const fileName = `olimpiada-${(evaluationInfo.titulo || 'resultado').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: 'Exportação concluída',
        description: 'Os resultados foram exportados em PDF com sucesso',
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar os resultados em PDF',
        variant: 'destructive',
      });
    }
  }, [apiData, evaluationInfo, rankedStudents, maxProficiency, toast]);

  // Estatísticas completas para os cards
  const stats = useMemo(() => {
    if (!evaluationInfo || !apiData) {
      return {
        totalStudents: 0,
        completedStudents: 0,
        averageScore: 0,
        averageProficiency: 0,
        approvalRate: 0,
        advancedCount: 0,
        adequateCount: 0,
      };
    }

    const distribuicao = apiData.estatisticas_gerais?.distribuicao_classificacao_geral || apiData.estatisticas_gerais?.distribuicao_classificacao;
    const advancedCount = distribuicao?.avancado || 0;
    const adequateCount = distribuicao?.adequado || 0;
    const approvalRate = evaluationInfo.alunos_participantes > 0
      ? ((advancedCount + adequateCount) / evaluationInfo.alunos_participantes) * 100
      : 0;

    return {
      totalStudents: evaluationInfo.total_alunos,
      completedStudents: evaluationInfo.alunos_participantes,
      averageScore: evaluationInfo.media_nota,
      averageProficiency: evaluationInfo.media_proficiencia,
      approvalRate,
      advancedCount,
      adequateCount,
    };
  }, [evaluationInfo, apiData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="relative border-b pb-6 pt-6 px-6 overflow-hidden">
          {/* Background decorativo */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20 opacity-80"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 dark:bg-yellow-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-xl">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div>
                  <DialogTitle className="text-3xl font-bold text-foreground">
                    {evaluationInfo?.titulo || 'Resultados da Olimpíada'}
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    Análise completa de desempenho
                  </DialogDescription>
                </div>
              </div>
              
              {(evaluationInfo?.disciplinas || evaluationInfo?.serie || evaluationInfo?.escola || evaluationInfo?.municipio) && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {evaluationInfo?.disciplinas && evaluationInfo.disciplinas.length > 0 && evaluationInfo.disciplinas.map((disc, idx) => (
                    <Badge 
                      key={idx} 
                      className="text-xs font-medium bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-900 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700 shadow-sm"
                    >
                      {disc}
                    </Badge>
                  ))}
                  {evaluationInfo?.serie && (
                    <Badge variant="secondary" className="text-xs font-medium shadow-sm">
                      {evaluationInfo.serie}
                    </Badge>
                  )}
                  {evaluationInfo?.escola && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/50 dark:bg-gray-900/50 border text-xs">
                      <School className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{evaluationInfo.escola}</span>
                    </div>
                  )}
                  {evaluationInfo?.municipio && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/50 dark:bg-gray-900/50 border text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{evaluationInfo.municipio}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-yellow-200 dark:border-yellow-800"></div>
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-yellow-600 dark:border-t-yellow-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Carregando resultados...
            </h3>
            <p className="text-sm text-muted-foreground">
              Processando dados da olimpíada
            </p>
          </div>
        ) : error ? (
          <div className="px-6 py-16">
            <Card className="border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="py-12 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-red-400/20 rounded-full blur-xl"></div>
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30">
                    <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Não foi possível carregar os resultados
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  {error}
                </p>
                <Button 
                  onClick={loadResults} 
                  variant="outline"
                  className="border-2 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 px-6 py-6 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-900/20 dark:to-transparent">
            {/* Stats Cards - Linha Superior */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-yellow-950/30 border-2 border-yellow-200/50 dark:border-yellow-800/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 dark:bg-yellow-600/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-yellow-900 dark:text-yellow-100">
                      Participantes
                    </CardTitle>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-yellow-900 dark:text-yellow-100">
                      {stats.completedStudents}
                    </span>
                    <span className="text-xl text-yellow-700 dark:text-yellow-300 font-bold">
                      /{stats.totalStudents}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <Progress 
                      value={stats.totalStudents > 0 ? (stats.completedStudents / stats.totalStudents) * 100 : 0}
                      className="h-2.5 bg-yellow-200 dark:bg-yellow-900/40"
                    />
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      {stats.totalStudents > 0
                        ? Math.round((stats.completedStudents / stats.totalStudents) * 100)
                        : 0}% de participação
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-green-950/30 border-2 border-green-200/50 dark:border-green-800/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 dark:bg-green-600/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-green-900 dark:text-green-100">
                      Nota Média
                    </CardTitle>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-green-900 dark:text-green-100">
                      {stats.averageScore.toFixed(1)}
                    </span>
                    <span className="text-xl text-green-700 dark:text-green-300 font-bold">/10</span>
                  </div>
                  <div className="space-y-1.5">
                    <Progress 
                      value={(stats.averageScore / 10) * 100}
                      className="h-2.5 bg-green-200 dark:bg-green-900/40"
                    />
                    <p className="text-xs font-medium text-green-800 dark:text-green-200">
                      {((stats.averageScore / 10) * 100).toFixed(0)}% da nota máxima
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-blue-950/30 border-2 border-blue-200/50 dark:border-blue-800/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-100">
                      Proficiência
                    </CardTitle>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-blue-900 dark:text-blue-100">
                      {stats.averageProficiency.toFixed(0)}
                    </span>
                    <span className="text-xl text-blue-700 dark:text-blue-300 font-bold">/{maxProficiency}</span>
                  </div>
                  <div className="space-y-1.5">
                    <Progress 
                      value={maxProficiency > 0 ? (stats.averageProficiency / maxProficiency) * 100 : 0}
                      className="h-2.5 bg-blue-200 dark:bg-blue-900/40"
                    />
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                      {maxProficiency > 0 ? ((stats.averageProficiency / maxProficiency) * 100).toFixed(0) : 0}% do máximo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Linha de métricas adicionais - apenas se houver dados de distribuição */}
            {(apiData?.estatisticas_gerais?.distribuicao_classificacao_geral || apiData?.estatisticas_gerais?.distribuicao_classificacao) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border-teal-200/50 dark:border-teal-800/50 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-teal-400/10 dark:bg-teal-600/10 rounded-full blur-xl"></div>
                  <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                        <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-teal-700 dark:text-teal-300 uppercase tracking-wide">Taxa de Participação</p>
                        <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                          {stats.totalStudents > 0 
                            ? ((stats.completedStudents / stats.totalStudents) * 100).toFixed(1) 
                            : 0}%
                        </p>
                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                          {stats.completedStudents} alunos participaram
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200/50 dark:border-rose-800/50 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-400/10 dark:bg-rose-600/10 rounded-full blur-xl"></div>
                  <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                        <UserCheck className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-rose-700 dark:text-rose-300 uppercase tracking-wide">Taxa de Presença</p>
                        <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                          {stats.totalStudents > 0 
                            ? ((stats.completedStudents / stats.totalStudents) * 100).toFixed(1) 
                            : 0}%
                        </p>
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                          {evaluationInfo?.alunos_ausentes || 0} alunos ausentes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Separador visual e Card de Distribuição de Níveis */}
            {(apiData?.estatisticas_gerais?.distribuicao_classificacao_geral || apiData?.estatisticas_gerais?.distribuicao_classificacao) && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-yellow-200 dark:border-yellow-800"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Análise Detalhada
                    </span>
                  </div>
                </div>
              <Card className="border-2 border-dashed border-yellow-300 dark:border-yellow-700 bg-gradient-to-r from-yellow-50/50 via-white to-amber-50/50 dark:from-yellow-950/10 dark:via-background dark:to-amber-950/10 shadow-md">
                <CardHeader className="border-b bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
                  <CardTitle className="text-lg font-bold flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500">
                      <PieChart className="h-5 w-5 text-white" />
                    </div>
                    Distribuição de Níveis de Proficiência
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {(() => {
                    const distribuicao = apiData.estatisticas_gerais.distribuicao_classificacao_geral || apiData.estatisticas_gerais.distribuicao_classificacao;
                    if (!distribuicao) return null;
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Abaixo do Básico */}
                        <div className="relative overflow-hidden text-center p-5 rounded-xl bg-red-100 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-red-400/10 dark:bg-red-600/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10 space-y-2">
                            <div className="text-4xl font-black text-red-800 dark:text-red-400">
                              {distribuicao.abaixo_do_basico || 0}
                            </div>
                            <div className="space-y-1">
                              <Progress 
                                value={stats.completedStudents > 0 ? ((distribuicao.abaixo_do_basico || 0) / stats.completedStudents) * 100 : 0}
                                className="h-1.5 bg-red-200 dark:bg-red-900/40 [&>div]:bg-[#DC2626]"
                              />
                              <div className="text-xs font-semibold text-red-800 dark:text-red-400">
                                {stats.completedStudents > 0 ? (((distribuicao.abaixo_do_basico || 0) / stats.completedStudents) * 100).toFixed(0) : 0}%
                              </div>
                            </div>
                            <div className="text-xs font-medium text-red-800 dark:text-red-400 mt-2">
                              Abaixo do Básico
                            </div>
                          </div>
                        </div>

                        {/* Básico */}
                        <div className="relative overflow-hidden text-center p-5 rounded-xl bg-yellow-100 dark:bg-yellow-950/30 border-2 border-yellow-200 dark:border-yellow-800 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 dark:bg-yellow-600/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10 space-y-2">
                            <div className="text-4xl font-black text-yellow-800 dark:text-yellow-400">
                              {distribuicao.basico || 0}
                            </div>
                            <div className="space-y-1">
                              <Progress 
                                value={stats.completedStudents > 0 ? ((distribuicao.basico || 0) / stats.completedStudents) * 100 : 0}
                                className="h-1.5 bg-yellow-200 dark:bg-yellow-900/40 [&>div]:bg-[#F59E0B]"
                              />
                              <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-400">
                                {stats.completedStudents > 0 ? (((distribuicao.basico || 0) / stats.completedStudents) * 100).toFixed(0) : 0}%
                              </div>
                            </div>
                            <div className="text-xs font-medium text-yellow-800 dark:text-yellow-400 mt-2">
                              Básico
                            </div>
                          </div>
                        </div>

                        {/* Adequado */}
                        <div className="relative overflow-hidden text-center p-5 rounded-xl bg-green-100 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-green-400/10 dark:bg-green-600/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10 space-y-2">
                            <div className="text-4xl font-black text-green-800 dark:text-green-400">
                              {distribuicao.adequado || 0}
                            </div>
                            <div className="space-y-1">
                              <Progress 
                                value={stats.completedStudents > 0 ? ((distribuicao.adequado || 0) / stats.completedStudents) * 100 : 0}
                                className="h-1.5 bg-green-200 dark:bg-green-900/40 [&>div]:bg-[#22C55E]"
                              />
                              <div className="text-xs font-semibold text-green-800 dark:text-green-400">
                                {stats.completedStudents > 0 ? (((distribuicao.adequado || 0) / stats.completedStudents) * 100).toFixed(0) : 0}%
                              </div>
                            </div>
                            <div className="text-xs font-medium text-green-800 dark:text-green-400 mt-2">
                              Adequado
                            </div>
                          </div>
                        </div>

                        {/* Avançado */}
                        <div className="relative overflow-hidden text-center p-5 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/10 dark:bg-emerald-600/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10 space-y-2">
                            <div className="text-4xl font-black text-emerald-800 dark:text-emerald-400">
                              {distribuicao.avancado || 0}
                            </div>
                            <div className="space-y-1">
                              <Progress 
                                value={stats.completedStudents > 0 ? ((distribuicao.avancado || 0) / stats.completedStudents) * 100 : 0}
                                className="h-1.5 bg-emerald-200 dark:bg-emerald-900/40 [&>div]:bg-[#16A34A]"
                              />
                              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                                {stats.completedStudents > 0 ? (((distribuicao.avancado || 0) / stats.completedStudents) * 100).toFixed(0) : 0}%
                              </div>
                            </div>
                            <div className="text-xs font-medium text-emerald-800 dark:text-emerald-400 mt-2">
                              Avançado
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              </>
            )}

            {/* Sistema de Abas */}
            <Tabs defaultValue="ranking" className="w-full">
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/10 dark:to-amber-950/10 p-1 rounded-xl border-2 border-yellow-200/50 dark:border-yellow-800/50 shadow-inner">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-transparent gap-1">
                  <TabsTrigger 
                    value="ranking" 
                    className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-100 data-[state=active]:to-amber-100 dark:data-[state=active]:from-yellow-900/40 dark:data-[state=active]:to-amber-900/40 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-yellow-300 dark:data-[state=active]:border-yellow-700 rounded-lg transition-all duration-300"
                  >
                    <Trophy className="h-4 w-4" />
                    <span className="font-semibold text-sm">Ranking</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="charts" 
                    className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-100 data-[state=active]:to-amber-100 dark:data-[state=active]:from-yellow-900/40 dark:data-[state=active]:to-amber-900/40 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-yellow-300 dark:data-[state=active]:border-yellow-700 rounded-lg transition-all duration-300"
                  >
                    <PieChart className="h-4 w-4" />
                    <span className="font-semibold text-sm">Gráficos</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tables" 
                    className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-100 data-[state=active]:to-amber-100 dark:data-[state=active]:from-yellow-900/40 dark:data-[state=active]:to-amber-900/40 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-yellow-300 dark:data-[state=active]:border-yellow-700 rounded-lg transition-all duration-300"
                  >
                    <Table2 className="h-4 w-4" />
                    <span className="font-semibold text-sm">Tabelas</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="statistics" 
                    className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-100 data-[state=active]:to-amber-100 dark:data-[state=active]:from-yellow-900/40 dark:data-[state=active]:to-amber-900/40 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-yellow-300 dark:data-[state=active]:border-yellow-700 rounded-lg transition-all duration-300"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-semibold text-sm">Estatísticas</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="ranking" className="space-y-4 mt-6">
                {rankedStudents.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="py-16 text-center">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-600/20 rounded-full blur-xl"></div>
                        <div className="relative p-4 rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30">
                          <Medal className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {evaluationInfo && evaluationInfo.total_alunos > 0
                          ? 'Nenhum aluno concluiu a prova ainda'
                          : 'Nenhum resultado disponível'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {evaluationInfo && evaluationInfo.total_alunos > 0
                          ? `${evaluationInfo.total_alunos} aluno(s) aplicado(s), ${evaluationInfo.alunos_participantes ?? 0} concluíram. Você pode ver a lista na aba Estatísticas.`
                          : 'Os alunos ainda não completaram a olimpíada'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <StudentRanking 
                    students={rankedStudents}
                    maxStudents={100}
                  />
                )}
              </TabsContent>

              <TabsContent value="charts" className="space-y-4 mt-6">
                {apiData && apiData.estatisticas_gerais && apiData.resultados_por_disciplina && Array.isArray(apiData.resultados_por_disciplina) && apiData.resultados_por_disciplina.length > 0 ? (
                  <div className="rounded-xl border-2 border-yellow-200/50 dark:border-yellow-800/50 overflow-hidden shadow-lg">
                    <ResultsCharts
                      apiData={{
                        estatisticas_gerais: {
                          media_nota_geral: apiData.estatisticas_gerais.media_nota_geral || 0,
                          media_proficiencia_geral: apiData.estatisticas_gerais.media_proficiencia_geral || 0
                        },
                        resultados_por_disciplina: apiData.resultados_por_disciplina
                      }}
                      evaluationInfo={evaluationInfo ? {
                        id: evaluationInfo.id,
                        titulo: evaluationInfo.titulo,
                        disciplina: evaluationInfo.disciplinas && evaluationInfo.disciplinas.length > 0
                          ? evaluationInfo.disciplinas[0]
                          : evaluationInfo.disciplina || '',
                        serie: evaluationInfo.serie || '',
                        escola: evaluationInfo.escola || '',
                        municipio: evaluationInfo.municipio || '',
                        data_aplicacao: evaluationInfo.data_aplicacao || new Date().toISOString(),
                        total_alunos: evaluationInfo.total_alunos || 0,
                        alunos_participantes: evaluationInfo.alunos_participantes || 0,
                        alunos_ausentes: evaluationInfo.alunos_ausentes || 0,
                        media_nota: evaluationInfo.media_nota || 0,
                        media_proficiencia: evaluationInfo.media_proficiencia || 0
                      } : null}
                      inferStageGroup={inferStageGroup}
                      getMaxForDiscipline={getMaxForDiscipline}
                    />
                  </div>
                ) : (
                  <Card className="border-2 border-dashed">
                    <CardContent className="text-center py-16">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-xl"></div>
                        <div className="relative p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                          <PieChart className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Dados insuficientes
                      </h3>
                      <p className="text-sm text-muted-foreground">Não há dados suficientes para gerar os gráficos.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="tables" className="space-y-4 mt-6">
                {apiData?.tabela_detalhada && apiData.tabela_detalhada.disciplinas && Array.isArray(apiData.tabela_detalhada.disciplinas) && apiData.tabela_detalhada.disciplinas.length > 0 ? (
                  <div className="rounded-xl border-2 border-yellow-200/50 dark:border-yellow-800/50 overflow-hidden shadow-lg">
                    <DisciplineTables
                      tabelaDetalhada={{
                        disciplinas: apiData.tabela_detalhada.disciplinas,
                        geral: apiData.tabela_detalhada.geral ? {
                          alunos: apiData.tabela_detalhada.geral.alunos.map((aluno) => ({
                            id: aluno.id,
                            nome: aluno.nome,
                            escola: aluno.escola || '',
                            serie: aluno.serie || '',
                            turma: aluno.turma || '',
                            nota_geral: aluno.nota_geral || 0,
                            proficiencia_geral: aluno.proficiencia_geral || 0,
                            nivel_proficiencia_geral: aluno.nivel_proficiencia_geral || '',
                            total_acertos_geral: aluno.total_acertos_geral || 0,
                            total_questoes_geral: aluno.total_questoes_geral || 0,
                            total_respondidas_geral: aluno.total_respondidas_geral || 0,
                            total_em_branco_geral: aluno.total_em_branco_geral || 0,
                            percentual_acertos_geral: aluno.percentual_acertos_geral || 0,
                            status_geral: aluno.status_geral || ''
                          }))
                        } : undefined
                      }}
                      onViewStudentDetails={handleViewStudentDetails}
                      onOpenInNewTab={handleOpenInNewTab}
                    />
                  </div>
                ) : (
                  <Card className="border-2 border-dashed">
                    <CardContent className="text-center py-16">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-xl"></div>
                        <div className="relative p-4 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30">
                          <Table2 className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Dados não disponíveis
                      </h3>
                      <p className="text-sm text-muted-foreground">Não há dados detalhados disponíveis.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="statistics" className="space-y-4 mt-6">
                {apiData && apiData.tabela_detalhada && apiData.tabela_detalhada.geral && apiData.tabela_detalhada.geral.alunos && Array.isArray(apiData.tabela_detalhada.geral.alunos) && apiData.tabela_detalhada.geral.alunos.length > 0 ? (
                  <div className="rounded-xl border-2 border-yellow-200/50 dark:border-yellow-800/50 overflow-hidden shadow-lg">
                    <ClassStatistics apiData={{
                      ...apiData,
                      tabela_detalhada: apiData.tabela_detalhada ? {
                        ...apiData.tabela_detalhada,
                        geral: apiData.tabela_detalhada.geral ? {
                          alunos: apiData.tabela_detalhada.geral.alunos.map((aluno) => ({
                            id: aluno.id,
                            nome: aluno.nome,
                            turma: aluno.turma,
                            nivel_proficiencia_geral: aluno.nivel_proficiencia_geral,
                            nota_geral: aluno.nota_geral || 0,
                            proficiencia_geral: aluno.proficiencia_geral || 0,
                            total_acertos_geral: aluno.total_acertos_geral || 0,
                            total_erros_geral: aluno.total_erros_geral || 0,
                            total_respondidas_geral: aluno.total_respondidas_geral || 0,
                          }))
                        } : undefined
                      } : undefined
                    }} />
                  </div>
                ) : (
                  <Card className="border-2 border-dashed">
                    <CardContent className="text-center py-16">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-green-400/20 dark:bg-green-600/20 rounded-full blur-xl"></div>
                        <div className="relative p-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                          <BarChart3 className="h-12 w-12 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Estatísticas indisponíveis
                      </h3>
                      <p className="text-sm text-muted-foreground">Não há estatísticas disponíveis.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="relative border-t bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 dark:from-yellow-950/10 dark:via-amber-950/10 dark:to-yellow-950/10">
          <div className="relative flex items-center justify-between pt-5 pb-5 px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleExportResults}
                disabled={!apiData || !evaluationInfo}
                className="border-2 border-yellow-400 dark:border-yellow-600 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar em PDF
              </Button>
              {rankedStudents.length > 0 && (
                <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                  {rankedStudents.length} {rankedStudents.length === 1 ? 'aluno' : 'alunos'} no ranking
                </Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-2 hover:bg-muted/50 transition-colors duration-300"
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
