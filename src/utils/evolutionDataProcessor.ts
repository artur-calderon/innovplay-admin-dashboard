import { ComparisonResponse } from '@/services/evaluationComparisonApi';
import { EvolutionData } from '@/components/evolution/EvolutionChart';

export interface ProcessedEvolutionData {
  /** "Geral" por etapa (notas) */
  generalData: EvolutionData[];
  /** "Geral" por etapa (proficiência) */
  proficiencyData: EvolutionData[];
  /** "Classificação/Aprovação" geral */
  approvalData: EvolutionData[];
  /** por disciplina (notas) */
  subjectData: Record<string, EvolutionData[]>;
  /** por disciplina (proficiência) */
  subjectProficiencyData: Record<string, EvolutionData[]>;
  /** classificação por disciplina (opcional) */
  classificationData: Record<string, EvolutionData[]>;
  /** dados por nível de proficiência */
  levelsData: Record<string, EvolutionData[]>;
  /** nomes das avaliações para exibição */
  evaluationNames: string[];
}

/**
 * Processa dados de comparação da API para formato dos gráficos
 */
export function processComparisonData(comparison: ComparisonResponse): ProcessedEvolutionData {
  const generalData = processGeneralComparison(comparison);
  const proficiencyData = processProficiencyComparison(comparison);
  const subjectData = processSubjectComparison(comparison);
  const subjectProficiencyData = processSubjectProficiencyComparison(comparison);
  const approvalData = processApprovalData(comparison);
  const classificationData = processClassificationData(comparison);
  const levelsData = processLevelsData(comparison);
  
  // Extrair nomes das avaliações
  const evaluationNames = comparison.evaluations
    ?.sort((a, b) => a.order - b.order)
    ?.map(evaluation => evaluation.title) || [];

  return {
    generalData,
    proficiencyData,
    subjectData,
    subjectProficiencyData,
    approvalData,
    classificationData,
    levelsData,
    evaluationNames
  };
}

/**
 * Processa dados gerais (média geral de todas as avaliações)
 */
function processGeneralComparison(comparison: ComparisonResponse): EvolutionData[] {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return [];
  }

  // NOVO: Coletar todos os valores das avaliações
  const values: number[] = [];
  const variations: number[] = [];
  
  // Primeira comparação tem evaluation_1 e evaluation_2
  if (comparison.comparisons[0]) {
    const first = comparison.comparisons[0].general_comparison;
    values.push(first.average_grade.evaluation_1);
    values.push(first.average_grade.evaluation_2);
    variations.push(first.average_grade.evolution.percentage);
  }
  
  // Comparações subsequentes só adicionam evaluation_2 (evita duplicatas)
  for (let i = 1; i < comparison.comparisons.length; i++) {
    const comp = comparison.comparisons[i].general_comparison;
    values.push(comp.average_grade.evaluation_2);
    variations.push(comp.average_grade.evolution.percentage);
  }
  
  // Criar UM único registro com todas as etapas dinamicamente
  const result: any = {
    name: "GERAL",
  };
  
  // Adicionar todas as etapas dinamicamente
  values.forEach((value, index) => {
    const etapaKey = `etapa${index + 1}`;
    result[etapaKey] = value;
  });
  
  // Adicionar todas as variações dinamicamente
  variations.forEach((variation, index) => {
    const variacaoKey = `variacao_${index + 1}_${index + 2}`;
    result[variacaoKey] = variation;
  });
  
  return [result];
}

/**
 * Processa dados de proficiência geral
 */
function processProficiencyComparison(comparison: ComparisonResponse): EvolutionData[] {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return [];
  }

  // NOVO: Coletar todos os valores de proficiência
  const values: number[] = [];
  const variations: number[] = [];
  
  // Primeira comparação tem evaluation_1 e evaluation_2
  if (comparison.comparisons[0]) {
    const first = comparison.comparisons[0].general_comparison;
    
    // Verificar se average_proficiency existe
    if (first.average_proficiency) {
      values.push(first.average_proficiency.evaluation_1);
      values.push(first.average_proficiency.evaluation_2);
      variations.push(first.average_proficiency.evolution.percentage);
    } else {
      // Se não há dados de proficiência, retornar array vazio
      return [];
    }
  }
  
  // Comparações subsequentes só adicionam evaluation_2 (evita duplicatas)
  for (let i = 1; i < comparison.comparisons.length; i++) {
    const comp = comparison.comparisons[i].general_comparison;
    if (comp.average_proficiency) {
      values.push(comp.average_proficiency.evaluation_2);
      variations.push(comp.average_proficiency.evolution.percentage);
    }
  }
  
  // Criar UM único registro com todas as etapas dinamicamente
  const result: any = {
    name: "PROFICIÊNCIA",
  };
  
  // Adicionar todas as etapas dinamicamente
  values.forEach((value, index) => {
    const etapaKey = `etapa${index + 1}`;
    result[etapaKey] = value;
  });
  
  // Adicionar todas as variações dinamicamente
  variations.forEach((variation, index) => {
    const variacaoKey = `variacao_${index + 1}_${index + 2}`;
    result[variacaoKey] = variation;
  });
  
  return [result];
}

/**
 * Normaliza nome de disciplina para comparação
 */
function normalizeSubjectName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Processa dados por disciplina
 */
function processSubjectComparison(comparison: ComparisonResponse): { [subjectName: string]: EvolutionData[] } {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return {};
  }

  const subjectData: { [subjectName: string]: EvolutionData[] } = {};
  
  // Coletar todas as disciplinas de todas as comparações e normalizar
  const allSubjectsMap = new Map<string, string>(); // normalized -> original
  
  comparison.comparisons.forEach(comp => {
    Object.keys(comp.subject_comparison).forEach(subjectName => {
      const normalized = normalizeSubjectName(subjectName);
      if (!allSubjectsMap.has(normalized)) {
        allSubjectsMap.set(normalized, subjectName);
      }
    });
  });
  
  // Para cada disciplina normalizada, verificar se existe em todas as comparações
  allSubjectsMap.forEach((originalName, normalizedName) => {
    // Verificar se a disciplina existe em todas as comparações
    const existsInAll = comparison.comparisons.every(comp => {
      return Object.keys(comp.subject_comparison).some(name => 
        normalizeSubjectName(name) === normalizedName
      );
    });
    
    if (!existsInAll) {
      // Pular disciplinas que não existem em todas as comparações
      return;
    }
    
    const values: number[] = [];
    const variations: number[] = [];
    
    // Primeira comparação
    if (comparison.comparisons[0]) {
      // Encontrar a disciplina na primeira comparação (pode ter case diferente)
      const firstCompSubjectKey = Object.keys(comparison.comparisons[0].subject_comparison).find(
        name => normalizeSubjectName(name) === normalizedName
      );
      
      if (firstCompSubjectKey) {
        const subj = comparison.comparisons[0].subject_comparison[firstCompSubjectKey];
        if (subj && subj.average_grade) {
          values.push(subj.average_grade.evaluation_1);
          values.push(subj.average_grade.evaluation_2);
          variations.push(subj.average_grade.evolution.percentage);
        }
      }
    }
    
    // Comparações subsequentes
    for (let i = 1; i < comparison.comparisons.length; i++) {
      const compSubjectKey = Object.keys(comparison.comparisons[i].subject_comparison).find(
        name => normalizeSubjectName(name) === normalizedName
      );
      
      if (compSubjectKey) {
        const subj = comparison.comparisons[i].subject_comparison[compSubjectKey];
        if (subj && subj.average_grade) {
          values.push(subj.average_grade.evaluation_2);
          variations.push(subj.average_grade.evolution.percentage);
        }
      }
    }
    
    // Só adicionar se tiver valores válidos
    if (values.length > 0) {
      const result: any = {
        name: originalName.toUpperCase(),
      };
      
      // Adicionar todas as etapas dinamicamente
      values.forEach((value, index) => {
        const etapaKey = `etapa${index + 1}`;
        result[etapaKey] = value;
      });
      
      // Adicionar todas as variações dinamicamente
      variations.forEach((variation, index) => {
        const variacaoKey = `variacao_${index + 1}_${index + 2}`;
        result[variacaoKey] = variation;
      });
      
      subjectData[originalName] = [result];
    }
  });
  
  return subjectData;
}

/**
 * Processa dados de proficiência por disciplina
 */
function processSubjectProficiencyComparison(comparison: ComparisonResponse): { [subjectName: string]: EvolutionData[] } {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return {};
  }

  const subjectData: { [subjectName: string]: EvolutionData[] } = {};
  
  // Coletar todas as disciplinas de todas as comparações e normalizar
  const allSubjectsMap = new Map<string, string>(); // normalized -> original
  
  comparison.comparisons.forEach(comp => {
    Object.keys(comp.subject_comparison).forEach(subjectName => {
      const normalized = normalizeSubjectName(subjectName);
      if (!allSubjectsMap.has(normalized)) {
        allSubjectsMap.set(normalized, subjectName);
      }
    });
  });
  
  // Para cada disciplina normalizada, verificar se existe em todas as comparações
  allSubjectsMap.forEach((originalName, normalizedName) => {
    // Verificar se a disciplina existe em todas as comparações
    const existsInAll = comparison.comparisons.every(comp => {
      return Object.keys(comp.subject_comparison).some(name => 
        normalizeSubjectName(name) === normalizedName
      );
    });
    
    if (!existsInAll) {
      // Pular disciplinas que não existem em todas as comparações
      return;
    }
    
    const values: number[] = [];
    const variations: number[] = [];
    
    // Primeira comparação
    if (comparison.comparisons[0]) {
      // Encontrar a disciplina na primeira comparação (pode ter case diferente)
      const firstCompSubjectKey = Object.keys(comparison.comparisons[0].subject_comparison).find(
        name => normalizeSubjectName(name) === normalizedName
      );
      
      if (firstCompSubjectKey) {
        const subj = comparison.comparisons[0].subject_comparison[firstCompSubjectKey];
        if (subj && subj.average_proficiency) {
          values.push(subj.average_proficiency.evaluation_1);
          values.push(subj.average_proficiency.evaluation_2);
          variations.push(subj.average_proficiency.evolution.percentage);
        }
      }
    }
    
    // Comparações subsequentes
    for (let i = 1; i < comparison.comparisons.length; i++) {
      const compSubjectKey = Object.keys(comparison.comparisons[i].subject_comparison).find(
        name => normalizeSubjectName(name) === normalizedName
      );
      
      if (compSubjectKey) {
        const subj = comparison.comparisons[i].subject_comparison[compSubjectKey];
        if (subj && subj.average_proficiency) {
          values.push(subj.average_proficiency.evaluation_2);
          variations.push(subj.average_proficiency.evolution.percentage);
        }
      }
    }
    
    // Só adicionar se tiver valores válidos
    if (values.length > 0) {
      const result: any = {
        name: originalName.toUpperCase(),
      };
      
      // Adicionar todas as etapas dinamicamente
      values.forEach((value, index) => {
        const etapaKey = `etapa${index + 1}`;
        result[etapaKey] = value;
      });
      
      // Adicionar todas as variações dinamicamente
      variations.forEach((variation, index) => {
        const variacaoKey = `variacao_${index + 1}_${index + 2}`;
        result[variacaoKey] = variation;
      });
      
      subjectData[originalName] = [result];
    }
  });
  
  return subjectData;
}

/**
 * Processa dados de participação
 */
function processParticipationData(comparison: ComparisonResponse): EvolutionData[] {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return [];
  }

  const data: EvolutionData[] = [];
  
  comparison.comparisons.forEach((comp, index) => {
    const general = comp.general_comparison;
    
    // Calcular taxa de participação (assumindo que temos dados de total de alunos)
    const participation1 = general.total_students.evaluation_1 > 0 
      ? (general.total_students.evaluation_1 / general.total_students.evaluation_1) * 100 
      : 0;
    const participation2 = general.total_students.evaluation_2 > 0 
      ? (general.total_students.evaluation_2 / general.total_students.evaluation_2) * 100 
      : 0;
    
    const variation = participation1 > 0 ? ((participation2 - participation1) / participation1) * 100 : 0;
    
    data.push({
      name: "PARTICIPAÇÃO",
      etapa1: participation1,
      etapa2: participation2,
      variacao_1_2: variation
    });

    // Se houver terceira avaliação
    if (index < comparison.comparisons.length - 1) {
      const nextComp = comparison.comparisons[index + 1];
      const nextGeneral = nextComp.general_comparison;
      
      const participation3 = nextGeneral.total_students.evaluation_2 > 0 
        ? (nextGeneral.total_students.evaluation_2 / nextGeneral.total_students.evaluation_2) * 100 
        : 0;
      
      const variation2 = participation2 > 0 ? ((participation3 - participation2) / participation2) * 100 : 0;
      
      data[data.length - 1].etapa3 = participation3;
      data[data.length - 1].variacao_2_3 = variation2;
    }
  });

  return data;
}

/**
 * Processa dados de aprovação (alunos com nota >= 6.0)
 */
function processApprovalData(comparison: ComparisonResponse): EvolutionData[] {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return [];
  }

  // NOVO: Coletar todos os valores de aprovação
  const values: number[] = [];
  const variations: number[] = [];
  
  // Primeira comparação
  if (comparison.comparisons[0]) {
    const general = comparison.comparisons[0].general_comparison;
    const approval1 = calculateApprovalRate(general.classification_distribution.evaluation_1);
    const approval2 = calculateApprovalRate(general.classification_distribution.evaluation_2);
    
    values.push(approval1);
    values.push(approval2);
    variations.push(approval1 > 0 ? ((approval2 - approval1) / approval1) * 100 : 0);
  }
  
  // Comparações subsequentes
  for (let i = 1; i < comparison.comparisons.length; i++) {
    const general = comparison.comparisons[i].general_comparison;
    const approval = calculateApprovalRate(general.classification_distribution.evaluation_2);
    values.push(approval);
    
    const prevApproval = values[values.length - 2];
    const variation = prevApproval > 0 ? ((approval - prevApproval) / prevApproval) * 100 : 0;
    variations.push(variation);
  }
  
  // Criar UM único registro com todas as etapas dinamicamente
  const result: any = {
    name: "APROVAÇÃO",
  };
  
  // Adicionar todas as etapas dinamicamente
  values.forEach((value, index) => {
    const etapaKey = `etapa${index + 1}`;
    result[etapaKey] = value;
  });
  
  // Adicionar todas as variações dinamicamente
  variations.forEach((variation, index) => {
    const variacaoKey = `variacao_${index + 1}_${index + 2}`;
    result[variacaoKey] = variation;
  });
  
  return [result];
}

/**
 * Processa dados de classificação por disciplina
 */
function processClassificationData(comparison: ComparisonResponse): { [subjectName: string]: EvolutionData[] } {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return {};
  }

  const classificationData: { [subjectName: string]: EvolutionData[] } = {};
  
  // Coletar todas as disciplinas de todas as comparações e normalizar
  const allSubjectsMap = new Map<string, string>(); // normalized -> original
  
  comparison.comparisons.forEach(comp => {
    Object.keys(comp.subject_comparison).forEach(subjectName => {
      const normalized = normalizeSubjectName(subjectName);
      if (!allSubjectsMap.has(normalized)) {
        allSubjectsMap.set(normalized, subjectName);
      }
    });
  });
  
  // Para cada disciplina normalizada, verificar se existe em todas as comparações
  allSubjectsMap.forEach((originalName, normalizedName) => {
    // Verificar se a disciplina existe em todas as comparações
    const existsInAll = comparison.comparisons.every(comp => {
      return Object.keys(comp.subject_comparison).some(name => 
        normalizeSubjectName(name) === normalizedName
      );
    });
    
    if (!existsInAll) {
      // Pular disciplinas que não existem em todas as comparações
      return;
    }
    
    const values: number[] = [];
    const variations: number[] = [];
    
    // Primeira comparação
    if (comparison.comparisons[0]) {
      // Encontrar a disciplina na primeira comparação (pode ter case diferente)
      const firstCompSubjectKey = Object.keys(comparison.comparisons[0].subject_comparison).find(
        name => normalizeSubjectName(name) === normalizedName
      );
      
      if (firstCompSubjectKey) {
        const subjectData = comparison.comparisons[0].subject_comparison[firstCompSubjectKey];
        if (subjectData && subjectData.classification_distribution) {
          const levels1 = subjectData.classification_distribution.evaluation_1;
          const levels2 = subjectData.classification_distribution.evaluation_2;
          
          const approval1 = calculateApprovalRate(levels1);
          const approval2 = calculateApprovalRate(levels2);
          
          values.push(approval1);
          values.push(approval2);
          variations.push(approval1 > 0 ? ((approval2 - approval1) / approval1) * 100 : 0);
        }
      }
    }
    
    // Comparações subsequentes
    for (let i = 1; i < comparison.comparisons.length; i++) {
      const compSubjectKey = Object.keys(comparison.comparisons[i].subject_comparison).find(
        name => normalizeSubjectName(name) === normalizedName
      );
      
      if (compSubjectKey) {
        const subjectData = comparison.comparisons[i].subject_comparison[compSubjectKey];
        if (subjectData && subjectData.classification_distribution) {
          const levels = subjectData.classification_distribution.evaluation_2;
          const approval = calculateApprovalRate(levels);
          values.push(approval);
          
          const prevApproval = values[values.length - 2];
          const variation = prevApproval > 0 ? ((approval - prevApproval) / prevApproval) * 100 : 0;
          variations.push(variation);
        }
      }
    }
    
    // Só adicionar se tiver valores válidos
    if (values.length > 0) {
      const result: any = {
        name: originalName.toUpperCase(),
      };
      
      // Adicionar todas as etapas dinamicamente
      values.forEach((value, index) => {
        const etapaKey = `etapa${index + 1}`;
        result[etapaKey] = value;
      });
      
      // Adicionar todas as variações dinamicamente
      variations.forEach((variation, index) => {
        const variacaoKey = `variacao_${index + 1}_${index + 2}`;
        result[variacaoKey] = variation;
      });
      
      classificationData[originalName] = [result];
    }
  });
  
  return classificationData;
}

/**
 * Busca valor de um nível na distribuição, tentando diferentes variações do nome
 */
function getLevelValue(distribution: Record<string, number>, levelName: string): number {
  if (!distribution) return 0;
  
  // Tentar diferentes variações do nome
  const variations = [
    levelName,
    levelName.toLowerCase(),
    levelName.toUpperCase(),
    levelName.replace(/[áàâã]/gi, 'a').replace(/[éê]/gi, 'e').replace(/[íî]/gi, 'i').replace(/[óôõ]/gi, 'o').replace(/[úû]/gi, 'u').replace(/[ç]/gi, 'c'),
    levelName.replace(/[áàâã]/gi, 'a').replace(/[éê]/gi, 'e').replace(/[íî]/gi, 'i').replace(/[óôõ]/gi, 'o').replace(/[úû]/gi, 'u').replace(/[ç]/gi, 'c').toLowerCase(),
  ];
  
  // Variações específicas por nível
  if (levelName === 'Abaixo do Básico') {
    variations.push('abaixo_do_basico', 'Abaixo do básico', 'abaixo do básico', 'Abaixo do Basico');
  } else if (levelName === 'Básico') {
    variations.push('basico', 'Basico', 'BÁSICO');
  } else if (levelName === 'Adequado') {
    variations.push('adequado', 'ADEQUADO', 'Adequado');
  } else if (levelName === 'Avançado') {
    variations.push('avancado', 'Avançado', 'AVANÇADO', 'Avançado');
  }
  
  // Buscar o primeiro valor encontrado
  for (const variation of variations) {
    if (distribution[variation] !== undefined) {
      return distribution[variation];
    }
  }
  
  return 0;
}

/**
 * Processa dados de níveis de proficiência (quantidade de alunos por nível)
 */
function processLevelsData(comparison: ComparisonResponse): Record<string, EvolutionData[]> {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return {};
  }

  const levelsData: Record<string, EvolutionData[]> = {};
  
  // Níveis esperados
  const levelNames = ['Abaixo do Básico', 'Básico', 'Adequado', 'Avançado'];
  
  // Para cada nível, coletar dados de todas as avaliações
  levelNames.forEach(levelName => {
    const values: number[] = [];
    const variations: number[] = [];
    
    // Primeira comparação tem evaluation_1 e evaluation_2
    if (comparison.comparisons[0]) {
      const general = comparison.comparisons[0].general_comparison;
      const dist1 = general.classification_distribution?.evaluation_1 || {};
      const dist2 = general.classification_distribution?.evaluation_2 || {};
      
      const actualValue1 = getLevelValue(dist1, levelName);
      const actualValue2 = getLevelValue(dist2, levelName);
      
      values.push(actualValue1);
      values.push(actualValue2);
      
      // Calcular variação percentual
      const variation = actualValue1 > 0 ? ((actualValue2 - actualValue1) / actualValue1) * 100 : (actualValue2 > 0 ? 100 : 0);
      variations.push(variation);
    }
    
    // Comparações subsequentes só adicionam evaluation_2 (evita duplicatas)
    for (let i = 1; i < comparison.comparisons.length; i++) {
      const general = comparison.comparisons[i].general_comparison;
      const dist2 = general.classification_distribution?.evaluation_2 || {};
      
      const actualValue = getLevelValue(dist2, levelName);
      values.push(actualValue);
      
      // Calcular variação percentual
      const prevValue = values[values.length - 2];
      const variation = prevValue > 0 ? ((actualValue - prevValue) / prevValue) * 100 : (actualValue > 0 ? 100 : 0);
      variations.push(variation);
    }
    
    // Só adicionar se tiver valores válidos
    if (values.length > 0) {
      const result: any = {
        name: levelName.toUpperCase(),
      };
      
      // Adicionar todas as etapas dinamicamente
      values.forEach((value, index) => {
        const etapaKey = `etapa${index + 1}`;
        result[etapaKey] = value;
      });
      
      // Adicionar todas as variações dinamicamente
      variations.forEach((variation, index) => {
        const variacaoKey = `variacao_${index + 1}_${index + 2}`;
        result[variacaoKey] = variation;
      });
      
      levelsData[levelName] = [result];
    }
  });
  
  return levelsData;
}

/**
 * Calcula taxa de aprovação baseada na distribuição de classificação
 */
function calculateApprovalRate(classificationDistribution: Record<string, number>): number {
  const total = Object.values(classificationDistribution).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) return 0;
  
  // Considerar "Adequado" e "Avançado" como aprovados
  const adequate = classificationDistribution['Adequado'] || 0;
  const advanced = classificationDistribution['Avançado'] || 0;
  
  return ((adequate + advanced) / total) * 100;
}

/**
 * Obtém domínio do eixo Y baseado na métrica
 */
export function getYAxisDomain(metric: string): [number, number] {
  switch (metric) {
    case 'grade':
      return [0, 10];
    case 'proficiency':
      return [0, 425];
    case 'participation':
    case 'approval':
      return [0, 100];
    default:
      return [0, 10];
  }
}

/**
 * Obtém label do eixo Y baseado na métrica
 */
export function getYAxisLabel(metric: string): string {
  switch (metric) {
    case 'grade':
      return 'Nota (0-10)';
    case 'proficiency':
      return 'Proficiência';
    case 'participation':
      return 'Participação (%)';
    case 'approval':
      return 'Taxa de Aprovação (%)';
    default:
      return 'Valor';
  }
}

