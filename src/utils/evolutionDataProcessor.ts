import { ComparisonResponse, EvolutionData } from '@/services/evaluationComparisonApi';

export interface ProcessedEvolutionData {
  generalData: EvolutionData[];
  subjectData: { [subjectName: string]: EvolutionData[] };
  participationData: EvolutionData[];
  approvalData: EvolutionData[];
  classificationData: { [subjectName: string]: EvolutionData[] };
}

/**
 * Processa dados de comparação da API para formato dos gráficos
 */
export function processComparisonData(comparison: ComparisonResponse): ProcessedEvolutionData {
  const generalData = processGeneralComparison(comparison);
  const subjectData = processSubjectComparison(comparison);
  const participationData = processParticipationData(comparison);
  const approvalData = processApprovalData(comparison);
  const classificationData = processClassificationData(comparison);

  return {
    generalData,
    subjectData,
    participationData,
    approvalData,
    classificationData
  };
}

/**
 * Processa dados gerais (média geral de todas as avaliações)
 */
function processGeneralComparison(comparison: ComparisonResponse): EvolutionData[] {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return [];
  }

  const data: EvolutionData[] = [];
  
  // Para cada comparação, extrair dados gerais
  comparison.comparisons.forEach((comp, index) => {
    const general = comp.general_comparison;
    
    data.push({
      name: "GERAL",
      etapa1: general.average_grade.evaluation_1,
      etapa2: general.average_grade.evaluation_2,
      variacao_1_2: general.average_grade.evolution.percentage
    });

    // Se houver terceira avaliação, adicionar dados da próxima comparação
    if (index < comparison.comparisons.length - 1) {
      const nextComp = comparison.comparisons[index + 1];
      const nextGeneral = nextComp.general_comparison;
      
      data[data.length - 1].etapa3 = nextGeneral.average_grade.evaluation_2;
      data[data.length - 1].variacao_2_3 = nextGeneral.average_grade.evolution.percentage;
    }
  });

  return data;
}

/**
 * Processa dados por disciplina
 */
function processSubjectComparison(comparison: ComparisonResponse): { [subjectName: string]: EvolutionData[] } {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return {};
  }

  const subjectData: { [subjectName: string]: EvolutionData[] } = {};
  
  comparison.comparisons.forEach((comp, index) => {
    const subjectComparison = comp.subject_comparison;
    
    Object.entries(subjectComparison).forEach(([subjectName, subjectData]) => {
      if (!subjectData[subjectName]) {
        subjectData[subjectName] = [];
      }
      
      subjectData[subjectName].push({
        name: subjectName.toUpperCase(),
        etapa1: subjectData.average_grade.evaluation_1,
        etapa2: subjectData.average_grade.evaluation_2,
        variacao_1_2: subjectData.average_grade.evolution.percentage
      });

      // Se houver terceira avaliação, adicionar dados da próxima comparação
      if (index < comparison.comparisons.length - 1) {
        const nextComp = comparison.comparisons[index + 1];
        const nextSubjectComparison = nextComp.subject_comparison;
        
        if (nextSubjectComparison[subjectName]) {
          const nextSubjectData = nextSubjectComparison[subjectName];
          const lastItem = subjectData[subjectName][subjectData[subjectName].length - 1];
          lastItem.etapa3 = nextSubjectData.average_grade.evaluation_2;
          lastItem.variacao_2_3 = nextSubjectData.average_grade.evolution.percentage;
        }
      }
    });
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

  const data: EvolutionData[] = [];
  
  comparison.comparisons.forEach((comp, index) => {
    const general = comp.general_comparison;
    
    // Calcular taxa de aprovação baseada na classificação
    const approval1 = calculateApprovalRate(general.classification_distribution.evaluation_1);
    const approval2 = calculateApprovalRate(general.classification_distribution.evaluation_2);
    
    const variation = approval1 > 0 ? ((approval2 - approval1) / approval1) * 100 : 0;
    
    data.push({
      name: "APROVAÇÃO",
      etapa1: approval1,
      etapa2: approval2,
      variacao_1_2: variation
    });

    // Se houver terceira avaliação
    if (index < comparison.comparisons.length - 1) {
      const nextComp = comparison.comparisons[index + 1];
      const nextGeneral = nextComp.general_comparison;
      
      const approval3 = calculateApprovalRate(nextGeneral.classification_distribution.evaluation_2);
      const variation2 = approval2 > 0 ? ((approval3 - approval2) / approval2) * 100 : 0;
      
      data[data.length - 1].etapa3 = approval3;
      data[data.length - 1].variacao_2_3 = variation2;
    }
  });

  return data;
}

/**
 * Processa dados de classificação por disciplina
 */
function processClassificationData(comparison: ComparisonResponse): { [subjectName: string]: EvolutionData[] } {
  if (!comparison.comparisons || comparison.comparisons.length === 0) {
    return {};
  }

  const classificationData: { [subjectName: string]: EvolutionData[] } = {};
  
  comparison.comparisons.forEach((comp, index) => {
    const subjectComparison = comp.subject_comparison;
    
    Object.entries(subjectComparison).forEach(([subjectName, subjectData]) => {
      if (!classificationData[subjectName]) {
        classificationData[subjectName] = [];
      }
      
      // Calcular percentual de alunos em cada nível
      const levels1 = subjectData.classification_distribution.evaluation_1;
      const levels2 = subjectData.classification_distribution.evaluation_2;
      
      // Calcular percentual de alunos "Adequado" e "Avançado" (considerados aprovados)
      const adequate1 = levels1['Adequado'] || 0;
      const advanced1 = levels1['Avançado'] || 0;
      const total1 = Object.values(levels1).reduce((sum, count) => sum + count, 0);
      const approval1 = total1 > 0 ? ((adequate1 + advanced1) / total1) * 100 : 0;
      
      const adequate2 = levels2['Adequado'] || 0;
      const advanced2 = levels2['Avançado'] || 0;
      const total2 = Object.values(levels2).reduce((sum, count) => sum + count, 0);
      const approval2 = total2 > 0 ? ((adequate2 + advanced2) / total2) * 100 : 0;
      
      const variation = approval1 > 0 ? ((approval2 - approval1) / approval1) * 100 : 0;
      
      classificationData[subjectName].push({
        name: subjectName.toUpperCase(),
        etapa1: approval1,
        etapa2: approval2,
        variacao_1_2: variation
      });

      // Se houver terceira avaliação
      if (index < comparison.comparisons.length - 1) {
        const nextComp = comparison.comparisons[index + 1];
        const nextSubjectComparison = nextComp.subject_comparison;
        
        if (nextSubjectComparison[subjectName]) {
          const nextSubjectData = nextSubjectComparison[subjectName];
          const nextLevels = nextSubjectData.classification_distribution.evaluation_2;
          
          const nextAdequate = nextLevels['Adequado'] || 0;
          const nextAdvanced = nextLevels['Avançado'] || 0;
          const nextTotal = Object.values(nextLevels).reduce((sum, count) => sum + count, 0);
          const nextApproval = nextTotal > 0 ? ((nextAdequate + nextAdvanced) / nextTotal) * 100 : 0;
          
          const nextVariation = approval2 > 0 ? ((nextApproval - approval2) / approval2) * 100 : 0;
          
          const lastItem = classificationData[subjectName][classificationData[subjectName].length - 1];
          lastItem.etapa3 = nextApproval;
          lastItem.variacao_2_3 = nextVariation;
        }
      }
    });
  });

  return classificationData;
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

