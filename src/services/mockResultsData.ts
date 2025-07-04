import { EvaluationResultsData, StudentProficiency, ClassPerformance, calculateProficiency } from "@/types/evaluation-results";

// Dados base para geração realista
const SCHOOLS = [
  { id: "school-001", name: "E.M. João Silva", municipality: "São Paulo" },
  { id: "school-002", name: "E.E. Maria Santos", municipality: "São Paulo" },
  { id: "school-003", name: "Colégio Dom Pedro", municipality: "São Paulo" },
  { id: "school-004", name: "E.E. Santos Dumont", municipality: "São Paulo" },
  { id: "school-005", name: "E.M. Monteiro Lobato", municipality: "Rio de Janeiro" },
  { id: "school-006", name: "Colégio São José", municipality: "Rio de Janeiro" },
  { id: "school-007", name: "E.E. Machado de Assis", municipality: "Belo Horizonte" },
  { id: "school-008", name: "E.M. Villa-Lobos", municipality: "Belo Horizonte" },
  { id: "school-009", name: "Colégio Tiradentes", municipality: "Salvador" },
  { id: "school-010", name: "E.E. Castro Alves", municipality: "Salvador" }
];

const SUBJECTS = [
  { id: "math", name: "Matemática" },
  { id: "port", name: "Português" },
  { id: "sci", name: "Ciências" },
  { id: "hist", name: "História" },
  { id: "geo", name: "Geografia" },
  { id: "eng", name: "Inglês" },
  { id: "art", name: "Arte" },
  { id: "pe", name: "Educação Física" }
];

const COURSES = [
  { id: "course-001", name: "Anos Iniciais" },
  { id: "course-002", name: "Anos Finais" },
  { id: "course-003", name: "Ensino Médio" }
];

const GRADES = [
  { id: "grade-001", name: "1º Ano", course: "Anos Iniciais" },
  { id: "grade-002", name: "2º Ano", course: "Anos Iniciais" },
  { id: "grade-003", name: "3º Ano", course: "Anos Iniciais" },
  { id: "grade-004", name: "4º Ano", course: "Anos Iniciais" },
  { id: "grade-005", name: "5º Ano", course: "Anos Iniciais" },
  { id: "grade-006", name: "6º Ano", course: "Anos Finais" },
  { id: "grade-007", name: "7º Ano", course: "Anos Finais" },
  { id: "grade-008", name: "8º Ano", course: "Anos Finais" },
  { id: "grade-009", name: "9º Ano", course: "Anos Finais" },
  { id: "grade-010", name: "1º Ano EM", course: "Ensino Médio" },
  { id: "grade-011", name: "2º Ano EM", course: "Ensino Médio" },
  { id: "grade-012", name: "3º Ano EM", course: "Ensino Médio" }
];

const STUDENT_NAMES = [
  "Ana Silva Santos", "Carlos Eduardo Lima", "Maria Fernanda Costa", "Pedro Henrique Oliveira",
  "Julia Martins Silva", "Roberto Santos Lima", "Larissa Oliveira Costa", "Gabriel Souza Pereira",
  "Beatriz Almeida Rocha", "Lucas Ferreira Nunes", "Camila Santos Barbosa", "Rafael Costa Mendes",
  "Isabela Rodrigues Dias", "Matheus Silva Cardoso", "Fernanda Oliveira Gomes", "João Pedro Alves",
  "Sophia Pereira Castro", "Enzo Gabriel Santos", "Valentina Costa Lima", "Arthur Rodrigues Silva",
  "Helena Martins Souza", "Davi Almeida Ferreira", "Alice Santos Rocha", "Bernardo Costa Neves",
  "Manuela Oliveira Dias", "Samuel Silva Barbosa", "Lívia Pereira Gomes", "Miguel Santos Alves",
  "Laura Rodrigues Castro", "Heitor Costa Martins", "Giovanna Silva Lima", "Nicolas Almeida Santos",
  "Emanuelly Ferreira", "Gustavo Henrique", "Yasmin Oliveira", "Cauã Silva", "Melissa Santos",
  "Ryan Pereira", "Lara Costa", "Kaique Almeida", "Pietra Rodrigues", "Kauê Martins",
  "Esther Lima", "Murilo Barbosa", "Catarina Gomes", "Theo Santos", "Antonella Castro",
  "Benjamin Alves", "Cecília Nunes", "Caleb Ferreira", "Maitê Dias", "Gael Oliveira",
  "Agatha Silva", "Noah Lima", "Maya Santos", "Anthony Costa", "Clarice Pereira",
  "Ravi Almeida", "Isis Rodrigues", "Vicente Martins", "Stella Barbosa", "Apolo Gomes"
];

// ✅ CONSTANTES PARA DADOS CONSISTENTES
const TARGET_TOTAL_STUDENTS = 251;
const TARGET_DISTRIBUTION = {
  abaixo_do_basico: 123, // 49.0%
  basico: 35,            // 13.9% 
  adequado: 35,          // 13.9%
  avancado: 58           // 23.1%
};

// Exportar para uso em outros arquivos
export const MOCK_DATA_CONSTANTS = {
  TARGET_TOTAL_STUDENTS,
  TARGET_DISTRIBUTION
};

export function generateMockResultsData(): EvaluationResultsData[] {
  const results: EvaluationResultsData[] = [];
  
  // ✅ PLANEJAMENTO PARA CONSISTÊNCIA TOTAL
  // Vamos gerar dados que resultem em exatamente 251 alunos analisados
  // Distribuição alvo: 123 Abaixo + 35 Básico + 35 Adequado + 58 Avançado = 251 total
  
  // Calcular quantos alunos cada avaliação deve ter para atingir o total
  const numEvaluations = 25;
  let remainingStudents = TARGET_TOTAL_STUDENTS;
  let evaluationStudentCounts: number[] = [];
  
  // Distribuir alunos entre as avaliações de forma realista (20-35 por avaliação)
  for (let i = 0; i < numEvaluations; i++) {
    if (i === numEvaluations - 1) {
      // Última avaliação pega os alunos restantes
      evaluationStudentCounts.push(remainingStudents);
    } else {
      const minStudents = Math.max(8, Math.min(20, remainingStudents - (numEvaluations - i - 1) * 8));
      const maxStudents = Math.min(35, remainingStudents - (numEvaluations - i - 1) * 8);
      const studentsForThisEval = Math.floor(Math.random() * (maxStudents - minStudents + 1)) + minStudents;
      evaluationStudentCounts.push(studentsForThisEval);
      remainingStudents -= studentsForThisEval;
    }
  }
  
  // Gerar 25 avaliações diversificadas
  for (let i = 0; i < numEvaluations; i++) {
    const school = SCHOOLS[Math.floor(Math.random() * SCHOOLS.length)];
    const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
    const grade = GRADES[Math.floor(Math.random() * GRADES.length)];
    const course = COURSES.find(c => c.name === grade.course)!;
    
    // Gerar datas variadas nos últimos 3 meses
    const daysAgo = Math.floor(Math.random() * 90);
    const appliedDate = new Date();
    appliedDate.setDate(appliedDate.getDate() - daysAgo);
    
    const status = Math.random() > 0.8 ? 'pending' : (Math.random() > 0.9 ? 'in_progress' : 'completed');
    
    // ✅ USAR CONTAGEM PLANEJADA DE ALUNOS
    const completedStudents = evaluationStudentCounts[i];
    const totalStudents = completedStudents + Math.floor(Math.random() * 3); // Alguns ausentes/pendentes
    const absentStudents = Math.floor(Math.random() * 2);
    const pendingStudents = totalStudents - completedStudents - absentStudents;
    
    // Gerar performance baseada na dificuldade da disciplina e série
    let basePerformance = 0.6; // Base 60%
    
    // Ajustar por disciplina
    if (subject.id === 'math') basePerformance -= 0.1; // Matemática mais difícil
    if (subject.id === 'port') basePerformance += 0.05; // Português um pouco mais fácil
    if (subject.id === 'art' || subject.id === 'pe') basePerformance += 0.15; // Disciplinas práticas
    
    // Ajustar por série (mais avançado = mais difícil)
    const gradeNumber = parseInt(grade.name);
    if (gradeNumber >= 8) basePerformance -= 0.05;
    if (grade.name.includes('EM')) basePerformance -= 0.1;
    
    // Gerar nota média com variação
    const averageRawScore = Math.max(3, Math.min(10, 
      (basePerformance * 10) + (Math.random() - 0.5) * 3
    ));
    
    const averageProficiency = Math.round(averageRawScore * 100);
    
    // ✅ GERAR DISTRIBUIÇÃO PROPORCIONAL AO TARGET
    const proportion = completedStudents / TARGET_TOTAL_STUDENTS;
    const distribution = {
      abaixo_do_basico: Math.round(TARGET_DISTRIBUTION.abaixo_do_basico * proportion),
      basico: Math.round(TARGET_DISTRIBUTION.basico * proportion),
      adequado: Math.round(TARGET_DISTRIBUTION.adequado * proportion),
      avancado: Math.round(TARGET_DISTRIBUTION.avancado * proportion)
    };
    
    // Ajustar para garantir que a soma seja exata
    const totalInDistribution = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const diff = completedStudents - totalInDistribution;
    if (diff !== 0) {
      // Ajustar o nível com mais alunos
      const maxLevel = Object.entries(distribution).reduce((max, [level, count]) => 
        count > max.count ? { level: level as keyof typeof distribution, count } : max
      , { level: 'abaixo_do_basico' as keyof typeof distribution, count: 0 });
      distribution[maxLevel.level] += diff;
    }
    
    // Gerar turmas (1-3 turmas por avaliação)
    const numClasses = Math.floor(Math.random() * 3) + 1;
    const classesPerformance: ClassPerformance[] = [];
    
    for (let j = 0; j < numClasses; j++) {
      const className = `${grade.name.charAt(0)}${String.fromCharCode(65 + j)}`; // A, B, C
      const classStudents = Math.floor(totalStudents / numClasses);
      const classCompleted = Math.floor(completedStudents / numClasses);
      
      // Distribuição proporcional para a turma
      const classDistribution = {
        abaixo_do_basico: Math.round(distribution.abaixo_do_basico / numClasses),
        basico: Math.round(distribution.basico / numClasses),
        adequado: Math.round(distribution.adequado / numClasses),
        avancado: Math.round(distribution.avancado / numClasses)
      };
      
      classesPerformance.push({
        classId: `class-${i}-${j}`,
        className,
        averageProficiency: averageProficiency + (Math.random() - 0.5) * 100,
        averageScore: averageRawScore + (Math.random() - 0.5) * 1.5,
        totalStudents: classStudents,
        completedStudents: classCompleted,
        distributionByLevel: classDistribution
      });
    }
    
    const result: EvaluationResultsData = {
      id: `result-${i + 1}`,
      evaluationId: `eval-${i + 1}`,
      evaluationTitle: `${getEvaluationType()} de ${subject.name} - ${grade.name}`,
      subject: subject.name,
      subjectId: subject.id,
      course: course.name,
      courseId: course.id,
      grade: grade.name,
      gradeId: grade.id,
      school: school.name,
      schoolId: school.id,
      municipality: school.municipality,
      municipalityId: school.municipality.toLowerCase().replace(/\s+/g, '-'),
      appliedAt: appliedDate.toISOString(),
      correctedAt: status === 'completed' ? new Date(appliedDate.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      status: status as any,
      totalStudents,
      completedStudents,
      pendingStudents,
      absentStudents,
      averageRawScore: Number(averageRawScore.toFixed(1)),
      averageProficiency,
      distributionByLevel: distribution,
      classesPerformance,
      studentsData: generateStudentsDataWithDistribution(subject.id, completedStudents, grade.name, classesPerformance, distribution)
    };
    
    results.push(result);
  }
  
  return results.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

function getEvaluationType(): string {
  const types = [
    "Avaliação", "Simulado", "Prova", "Teste", "Diagnóstica", 
    "Recuperação", "Bimestral", "Trimestral", "Mensal"
  ];
  return types[Math.floor(Math.random() * types.length)];
}

function generateDistribution(totalStudents: number, averageScore: number, grade: string, subject: string) {
  const distribution = {
    abaixo_do_basico: 0,
    basico: 0,
    adequado: 0,
    avancado: 0
  };
  
  if (totalStudents === 0) return distribution;
  
  // Distribuir alunos baseado na média
  for (let i = 0; i < totalStudents; i++) {
    const studentScore = Math.max(0, Math.min(10, 
      averageScore + (Math.random() - 0.5) * 4
    ));
    
    const proficiency = calculateProficiency(studentScore, 20, grade, subject);
    distribution[proficiency.proficiencyLevel]++;
  }
  
  return distribution;
}

function generateStudentsData(
  subject: string, 
  count: number, 
  grade: string,
  classes: ClassPerformance[]
): StudentProficiency[] {
  const students: StudentProficiency[] = [];
  
  for (let i = 0; i < count; i++) {
    const className = classes[i % classes.length]?.className || `${grade.charAt(0)}A`;
    
    // Gerar nota base com distribuição mais realista
    const baseScore = Math.random() * 10;
    const rawScore = Math.max(0, Math.min(10, baseScore + (Math.random() - 0.5) * 2));
    
    // Calcular proficiência
    const proficiencyData = calculateProficiency(rawScore, 20, grade, subject);
    
    // Gerar dados de questões (varia por disciplina)
    const totalQuestions = subject === 'math' ? 25 : subject === 'port' ? 30 : 20;
    const correctAnswers = Math.round((rawScore / 10) * totalQuestions);
    const wrongAnswers = Math.max(0, totalQuestions - correctAnswers - Math.floor(Math.random() * 4));
    const blankAnswers = totalQuestions - correctAnswers - wrongAnswers;
    
    // Tempo gasto varia por disciplina e série
    let baseTime = 60; // 60 minutos base
    if (subject === 'math') baseTime += 30; // Matemática demora mais
    if (grade.includes('EM')) baseTime += 20; // Ensino médio demora mais
    
    const timeSpent = Math.floor(baseTime + (Math.random() - 0.5) * 40);
    
    students.push({
      studentId: `student-${subject}-${i + 1}`,
      studentName: STUDENT_NAMES[i % STUDENT_NAMES.length],
      studentClass: className,
      rawScore: Number(rawScore.toFixed(1)),
      proficiencyScore: proficiencyData.proficiencyScore,
      proficiencyLevel: proficiencyData.proficiencyLevel,
      classification: proficiencyData.classification,
      answeredQuestions: totalQuestions,
      correctAnswers,
      wrongAnswers,
      blankAnswers,
      timeSpent,
      status: Math.random() > 0.98 ? 'pending' : 'completed' as any
    });
  }
  
  return students;
}

function generateStudentsDataWithDistribution(
  subject: string, 
  count: number, 
  grade: string,
  classes: ClassPerformance[],
  distribution: { abaixo_do_basico: number; basico: number; adequado: number; avancado: number }
): StudentProficiency[] {
  const students: StudentProficiency[] = [];
  
  // ✅ CRIAR ALUNOS RESPEITANDO EXATAMENTE A DISTRIBUIÇÃO
  const levels: Array<{ level: keyof typeof distribution; count: number }> = [
    { level: 'abaixo_do_basico', count: distribution.abaixo_do_basico },
    { level: 'basico', count: distribution.basico },
    { level: 'adequado', count: distribution.adequado },
    { level: 'avancado', count: distribution.avancado }
  ];
  
  let studentIndex = 0;
  
  // ✅ GARANTIR QUE A SOMA DA DISTRIBUIÇÃO SEJA EXATAMENTE IGUAL AO COUNT
  const totalInDistribution = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (totalInDistribution !== count) {
    console.warn(`⚠️  Inconsistência detectada: distribuição soma ${totalInDistribution}, mas count é ${count}`);
    
    // Ajustar a distribuição para bater com o count
    const diff = count - totalInDistribution;
    if (diff > 0) {
      // Adicionar alunos ao nível com mais alunos
      const maxLevel = Object.entries(distribution).reduce((max, [level, levelCount]) => 
        levelCount > max.count ? { level: level as keyof typeof distribution, count: levelCount } : max
      , { level: 'abaixo_do_basico' as keyof typeof distribution, count: 0 });
      distribution[maxLevel.level] += diff;
    } else if (diff < 0) {
      // Remover alunos do nível com mais alunos
      const maxLevel = Object.entries(distribution).reduce((max, [level, levelCount]) => 
        levelCount > max.count ? { level: level as keyof typeof distribution, count: levelCount } : max
      , { level: 'abaixo_do_basico' as keyof typeof distribution, count: 0 });
      distribution[maxLevel.level] = Math.max(0, distribution[maxLevel.level] + diff);
    }
    
    // Atualizar os levels com a distribuição corrigida
    levels[0].count = distribution.abaixo_do_basico;
    levels[1].count = distribution.basico;
    levels[2].count = distribution.adequado;
    levels[3].count = distribution.avancado;
  }
  
  // Gerar alunos para cada nível de proficiência
  for (const { level, count: levelCount } of levels) {
    for (let i = 0; i < levelCount; i++) {
      const className = classes[studentIndex % classes.length]?.className || `${grade.charAt(0)}A`;
      
      // ✅ GERAR NOTA BASEADA NO NÍVEL DE PROFICIÊNCIA DESEJADO
      let rawScore: number;
      switch (level) {
        case 'abaixo_do_basico':
          rawScore = 2 + Math.random() * 3; // 2.0 - 5.0
          break;
        case 'basico':
          rawScore = 5 + Math.random() * 1.5; // 5.0 - 6.5
          break;
        case 'adequado':
          rawScore = 6.5 + Math.random() * 1.5; // 6.5 - 8.0
          break;
        case 'avancado':
          rawScore = 8 + Math.random() * 2; // 8.0 - 10.0
          break;
      }
      
      rawScore = Math.max(0, Math.min(10, rawScore));
      
      // Calcular proficiência (deve resultar no nível desejado)
      const proficiencyData = calculateProficiency(rawScore, 20, grade, subject);
      
      // ✅ FORÇAR O NÍVEL CORRETO SE NECESSÁRIO (para garantir consistência)
      const finalProficiencyData = {
        proficiencyScore: proficiencyData.proficiencyScore,
        proficiencyLevel: level,
        classification: level === 'abaixo_do_basico' ? 'Abaixo do Básico' :
                       level === 'basico' ? 'Básico' :
                       level === 'adequado' ? 'Adequado' : 'Avançado'
      };
      
      // Gerar dados de questões (varia por disciplina)
      const totalQuestions = subject === 'math' ? 25 : subject === 'port' ? 30 : 20;
      const correctAnswers = Math.round((rawScore / 10) * totalQuestions);
      const wrongAnswers = Math.max(0, totalQuestions - correctAnswers - Math.floor(Math.random() * 4));
      const blankAnswers = totalQuestions - correctAnswers - wrongAnswers;
      
      // Tempo gasto varia por disciplina e série
      let baseTime = 60; // 60 minutos base
      if (subject === 'math') baseTime += 30; // Matemática demora mais
      if (grade.includes('EM')) baseTime += 20; // Ensino médio demora mais
      
      const timeSpent = Math.floor(baseTime + (Math.random() - 0.5) * 40);
      
      students.push({
        studentId: `student-${subject}-${studentIndex + 1}`,
        studentName: STUDENT_NAMES[studentIndex % STUDENT_NAMES.length],
        studentClass: className,
        rawScore: Number(rawScore.toFixed(1)),
        proficiencyScore: finalProficiencyData.proficiencyScore,
        proficiencyLevel: finalProficiencyData.proficiencyLevel,
        classification: finalProficiencyData.classification,
        answeredQuestions: totalQuestions,
        correctAnswers,
        wrongAnswers,
        blankAnswers,
        timeSpent,
        status: Math.random() > 0.98 ? 'pending' : 'completed' as any
      });
      
      studentIndex++;
    }
  }
  
  // ✅ VALIDAÇÃO FINAL: Garantir que temos exatamente o número correto de alunos
  if (students.length !== count) {
    console.error(`❌ ERRO: Gerados ${students.length} alunos, mas esperava ${count}`);
  }
  
  return students;
}

// Função para filtrar dados mock
export function filterMockData(
  data: EvaluationResultsData[], 
  filters: {
    course?: string;
    subject?: string;
    class?: string;
    school?: string;
    municipality?: string;
    status?: string[];
    proficiencyRange?: [number, number];
    scoreRange?: [number, number];
    dateRange?: { start: string; end: string };
  }
): EvaluationResultsData[] {
  return data.filter(item => {
    // Filtro por curso
    if (filters.course && item.course !== filters.course) {
      return false;
    }
    
    // Filtro por disciplina
    if (filters.subject && item.subject !== filters.subject) {
      return false;
    }
    
    // Filtro por escola
    if (filters.school && item.school !== filters.school) {
      return false;
    }
    
    // Filtro por município
    if (filters.municipality && item.municipality !== filters.municipality) {
      return false;
    }
    
    // Filtro por status
    if (filters.status && filters.status.length > 0 && !filters.status.includes(item.status)) {
      return false;
    }
    
    // Filtro por range de proficiência
    if (filters.proficiencyRange) {
      const [min, max] = filters.proficiencyRange;
      if (item.averageProficiency < min || item.averageProficiency > max) {
        return false;
      }
    }
    
    // Filtro por range de nota
    if (filters.scoreRange) {
      const [min, max] = filters.scoreRange;
      if (item.averageRawScore < min || item.averageRawScore > max) {
        return false;
      }
    }
    
    // Filtro por data
    if (filters.dateRange) {
      const itemDate = new Date(item.appliedAt);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      if (itemDate < startDate || itemDate > endDate) {
        return false;
      }
    }
    
    return true;
  });
}

// Função para obter opções de filtros dos dados mock
export function getMockFilterOptions(data: EvaluationResultsData[]) {
  const courses = [...new Set(data.map(item => item.course))];
  const subjects = [...new Set(data.map(item => item.subject))];
  const schools = [...new Set(data.map(item => item.school))];
  const municipalities = [...new Set(data.map(item => item.municipality))];
  const classes = [...new Set(data.flatMap(item => 
    item.classesPerformance?.map(c => c.className) || []
  ))];
  
  return {
    courses: courses.sort(),
    subjects: subjects.sort(),
    schools: schools.sort(),
    municipalities: municipalities.sort(),
    classes: classes.sort()
  };
}

// Função para obter dados de resultados de avaliações
export async function getEvaluationResults(): Promise<EvaluationResultsData[]> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 500));
  return generateMockResultsData();
}

// Função para exportar resultados
export async function exportResults(ids: string[]): Promise<{ success: boolean; message?: string }> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    message: `Exportação concluída para ${ids.length} avaliações`
  };
} 