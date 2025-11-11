import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, RefreshCw, Filter, BookOpen, Calculator, LineChart, Trophy } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { RelatorioCompleto } from "@/types/evaluation-results";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { FilterComponentAnalise } from "@/components/filters";
import { getUserHierarchyContext, getRestrictionMessage, validateReportAccess, UserHierarchyContext } from "@/utils/userHierarchy";
import { cn } from "@/lib/utils";
import { getProficiencyLevel, getProficiencyLevelColor, getProficiencyLevelLabel, ProficiencyLevel } from "@/components/evaluations/results/utils/proficiency";

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const findDisciplinaByAliases = <T,>(
  collection: Record<string, T> | undefined,
  aliases: string[]
): T | undefined => {
  if (!collection) return undefined;
  return Object.entries(collection).find(([key]) => {
    const normalizedKey = normalizeText(key);
    return aliases.some(alias => normalizedKey.includes(alias));
  })?.[1];
};

interface ClassSummaryRow {
  serie: string;
  turma: string;
  mediaLP?: number;
  mediaMAT?: number;
  mediaGeral?: number;
  proficienciaMedia?: number;
  proficiencyLevel?: ProficiencyLevel;
  proficiencyLabel?: string;
  proficiencyColor?: string;
  matriculados?: number;
  avaliados?: number;
  comparecimento?: number;
}

interface DistributionChartData {
  title: string;
  total: number;
  segments: Array<{
    key: string;
    label: string;
    value: number;
    percentage: number;
    color: string;
  }>;
}

interface ProficiencyDistribution {
  title: string;
  color: string;
  columns: string[];
  rows: Array<{ label: string; data: number[] }>;
  bars: Array<{ label: string; value: number }>;
}

const formatAverage = (value?: number, decimals = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  return value.toFixed(decimals);
};

const formatProficiency = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  return Math.round(value).toString();
};

const formatPercentageValue = (value?: number, decimals = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(decimals)}%`;
};

export default function RelatorioEscolar() {
  const { autoLogin, user } = useAuth();
  const [apiData, setApiData] = useState<RelatorioCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedSchoolInfo, setSelectedSchoolInfo] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('all');

  // Estados para hierarquia do usuário
  const [userHierarchyContext, setUserHierarchyContext] = useState<UserHierarchyContext | null>(null);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(true);

  const isMunicipalView = selectedSchool === 'all';

  const sampleProficiencyDistributions = useMemo<ProficiencyDistribution[]>(() => {
    const scopeLabel = isMunicipalView ? "Total Município" : "Total Escola";

    return [
      {
        title: "Distribuição percentual dos estudantes por Nível de Proficiência - Língua Portuguesa",
        color: "#16A34A",
        columns: Array.from({ length: 9 }, (_, index) => `Nível ${index}`),
        rows: [
          { label: scopeLabel, data: [7.30, 8.56, 15.31, 19.38, 21.22, 15.06, 10.13, 2.85, 0.20] }
        ],
        bars: [
          { label: "Nível 0", value: 7.15 },
          { label: "Nível 1", value: 9.47 },
          { label: "Nível 2", value: 16.25 },
          { label: "Nível 3", value: 16.60 },
          { label: "Nível 4", value: 20.84 },
          { label: "Nível 5", value: 15.64 },
          { label: "Nível 6", value: 11.24 },
          { label: "Nível 7", value: 3.6 },
          { label: "Nível 8", value: 0.0 }
        ]
      },
      {
        title: "Distribuição percentual dos estudantes por Nível de Proficiência - Matemática",
        color: "#1D4ED8",
        columns: Array.from({ length: 10 }, (_, index) => `Nível ${index}`),
        rows: [
          { label: scopeLabel, data: [6.53, 9.38, 16.59, 19.99, 23.12, 13.80, 5.54, 3.31, 1.73, 0.35] }
        ],
        bars: [
          { label: "Nível 0", value: 5.7 },
          { label: "Nível 1", value: 6.4 },
          { label: "Nível 2", value: 12.87 },
          { label: "Nível 3", value: 21.95 },
          { label: "Nível 4", value: 27.18 },
          { label: "Nível 5", value: 17.39 },
          { label: "Nível 6", value: 5.6 },
          { label: "Nível 7", value: 2.91 },
          { label: "Nível 8", value: 0.0 },
          { label: "Nível 9", value: 0.0 }
        ]
      }
    ];
  }, [isMunicipalView]);

  // Estados dos dados dos filtros (movidos para FilterComponentAnalise)

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (user && !['admin', 'professor', 'diretor', 'coordenador', 'tecadm'].includes(user.role)) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/app");
      return;
    }
  }, [user, navigate, toast]);

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
        }

        if (context.school) {
          setSelectedSchool(context.school.id);
        }

        // Para professor, carregar escolas das suas turmas
        if (context.classes && context.classes.length > 0) {
          const schoolEntries = context.classes.map(c => ({ id: c.school_id, name: c.school_name }));
          const uniqueSchoolIds = Array.from(new Set(schoolEntries.map(s => s.id)));
          const uniqueSchools = uniqueSchoolIds
            .map(id => schoolEntries.find(s => s.id === id))
            .filter((school): school is { id: string; name: string } => Boolean(school))
            .map(s => ({ id: s.id, nome: s.name }));

          // Se só tem uma escola, pre-selecionar
          if (uniqueSchools.length === 1) {
            setSelectedSchool(uniqueSchools[0].id);
          }
        }

      } catch (error) {
        console.error('Erro ao carregar contexto hierárquico:', error);
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
  }, [user?.id, user?.role, toast]);

  // Inicialização e carregamento de filtros movido para FilterComponentAnalise
  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        try {
          await autoLogin();
        } catch (error) {
          console.error("Erro no login automático:", error);
          toast({
            title: "Erro de Autenticação",
            description: "Não foi possível fazer login automático. Verifique suas credenciais.",
            variant: "destructive",
          });
          return;
        }
      }
      setIsLoading(false);
    };

    initializeData();
  }, [autoLogin, toast]);

  // Verificar se todos os filtros obrigatórios estão selecionados
  // Estado e Município são obrigatórios, Escola pode ser "Todas", Avaliação é obrigatória
  const allRequiredFiltersSelected = selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all';

  const classSummaryRows = useMemo<ClassSummaryRow[]>(() => {
    if (!apiData) return [];

    if (isMunicipalView) {
      const rowsMap = new Map<string, ClassSummaryRow>();
      const order: string[] = [];

      const ensureRow = (rawName?: string) => {
        if (!rawName) return undefined;
        const name = rawName.toString().trim();
        if (!name) return undefined;

        if (!rowsMap.has(name)) {
          rowsMap.set(name, {
            turma: name,
            serie: '-'
          });
          order.push(name);
        }

        return rowsMap.get(name);
      };

      const processList = (list: any[] | undefined, assign: (row: ClassSummaryRow, item: any) => void) => {
        if (!list) return;
        list.forEach(item => {
          const row = ensureRow(item?.escola);
          if (row) assign(row, item);
        });
      };

      const notaPorDisciplina = apiData.nota_geral?.por_disciplina ?? {};
      const portuguesNotas = findDisciplinaByAliases(notaPorDisciplina, ['lingua portuguesa', 'portugues']);
      const matematicaNotas = findDisciplinaByAliases(notaPorDisciplina, ['matematica', 'matemática']);
      const geralNotas = findDisciplinaByAliases(notaPorDisciplina, ['geral']);

      processList(portuguesNotas?.por_escola, (row, item) => {
        row.mediaLP = item?.nota ?? undefined;
      });
      processList(matematicaNotas?.por_escola, (row, item) => {
        row.mediaMAT = item?.nota ?? undefined;
      });
      processList(geralNotas?.por_escola, (row, item) => {
        row.mediaGeral = item?.nota ?? undefined;
      });

      processList(apiData.total_alunos?.por_escola, (row, item) => {
        row.matriculados = item?.matriculados ?? undefined;
        row.avaliados = item?.avaliados ?? undefined;
        row.comparecimento = item?.percentual ?? undefined;
      });

      const profPorDisciplina = apiData.proficiencia?.por_disciplina ?? {};
      const geralProficiencia = findDisciplinaByAliases(profPorDisciplina, ['geral']);

      processList(geralProficiencia?.por_escola, (row, item) => {
        if (item?.proficiencia !== undefined && item?.proficiencia !== null) {
          row.proficienciaMedia = item.proficiencia;
        }
      });

      order.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

      return order.map(escolaNome => {
        const baseRow = rowsMap.get(escolaNome)!;
        if (baseRow.proficienciaMedia !== undefined) {
          const level = getProficiencyLevel(baseRow.proficienciaMedia, baseRow.serie, escolaNome);
          return {
            ...baseRow,
            proficiencyLevel: level,
            proficiencyLabel: getProficiencyLevelLabel(level),
            proficiencyColor: getProficiencyLevelColor(level)
          };
        }
        return baseRow;
      });
    }

    const rowsMap = new Map<string, ClassSummaryRow>();
    const order: string[] = [];

    const ensureRow = (rawTurma?: string) => {
      if (!rawTurma) return undefined;
      const turmaName = rawTurma.toString().trim();
      if (!turmaName || normalizeText(turmaName).includes('total')) return undefined;

      if (!rowsMap.has(turmaName)) {
        const serie = turmaName.split(' ')[0] || '-';
        rowsMap.set(turmaName, {
          turma: turmaName,
          serie
        });
        order.push(turmaName);
      }

      return rowsMap.get(turmaName);
    };

    const notaPorDisciplina = apiData.nota_geral?.por_disciplina ?? {};
    const portuguesNotas = findDisciplinaByAliases(notaPorDisciplina, ['lingua portuguesa', 'portugues']);
    const matematicaNotas = findDisciplinaByAliases(notaPorDisciplina, ['matematica', 'matemática']);
    const geralNotas = findDisciplinaByAliases(notaPorDisciplina, ['geral']);

    portuguesNotas?.por_turma?.forEach(turma => {
      const row = ensureRow(turma.turma);
      if (row) row.mediaLP = turma.nota;
    });

    matematicaNotas?.por_turma?.forEach(turma => {
      const row = ensureRow(turma.turma);
      if (row) row.mediaMAT = turma.nota;
    });

    geralNotas?.por_turma?.forEach(turma => {
      const row = ensureRow(turma.turma);
      if (row) row.mediaGeral = turma.nota;
    });

    apiData.total_alunos?.por_turma?.forEach(turma => {
      const row = ensureRow(turma.turma);
      if (row) {
        row.matriculados = turma.matriculados ?? undefined;
        row.avaliados = turma.avaliados ?? undefined;
        if (turma.avaliados !== undefined && turma.matriculados) {
          row.comparecimento = turma.matriculados > 0 ? (turma.avaliados / turma.matriculados) * 100 : 0;
        } else if (turma.percentual !== undefined && turma.percentual !== null) {
          row.comparecimento = turma.percentual;
        }
      }
    });

    const profPorDisciplina = apiData.proficiencia?.por_disciplina ?? {};
    const geralProficiencia = findDisciplinaByAliases(profPorDisciplina, ['geral']);
    const portuguesProficiencia = findDisciplinaByAliases(profPorDisciplina, ['lingua portuguesa', 'portugues']);
    const matematicaProficiencia = findDisciplinaByAliases(profPorDisciplina, ['matematica', 'matemática']);

    const proficiencyAccumulator = new Map<string, { sum: number; count: number }>();

    const addProficiency = (turmaName?: string, value?: number) => {
      if (value === undefined || value === null || Number.isNaN(value)) return;
      const row = ensureRow(turmaName);
      if (!row || !turmaName) return;

      const key = turmaName.trim();
      const current = proficiencyAccumulator.get(key) ?? { sum: 0, count: 0 };
      proficiencyAccumulator.set(key, {
        sum: current.sum + value,
        count: current.count + 1
      });
    };

    geralProficiencia?.por_turma?.forEach(turma => addProficiency(turma.turma, turma.proficiencia));

    if (proficiencyAccumulator.size === 0) {
      portuguesProficiencia?.por_turma?.forEach(turma => addProficiency(turma.turma, turma.proficiencia));
      matematicaProficiencia?.por_turma?.forEach(turma => addProficiency(turma.turma, turma.proficiencia));
    }

    proficiencyAccumulator.forEach((value, turmaName) => {
      const row = rowsMap.get(turmaName);
      if (row) {
        row.proficienciaMedia = value.sum / Math.max(value.count, 1);
      }
    });

    order.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return order.map(turmaName => {
      const baseRow = rowsMap.get(turmaName)!;
      if (baseRow.proficienciaMedia !== undefined) {
        const level = getProficiencyLevel(baseRow.proficienciaMedia, baseRow.serie, turmaName);
        return {
          ...baseRow,
          proficiencyLevel: level,
          proficiencyLabel: getProficiencyLevelLabel(level),
          proficiencyColor: getProficiencyLevelColor(level)
        };
      }

      return baseRow;
    });
  }, [apiData, isMunicipalView]);

  const distributionCharts = useMemo<DistributionChartData[]>(() => {
    if (!apiData) return [];

    const disciplinas = [
      { aliases: ['lingua portuguesa', 'portugues'], title: 'Língua Portuguesa' },
      { aliases: ['matematica', 'matemática'], title: 'Matemática' }
    ];

    return disciplinas
      .map(({ aliases, title }) => {
        const dadosDisciplina: any = findDisciplinaByAliases(apiData.niveis_aprendizagem, aliases);
        if (!dadosDisciplina || !dadosDisciplina.geral) return null;

        const buildAggregatedTotals = () => {
          const listaBruta = isMunicipalView
            ? (dadosDisciplina as any).por_escola
            : (dadosDisciplina as any).por_turma;

          if (!Array.isArray(listaBruta) || listaBruta.length === 0) {
            return null;
          }

          return listaBruta.reduce(
            (acc, item) => ({
              abaixo_do_basico: acc.abaixo_do_basico + (item?.abaixo_do_basico ?? 0),
              basico: acc.basico + (item?.basico ?? 0),
              adequado: acc.adequado + (item?.adequado ?? 0),
              avancado: acc.avancado + (item?.avancado ?? 0),
              total: acc.total + (item?.total ?? 0)
            }),
            { abaixo_do_basico: 0, basico: 0, adequado: 0, avancado: 0, total: 0 }
          );
        };

        const geralDados =
          (dadosDisciplina as any).total_geral ??
          dadosDisciplina.geral ??
          buildAggregatedTotals();

        if (!geralDados) return null;

        const totalFromSum =
          Number(geralDados.abaixo_do_basico ?? 0) +
          Number(geralDados.basico ?? 0) +
          Number(geralDados.adequado ?? 0) +
          Number(geralDados.avancado ?? 0);

        const totalValue = Number(geralDados.total ?? 0);
        const total = totalValue > 0 ? totalValue : totalFromSum;
        if (total === null || total === undefined) return null;

        const segments = [
          { key: 'abaixo', label: 'Abaixo do Básico', value: Number(geralDados.abaixo_do_basico ?? 0), color: '#DC2626' },
          { key: 'basico', label: 'Básico', value: Number(geralDados.basico ?? 0), color: '#F59E0B' },
          { key: 'adequado', label: 'Adequado', value: Number(geralDados.adequado ?? 0), color: '#22C55E' },
          { key: 'avancado', label: 'Avançado', value: Number(geralDados.avancado ?? 0), color: '#16A34A' }
        ].map(segment => ({
          ...segment,
          percentage: total > 0 ? Number(((segment.value / total) * 100).toFixed(1)) : 0
        }));

        return {
          title: title.toUpperCase(),
          total,
          segments
        } as DistributionChartData;
      })
      .filter((item): item is DistributionChartData => Boolean(item));
  }, [apiData]);

  const summaryStats = useMemo(() => {
    if (!apiData) return null;

    const notaPorDisciplina = apiData.nota_geral?.por_disciplina ?? {};
    const portuguesNotas = findDisciplinaByAliases(notaPorDisciplina, ['lingua portuguesa', 'portugues']);
    const matematicaNotas = findDisciplinaByAliases(notaPorDisciplina, ['matematica', 'matemática']);
    const geralNotas = findDisciplinaByAliases(notaPorDisciplina, ['geral']);

    const profPorDisciplina = apiData.proficiencia?.por_disciplina ?? {};
    const geralProficiencia = findDisciplinaByAliases(profPorDisciplina, ['geral']);

    const mediaLP = portuguesNotas?.media_geral ?? null;
    const mediaMAT = matematicaNotas?.media_geral ?? null;
    const mediaGeral = geralNotas?.media_geral ?? null;
    const proficienciaMedia = geralProficiencia?.media_geral ?? null;

    if (
      mediaLP === null &&
      mediaMAT === null &&
      mediaGeral === null &&
      proficienciaMedia === null
    ) {
      return null;
    }

    const serieRef = classSummaryRows[0]?.serie;

    const proficiencyLevel =
      proficienciaMedia !== null && proficienciaMedia !== undefined
        ? getProficiencyLevel(proficienciaMedia, serieRef, undefined)
        : null;

    const totalMatriculados = apiData.total_alunos?.total_geral?.matriculados ?? null;
    const totalAvaliados = apiData.total_alunos?.total_geral?.avaliados ?? null;
    const comparecimentoGeral = totalMatriculados && totalMatriculados > 0
      ? (totalAvaliados ?? 0) / totalMatriculados * 100
      : (apiData.total_alunos?.total_geral?.percentual ?? null);

    return {
      mediaLP,
      mediaMAT,
      mediaGeral,
      proficienciaMedia,
      proficiencyLevel,
      proficiencyLabel: proficiencyLevel ? getProficiencyLevelLabel(proficiencyLevel) : null,
      proficiencyColor: proficiencyLevel ? getProficiencyLevelColor(proficiencyLevel) : null,
      totalMatriculados,
      totalAvaliados,
      comparecimentoGeral
    };
  }, [apiData, classSummaryRows]);



  // Função para baixar relatório PDF
  const downloadReport = async () => {
    if (!selectedEvaluation || !apiData) return;
    
    // Validar acesso baseado na hierarquia
    if (userHierarchyContext && user?.role) {
      const validation = validateReportAccess(user.role, {
        state: selectedState,
        municipality: selectedMunicipality,
        school: selectedSchool
      }, userHierarchyContext);

      if (!validation.isValid) {
        toast({
          title: "Acesso Negado",
          description: validation.reason || "Você não tem permissão para gerar este relatório.",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (!apiData || !summaryStats) {
      toast({
        title: "Dados insuficientes",
        description: "Carregue os dados do relatório antes de gerar o PDF.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingReport(true);

      const chartsPayload = distributionCharts.map(chart => {
        return {
          title: chart.title,
          total: chart.total || 0,
          segments: chart.segments.map(segment => ({
            label: segment.label,
            value: segment.value,
            percentage: segment.percentage,
            color: segment.color
          }))
        };
      });

      const classRowsPayload = classSummaryRows.map(row => ({
        turma: row.turma,
        media_lp: row.mediaLP ?? null,
        media_mat: row.mediaMAT ?? null,
        media_geral: row.mediaGeral ?? null,
        comparecimento: row.comparecimento ?? null,
        proficiencia_media: row.proficienciaMedia ?? null,
        proficiency_label: row.proficiencyLabel ?? null,
        proficiency_level: row.proficiencyLevel ?? null
      }));

      const payload = {
        evaluation: {
          id: apiData.avaliacao?.id ?? null,
          title: apiData.avaliacao?.titulo ?? null,
          description: apiData.avaliacao?.descricao ?? null
        },
        summary: {
          media_lp: summaryStats.mediaLP,
          media_mat: summaryStats.mediaMAT,
          media_geral: summaryStats.mediaGeral,
          proficiencia_media: summaryStats.proficienciaMedia,
          proficiency_label: summaryStats.proficiencyLabel,
          proficiency_level: summaryStats.proficiencyLevel,
          total_matriculados: summaryStats.totalMatriculados,
          total_avaliados: summaryStats.totalAvaliados,
          comparecimento: summaryStats.comparecimentoGeral
        },
        totals: {
          matriculados: apiData.total_alunos?.total_geral?.matriculados ?? null,
          avaliados: apiData.total_alunos?.total_geral?.avaliados ?? null,
          percentual: apiData.total_alunos?.total_geral?.percentual ?? null
        },
        classes: classRowsPayload,
        charts: chartsPayload,
        metadata: {
          scope: selectedSchool === 'all' ? 'municipio' : 'escola',
          state_id: selectedState,
          municipality_id: selectedMunicipality,
          school_id: selectedSchool,
          school_name: selectedSchoolInfo?.name ?? null,
          evaluation_id: selectedEvaluation
        }
      };

      const response = await api.post('/reports/relatorios/relatorio-escolar-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;

      const evaluationName = apiData?.avaliacao?.titulo || 'relatorio_escolar';
      const sanitizedName = evaluationName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
      const fileName = `relatorio_escolar_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Relatório Baixado com Sucesso",
        description: "O relatório escolar foi salvo no seu dispositivo.",
      });

    } catch (error) {
      console.error("Erro ao baixar relatório:", error);
      toast({
        title: "Erro ao Baixar Relatório",
        description: "Não foi possível baixar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Carregar dados quando todos os filtros estiverem selecionados
  useEffect(() => {
    const loadData = async () => {
      if (allRequiredFiltersSelected) {
        try {
          setIsLoadingData(true);
          // Buscar relatório completo da avaliação selecionada
          const relatorio = await EvaluationResultsApiService.getRelatorioCompleto(selectedEvaluation);
          console.log("📊 Estrutura completa da resposta da API:", relatorio);
          console.log("📊 Estrutura de acertos_por_habilidade:", relatorio.acertos_por_habilidade);
          setApiData(relatorio);
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          toast({
            title: "Erro ao carregar dados",
            description: "Não foi possível carregar os dados do relatório. Tente novamente.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    loadData();
  }, [allRequiredFiltersSelected, selectedState, selectedMunicipality, selectedSchool, selectedEvaluation, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório Escolar</h1>
          <p className="text-gray-600 mt-2">
            Relatórios escolares detalhados do seu município
          </p>
          {user?.role && (
            <p className="text-sm text-blue-600 mt-1">
              {getRestrictionMessage(user.role)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {user?.role === 'admin' ? 'Administrador' : 
             user?.role === 'professor' ? 'Professor' :
             user?.role === 'diretor' ? 'Diretor' :
             user?.role === 'coordenador' ? 'Coordenador' : 'Técnico Administrativo'}
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <FilterComponentAnalise
        selectedState={selectedState}
        selectedMunicipality={selectedMunicipality}
        selectedSchool={selectedSchool}
        selectedEvaluation={selectedEvaluation}
        onStateChange={setSelectedState}
        onMunicipalityChange={setSelectedMunicipality}
        onSchoolChange={setSelectedSchool}
        onSchoolSelectDetail={setSelectedSchoolInfo}
        onEvaluationChange={setSelectedEvaluation}
        isLoadingFilters={isLoadingFilters}
        onLoadingChange={setIsLoadingFilters}
        // Props para hierarquia
        userRole={user?.role}
        canSelectState={userHierarchyContext?.restrictions.canSelectState}
        canSelectMunicipality={userHierarchyContext?.restrictions.canSelectMunicipality}
        canSelectSchool={userHierarchyContext?.restrictions.canSelectSchool}
      />

      {/* Mensagem quando não há filtros suficientes */}
      {!allRequiredFiltersSelected && !isLoading && (
      <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione todos os filtros para continuar
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Para visualizar o relatório escolar, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong> e <strong>Avaliação</strong>. A <strong>Escola</strong> pode ser "Todas" para ver todas as escolas do município.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading dos dados */}
      {allRequiredFiltersSelected && isLoadingData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Carregando dados do relatório...</p>
          </CardContent>
        </Card>
      )}

      {/* Dados do Relatório */}
      {allRequiredFiltersSelected && !isLoadingData && apiData && (
        <div className="space-y-6">
          {summaryStats && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm border border-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600">
                    <span className="uppercase tracking-wide text-gray-500">Média Geral LP</span>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {formatAverage(summaryStats.mediaLP)}
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex rounded-md bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                      LP
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600">
                    <span className="uppercase tracking-wide text-gray-500">Média Geral MAT</span>
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {formatAverage(summaryStats.mediaMAT)}
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex rounded-md bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                      MAT
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600">
                    <span className="uppercase tracking-wide text-gray-500">Média Geral</span>
                    <LineChart className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {formatAverage(summaryStats.mediaGeral)}
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex rounded-md bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                      Todas
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-slate-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600">
                    <span className="uppercase tracking-wide text-gray-500">Proficiência Média</span>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {formatProficiency(summaryStats.proficienciaMedia)}
                  </div>
                  <div className="mt-4">
                    {summaryStats.proficiencyLabel ? (
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                          summaryStats.proficiencyColor ?? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                        )}
                      >
                        {summaryStats.proficiencyLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sem classificação</span>
                    )}
          </div>
        </CardContent>
      </Card>
            </div>
          )}

          <Card className="overflow-hidden shadow-md">
            <CardHeader className="flex flex-col gap-3 border-b border-slate-100 bg-white md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-purple-600" />
                {isMunicipalView ? 'Desempenho por Escola' : 'Desempenho por Turma'}
              </CardTitle>
              <Button
                onClick={downloadReport}
                disabled={isGeneratingReport}
                className="flex items-center gap-2"
                variant="outline"
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Baixando Relatório...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Baixar Relatório
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {classSummaryRows.length > 0 ? (
                <div className="overflow-hidden">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th className="bg-[#6C2BD9] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                          {isMunicipalView ? 'Escola' : 'Turma'}
                        </th>
                        <th className="bg-[#6C2BD9] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Média LP</th>
                        <th className="bg-[#6C2BD9] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Média MAT</th>
                        <th className="bg-[#6C2BD9] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Média Geral</th>
                        <th className="bg-[#6C2BD9] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Comparecimento</th>
                        <th className="bg-[#6C2BD9] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Proficiência Média</th>
                        <th className="bg-[#6C2BD9] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Nível Proficiência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSummaryRows.map((row, index) => (
                        <tr
                          key={row.turma}
                          className={cn(
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                          )}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800 border-t border-slate-100">
                            {row.turma}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-100">
                            {formatAverage(row.mediaLP)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-100">
                            {formatAverage(row.mediaMAT)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-100">
                            {formatAverage(row.mediaGeral)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-100">
                            {formatPercentageValue(row.comparecimento)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-100">
                            {formatProficiency(row.proficienciaMedia)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm border-t border-slate-100">
                            {row.proficiencyLabel ? (
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                                  row.proficiencyColor ?? 'bg-gray-100 text-gray-600 border-gray-300'
                                )}
                              >
                                {row.proficiencyLabel}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {summaryStats && (
                        <tr className="bg-gray-100">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-t border-slate-200">
                            {isMunicipalView ? 'Total Município' : 'Total Escola'}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-200">
                            {formatAverage(summaryStats.mediaLP)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-200">
                            {formatAverage(summaryStats.mediaMAT)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-200">
                            {formatAverage(summaryStats.mediaGeral)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-200">
                            {formatPercentageValue(summaryStats.comparecimentoGeral)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-t border-slate-200">
                            {formatProficiency(summaryStats.proficienciaMedia)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm border-t border-slate-200">
                            {summaryStats.proficiencyLabel ? (
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                                  summaryStats.proficiencyColor ?? 'bg-gray-100 text-gray-600 border-gray-300'
                                )}
                              >
                                {summaryStats.proficiencyLabel}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">--</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-gray-500">
                  Nenhum dado disponível para os filtros selecionados.
                </div>
              )}
            </CardContent>
          </Card>

          {distributionCharts.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {distributionCharts.map(chart => {
                const maxPercentage = Math.max(...chart.segments.map(segment => segment.percentage), 0);

                return (
                  <Card key={chart.title} className="shadow-md">
                    <CardContent className="space-y-6 pt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold uppercase tracking-wide text-gray-900">{chart.title}</h3>
                        <span className="text-sm font-semibold text-gray-500">Total: {chart.total}</span>
                      </div>
                      <div className="space-y-4">
                        {chart.segments.map(segment => {
                          const width = `${segment.percentage}%`;
                          const showValueInside = segment.percentage >= Math.max(maxPercentage * 0.3, 18);

                          return (
                            <div key={segment.key} className="flex items-center gap-3">
                              <div className="flex w-32 items-center gap-2 text-sm font-medium text-gray-700">
                                <span
                                  className="inline-flex h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: segment.color }}
                                ></span>
                                <span className="truncate">{segment.label}</span>
                              </div>
                              <div className="relative flex flex-1 items-center rounded-full bg-slate-200">
                                <div
                                  className="h-3 rounded-full transition-all"
                                  style={{
                                    width,
                                    backgroundColor: segment.color
                                  }}
                                ></div>
                                {segment.value > 0 && showValueInside && (
                                  <span className="absolute right-2 text-xs font-semibold text-black">
                                    {segment.value}
                                  </span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'w-10 text-right text-xs font-semibold text-gray-900 transition-opacity',
                                  showValueInside && 'opacity-0'
                                )}
                              >
                                {segment.value}
                              </span>
                              <span className="w-12 text-right text-xs font-semibold text-gray-800">
                                {segment.percentage.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {sampleProficiencyDistributions.length > 0 && (
            <div className="mt-10 space-y-6">
              {sampleProficiencyDistributions.map(distribution => {
                const maxValue = Math.max(...distribution.bars.map(bar => bar.value), 1);

                return (
                  <Card key={distribution.title} className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold uppercase tracking-wide text-gray-900">
                        {distribution.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              <th
                                className="px-3 py-2 text-left font-semibold text-white"
                                style={{ backgroundColor: distribution.color }}
                              ></th>
                              {distribution.columns.map(column => (
                                <th
                                  key={column}
                                  className="px-3 py-2 text-center font-semibold text-white"
                                  style={{ backgroundColor: distribution.color }}
                                >
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {distribution.rows.map(row => (
                              <tr key={row.label} className="odd:bg-slate-50">
                                <td className="px-3 py-2 text-left font-semibold text-slate-700">{row.label}</td>
                                {row.data.map((value, index) => (
                                  <td key={index} className="px-3 py-2 text-center text-slate-600">
                                    {value.toFixed(2)}%
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-wrap items-end justify-center gap-6">
                        {distribution.bars.map(bar => {
                          const heightPercentage = (bar.value / maxValue) * 100;
                          return (
                            <div key={bar.label} className="flex min-w-[56px] flex-col items-center gap-2">
                              <span className="-rotate-45 text-xs font-semibold text-slate-600">
                                {bar.value.toFixed(2)}
                              </span>
                              <div className="flex h-40 w-10 items-end justify-center rounded-t-lg bg-slate-100">
                                <div
                                  className="w-full rounded-t-lg"
                                  style={{
                                    height: `${heightPercentage}%`,
                                    backgroundColor: distribution.color
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold text-slate-700">{bar.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

