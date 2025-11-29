import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, RefreshCw, Filter, BookOpen, Calculator, LineChart, Trophy } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationResultsApiService, NovaRespostaAPI } from "@/services/evaluationResultsApi";
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
  return value.toFixed(1);
};

const formatPercentageValue = (value?: number, decimals = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(decimals)}%`;
};

// Intervalos de níveis de proficiência por curso e disciplina
const niveisEscolares = {
  // Anos Finais e Ensino Médio (Exceto matemática)
  ANOS_FINAIS_GERAL: [
    { level: 0, min: 0, max: 199 },
    { level: 1, min: 200, max: 224 },
    { level: 2, min: 225, max: 249 },
    { level: 3, min: 250, max: 274 },
    { level: 4, min: 275, max: 299 },
    { level: 5, min: 300, max: 324 },
    { level: 6, min: 325, max: 349 },
    { level: 7, min: 350, max: 374 },
    { level: 8, min: 375, max: null },
  ],

  // Anos Finais e Ensino Médio (Matemática)
  ANOS_FINAIS_MAT: [
    { level: 0, min: 0, max: 199 },
    { level: 1, min: 200, max: 224 },
    { level: 2, min: 225, max: 249 },
    { level: 3, min: 250, max: 274 },
    { level: 4, min: 275, max: 299 },
    { level: 5, min: 300, max: 324 },
    { level: 6, min: 325, max: 349 },
    { level: 7, min: 350, max: 374 },
    { level: 8, min: 375, max: 399 },
    { level: 9, min: 400, max: null },
  ],

  // Anos Iniciais/Educação Infantil/EJA (Exceto Matemática)
  ANOS_INICIAIS_GERAL: [
    { level: 0, min: 0, max: 124 },
    { level: 1, min: 125, max: 149 },
    { level: 2, min: 150, max: 174 },
    { level: 3, min: 175, max: 199 },
    { level: 4, min: 200, max: 224 },
    { level: 5, min: 225, max: 249 },
    { level: 6, min: 250, max: 274 },
    { level: 7, min: 275, max: 299 },
    { level: 8, min: 300, max: 324 },
    { level: 9, min: 325, max: null },
  ],

  // Anos Iniciais/EDUCAÇÃO INFANTIL/EJA (Apenas Matemática)
  ANOS_INICIAIS_MAT: [
    { level: 0, min: 0, max: 124 },
    { level: 1, min: 125, max: 149 },
    { level: 2, min: 150, max: 174 },
    { level: 3, min: 175, max: 199 },
    { level: 4, min: 200, max: 224 },
    { level: 5, min: 225, max: 249 },
    { level: 6, min: 250, max: 274 },
    { level: 7, min: 275, max: 299 },
    { level: 8, min: 300, max: 324 },
    { level: 9, min: 325, max: 349 },
    { level: 10, min: 350, max: null },
  ]
};

// Função para classificar proficiência em nível
const classificarNivel = (proficiencia: number, niveis: Array<{level: number, min: number, max: number | null}>): number => {
  for (const nivel of niveis) {
    if (proficiencia >= nivel.min && (nivel.max === null || proficiencia <= nivel.max)) {
      return nivel.level;
    }
  }
  return 0; // Fallback
};

// Função para determinar qual conjunto de intervalos usar
const obterIntervalosNiveis = (curso: string | undefined, disciplina: string): Array<{level: number, min: number, max: number | null}> => {
  const disciplinaNormalizada = normalizeText(disciplina);
  const isMatematica = disciplinaNormalizada.includes('matematica') || disciplinaNormalizada.includes('matemática');
  const isAnosFinais = curso?.toLowerCase().includes('anos finais') || curso?.toLowerCase().includes('ensino médio') || curso?.toLowerCase().includes('medio');
  
  if (isAnosFinais) {
    return isMatematica ? niveisEscolares.ANOS_FINAIS_MAT : niveisEscolares.ANOS_FINAIS_GERAL;
  } else {
    return isMatematica ? niveisEscolares.ANOS_INICIAIS_MAT : niveisEscolares.ANOS_INICIAIS_GERAL;
  }
};

// Função para obter cor da disciplina
const obterCorDisciplina = (nomeDisciplina: string, index: number): string => {
  const nomeNormalizado = normalizeText(nomeDisciplina);
  
  // Cores específicas para disciplinas conhecidas
  if (nomeNormalizado.includes('portugues') || nomeNormalizado.includes('português') || nomeNormalizado.includes('lingua portuguesa')) {
    return "#16A34A"; // Verde
  }
  if (nomeNormalizado.includes('matematica') || nomeNormalizado.includes('matemática')) {
    return "#1D4ED8"; // Azul
  }
  
  // Paleta de cores para outras disciplinas
  const coresPaleta = [
    "#DC2626", // Vermelho
    "#EA580C", // Laranja
    "#CA8A04", // Amarelo
    "#059669", // Verde esmeralda
    "#0891B2", // Ciano
    "#7C3AED", // Roxo
    "#DB2777", // Rosa
    "#BE185D", // Rosa escuro
  ];
  
  return coresPaleta[index % coresPaleta.length];
};

export default function RelatorioEscolar() {
  const { autoLogin, user } = useAuth();
  const [apiData, setApiData] = useState<NovaRespostaAPI | null>(null);
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

  const handleStateChange = useCallback((stateId: string) => {
    if (stateId === selectedState) return;

    setSelectedState(stateId);
    setSelectedMunicipality('all');
    setSelectedSchool('all');
    setSelectedEvaluation('all');
    setApiData(null);
  }, [selectedState]);

  const handleMunicipalityChange = useCallback((municipalityId: string) => {
    if (municipalityId === selectedMunicipality) return;

    setSelectedMunicipality(municipalityId);
    setSelectedSchool('all');
    setSelectedEvaluation('all');
    setApiData(null);
  }, [selectedMunicipality]);

  const fallbackSchools = useMemo(() => {
    const uniqueSchools = new Map<string, { id: string; name: string; municipalityId?: string }>();

    if (userHierarchyContext?.school?.id) {
      uniqueSchools.set(userHierarchyContext.school.id, {
        id: userHierarchyContext.school.id,
        name: userHierarchyContext.school.name,
        municipalityId: userHierarchyContext.school.municipality_id,
      });
    }

    if (Array.isArray(userHierarchyContext?.classes)) {
      userHierarchyContext!.classes!.forEach((classe) => {
        if (classe.school_id) {
          uniqueSchools.set(classe.school_id, {
            id: classe.school_id,
            name: classe.school_name,
            municipalityId: userHierarchyContext?.municipality?.id,
          });
        }
      });
    }

    return Array.from(uniqueSchools.values());
  }, [userHierarchyContext]);

  // Calcular distribuição de níveis de proficiência dinamicamente
  const proficiencyDistributions = useMemo<ProficiencyDistribution[]>(() => {
    if (!apiData) {
      console.log("📊 proficiencyDistributions: apiData não disponível");
      return [];
    }

    // Se tabela_detalhada não estiver disponível, retornar array vazio (gráficos não aparecerão)
    if (!apiData.tabela_detalhada) {
      console.log("📊 proficiencyDistributions: tabela_detalhada não disponível ainda, aguardando carregamento...");
      return [];
    }

    // Processar todas as disciplinas que têm dados
    const scopeLabel = isMunicipalView ? "Total Município" : "Total Escola";
    
    // ✅ MELHORADO: Inferência do curso usando múltiplas fontes
    const inferirCurso = (): string => {
      // Prioridade 1: Inferir do nome em estatisticas_gerais (pode conter informações do curso)
      const nome = apiData.estatisticas_gerais?.nome;
      if (nome) {
        const nomeLower = nome.toLowerCase();
        if (nomeLower.includes('anos finais') || nomeLower.includes('ensino médio') || 
            nomeLower.includes('medio') || nomeLower.includes('médio')) {
          return "Anos Finais";
        }
        if (nomeLower.includes('anos iniciais') || nomeLower.includes('educação infantil') ||
            nomeLower.includes('educacao infantil') || nomeLower.includes('eja') ||
            nomeLower.includes('especial')) {
          return "Anos Iniciais";
        }
      }

      // Prioridade 2: Inferir da série em estatisticas_gerais
      const serie = apiData.estatisticas_gerais?.serie;
      if (serie) {
        const serieLower = serie.toLowerCase();
        if (serieLower.includes('6') || serieLower.includes('7') || 
            serieLower.includes('8') || serieLower.includes('9') ||
            serieLower.includes('em') || serieLower.includes('médio') ||
            serieLower.includes('medio') || serieLower.includes('1º ano') ||
            serieLower.includes('2º ano') || serieLower.includes('3º ano')) {
          return "Anos Finais";
        }
      }

      // Prioridade 3: Inferir do tipo em estatisticas_gerais
      const tipo = apiData.estatisticas_gerais?.tipo;
      if (tipo) {
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('anos finais') || tipoLower.includes('ensino médio')) {
          return "Anos Finais";
        }
      }

      // Prioridade 4: Fallback - inferir da primeira série dos alunos na tabela detalhada
      if (apiData.tabela_detalhada.disciplinas && apiData.tabela_detalhada.disciplinas.length > 0) {
        // Coletar todas as séries disponíveis dos alunos
        const seriesEncontradas = new Set<string>();
        apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
          if (disciplina.alunos && disciplina.alunos.length > 0) {
            disciplina.alunos.forEach(aluno => {
              if (aluno.serie) {
                seriesEncontradas.add(aluno.serie.toLowerCase());
              }
            });
          }
        });

        // Verificar se alguma série indica Anos Finais
        for (const serie of seriesEncontradas) {
          if (serie.includes('6') || serie.includes('7') || 
              serie.includes('8') || serie.includes('9') ||
              serie.includes('em') || serie.includes('médio') ||
              serie.includes('medio') || serie.includes('1º ano') ||
              serie.includes('2º ano') || serie.includes('3º ano')) {
            return "Anos Finais";
          }
        }
      }

      // Padrão: Anos Iniciais
      return "Anos Iniciais";
    };

    const curso = inferirCurso();

    // Processar TODAS as disciplinas que têm dados em apiData.tabela_detalhada
    if (!apiData.tabela_detalhada.disciplinas || apiData.tabela_detalhada.disciplinas.length === 0) {
      console.log("📊 proficiencyDistributions: Nenhuma disciplina encontrada na tabela_detalhada");
      return [];
    }

    console.log("📊 proficiencyDistributions: Processando disciplinas", {
      totalDisciplinas: apiData.tabela_detalhada.disciplinas.length,
      disciplinas: apiData.tabela_detalhada.disciplinas.map(d => ({
        nome: d.nome,
        totalAlunos: d.alunos?.length || 0,
        temQuestoes: d.questoes?.length || 0
      }))
    });

    return apiData.tabela_detalhada.disciplinas
      .filter(disciplinaData => {
        // ✅ VALIDADO: Filtrar disciplinas que têm alunos
        if (!disciplinaData.alunos || disciplinaData.alunos.length === 0) {
          console.warn(`⚠️ Disciplina "${disciplinaData.nome}" não tem alunos ou array está vazio`);
          return false;
        }
        return true;
      })
      .map((disciplinaData, index) => {
        const nomeDisciplina = disciplinaData.nome;
        
        if (!nomeDisciplina || nomeDisciplina.trim() === '') {
          return null;
        }

        // ✅ VALIDADO: Obter intervalos corretos usando o nome exato da disciplina
        const intervalos = obterIntervalosNiveis(curso, nomeDisciplina);
        if (!intervalos || intervalos.length === 0) {
          console.warn(`⚠️ Intervalos não encontrados para curso: ${curso}, disciplina: ${nomeDisciplina}`);
          return null;
        }

        const maxLevel = Math.max(...intervalos.map(i => i.level));

        // Inicializar contagem por nível
        const contagemPorNivel: Record<number, number> = {};
        for (let i = 0; i <= maxLevel; i++) {
          contagemPorNivel[i] = 0;
        }

        // ✅ MELHORADO: Filtrar apenas alunos que participaram da avaliação
        const alunosParticipantes = disciplinaData.alunos.filter((aluno) => {
          // Verificar se o aluno tem proficiência válida
          if (aluno.proficiencia === undefined || aluno.proficiencia === null || Number.isNaN(aluno.proficiencia)) {
            return false;
          }

          // ✅ NOVO: Verificar se o aluno respondeu pelo menos uma questão
          // (indicando participação na avaliação)
          if (aluno.respostas_por_questao && Array.isArray(aluno.respostas_por_questao)) {
            const respondeuAlgumaQuestao = aluno.respostas_por_questao.some(resposta => resposta.respondeu === true);
            if (!respondeuAlgumaQuestao) {
              return false; // Aluno não participou
            }
          }

          return true;
        });

        // Classificar cada aluno participante por nível usando a proficiência
        alunosParticipantes.forEach((aluno) => {
          const proficiencia = Number(aluno.proficiencia);
          if (!Number.isNaN(proficiencia) && proficiencia >= 0) {
            const nivel = classificarNivel(proficiencia, intervalos);
            if (nivel >= 0 && nivel <= maxLevel) {
              contagemPorNivel[nivel] = (contagemPorNivel[nivel] || 0) + 1;
            }
          }
        });

        const totalAlunos = alunosParticipantes.length;

        if (totalAlunos === 0) {
          return null;
        }

        // ✅ VALIDADO: Calcular percentuais corretamente
        const percentuaisPorNivel: number[] = [];
        const bars: Array<{ label: string; value: number }> = [];
        let somaPercentuais = 0;

        for (let i = 0; i <= maxLevel; i++) {
          const quantidade = contagemPorNivel[i] || 0;
          const percentual = totalAlunos > 0 ? (quantidade / totalAlunos) * 100 : 0;
          const percentualArredondado = Number(percentual.toFixed(2));
          
          percentuaisPorNivel.push(percentualArredondado);
          somaPercentuais += percentualArredondado;
          
          bars.push({
            label: `Nível ${i}`,
            value: percentualArredondado
          });
        }

        // Validar que a soma dos percentuais está próxima de 100% (com tolerância para arredondamento)
        if (Math.abs(somaPercentuais - 100) > 1) {
          console.warn(`⚠️ Soma de percentuais = ${somaPercentuais.toFixed(2)}% para disciplina ${nomeDisciplina}. Total de alunos: ${totalAlunos}`);
        }

        // Obter cor da disciplina
        const color = obterCorDisciplina(nomeDisciplina, index);

        return {
          title: `Distribuição percentual dos estudantes por Nível de Proficiência - ${nomeDisciplina}`,
          color,
          columns: Array.from({ length: maxLevel + 1 }, (_, i) => `Nível ${i}`),
          rows: [
            { label: scopeLabel, data: percentuaisPorNivel }
          ],
          bars
        };
      })
      .filter((item): item is ProficiencyDistribution => item !== null);
  }, [apiData, isMunicipalView]);

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
    if (!apiData || !apiData.tabela_detalhada) {
      console.log("📊 classSummaryRows: apiData ou tabela_detalhada não disponível");
      return [];
    }

    console.log("📊 classSummaryRows: Processando dados de tabela_detalhada", {
      isMunicipalView,
      totalDisciplinas: apiData.tabela_detalhada.disciplinas?.length || 0
    });

    // ✅ NOVO: Processar dados reais de tabela_detalhada
    if (isMunicipalView) {
      // Agrupar por escola usando tabela_detalhada
      const escolasMap = new Map<string, {
        alunos: Set<string>;
        notasLP: number[];
        notasMAT: number[];
        notasGeral: number[];
        proficiencias: number[];
        serie: string;
      }>();

      // Processar alunos de todas as disciplinas
      apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
        const disciplinaNome = disciplina.nome?.toLowerCase() || '';
        const isPortugues = disciplinaNome.includes('português') || disciplinaNome.includes('portugues');
        const isMatematica = disciplinaNome.includes('matemática') || disciplinaNome.includes('matematica');

        disciplina.alunos?.forEach(aluno => {
          if (!aluno.escola || !aluno.id) return;
          
          const escolaNome = aluno.escola.trim();
          if (!escolasMap.has(escolaNome)) {
            escolasMap.set(escolaNome, {
              alunos: new Set(),
              notasLP: [],
              notasMAT: [],
              notasGeral: [],
              proficiencias: [],
              serie: aluno.serie || '-'
            });
          }

          const escola = escolasMap.get(escolaNome)!;
          escola.alunos.add(aluno.id);

          // Coletar notas e proficiências por disciplina
          if (aluno.nota !== undefined && aluno.nota !== null && !Number.isNaN(aluno.nota)) {
            if (isPortugues) {
              escola.notasLP.push(aluno.nota);
            } else if (isMatematica) {
              escola.notasMAT.push(aluno.nota);
            }
          }

          if (aluno.proficiencia !== undefined && aluno.proficiencia !== null && !Number.isNaN(aluno.proficiencia)) {
            escola.proficiencias.push(aluno.proficiencia);
          }
        });
      });

      // Processar dados gerais se disponível
      if (apiData.tabela_detalhada.geral?.alunos) {
        apiData.tabela_detalhada.geral.alunos.forEach(aluno => {
          if (!aluno.escola || !aluno.id) return;
          
          const escolaNome = aluno.escola.trim();
          const escola = escolasMap.get(escolaNome);
          if (escola) {
            if (aluno.nota_geral !== undefined && aluno.nota_geral !== null && !Number.isNaN(aluno.nota_geral)) {
              escola.notasGeral.push(aluno.nota_geral);
            }
            if (aluno.proficiencia_geral !== undefined && aluno.proficiencia_geral !== null && !Number.isNaN(aluno.proficiencia_geral)) {
              escola.proficiencias.push(aluno.proficiencia_geral);
            }
          }
        });
      }

      // Converter para ClassSummaryRow
      const rows: ClassSummaryRow[] = Array.from(escolasMap.entries()).map(([escolaNome, dados]) => {
        // Calcular médias de notas por disciplina
        const mediaLP = dados.notasLP.length > 0 
          ? dados.notasLP.reduce((sum, nota) => sum + nota, 0) / dados.notasLP.length 
          : undefined;
        const mediaMAT = dados.notasMAT.length > 0 
          ? dados.notasMAT.reduce((sum, nota) => sum + nota, 0) / dados.notasMAT.length 
          : undefined;
        
        // Priorizar média geral dos dados agregados, depois calcular a partir das médias por disciplina
        let mediaGeral = dados.notasGeral.length > 0 
          ? dados.notasGeral.reduce((sum, nota) => sum + nota, 0) / dados.notasGeral.length 
          : undefined;
        
        // Se não tem média geral direta, calcular a partir das médias das disciplinas
        if (mediaGeral === undefined && (mediaLP !== undefined || mediaMAT !== undefined)) {
          const mediasDisciplinas = [mediaLP, mediaMAT].filter((m): m is number => m !== undefined);
          if (mediasDisciplinas.length > 0) {
            mediaGeral = mediasDisciplinas.reduce((sum, m) => sum + m, 0) / mediasDisciplinas.length;
          }
        }
        
        const proficienciaMedia = dados.proficiencias.length > 0 
          ? dados.proficiencias.reduce((sum, prof) => sum + prof, 0) / dados.proficiencias.length 
          : undefined;

        const avaliados = dados.alunos.size;
        // ✅ MELHORADO: Usar dados de estatisticas_gerais quando disponível
        const matriculados = apiData.estatisticas_gerais?.total_alunos || avaliados;
        const comparecimento = matriculados > 0 ? (avaliados / matriculados) * 100 : undefined;

        const row: ClassSummaryRow = {
          turma: escolaNome,
          serie: dados.serie,
          mediaLP,
          mediaMAT,
          mediaGeral,
          proficienciaMedia,
          matriculados,
          avaliados,
          comparecimento
        };

        if (row.proficienciaMedia !== undefined) {
          const level = getProficiencyLevel(row.proficienciaMedia, row.serie, escolaNome);
          row.proficiencyLevel = level;
          row.proficiencyLabel = getProficiencyLevelLabel(level);
          row.proficiencyColor = getProficiencyLevelColor(level);
        }

        return row;
      });

      const sortedRows = rows.sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR', { sensitivity: 'base' }));
      console.log(`📊 classSummaryRows (municipal): ${sortedRows.length} escolas processadas`);
      return sortedRows;
    }

    // ✅ NOVO: Agrupar por turma usando tabela_detalhada
    const turmasMap = new Map<string, {
      alunos: Set<string>;
      notasLP: number[];
      notasMAT: number[];
      notasGeral: number[];
      proficiencias: number[];
      serie: string;
    }>();

    // Processar alunos de todas as disciplinas
    apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
      const disciplinaNome = disciplina.nome?.toLowerCase() || '';
      const isPortugues = disciplinaNome.includes('português') || disciplinaNome.includes('portugues');
      const isMatematica = disciplinaNome.includes('matemática') || disciplinaNome.includes('matematica');

      disciplina.alunos?.forEach(aluno => {
        if (!aluno.turma || !aluno.id) return;
        
        const turmaNome = aluno.turma.trim();
        if (!turmasMap.has(turmaNome)) {
          turmasMap.set(turmaNome, {
            alunos: new Set(),
            notasLP: [],
            notasMAT: [],
            notasGeral: [],
            proficiencias: [],
            serie: aluno.serie || turmaNome.split(' ')[0] || '-'
          });
        }

        const turma = turmasMap.get(turmaNome)!;
        turma.alunos.add(aluno.id);

        // Coletar notas e proficiências por disciplina
        if (aluno.nota !== undefined && aluno.nota !== null && !Number.isNaN(aluno.nota)) {
          if (isPortugues) {
            turma.notasLP.push(aluno.nota);
          } else if (isMatematica) {
            turma.notasMAT.push(aluno.nota);
          }
        }

        if (aluno.proficiencia !== undefined && aluno.proficiencia !== null && !Number.isNaN(aluno.proficiencia)) {
          turma.proficiencias.push(aluno.proficiencia);
        }
      });
    });

    // Processar dados gerais se disponível
    if (apiData.tabela_detalhada.geral?.alunos) {
      apiData.tabela_detalhada.geral.alunos.forEach(aluno => {
        if (!aluno.turma || !aluno.id) return;
        
        const turmaNome = aluno.turma.trim();
        const turma = turmasMap.get(turmaNome);
        if (turma) {
          if (aluno.nota_geral !== undefined && aluno.nota_geral !== null && !Number.isNaN(aluno.nota_geral)) {
            turma.notasGeral.push(aluno.nota_geral);
          }
          if (aluno.proficiencia_geral !== undefined && aluno.proficiencia_geral !== null && !Number.isNaN(aluno.proficiencia_geral)) {
            turma.proficiencias.push(aluno.proficiencia_geral);
          }
        }
      });
    }

    // Converter para ClassSummaryRow
    const rows: ClassSummaryRow[] = Array.from(turmasMap.entries()).map(([turmaNome, dados]) => {
      // Calcular médias de notas por disciplina
      const mediaLP = dados.notasLP.length > 0 
        ? dados.notasLP.reduce((sum, nota) => sum + nota, 0) / dados.notasLP.length 
        : undefined;
      const mediaMAT = dados.notasMAT.length > 0 
        ? dados.notasMAT.reduce((sum, nota) => sum + nota, 0) / dados.notasMAT.length 
        : undefined;
      
      // Priorizar média geral dos dados agregados, depois calcular a partir das médias por disciplina
      let mediaGeral = dados.notasGeral.length > 0 
        ? dados.notasGeral.reduce((sum, nota) => sum + nota, 0) / dados.notasGeral.length 
        : undefined;
      
      // Se não tem média geral direta, calcular a partir das médias das disciplinas
      if (mediaGeral === undefined && (mediaLP !== undefined || mediaMAT !== undefined)) {
        const mediasDisciplinas = [mediaLP, mediaMAT].filter((m): m is number => m !== undefined);
        if (mediasDisciplinas.length > 0) {
          mediaGeral = mediasDisciplinas.reduce((sum, m) => sum + m, 0) / mediasDisciplinas.length;
        }
      }
      
      const proficienciaMedia = dados.proficiencias.length > 0 
        ? dados.proficiencias.reduce((sum, prof) => sum + prof, 0) / dados.proficiencias.length 
        : undefined;

      const avaliados = dados.alunos.size;
      // ✅ MELHORADO: Usar dados de estatisticas_gerais quando disponível
      const matriculados = apiData.estatisticas_gerais?.total_alunos || avaliados;
      const comparecimento = matriculados > 0 ? (avaliados / matriculados) * 100 : undefined;

      const row: ClassSummaryRow = {
        turma: turmaNome,
        serie: dados.serie,
        mediaLP,
        mediaMAT,
        mediaGeral,
        proficienciaMedia,
        matriculados,
        avaliados,
        comparecimento
      };

      if (row.proficienciaMedia !== undefined) {
        const level = getProficiencyLevel(row.proficienciaMedia, row.serie, turmaNome);
        row.proficiencyLevel = level;
        row.proficiencyLabel = getProficiencyLevelLabel(level);
        row.proficiencyColor = getProficiencyLevelColor(level);
      }

      return row;
    });

    const sortedRows = rows.sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR', { sensitivity: 'base' }));
    console.log(`📊 classSummaryRows (escola): ${sortedRows.length} turmas processadas`);
    return sortedRows;
  }, [apiData, isMunicipalView]);

  const distributionCharts = useMemo<DistributionChartData[]>(() => {
    if (!apiData || !apiData.resultados_por_disciplina) return [];

    // ✅ NOVO: Usar dados reais de resultados_por_disciplina
    return apiData.resultados_por_disciplina
      .map((dadosDisciplina) => {
        // Buscar distribuição de classificação da disciplina
        const distribuicao = dadosDisciplina.distribuicao_classificacao;
        if (!distribuicao) return null;

        const abaixo_do_basico = Number(distribuicao.abaixo_do_basico ?? 0);
        const basico = Number(distribuicao.basico ?? 0);
        const adequado = Number(distribuicao.adequado ?? 0);
        const avancado = Number(distribuicao.avancado ?? 0);

        const total = abaixo_do_basico + basico + adequado + avancado;

        if (total === 0) return null;

        const segments = [
          { key: 'abaixo', label: 'Abaixo do Básico', value: abaixo_do_basico, color: '#DC2626' },
          { key: 'basico', label: 'Básico', value: basico, color: '#F59E0B' },
          { key: 'adequado', label: 'Adequado', value: adequado, color: '#22C55E' },
          { key: 'avancado', label: 'Avançado', value: avancado, color: '#16A34A' }
        ].map(segment => ({
          ...segment,
          percentage: total > 0 ? Number(((segment.value / total) * 100).toFixed(1)) : 0
        }));

        // Obter nome da disciplina formatado
        const disciplinaNome = dadosDisciplina.disciplina || 'Disciplina';
        const title = disciplinaNome.toUpperCase();

        return {
          title,
          total,
          segments
        } as DistributionChartData;
      })
      .filter((item): item is DistributionChartData => Boolean(item));
  }, [apiData]);

  const summaryStats = useMemo(() => {
    if (!apiData) return null;

    // ✅ NOVO: Usar dados reais de resultados_por_disciplina e estatisticas_gerais
    const portuguesDisciplina = apiData.resultados_por_disciplina?.find(
      d => d.disciplina?.toLowerCase().includes('português') || d.disciplina?.toLowerCase().includes('portugues')
    );
    const matematicaDisciplina = apiData.resultados_por_disciplina?.find(
      d => d.disciplina?.toLowerCase().includes('matemática') || d.disciplina?.toLowerCase().includes('matematica')
    );

    const mediaLP = portuguesDisciplina?.media_nota ?? null;
    const mediaMAT = matematicaDisciplina?.media_nota ?? null;
    
    // Calcular média geral como média das médias das disciplinas
    const disciplinasComMedia = apiData.resultados_por_disciplina?.filter(
      d => d.media_nota !== undefined && d.media_nota !== null
    ) || [];
    const mediaGeral = disciplinasComMedia.length > 0
      ? disciplinasComMedia.reduce((sum, d) => sum + (d.media_nota || 0), 0) / disciplinasComMedia.length
      : null;

    // Proficiência média geral
    const proficienciasValidas = apiData.resultados_por_disciplina?.filter(
      d => d.media_proficiencia !== undefined && d.media_proficiencia !== null
    ).map(d => d.media_proficiencia!) || [];
    const proficienciaMedia = proficienciasValidas.length > 0
      ? proficienciasValidas.reduce((sum, prof) => sum + prof, 0) / proficienciasValidas.length
      : apiData.estatisticas_gerais?.media_proficiencia_geral ?? null;

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

    // Usar dados de estatisticas_gerais
    const totalMatriculados = apiData.estatisticas_gerais?.total_alunos ?? null;
    const totalAvaliados = apiData.estatisticas_gerais?.alunos_participantes ?? null;
    const comparecimentoGeral = totalMatriculados && totalMatriculados > 0
      ? (totalAvaliados ?? 0) / totalMatriculados * 100
      : null;

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
    if (!selectedEvaluation || !apiData) {
      toast({
        title: "Dados insuficientes",
        description: "Carregue os dados do relatório antes de gerar o PDF.",
        variant: "destructive"
      });
      return;
    }
    
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
          id: selectedEvaluation !== 'all' ? selectedEvaluation : null,
          title: apiData.estatisticas_gerais?.nome ?? null,
          description: null
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
          matriculados: apiData.estatisticas_gerais?.total_alunos ?? null,
          avaliados: apiData.estatisticas_gerais?.alunos_participantes ?? null,
          percentual: apiData.estatisticas_gerais?.total_alunos && apiData.estatisticas_gerais?.alunos_participantes 
            ? (apiData.estatisticas_gerais.alunos_participantes / apiData.estatisticas_gerais.total_alunos) * 100 
            : null
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

      const evaluationName = apiData?.estatisticas_gerais?.nome || 'relatorio_escolar';
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
          
          // Usar getEvaluationsList como em Results.tsx para obter tabela_detalhada com alunos por disciplina
          const filters = {
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacao: selectedEvaluation !== 'all' ? selectedEvaluation : undefined,
            escola: selectedSchool !== 'all' ? selectedSchool : undefined,
          };

          const evaluationsResponse = await EvaluationResultsApiService.getEvaluationsList(1, 1, filters);
          
          if (evaluationsResponse) {
            console.log("📊 Estrutura completa da resposta da API:", evaluationsResponse);
            console.log("📊 tabela_detalhada:", evaluationsResponse.tabela_detalhada);
            
            // ✅ NOVO: Log detalhado da estrutura da tabela_detalhada
            if (evaluationsResponse.tabela_detalhada) {
              const tabela = evaluationsResponse.tabela_detalhada;
              const totalDisciplinas = tabela.disciplinas?.length || 0;
              const disciplinasComAlunos = tabela.disciplinas?.filter(
                d => d.alunos && Array.isArray(d.alunos) && d.alunos.length > 0
              ).length || 0;
              const totalAlunosGeral = tabela.geral?.alunos?.length || 0;
              
              console.log("📊 DEBUG tabela_detalhada estrutura:", {
                temDisciplinas: !!tabela.disciplinas,
                totalDisciplinas,
                disciplinasDetalhadas: tabela.disciplinas?.map(d => ({
                  nome: d.nome,
                  totalAlunos: d.alunos?.length || 0,
                  temQuestoes: d.questoes?.length || 0
                })),
                temGeral: !!tabela.geral,
                totalAlunosGeral
              });
              
              console.log(`📊 Resumo: ${totalDisciplinas} disciplinas encontradas, ${disciplinasComAlunos} com alunos, ${totalAlunosGeral} alunos em geral`);
              
              // ✅ NOVO: Fallback - Se disciplina está vazia quando escola específica está selecionada, buscar dados do município e filtrar
              if (disciplinasComAlunos === 0 && selectedSchool !== 'all' && filters.escola) {
                console.warn(`⚠️ PROBLEMA DETECTADO: Disciplinas sem alunos quando escola específica está selecionada.`);
                console.warn(`⚠️ Tentando buscar dados do município e filtrar por escola...`);
                
                try {
                  // Buscar dados do município (sem filtro de escola)
                  const municipioFilters = {
                    estado: filters.estado,
                    municipio: filters.municipio,
                    avaliacao: filters.avaliacao,
                    escola: undefined, // Remover filtro de escola para obter todos os dados do município
                  };
                  
                  const municipioResponse = await EvaluationResultsApiService.getEvaluationsList(1, 1, municipioFilters);
                  
                  if (municipioResponse?.tabela_detalhada?.disciplinas) {
                    const municipioDisciplinasComAlunos = municipioResponse.tabela_detalhada.disciplinas.filter(
                      d => d.alunos && Array.isArray(d.alunos) && d.alunos.length > 0
                    ).length;
                    
                    console.log(`📊 Dados do município: ${municipioDisciplinasComAlunos} disciplinas com alunos`);
                    
                    // Obter nome da escola selecionada das estatísticas gerais
                    const nomeEscolaSelecionada = evaluationsResponse.estatisticas_gerais?.escola;
                    
                    if (municipioDisciplinasComAlunos > 0 && nomeEscolaSelecionada) {
                      console.log(`📊 Filtrando alunos da escola: "${nomeEscolaSelecionada}"`);
                      
                      // Filtrar alunos que pertencem à escola selecionada
                      // Usar o campo 'escola' do aluno em tabela_detalhada.geral.alunos ou das disciplinas
                      const alunosDaEscola = new Set<string>();
                      
                      // Primeiro, identificar IDs dos alunos da escola usando tabela_detalhada.geral
                      if (municipioResponse.tabela_detalhada.geral?.alunos) {
                        municipioResponse.tabela_detalhada.geral.alunos.forEach(aluno => {
                          const escolaDoAluno = aluno.escola;
                          if (escolaDoAluno && escolaDoAluno.toLowerCase().includes(nomeEscolaSelecionada.toLowerCase())) {
                            alunosDaEscola.add(aluno.id);
                          }
                        });
                      }
                      
                      // Se não encontrou alunos em geral, tentar usar as disciplinas
                      if (alunosDaEscola.size === 0) {
                        municipioResponse.tabela_detalhada.disciplinas.forEach(disciplina => {
                          disciplina.alunos?.forEach(aluno => {
                            if (aluno.escola && aluno.escola.toLowerCase().includes(nomeEscolaSelecionada.toLowerCase())) {
                              alunosDaEscola.add(aluno.id);
                            }
                          });
                        });
                      }
                      
                      console.log(`📊 Encontrados ${alunosDaEscola.size} alunos da escola selecionada`);
                      
                      if (alunosDaEscola.size > 0) {
                        // Reconstruir tabela_detalhada com apenas alunos da escola selecionada
                        const disciplinasComAlunosFiltrados = municipioResponse.tabela_detalhada.disciplinas.map(disciplina => {
                          const alunosFiltrados = disciplina.alunos?.filter(aluno => alunosDaEscola.has(aluno.id)) || [];
                          
                          return {
                            ...disciplina,
                            alunos: alunosFiltrados
                          };
                        });
                        
                        // Filtrar também alunos em geral
                        const alunosGeralFiltrados = municipioResponse.tabela_detalhada.geral?.alunos?.filter(
                          aluno => alunosDaEscola.has(aluno.id)
                        ) || [];
                        
                        // Atualizar a resposta com os dados filtrados
                        evaluationsResponse.tabela_detalhada = {
                          ...municipioResponse.tabela_detalhada,
                          disciplinas: disciplinasComAlunosFiltrados,
                          geral: {
                            ...municipioResponse.tabela_detalhada.geral,
                            alunos: alunosGeralFiltrados
                          }
                        };
                        
                        console.log(`✅ Fallback aplicado: ${disciplinasComAlunosFiltrados.filter(d => d.alunos.length > 0).length} disciplinas agora têm alunos filtrados da escola`);
                      } else {
                        console.warn(`⚠️ Não foi possível encontrar alunos da escola "${nomeEscolaSelecionada}" nos dados do município.`);
                      }
                    }
                  }
                } catch (fallbackError) {
                  console.error("❌ Erro ao tentar fallback (buscar dados do município):", fallbackError);
                }
              }
            }
            
            setApiData(evaluationsResponse);
            // apiData.tabela_detalhada já contém os alunos por disciplina com proficiência
          } else {
            setApiData(null);
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          toast({
            title: "Erro ao carregar dados",
            description: "Não foi possível carregar os dados do relatório. Tente novamente.",
            variant: "destructive",
          });
          setApiData(null);
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    loadData();
  }, [allRequiredFiltersSelected, selectedState, selectedMunicipality, selectedSchool, selectedEvaluation, toast]);

  // Removido: useEffect de getTabelaDetalhada - os dados já vêm de getEvaluationsList em apiData.tabela_detalhada

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="ml-2 text-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatório Escolar</h1>
          <p className="text-muted-foreground mt-2">
            Relatórios escolares detalhados do seu município
          </p>
          {user?.role && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
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
        onStateChange={handleStateChange}
        onMunicipalityChange={handleMunicipalityChange}
        onSchoolChange={(schoolId) => {
          // Só limpar dados se a escola realmente mudou
          if (schoolId !== selectedSchool) {
            setApiData(null);
          }
          setSelectedSchool(schoolId);
        }}
        onSchoolSelectDetail={setSelectedSchoolInfo}
        onEvaluationChange={(evaluationId) => {
          // Só limpar dados se a avaliação realmente mudou
          if (evaluationId !== selectedEvaluation) {
            setApiData(null);
          }
          setSelectedEvaluation(evaluationId);
        }}
        isLoadingFilters={isLoadingFilters}
        onLoadingChange={setIsLoadingFilters}
        // Props para hierarquia
        userRole={user?.role}
        canSelectState={userHierarchyContext?.restrictions.canSelectState}
        canSelectMunicipality={userHierarchyContext?.restrictions.canSelectMunicipality}
        canSelectSchool={userHierarchyContext?.restrictions.canSelectSchool}
        fallbackSchools={fallbackSchools}
        // Prop para ordenação personalizada: Avaliação antes de Escola
        loadSchoolsAfterEvaluation={true}
      />

      {/* Mensagem quando não há filtros suficientes */}
      {!allRequiredFiltersSelected && !isLoading && (
      <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Selecione todos os filtros para continuar
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Para visualizar o relatório escolar, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong> e <strong>Avaliação</strong>. A <strong>Escola</strong> pode ser "Todas" para ver todas as escolas do município.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading dos dados */}
      {allRequiredFiltersSelected && isLoadingData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
            <p className="text-muted-foreground">Carregando dados do relatório...</p>
          </CardContent>
        </Card>
      )}

      {/* Dados do Relatório */}
      {allRequiredFiltersSelected && !isLoadingData && apiData && (
        <div className="space-y-6">
          {summaryStats && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm border border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-400">
                    <span className="uppercase tracking-wide text-muted-foreground">Média Geral LP</span>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-foreground">
                    {formatAverage(summaryStats.mediaLP)}
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex rounded-md bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                      LP
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-400">
                    <span className="uppercase tracking-wide text-muted-foreground">Média Geral MAT</span>
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-foreground">
                    {formatAverage(summaryStats.mediaMAT)}
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex rounded-md bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                      MAT
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-400">
                    <span className="uppercase tracking-wide text-muted-foreground">Média Geral</span>
                    <LineChart className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-foreground">
                    {formatAverage(summaryStats.mediaGeral)}
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex rounded-md bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                      Todas
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-400">
                    <span className="uppercase tracking-wide text-muted-foreground">Proficiência Média</span>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-foreground">
                    {formatProficiency(summaryStats.proficienciaMedia)}
                  </div>
                  <div className="mt-4">
                    {summaryStats.proficiencyLabel ? (
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                          summaryStats.proficiencyColor ?? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800'
                        )}
                      >
                        {summaryStats.proficiencyLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem classificação</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ✅ SEMPRE MOSTRAR: Seção de desempenho e botão de download sempre aparecem quando há apiData */}
          <Card className="mt-6 overflow-hidden shadow-md">
            <CardHeader className="flex flex-col gap-3 border-b border-border md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                {isMunicipalView ? 'Desempenho por Escola' : 'Desempenho por Turma'}
              </CardTitle>
              <Button
                onClick={downloadReport}
                disabled={isGeneratingReport || !apiData}
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
                            index % 2 === 0 ? 'bg-card' : 'bg-muted/50'
                          )}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-foreground border-t border-border">
                            {row.turma}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatAverage(row.mediaLP)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatAverage(row.mediaMAT)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatAverage(row.mediaGeral)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatPercentageValue(row.comparecimento)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatProficiency(row.proficienciaMedia)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm border-t border-border">
                            {row.proficiencyLabel ? (
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                                  row.proficiencyColor ?? 'bg-muted text-muted-foreground border-border'
                                )}
                              >
                                {row.proficiencyLabel}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {summaryStats && (
                        <tr className="bg-muted">
                          <td className="px-4 py-3 text-sm font-semibold text-foreground border-t border-border">
                            {isMunicipalView ? 'Total Município' : 'Total Escola'}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatAverage(summaryStats.mediaLP)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatAverage(summaryStats.mediaMAT)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatAverage(summaryStats.mediaGeral)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatPercentageValue(summaryStats.comparecimentoGeral)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground border-t border-border">
                            {formatProficiency(summaryStats.proficienciaMedia)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm border-t border-border">
                            {summaryStats.proficiencyLabel ? (
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                                  summaryStats.proficiencyColor ?? 'bg-muted text-muted-foreground border-border'
                                )}
                              >
                                {summaryStats.proficiencyLabel}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">--</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum dado disponível para os filtros selecionados.
                </div>
              )}
            </CardContent>
          </Card>

          {distributionCharts.length > 0 && (
            <div className="mt-6 space-y-6">
              {distributionCharts.map(chart => {
                const maxPercentage = Math.max(...chart.segments.map(segment => segment.percentage), 0);

                return (
                  <Card key={chart.title} className="shadow-md">
                    <CardContent className="space-y-6 pt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold uppercase tracking-wide text-foreground">{chart.title}</h3>
                        <span className="text-sm font-semibold text-muted-foreground">Total: {chart.total}</span>
                      </div>
                      <div className="space-y-4">
                        {chart.segments.map(segment => {
                          const width = `${segment.percentage}%`;
                          const showValueInside = segment.percentage >= Math.max(maxPercentage * 0.3, 18);

                          return (
                            <div key={segment.key} className="flex items-center gap-3">
                              <div className="flex w-32 items-center gap-2 text-sm font-medium text-foreground">
                                <span
                                  className="inline-flex h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: segment.color }}
                                ></span>
                                <span className="truncate">{segment.label}</span>
                              </div>
                              <div className="relative flex flex-1 items-center rounded-full bg-muted">
                                <div
                                  className="h-3 rounded-full transition-all"
                                  style={{
                                    width,
                                    backgroundColor: segment.color
                                  }}
                                ></div>
                                {segment.value > 0 && showValueInside && (
                                  <span className="absolute right-2 text-xs font-semibold text-foreground">
                                    {segment.value}
                                  </span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'w-10 text-right text-xs font-semibold text-foreground transition-opacity',
                                  showValueInside && 'opacity-0'
                                )}
                              >
                                {segment.value}
                              </span>
                              <span className="w-12 text-right text-xs font-semibold text-foreground">
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

          {/* Gráficos de distribuição de níveis de proficiência */}
          {proficiencyDistributions.length > 0 ? (
            <div className="mt-6 space-y-6">
              {proficiencyDistributions.map(distribution => {
                const maxValue = Math.max(...distribution.bars.map(bar => bar.value), 1);

                return (
                  <Card key={distribution.title} className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold uppercase tracking-wide text-foreground">
                        {distribution.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <colgroup>
                            <col className="min-w-[120px]" />
                            {distribution.columns.map((_, index) => (
                              <col key={index} className="min-w-[80px]" />
                            ))}
                          </colgroup>
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
                              <tr key={row.label} className="odd:bg-muted/50">
                                <td className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{row.label}</td>
                                {row.data.map((value, index) => (
                                  <td key={index} className="px-3 py-2 text-center text-muted-foreground">
                                    {value.toFixed(2)}%
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="overflow-x-auto">
                        <div 
                          className="grid"
                          style={{
                            gridTemplateColumns: `minmax(120px, auto) repeat(${distribution.columns.length}, minmax(80px, 1fr))`,
                            gap: '12px 16px'
                          }}
                        >
                          {/* Espaço vazio correspondente à primeira coluna (label) */}
                          <div className="px-3"></div>
                          
                          {/* Barras alinhadas com as colunas */}
                          {distribution.bars.map((bar, index) => {
                            const heightPercentage = (bar.value / maxValue) * 100;
                            return (
                              <div key={bar.label} className="flex flex-col items-center gap-2 px-3">
                                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                  {bar.value.toFixed(2)}%
                                </span>
                                <div className="flex h-40 w-full max-w-[60px] items-end justify-center rounded-t-lg bg-muted">
                                  <div
                                    className="w-full rounded-t-lg"
                                    style={{
                                      height: `${heightPercentage}%`,
                                      backgroundColor: distribution.color
                                    }}
                                  ></div>
                                </div>
                                <span className="text-xs font-semibold text-foreground text-center whitespace-nowrap">{bar.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : apiData && !apiData.tabela_detalhada ? (
            <Card className="mt-6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                <p className="text-muted-foreground text-center">
                  Carregando dados de proficiência dos alunos...
                </p>
              </CardContent>
            </Card>
          ) : apiData && apiData.tabela_detalhada && proficiencyDistributions.length === 0 ? (
            <Card className="mt-6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-2 font-semibold">
                  Não foi possível calcular a distribuição de níveis de proficiência.
                </p>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {selectedSchool !== 'all' 
                    ? "Quando uma escola específica é selecionada, o backend não está retornando dados individuais de alunos por disciplina. Tente selecionar 'Todas' as escolas para visualizar os dados do município."
                    : apiData.tabela_detalhada.disciplinas?.some(d => d.alunos && d.alunos.length > 0)
                      ? "Os dados de proficiência dos alunos não estão disponíveis para os filtros selecionados."
                      : "O backend não retornou dados de alunos na tabela detalhada. Verifique se há alunos cadastrados para esta avaliação e filtros."}
                </p>
                {apiData.tabela_detalhada?.disciplinas && (
                  <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                    <p className="text-xs font-semibold text-foreground mb-2">Informações de Debug:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Disciplinas encontradas: {apiData.tabela_detalhada.disciplinas.length}</p>
                      <p>• Disciplinas com alunos: {apiData.tabela_detalhada.disciplinas.filter(d => d.alunos && d.alunos.length > 0).length}</p>
                      {apiData.tabela_detalhada.geral?.alunos && (
                        <p>• Alunos em geral: {apiData.tabela_detalhada.geral.alunos.length}</p>
                      )}
                      {apiData.estatisticas_gerais && (
                        <>
                          <p>• Total de alunos (estatísticas): {apiData.estatisticas_gerais.total_alunos}</p>
                          <p>• Alunos participantes: {apiData.estatisticas_gerais.alunos_participantes}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

