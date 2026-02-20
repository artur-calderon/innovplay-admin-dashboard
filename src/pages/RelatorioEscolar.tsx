import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, RefreshCw, Filter, BookOpen, Calculator, LineChart, Trophy } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationResultsApiService, NovaRespostaAPI } from "@/services/evaluationResultsApi";
import { RelatorioCompleto } from "@/types/evaluation-results";
import { useAuth } from "@/context/authContext";
import { FilterComponentAnalise } from "@/components/filters";
import { getUserHierarchyContext, getRestrictionMessage, validateReportAccess, UserHierarchyContext } from "@/utils/userHierarchy";
import { cn } from "@/lib/utils";
import { getProficiencyLevel, getProficiencyLevelColor, getProficiencyLevelLabel, getProficiencyTableInfo, ProficiencyLevel } from "@/components/evaluations/results/utils/proficiency";

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
  bars: Array<{ label: string; value: number; quantidade: number }>;
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

// ✅ NOVA FUNÇÃO: Validar nível de proficiência por disciplina
interface ValidacaoNivelResult {
  nivel: number;
  valido: boolean;
  motivo?: string;
  detalhes?: {
    proficiencia: number;
    disciplina: string;
    curso: string;
    nivelMaximo: number;
    proficienciaMaximaEsperada: number;
    intervaloUsado: { min: number; max: number | null };
  };
}

const validarNivelProficiencia = (
  proficiencia: number,
  disciplina: string,
  curso: string,
  intervalos: Array<{level: number, min: number, max: number | null}>
): ValidacaoNivelResult => {
  const disciplinaNormalizada = normalizeText(disciplina);
  const isMatematica = disciplinaNormalizada.includes('matematica') || disciplinaNormalizada.includes('matemática');
  const isAnosFinais = curso?.toLowerCase().includes('anos finais') || curso?.toLowerCase().includes('ensino médio') || curso?.toLowerCase().includes('medio');
  
  // Determinar proficiência máxima esperada
  let proficienciaMaximaEsperada: number;
  if (isAnosFinais) {
    proficienciaMaximaEsperada = isMatematica ? 425 : 400;
  } else {
    proficienciaMaximaEsperada = isMatematica ? 375 : 350;
  }
  
  // Encontrar o nível máximo
  const maxLevel = Math.max(...intervalos.map(i => i.level));
  const nivelMaximo = intervalos.find(i => i.level === maxLevel);
  
  // Validar se a proficiência está dentro do range esperado
  if (proficiencia < 0) {
    return {
      nivel: 0,
      valido: false,
      motivo: `Proficiência negativa: ${proficiencia}`,
      detalhes: {
        proficiencia,
        disciplina,
        curso,
        nivelMaximo: maxLevel,
        proficienciaMaximaEsperada,
        intervaloUsado: { min: 0, max: null }
      }
    };
  }
  
  if (proficiencia > proficienciaMaximaEsperada * 1.1) {
    return {
      nivel: maxLevel,
      valido: false,
      motivo: `Proficiência acima do máximo esperado: ${proficiencia} (máximo esperado: ${proficienciaMaximaEsperada})`,
      detalhes: {
        proficiencia,
        disciplina,
        curso,
        nivelMaximo: maxLevel,
        proficienciaMaximaEsperada,
        intervaloUsado: nivelMaximo ? { min: nivelMaximo.min, max: nivelMaximo.max } : { min: 0, max: null }
      }
    };
  }
  
  // Classificar o nível
  const nivel = classificarNivel(proficiencia, intervalos);
  
  // Verificar se o nível está correto
  const intervaloDoNivel = intervalos.find(i => i.level === nivel);
  if (!intervaloDoNivel) {
    return {
      nivel,
      valido: false,
      motivo: `Nível ${nivel} não encontrado nos intervalos`,
      detalhes: {
        proficiencia,
        disciplina,
        curso,
        nivelMaximo: maxLevel,
        proficienciaMaximaEsperada,
        intervaloUsado: { min: 0, max: null }
      }
    };
  }
  
  // Validar se a proficiência está dentro do intervalo do nível calculado
  const dentroDoIntervalo = proficiencia >= intervaloDoNivel.min && 
    (intervaloDoNivel.max === null || proficiencia <= intervaloDoNivel.max);
  
  if (!dentroDoIntervalo) {
    return {
      nivel,
      valido: false,
      motivo: `Proficiência ${proficiencia} não está dentro do intervalo do nível ${nivel} (${intervaloDoNivel.min} - ${intervaloDoNivel.max ?? '∞'})`,
      detalhes: {
        proficiencia,
        disciplina,
        curso,
        nivelMaximo: maxLevel,
        proficienciaMaximaEsperada,
        intervaloUsado: { min: intervaloDoNivel.min, max: intervaloDoNivel.max }
      }
    };
  }
  
  // Se a proficiência está no máximo ou acima, deve ser o nível máximo
  if (nivelMaximo && proficiencia >= nivelMaximo.min && (nivelMaximo.max === null || proficiencia <= nivelMaximo.max)) {
    if (nivel !== maxLevel) {
      return {
        nivel: maxLevel,
        valido: false,
        motivo: `Proficiência ${proficiencia} está no intervalo do nível máximo (${maxLevel}) mas foi classificada como nível ${nivel}`,
        detalhes: {
          proficiencia,
          disciplina,
          curso,
          nivelMaximo: maxLevel,
          proficienciaMaximaEsperada,
          intervaloUsado: { min: nivelMaximo.min, max: nivelMaximo.max }
        }
      };
    }
  }
  
  return {
    nivel,
    valido: true,
    detalhes: {
      proficiencia,
      disciplina,
      curso,
      nivelMaximo: maxLevel,
      proficienciaMaximaEsperada,
      intervaloUsado: { min: intervaloDoNivel.min, max: intervaloDoNivel.max }
    }
  };
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

const sanitizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

// ✅ FUNÇÃO AUXILIAR: Calcular nível de proficiência para dados agregados (escola/turma)
// Usa apenas curso/série, sem disciplina específica, para usar a tabela geral
const getProficiencyLevelForAggregatedData = (
  proficiency: number,
  grade?: string,
  course?: string
): ProficiencyLevel => {
  if (proficiency === null || proficiency === undefined || isNaN(proficiency)) {
    return 'abaixo_do_basico';
  }

  // Inferir curso da grade se não fornecido
  let inferredCourse = course;
  if (!inferredCourse && grade) {
    const gradeLower = grade.toLowerCase();
    if (gradeLower.includes('6') || gradeLower.includes('7') || 
        gradeLower.includes('8') || gradeLower.includes('9') ||
        gradeLower.includes('em') || gradeLower.includes('médio') ||
        gradeLower.includes('medio') || gradeLower.includes('1º ano') ||
        gradeLower.includes('2º ano') || gradeLower.includes('3º ano')) {
      inferredCourse = 'Anos Finais';
    } else {
      inferredCourse = 'Anos Iniciais';
    }
  }

  // Usar getProficiencyTableInfo com undefined como subject para usar tabela geral
  // Passar course como terceiro parâmetro (mesmo que não seja usado atualmente, pode ser útil no futuro)
  const tableInfo = getProficiencyTableInfo(grade, undefined, inferredCourse);
  const table = tableInfo.table;
  
  if (proficiency <= table.abaixo_do_basico.max) return 'abaixo_do_basico';
  if (proficiency <= table.basico.max) return 'basico';
  if (proficiency <= table.adequado.max) return 'adequado';
  return 'avancado';
};

export default function RelatorioEscolar() {
  const { autoLogin, user } = useAuth();
  const [apiData, setApiData] = useState<NovaRespostaAPI | null>(null);
  const [relatorioCompleto, setRelatorioCompleto] = useState<RelatorioCompleto | null>(null);
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
      return [];
    }

    // Se tabela_detalhada não estiver disponível, retornar array vazio (gráficos não aparecerão)
    if (!apiData.tabela_detalhada) {
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
      return [];
    }

    return apiData.tabela_detalhada.disciplinas
      .filter(disciplinaData => {
        // ✅ VALIDADO: Filtrar disciplinas que têm alunos
        if (!disciplinaData.alunos || disciplinaData.alunos.length === 0) {
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
          // ✅ VALIDAÇÃO: Garantir que está usando proficiência específica da disciplina (não geral)
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

        // ✅ MELHORADO: Classificar cada aluno participante por nível usando validação rigorosa
        alunosParticipantes.forEach((aluno) => {
          const proficiencia = Number(aluno.proficiencia);
          
          // ✅ VALIDAÇÃO: Garantir que a proficiência é válida
          if (Number.isNaN(proficiencia) || proficiencia < 0) {
            return;
          }

          // ✅ VALIDAÇÃO RIGOROSA: Usar função de validação
          const validacao = validarNivelProficiencia(proficiencia, nomeDisciplina, curso, intervalos);

          // Usar o nível da validação (que pode ter sido corrigido)
          const nivel = validacao.nivel;
          
          if (nivel >= 0 && nivel <= maxLevel) {
            contagemPorNivel[nivel] = (contagemPorNivel[nivel] || 0) + 1;
          }
        });

        const totalAlunos = alunosParticipantes.length;

        if (totalAlunos === 0) {
          return null;
        }

        // ✅ VALIDADO: Calcular percentuais corretamente
        const percentuaisPorNivel: number[] = [];
        const bars: Array<{ label: string; value: number; quantidade: number }> = [];
        let somaPercentuais = 0;

        for (let i = 0; i <= maxLevel; i++) {
          const quantidade = contagemPorNivel[i] || 0;
          const percentual = totalAlunos > 0 ? (quantidade / totalAlunos) * 100 : 0;
          const percentualArredondado = Number(percentual.toFixed(2));
          
          percentuaisPorNivel.push(percentualArredondado);
          somaPercentuais += percentualArredondado;
          
          bars.push({
            label: `Nível ${i}`,
            value: percentualArredondado,
            quantidade: quantidade
          });
        }

        // Validar que a soma dos percentuais está próxima de 100% (com tolerância para arredondamento)
        if (Math.abs(somaPercentuais - 100) > 1) {
          // Soma de percentuais não está próxima de 100%, mas não vamos logar
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
      try {
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
      } finally {
        // Sempre encerrar o loading para não travar a tela (ex.: autoLogin falha ou demora)
        setIsLoading(false);
      }
    };

    initializeData();
  }, [autoLogin, toast]);

  // Verificar se todos os filtros obrigatórios estão selecionados
  // Estado e Município são obrigatórios, Escola pode ser "Todas", Avaliação é obrigatória
  const allRequiredFiltersSelected = selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all';

  const classSummaryRows = useMemo<ClassSummaryRow[]>(() => {
    // ✅ PRIORIDADE: Usar dados do relatório completo se disponível (dados agregados corretos)
    if (relatorioCompleto) {
      const turmasMap = new Map<string, ClassSummaryRow>();
      
      // ✅ MELHORADO: Verificar se temos dados por_escola ou por_turma
      // Quando escola está selecionada, pode vir por_escola ou por_turma dependendo da API
      const hasPorEscola = relatorioCompleto.total_alunos.por_escola && relatorioCompleto.total_alunos.por_escola.length > 0;
      const hasPorTurma = relatorioCompleto.total_alunos.por_turma && relatorioCompleto.total_alunos.por_turma.length > 0;
      
      // Processar dados de nota_geral e proficiencia
      Object.entries(relatorioCompleto.nota_geral.por_disciplina).forEach(([disciplina, dadosDisciplina]) => {
        const disciplinaLower = disciplina.toLowerCase();
        const isPortugues = disciplinaLower.includes('português') || disciplinaLower.includes('portugues');
        const isMatematica = disciplinaLower.includes('matemática') || disciplinaLower.includes('matematica');
        
        // Processar por_turma se disponível
        if (dadosDisciplina.por_turma && dadosDisciplina.por_turma.length > 0) {
          dadosDisciplina.por_turma.forEach(turmaData => {
            const turmaNome = turmaData.turma;
            if (!turmasMap.has(turmaNome)) {
              turmasMap.set(turmaNome, {
                turma: turmaNome,
                serie: turmaNome.split(' ')[0] || '-',
                mediaLP: undefined,
                mediaMAT: undefined,
                mediaGeral: undefined,
                proficienciaMedia: undefined,
                matriculados: undefined,
                avaliados: undefined,
                comparecimento: undefined
              });
            }
            
            const row = turmasMap.get(turmaNome)!;
            if (isPortugues) {
              row.mediaLP = turmaData.nota;
            } else if (isMatematica) {
              row.mediaMAT = turmaData.nota;
            }
            
            // Se for GERAL, usar como média geral
            if (disciplina === 'GERAL') {
              row.mediaGeral = turmaData.nota;
            }
          });
        }
        
        // ✅ NOVO: Processar por_escola se disponível (quando escola está selecionada mas API retorna por escola)
        if (dadosDisciplina.por_escola && dadosDisciplina.por_escola.length > 0 && !hasPorTurma) {
          dadosDisciplina.por_escola.forEach(escolaData => {
            const escolaNome = escolaData.escola;
            if (!turmasMap.has(escolaNome)) {
              turmasMap.set(escolaNome, {
                turma: escolaNome,
                serie: escolaNome.split(' ')[0] || '-',
                mediaLP: undefined,
                mediaMAT: undefined,
                mediaGeral: undefined,
                proficienciaMedia: undefined,
                matriculados: undefined,
                avaliados: undefined,
                comparecimento: undefined
              });
            }
            
            const row = turmasMap.get(escolaNome)!;
            if (isPortugues) {
              row.mediaLP = escolaData.nota ?? escolaData.media;
            } else if (isMatematica) {
              row.mediaMAT = escolaData.nota ?? escolaData.media;
            }
            
            // Se for GERAL, usar como média geral
            if (disciplina === 'GERAL') {
              row.mediaGeral = escolaData.nota ?? escolaData.media;
            }
          });
        }
      });
      
      // Processar proficiência - coletar todas as proficiências primeiro
      const proficienciasPorItem = new Map<string, number[]>();
      Object.entries(relatorioCompleto.proficiencia.por_disciplina).forEach(([disciplina, dadosDisciplina]) => {
        // Processar por_turma se disponível
        if (dadosDisciplina.por_turma && dadosDisciplina.por_turma.length > 0) {
          dadosDisciplina.por_turma.forEach(turmaData => {
            const turmaNome = turmaData.turma;
            if (!proficienciasPorItem.has(turmaNome)) {
              proficienciasPorItem.set(turmaNome, []);
            }
            proficienciasPorItem.get(turmaNome)!.push(turmaData.proficiencia);
          });
        }
        
        // ✅ NOVO: Processar por_escola se disponível (quando escola está selecionada mas API retorna por escola)
        if (dadosDisciplina.por_escola && dadosDisciplina.por_escola.length > 0 && !hasPorTurma) {
          dadosDisciplina.por_escola.forEach(escolaData => {
            const escolaNome = escolaData.escola;
            if (!proficienciasPorItem.has(escolaNome)) {
              proficienciasPorItem.set(escolaNome, []);
            }
            proficienciasPorItem.get(escolaNome)!.push(escolaData.proficiencia ?? escolaData.media);
          });
        }
      });
      
      // Calcular média de proficiência para cada item (turma ou escola)
      proficienciasPorItem.forEach((proficiencias, itemNome) => {
        const row = turmasMap.get(itemNome);
        if (row && proficiencias.length > 0) {
          row.proficienciaMedia = proficiencias.reduce((sum, p) => sum + p, 0) / proficiencias.length;
        }
      });
      
      // Se não encontrou proficiência por disciplina, usar GERAL
      if (relatorioCompleto.proficiencia.por_disciplina['GERAL']) {
        // Tentar por_turma primeiro
        if (relatorioCompleto.proficiencia.por_disciplina['GERAL'].por_turma) {
          relatorioCompleto.proficiencia.por_disciplina['GERAL'].por_turma.forEach(turmaData => {
            const row = turmasMap.get(turmaData.turma);
            if (row && row.proficienciaMedia === undefined) {
              row.proficienciaMedia = turmaData.proficiencia;
            }
          });
        }
        // ✅ NOVO: Tentar por_escola se por_turma não estiver disponível
        if (relatorioCompleto.proficiencia.por_disciplina['GERAL'].por_escola && !hasPorTurma) {
          relatorioCompleto.proficiencia.por_disciplina['GERAL'].por_escola.forEach(escolaData => {
            const row = turmasMap.get(escolaData.escola);
            if (row && row.proficienciaMedia === undefined) {
              row.proficienciaMedia = escolaData.proficiencia ?? escolaData.media;
            }
          });
        }
      }
      
      // Processar dados de comparecimento de total_alunos
      // ✅ MELHORADO: Verificar tanto por_turma quanto por_escola
      if (relatorioCompleto.total_alunos.por_turma && relatorioCompleto.total_alunos.por_turma.length > 0) {
        relatorioCompleto.total_alunos.por_turma.forEach(turmaAlunos => {
          const row = turmasMap.get(turmaAlunos.turma);
          if (row) {
            row.matriculados = turmaAlunos.matriculados;
            row.avaliados = turmaAlunos.avaliados;
            row.comparecimento = turmaAlunos.percentual;
          }
        });
      } else if (relatorioCompleto.total_alunos.por_escola && relatorioCompleto.total_alunos.por_escola.length > 0) {
        // ✅ NOVO: Processar por_escola se por_turma não estiver disponível
        relatorioCompleto.total_alunos.por_escola.forEach(escolaAlunos => {
          const row = turmasMap.get(escolaAlunos.escola);
          if (row) {
            row.matriculados = escolaAlunos.matriculados;
            row.avaliados = escolaAlunos.avaliados;
            row.comparecimento = escolaAlunos.percentual;
          }
        });
      }
      
      // Calcular média geral se não foi definida
      Array.from(turmasMap.values()).forEach(row => {
        if (row.mediaGeral === undefined && (row.mediaLP !== undefined || row.mediaMAT !== undefined)) {
          const mediasDisciplinas = [row.mediaLP, row.mediaMAT].filter((m): m is number => m !== undefined);
          if (mediasDisciplinas.length > 0) {
            row.mediaGeral = mediasDisciplinas.reduce((sum, m) => sum + m, 0) / mediasDisciplinas.length;
          }
        }
        
        // Calcular nível de proficiência
        if (row.proficienciaMedia !== undefined) {
          const level = getProficiencyLevelForAggregatedData(row.proficienciaMedia, row.serie);
          row.proficiencyLevel = level;
          row.proficiencyLabel = getProficiencyLevelLabel(level);
          row.proficiencyColor = getProficiencyLevelColor(level);
        }
      });
      
      const sortedRows = Array.from(turmasMap.values()).sort((a, b) => 
        a.turma.localeCompare(b.turma, 'pt-BR', { sensitivity: 'base' })
      );
      
      return sortedRows;
    }
    
    // Fallback: usar dados de tabela_detalhada se relatório completo não estiver disponível
    if (!apiData || !apiData.tabela_detalhada) {
      return [];
    }

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
          const level = getProficiencyLevelForAggregatedData(row.proficienciaMedia, row.serie);
          row.proficiencyLevel = level;
          row.proficiencyLabel = getProficiencyLevelLabel(level);
          row.proficiencyColor = getProficiencyLevelColor(level);
        }

        return row;
      });

      const sortedRows = rows.sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR', { sensitivity: 'base' }));
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
        const level = getProficiencyLevelForAggregatedData(row.proficienciaMedia, row.serie);
        row.proficiencyLevel = level;
        row.proficiencyLabel = getProficiencyLevelLabel(level);
        row.proficiencyColor = getProficiencyLevelColor(level);
      }

      return row;
    });

    const sortedRows = rows.sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR', { sensitivity: 'base' }));
    return sortedRows;
  }, [apiData, isMunicipalView, relatorioCompleto]);

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
    // ✅ PRIORIDADE: Usar dados do relatório completo se disponível
    if (relatorioCompleto) {
      const portuguesNota = relatorioCompleto.nota_geral.por_disciplina['Português']?.media_geral 
        || relatorioCompleto.nota_geral.por_disciplina['Língua Portuguesa']?.media_geral
        || Object.entries(relatorioCompleto.nota_geral.por_disciplina).find(([key]) => 
          key.toLowerCase().includes('português') || key.toLowerCase().includes('portugues')
        )?.[1]?.media_geral;
      
      const matematicaNota = relatorioCompleto.nota_geral.por_disciplina['Matemática']?.media_geral
        || Object.entries(relatorioCompleto.nota_geral.por_disciplina).find(([key]) => 
          key.toLowerCase().includes('matemática') || key.toLowerCase().includes('matematica')
        )?.[1]?.media_geral;
      
      const geralNota = relatorioCompleto.nota_geral.por_disciplina['GERAL']?.media_geral;
      
      const portuguesProf = relatorioCompleto.proficiencia.por_disciplina['Português']?.media_geral
        || relatorioCompleto.proficiencia.por_disciplina['Língua Portuguesa']?.media_geral
        || Object.entries(relatorioCompleto.proficiencia.por_disciplina).find(([key]) => 
          key.toLowerCase().includes('português') || key.toLowerCase().includes('portugues')
        )?.[1]?.media_geral;
      
      const matematicaProf = relatorioCompleto.proficiencia.por_disciplina['Matemática']?.media_geral
        || Object.entries(relatorioCompleto.proficiencia.por_disciplina).find(([key]) => 
          key.toLowerCase().includes('matemática') || key.toLowerCase().includes('matematica')
        )?.[1]?.media_geral;
      
      const proficienciasValidas = [portuguesProf, matematicaProf].filter((p): p is number => p !== undefined);
      const proficienciaMedia = proficienciasValidas.length > 0
        ? proficienciasValidas.reduce((sum, p) => sum + p, 0) / proficienciasValidas.length
        : relatorioCompleto.proficiencia.por_disciplina['GERAL']?.media_geral ?? null;
      
      const totalGeral = relatorioCompleto.total_alunos.total_geral;
      const totalMatriculados = totalGeral?.matriculados ?? null;
      const totalAvaliados = totalGeral?.avaliados ?? null;
      const comparecimentoGeral = totalGeral?.percentual ?? null;
      
      const serieRef = classSummaryRows[0]?.serie;
      const proficiencyLevel = proficienciaMedia !== null && proficienciaMedia !== undefined
        ? getProficiencyLevelForAggregatedData(proficienciaMedia, serieRef)
        : null;
      
      return {
        mediaLP: portuguesNota ?? null,
        mediaMAT: matematicaNota ?? null,
        mediaGeral: geralNota ?? null,
        proficienciaMedia,
        proficiencyLevel,
        proficiencyLabel: proficiencyLevel ? getProficiencyLevelLabel(proficiencyLevel) : null,
        proficiencyColor: proficiencyLevel ? getProficiencyLevelColor(proficiencyLevel) : null,
        totalMatriculados,
        totalAvaliados,
        comparecimentoGeral
      };
    }
    
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
        ? getProficiencyLevelForAggregatedData(proficienciaMedia, serieRef)
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
  }, [apiData, classSummaryRows, relatorioCompleto]);



  const handleDownloadReport = useCallback(async () => {
    if (!selectedEvaluation || !apiData) {
      toast({
        title: "Dados insuficientes",
        description: "Carregue os dados do relatório antes de gerar o PDF.",
        variant: "destructive"
      });
      return;
    }
    
    if (userHierarchyContext && user?.role) {
      const validation = validateReportAccess(
        user.role,
        {
        state: selectedState,
        municipality: selectedMunicipality,
        school: selectedSchool
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

      setIsGeneratingReport(true);

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      // Carregar logo
      let logoDataUrl = '';
      let logoWidth = 0;
      let logoHeight = 0;
      try {
        const logoPath = '/LOGO-1-menor.png';
        const logoImg = new Image();
        const logoPromise = new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = reject;
          logoImg.src = logoPath;
        });
        
        await logoPromise;
        
        // Obter dimensões reais da imagem
        logoWidth = logoImg.width;
        logoHeight = logoImg.height;
        
        // Converter para DataURL
        const response = await fetch(logoPath);
        const blob = await response.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn('Não foi possível carregar logo, continuando sem ela:', error);
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Paleta de cores institucional
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
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Função auxiliar: Adicionar rodapé
      const addFooter = (pageNum: number) => {
        const centerX = pageWidth / 2;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(156, 163, 175);
        doc.text('AFIRME EDUCACIONAL', margin, pageHeight - 10);
        doc.text(`Página ${pageNum}`, centerX, pageHeight - 10, { align: 'center' });
        doc.text(new Date().toLocaleString('pt-BR'), pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      // Função auxiliar: Obter cor para badges de proficiência
      const generateClassificationColor = (label: string): [number, number, number] => {
        const labelLower = label.toLowerCase();
        if (labelLower.includes('avançado')) return [22, 163, 74]; // Verde escuro
        if (labelLower.includes('adequado')) return [132, 204, 22]; // Verde lima
        if (labelLower.includes('básico')) return [251, 191, 36]; // Amarelo
        if (labelLower.includes('abaixo')) return [239, 68, 68]; // Vermelho
        return [156, 163, 175]; // Cinza padrão
      };

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
        const municipalityName = apiData.estatisticas_gerais?.municipio || selectedMunicipality;
        const stateName = apiData.estatisticas_gerais?.estado || (selectedState !== 'all' ? selectedState : 'AL');
        const locationText = `${municipalityName?.toUpperCase() || 'MUNICÍPIO'} - ${stateName}`;
        doc.text(locationText, centerX, y, { align: 'center' });

        y += 8;

        // Secretaria
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.textGray); // Cinza
        doc.setFont('helvetica', 'normal');
        doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', centerX, y, { align: 'center' });

        y += 18;

        // Determinar o tipo de relatório baseado nos dados da API
        const reportType = apiData.estatisticas_gerais?.tipo || (isMunicipalView ? 'municipio' : 'escola');
        const serieFromApi = apiData.estatisticas_gerais?.serie;
        const escolaFromApi = apiData.estatisticas_gerais?.escola;

        // Título principal - ajustar de acordo com o tipo de dados
        doc.setFontSize(24);
        doc.setTextColor(...COLORS.textDark); // Preto
        doc.setFont('helvetica', 'bold');
        let mainTitle = 'RELATÓRIO ESCOLAR';
        if (reportType === 'municipio' || isMunicipalView) {
          mainTitle = 'RELATÓRIO MUNICIPAL';
        } else if (reportType === 'turma') {
          mainTitle = 'RELATÓRIO POR TURMA';
        } else if (reportType === 'serie') {
          mainTitle = 'RELATÓRIO POR SÉRIE';
        } else if (reportType === 'escola') {
          mainTitle = 'RELATÓRIO POR ESCOLA';
        }
        doc.text(mainTitle, centerX, y, { align: 'center' });

        y += 20;

        // Card de informações - tamanho dinâmico baseado nos campos a exibir
        const cardWidth = pageWidth - 120; // Reduzido: mais estreito
        // Calcular altura do card baseado nos campos que serão exibidos
        let fieldsCount = 2; // Avaliação e Município são sempre exibidos
        if (!isMunicipalView || escolaFromApi) fieldsCount++; // Escola
        if (serieFromApi) fieldsCount++; // Série
        if (apiData.estatisticas_gerais?.data_aplicacao) fieldsCount++; // Data
        const cardHeight = 30 + (fieldsCount * 8); // Altura base + espaço por campo
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

        // Título do card - ajustar de acordo com tipo de relatório
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary); // Roxo
        doc.setFont('helvetica', 'bold');
        let cardTitle = 'INFORMAÇÕES DA AVALIAÇÃO';
        if (reportType === 'municipio' || isMunicipalView) {
          cardTitle = 'INFORMAÇÕES DO MUNICÍPIO';
        } else if (reportType === 'turma') {
          cardTitle = 'INFORMAÇÕES DA TURMA';
        } else if (reportType === 'serie') {
          cardTitle = 'INFORMAÇÕES DA SÉRIE';
        } else if (reportType === 'escola') {
          cardTitle = 'INFORMAÇÕES DA ESCOLA';
        }
        doc.text(cardTitle, centerX, cardY, { align: 'center' });

        cardY += 9;

        // Informações em formato tabular (label: valor)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        const leftColX = cardX + 12;
        const labelWidth = 32; // Espaçamento adequado para evitar sobreposição

        // AVALIAÇÃO
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary); // Labels em roxo
        doc.text('AVALIAÇÃO:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark); // Valores em preto
        const avaliacaoText = apiData.estatisticas_gerais?.nome || 'N/A';
        const avaliacaoLines = doc.splitTextToSize(avaliacaoText, cardWidth - labelWidth - 24);
        doc.text(avaliacaoLines, leftColX + labelWidth, cardY);
        cardY += Math.max(5, avaliacaoLines.length * 4);

        // MUNICÍPIO
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('MUNICÍPIO:', leftColX, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        doc.text(municipalityName || 'N/A', leftColX + labelWidth, cardY);
        cardY += 5;

        // ESCOLA (exibir se escola selecionada ou se API retorna escola)
        if (!isMunicipalView || escolaFromApi) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text('ESCOLA:', leftColX, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          const escolaText = escolaFromApi || selectedSchoolInfo?.name || 'Escola Selecionada';
          const escolaLines = doc.splitTextToSize(escolaText.toUpperCase(), cardWidth - labelWidth - 24);
          doc.text(escolaLines, leftColX + labelWidth, cardY);
          cardY += Math.max(5, escolaLines.length * 4);
        }

        // SÉRIE (exibir se a API retorna série)
        if (serieFromApi) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text('SÉRIE:', leftColX, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          doc.text(serieFromApi.toUpperCase(), leftColX + labelWidth, cardY);
          cardY += 5;
        }

        // DATA (se disponível)
        if (apiData.estatisticas_gerais?.data_aplicacao) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text('DATA:', leftColX, cardY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          doc.text(new Date(apiData.estatisticas_gerais.data_aplicacao).toLocaleDateString('pt-BR'), leftColX + labelWidth, cardY);
          cardY += 5;
        }
      };

      // Função auxiliar: Adicionar cabeçalho institucional
      const addHeader = (): number => {
        let y = 20;
        const centerX = pageWidth / 2;

        // Município + UF
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(55, 65, 81);
        const municipalityName = apiData.estatisticas_gerais?.municipio || selectedMunicipality;
        const stateName = apiData.estatisticas_gerais?.estado || (selectedState !== 'all' ? selectedState : 'AL');
        const municipalityText = `${municipalityName?.toUpperCase() || 'MUNICÍPIO'} - ${stateName}`;
        doc.text(municipalityText, centerX, y, { align: 'center', maxWidth: pageWidth - 2 * margin });
        y += 5;

        // Secretaria
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', centerX, y, { align: 'center' });
        y += 6;

        // Nome da escola ou "RELATÓRIO MUNICIPAL"
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(55, 65, 81);
        const schoolLabel = isMunicipalView 
          ? 'RELATÓRIO MUNICIPAL' 
          : (selectedSchoolInfo?.name || 'ESCOLA SELECIONADA').toUpperCase();
        doc.text(schoolLabel, centerX, y, { align: 'center', maxWidth: pageWidth - 2 * margin });
        y += 5;

        // Nome da avaliação
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        const evaluationName = apiData.estatisticas_gerais?.nome || 'AVALIAÇÃO';
        doc.text(evaluationName.toUpperCase(), centerX, y, { align: 'center', maxWidth: pageWidth - 2 * margin });
        y += 10;

        return y;
      };

      // ===== CAPA INICIAL =====
      addInitialCover();
      pageCount++;

      // ===== PÁGINA 1: Cards de resumo + Tabela de desempenho =====
      doc.addPage();
      pageCount++;
      let startY = addHeader();

      // Cards de resumo (grid 2x2)
      if (summaryStats) {
        const cardWidth = (pageWidth - 2 * margin - 5) / 2;
        const cardHeight = 28;
        const gap = 5;

        const cards = [
          { 
            label: 'MÉDIA GERAL LP', 
            value: formatAverage(summaryStats.mediaLP),
            badge: 'LP',
            badgeBg: [237, 233, 254],
            badgeText: [124, 58, 237]
          },
          { 
            label: 'MÉDIA GERAL MAT', 
            value: formatAverage(summaryStats.mediaMAT),
            badge: 'MAT',
            badgeBg: [254, 243, 199],
            badgeText: [217, 119, 6]
          },
          { 
            label: 'MÉDIA GERAL', 
            value: formatAverage(summaryStats.mediaGeral),
            badge: 'Todas',
            badgeBg: [224, 231, 255],
            badgeText: [79, 70, 229]
          },
          { 
            label: 'PROFICIÊNCIA MÉDIA', 
            value: formatProficiency(summaryStats.proficienciaMedia),
            badge: summaryStats.proficiencyLabel || '--',
            badgeBg: summaryStats.proficiencyLabel ? generateClassificationColor(summaryStats.proficiencyLabel) : [229, 231, 235],
            badgeText: [255, 255, 255]
          }
        ];

        cards.forEach((card, index) => {
          const row = Math.floor(index / 2);
          const col = index % 2;
          const x = margin + col * (cardWidth + gap);
          const y = startY + row * (cardHeight + gap);

          // Card background
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.1);
          doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

          // Card header
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text(card.label, x + 3, y + 5, { maxWidth: cardWidth - 6 });

          // Card value
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(20);
          doc.setTextColor(17, 24, 39);
          doc.text(card.value, x + 3, y + 17);

          // Badge
          const badgeBgColor = Array.isArray(card.badgeBg) ? card.badgeBg : [card.badgeBg];
          const badgeTextColor = Array.isArray(card.badgeText) ? card.badgeText : [card.badgeText];
          
          // Calcular largura do badge baseado no texto
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const badgeTextWidth = doc.getTextWidth(card.badge);
          const badgeWidth = Math.max(20, badgeTextWidth + 6);
          
          doc.setFillColor(badgeBgColor[0], badgeBgColor[1], badgeBgColor[2]);
          doc.roundedRect(x + 3, y + 20, badgeWidth, 5, 1, 1, 'F');
          doc.setTextColor(badgeTextColor[0], badgeTextColor[1], badgeTextColor[2]);
          doc.text(card.badge, x + 3 + badgeWidth / 2, y + 23.5, { align: 'center' });
        });

        startY += 2 * (cardHeight + gap) + 5;
      }

      // Título da seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(124, 58, 237);
      const sectionTitle = `Desempenho por ${isMunicipalView ? 'Escola' : 'Turma'}`;
      doc.text(sectionTitle, margin, startY, { maxWidth: pageWidth - 2 * margin });
      startY += 8;

      // Tabela de desempenho
      if (classSummaryRows.length > 0) {
        const tableData: (string | number)[][] = [];
        
        classSummaryRows.forEach(row => {
          // Truncar nomes muito longos
          const turmaName = row.turma.length > 35 ? row.turma.substring(0, 32) + '...' : row.turma;
          tableData.push([
            turmaName,
            formatAverage(row.mediaLP),
            formatAverage(row.mediaMAT),
            formatAverage(row.mediaGeral),
            formatPercentageValue(row.comparecimento),
            formatProficiency(row.proficienciaMedia),
            row.proficiencyLabel || '--'
          ]);
        });

        // Adicionar linha total
        if (summaryStats) {
          tableData.push([
            isMunicipalView ? 'Total Município' : 'Total Escola',
            formatAverage(summaryStats.mediaLP),
            formatAverage(summaryStats.mediaMAT),
            formatAverage(summaryStats.mediaGeral),
            formatPercentageValue(summaryStats.comparecimentoGeral),
            formatProficiency(summaryStats.proficienciaMedia),
            summaryStats.proficiencyLabel || '--'
          ]);
        }

        autoTable(doc, {
          startY: startY,
          head: [[
            isMunicipalView ? 'ESCOLA' : 'TURMA',
            'MÉDIA LP',
            'MÉDIA MAT',
            'MÉDIA GERAL',
            'COMPAREC.',
            'PROFIC. MÉDIA',
            'NÍVEL PROFIC.'
          ]],
          body: tableData,
          theme: 'grid',
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
            lineColor: [229, 231, 235],
            lineWidth: 0.1,
            valign: 'middle',
            overflow: 'linebreak'
          },
          headStyles: {
            fillColor: [124, 58, 237],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8
          },
          bodyStyles: { textColor: [55, 65, 81] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 'auto', minCellWidth: 32 },
            1: { halign: 'center', cellWidth: 17 },
            2: { halign: 'center', cellWidth: 17 },
            3: { halign: 'center', cellWidth: 19 },
            4: { halign: 'center', cellWidth: 19 },
            5: { halign: 'center', cellWidth: 20 },
            6: { halign: 'center', cellWidth: 'auto', minCellWidth: 30 }
          },
          didDrawCell: (data) => {
            // Colorir última coluna (Nível Proficiência)
            if (data.section === 'body' && data.column.index === 6) {
              const textValue = (Array.isArray(data.cell.text) ? data.cell.text[0] : data.cell.text || '').toString().trim();
              
              if (textValue !== '--') {
                const [r, g, b] = generateClassificationColor(textValue);
                
                doc.setFillColor(r, g, b);
                doc.roundedRect(data.cell.x + 1.5, data.cell.y + 1.5, data.cell.width - 3, data.cell.height - 3, 2, 2, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.text(
                  textValue,
                  data.cell.x + data.cell.width / 2,
                  data.cell.y + data.cell.height / 2 + 2,
                  { align: 'center', maxWidth: data.cell.width - 4 }
                );
              }
            }

            // Destacar linha total
            if (data.section === 'body' && data.row.index === tableData.length - 1) {
              if (data.column.index < 6) {
                data.cell.styles.fillColor = [238, 242, 255];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });
      }

      addFooter(pageCount);

      // ===== PÁGINA 2: Gráficos de distribuição por classificação =====
      if (distributionCharts.length > 0) {
        doc.addPage();
        pageCount++;
        
        let yPos = addHeader();

        // Título da seção
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(124, 58, 237);
        doc.text('Distribuição Percentual por Nível de Proficiência', margin, yPos, { maxWidth: pageWidth - 2 * margin });
        yPos += 10;

        distributionCharts.forEach((chart, chartIndex) => {
          // Calcular altura necessária para o gráfico
          const numSegments = chart.segments.length;
          const barHeight = 14; // Aumentado de 10 para 14 (barras mais robustas)
          const barGap = 5;
          const chartHeight = 18 + (numSegments * (barHeight + barGap)) + 12;
          
          // Verificar se precisa de nova página
          if (yPos + chartHeight + 10 > pageHeight - 20) {
            addFooter(pageCount);
            doc.addPage();
            pageCount++;
            yPos = addHeader() + 10;
          }

          // Card do gráfico com sombra mais profissional
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.2);
          doc.roundedRect(margin, yPos, pageWidth - 2 * margin, chartHeight, 3, 3, 'FD');

          // Título do gráfico
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(17, 24, 39);
          doc.text(chart.title, pageWidth / 2, yPos + 9, { align: 'center', maxWidth: pageWidth - 2 * margin - 10 });

          let barY = yPos + 18;
          const maxValue = Math.max(...chart.segments.map(s => s.value), 1);

          chart.segments.forEach((segment) => {
            const labelWidth = 48;
            const barStartX = margin + 10 + labelWidth;
            const barMaxWidth = pageWidth - 2 * margin - labelWidth - 42;
            const barWidth = (segment.value / maxValue) * barMaxWidth;

            // Label
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(55, 65, 81);
            const labelText = segment.label.length > 18 ? segment.label.substring(0, 16) + '...' : segment.label;
            doc.text(labelText, margin + 10, barY + 9);

            // Extrair cor RGB
            const hexColor = segment.color;
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);

            // Barra com estilo mais profissional
            if (segment.value > 0) {
              // Sombra sutil da barra
              doc.setFillColor(r * 0.8, g * 0.8, b * 0.8);
              doc.rect(barStartX + 0.5, barY + 0.5, Math.max(barWidth, 3), barHeight, 'F');
              
              // Barra principal com bordas retas (mais profissional)
              doc.setFillColor(r, g, b);
              doc.rect(barStartX, barY, Math.max(barWidth, 3), barHeight, 'F');

              // Borda da barra
              doc.setDrawColor(r * 0.7, g * 0.7, b * 0.7);
              doc.setLineWidth(0.3);
              doc.rect(barStartX, barY, Math.max(barWidth, 3), barHeight);

              // Valor dentro da barra (se houver espaço)
              if (barWidth > 25) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text(segment.value.toString(), barStartX + barWidth - 5, barY + 9, { align: 'right' });
              }
            } else {
              // Barra vazia (apenas contorno)
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.5);
              doc.rect(barStartX, barY, 3, barHeight);
            }

            // Quantidade e Percentual fora da barra
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(55, 65, 81);
            const valueText = segment.value > 0 && barWidth <= 25 ? `${segment.value} ` : '';
            doc.text(`${valueText}(${segment.percentage.toFixed(1)}%)`, barStartX + barMaxWidth + 5, barY + 9);

            barY += barHeight + barGap;
          });

          // Total com destaque
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          doc.text(`Total: ${chart.total} alunos`, pageWidth / 2, yPos + chartHeight - 5, { align: 'center' });

          yPos += chartHeight + 12;
        });

        // Resumo de totais
        if (summaryStats) {
          if (yPos + 15 > pageHeight - 20) {
            addFooter(pageCount);
            doc.addPage();
            pageCount++;
            yPos = addHeader() + 10;
          }

          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(229, 231, 235);
          doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 2, 2, 'FD');
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          const totalText = `Matrículas: ${summaryStats.totalMatriculados || 0} · Avaliados: ${summaryStats.totalAvaliados || 0} · Comparecimento: ${formatPercentageValue(summaryStats.comparecimentoGeral)}`;
          doc.text(totalText, pageWidth / 2, yPos + 7.5, { align: 'center' });
        }

        addFooter(pageCount);
      }

      // ===== PÁGINAS 3+: Distribuição por níveis de proficiência =====
      if (proficiencyDistributions.length > 0) {
        proficiencyDistributions.forEach((distribution) => {
          doc.addPage();
          pageCount++;
          
          let yPos = addHeader();

          // Título
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(17, 24, 39);
          doc.text(distribution.title, pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 2 * margin });
          yPos += 12;

          // Tabela de percentuais
          const tableBody = distribution.rows.map(row => [
            row.label,
            ...row.data.map((v, index) => {
              const quantidade = distribution.bars[index]?.quantidade || 0;
              return `${quantidade}\n${v.toFixed(2)}%`;
            })
          ]);

          const hexColor = distribution.color;
          const r = parseInt(hexColor.slice(1, 3), 16);
          const g = parseInt(hexColor.slice(3, 5), 16);
          const b = parseInt(hexColor.slice(5, 7), 16);

          // Definir largura da primeira coluna (label)
          const labelColumnWidth = 50;
          
          autoTable(doc, {
            startY: yPos,
            head: [['', ...distribution.columns]],
            body: tableBody,
            theme: 'grid',
            margin: { left: margin, right: margin },
            styles: {
              fontSize: 9,
              cellPadding: 2,
              halign: 'center',
              valign: 'middle'
            },
            headStyles: {
              fillColor: [r, g, b],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 9
            },
            columnStyles: {
              0: { halign: 'left', fontStyle: 'bold', cellWidth: labelColumnWidth }
            },
            bodyStyles: { textColor: [55, 65, 81] },
            alternateRowStyles: { fillColor: [248, 250, 252] }
          });

          const finalY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || yPos) + 10;

          // Gráfico de barras verticais (verificar espaço disponível)
          const requiredSpace = 110; // Espaço necessário para o gráfico
          let chartStartY = finalY;
          
          // Se não há espaço suficiente, criar nova página
          if (finalY + requiredSpace > pageHeight - 20) {
            addFooter(pageCount);
            doc.addPage();
            pageCount++;
            chartStartY = addHeader() + 10;
          }

          const chartHeight = 80;
          const barCount = distribution.bars.length;
          
          // Calcular área disponível para as barras (excluindo a primeira coluna de label)
          const availableWidth = pageWidth - 2 * margin - labelColumnWidth;
          
          // Calcular largura de cada barra para alinhar com as colunas da tabela
          const barWidth = availableWidth / barCount;
          const barPadding = barWidth * 0.15; // 15% de padding em cada lado
          const actualBarWidth = barWidth - (2 * barPadding);
          
          const maxValue = Math.max(...distribution.bars.map(b => b.value), 1);
          
          // Desenhar linha vertical sutil para marcar o início da área de dados (alinhamento visual)
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.line(margin + labelColumnWidth, chartStartY - 2, margin + labelColumnWidth, chartStartY + chartHeight + 8);
          
          // Label do eixo Y (à esquerda das barras)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text('Percentual', margin + 2, chartStartY + chartHeight / 2, { angle: 90 });

          distribution.bars.forEach((bar, index) => {
            // Alinhar com as colunas da tabela
            const barX = margin + labelColumnWidth + (index * barWidth) + barPadding;
            const barHeight = (bar.value / maxValue) * chartHeight;
            const barY = chartStartY + chartHeight - barHeight;

            // Quantidade acima da barra
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            const quantityText = `${bar.quantidade || 0}`;
            doc.text(quantityText, barX + actualBarWidth / 2, Math.max(chartStartY + 5, barY - 2), { align: 'center' });

            // Fundo da barra
            doc.setFillColor(241, 245, 249);
            doc.rect(barX, chartStartY, actualBarWidth, chartHeight, 'F');

            // Barra colorida
            if (barHeight > 0) {
              doc.setFillColor(r, g, b);
              doc.rect(barX, barY, actualBarWidth, Math.max(barHeight, 2), 'F');
            }

            // Label do nível (alinhado com a coluna)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(55, 65, 81);
            doc.text(bar.label, barX + actualBarWidth / 2, chartStartY + chartHeight + 5, { align: 'center' });
          });

          addFooter(pageCount);
        });
      }

      // Salvar PDF
      const evaluationName = apiData.estatisticas_gerais?.nome || "relatorio_escolar";
      const scopeLabel = isMunicipalView
        ? `municipio_${selectedMunicipality !== "all" ? selectedMunicipality : "todos"}`
        : `escola_${selectedSchoolInfo?.name || selectedSchool || "selecionada"}`;

      const fileName = `relatorio_escolar_${sanitizeFileName(evaluationName)}_${sanitizeFileName(scopeLabel)}_${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;

      doc.save(fileName);

      toast({
        title: "Relatório gerado com sucesso",
        description: `O PDF "${fileName}" foi criado com sucesso.`
      });

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível criar o arquivo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [
    apiData,
    classSummaryRows,
    distributionCharts,
    isMunicipalView,
    proficiencyDistributions,
    selectedEvaluation,
    selectedMunicipality,
    selectedSchool,
    selectedSchoolInfo,
    selectedState,
    summaryStats,
    toast,
    user?.role,
    userHierarchyContext
  ]);

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
          
          // ✅ NOVO: Buscar relatório completo para obter dados agregados por turma
          let relatorioCompletoData: RelatorioCompleto | null = null;
          if (selectedEvaluation !== 'all') {
            try {
              const options = selectedSchool !== 'all' 
                ? { schoolId: selectedSchool }
                : { cityId: selectedMunicipality };
              relatorioCompletoData = await EvaluationResultsApiService.getRelatorioCompleto(selectedEvaluation, options);
              setRelatorioCompleto(relatorioCompletoData);
            } catch (relatorioError) {
              setRelatorioCompleto(null);
            }
          } else {
            setRelatorioCompleto(null);
          }
          
          if (evaluationsResponse) {
            // ✅ NOVO: Fallback - Se disciplina está vazia quando escola específica está selecionada, buscar dados do município e filtrar
            if (evaluationsResponse.tabela_detalhada) {
              const tabela = evaluationsResponse.tabela_detalhada;
              const disciplinasComAlunos = tabela.disciplinas?.filter(
                d => d.alunos && Array.isArray(d.alunos) && d.alunos.length > 0
              ).length || 0;
              
              if (disciplinasComAlunos === 0 && selectedSchool !== 'all' && filters.escola) {
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
                    
                    // Obter nome da escola selecionada das estatísticas gerais
                    const nomeEscolaSelecionada = evaluationsResponse.estatisticas_gerais?.escola;
                    
                    if (municipioDisciplinasComAlunos > 0 && nomeEscolaSelecionada) {
                      // Filtrar alunos que pertencem à escola selecionada
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
                      }
                    }
                  }
                } catch (fallbackError) {
                  // Erro silencioso no fallback
                }
              }
            }
            
            setApiData(evaluationsResponse);
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
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Relatório Escolar
          </h1>
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
                onClick={handleDownloadReport}
                disabled={isGeneratingReport || !apiData}
                className="flex items-center gap-2"
                variant="outline"
                data-export-hide="true"
                aria-label="Baixar relatório escolar em PDF"
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

                          return (
                            <div key={segment.key} className="flex items-center gap-3">
                              <div className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium text-foreground">
                                <span
                                  className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: segment.color }}
                                ></span>
                                <span className="truncate">{segment.label}</span>
                              </div>
                              <div className="relative flex flex-1 items-center rounded-full bg-muted overflow-hidden min-w-0">
                                <div
                                  className="h-3 rounded-full transition-all"
                                  style={{
                                    width,
                                    backgroundColor: segment.color
                                  }}
                                ></div>
                              </div>
                              <span className="w-10 shrink-0 text-right text-xs font-semibold text-foreground whitespace-nowrap">
                                {segment.value}
                              </span>
                              <span className="w-12 shrink-0 text-right text-xs font-semibold text-foreground whitespace-nowrap">
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
                    <CardContent className="space-y-6">
                      {/* Versão Mobile: Layout compacto sem scroll */}
                      <div className="block md:hidden space-y-4">
                        {/* Tabela compacta mobile - Grid responsivo */}
                        <div className="space-y-3">
                          {distribution.rows.map(row => (
                            <div key={row.label} className="border rounded-lg p-3 bg-muted/20">
                              <div className="font-semibold text-sm mb-2.5 text-foreground pb-2 border-b">{row.label}</div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {row.data.map((value, index) => (
                                  <div key={index} className="flex flex-col items-center p-2 bg-background rounded-md border border-border/50">
                                    <span className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                                      {distribution.columns[index]}
                                    </span>
                                    <span className="text-sm font-bold text-foreground">{value.toFixed(1)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Gráfico de barras mobile - Grid compacto */}
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {distribution.bars.map((bar, index) => {
                              const heightPercentage = (bar.value / maxValue) * 100;
                              return (
                                <div key={bar.label} className="flex flex-col items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {bar.quantidade || 0} {bar.quantidade === 1 ? 'aluno' : 'alunos'}
                                  </span>
                                  <div className="flex h-28 w-full max-w-[70px] items-end justify-center rounded-t-md bg-muted/50">
                                    <div
                                      className="w-full rounded-t-md transition-all shadow-sm"
                                      style={{
                                        height: `${heightPercentage}%`,
                                        backgroundColor: distribution.color,
                                        minHeight: heightPercentage > 0 ? '3px' : '0'
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-foreground text-center leading-tight">
                                    {bar.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Versão Desktop: Tabela e gráfico alinhados */}
                      <div className="hidden md:block">
                        {/* Tabela de percentuais */}
                        <div className="mb-6">
                          <table className="w-full border-collapse text-sm">
                            <colgroup>
                              <col className="w-[150px]" />
                              {distribution.columns.map((_, index) => (
                                <col key={index} className="w-[80px]" />
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
                                    className="px-3 py-2 text-center font-semibold text-white text-sm"
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
                                  <td className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">
                                    {row.label}
                                  </td>
                                  {row.data.map((value, index) => (
                                    <td key={index} className="px-3 py-2 text-center text-muted-foreground text-sm">
                                      {value.toFixed(2)}%
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Gráfico de barras alinhado com a tabela */}
                        <div className="mt-6">
                          <table className="w-full border-collapse">
                            <colgroup>
                              <col className="w-[150px]" />
                              {distribution.columns.map((_, index) => (
                                <col key={index} className="w-[80px]" />
                              ))}
                            </colgroup>
                            <tbody>
                              <tr>
                                <td className="px-3"></td>
                                {distribution.bars.map((bar, index) => {
                                  const heightPercentage = (bar.value / maxValue) * 100;
                                  return (
                                    <td key={bar.label} className="px-3 align-bottom">
                                      <div className="flex flex-col items-center gap-2 w-full">
                                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                          {bar.quantidade || 0} {bar.quantidade === 1 ? 'aluno' : 'alunos'}
                                        </span>
                                        <div className="flex h-40 w-full max-w-[60px] mx-auto items-end justify-center rounded-t-lg bg-muted">
                                          <div
                                            className="w-full rounded-t-lg transition-all"
                                            style={{
                                              height: `${heightPercentage}%`,
                                              backgroundColor: distribution.color,
                                              minHeight: heightPercentage > 0 ? '2px' : '0'
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-semibold text-foreground text-center whitespace-nowrap">
                                          {bar.label}
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
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

