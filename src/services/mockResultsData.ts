import { EvaluationResultsData, StudentProficiency, ClassPerformance, calculateProficiency } from "@/types/evaluation-results";

export function generateMockResultsData(): EvaluationResultsData[] {
  return [
    {
      id: "result-1",
      evaluationId: "eval-1",
      evaluationTitle: "Avaliação de Matemática - 5º Ano",
      subject: "Matemática",
      subjectId: "math-001",
      course: "Anos Finais",
      courseId: "course-001",
      grade: "5º Ano",
      gradeId: "grade-005",
      school: "E.M. João Silva",
      schoolId: "school-001",
      municipality: "São Paulo",
      municipalityId: "sp-001",
      appliedAt: "2024-01-15T09:00:00Z",
      correctedAt: "2024-01-15T17:30:00Z",
      status: "completed",
      totalStudents: 32,
      completedStudents: 28,
      pendingStudents: 3,
      absentStudents: 1,
      averageRawScore: 7.2,
      averageProficiency: 650,
      distributionByLevel: {
        abaixo_do_basico: 3,
        basico: 8,
        adequado: 12,
        avancado: 5
      },
      classesPerformance: [
        {
          classId: "class-001",
          className: "5º A",
          averageProficiency: 680,
          averageScore: 7.5,
          totalStudents: 16,
          completedStudents: 15,
          distributionByLevel: {
            abaixo_do_basico: 1,
            basico: 3,
            adequado: 8,
            avancado: 3
          }
        },
        {
          classId: "class-002", 
          className: "5º B",
          averageProficiency: 620,
          averageScore: 6.9,
          totalStudents: 16,
          completedStudents: 13,
          distributionByLevel: {
            abaixo_do_basico: 2,
            basico: 5,
            adequado: 4,
            avancado: 2
          }
        }
      ],
      studentsData: generateStudentsData("math", 28)
    },
    {
      id: "result-2",
      evaluationId: "eval-2", 
      evaluationTitle: "Simulado de Português - 3º Ano",
      subject: "Português",
      subjectId: "port-001",
      course: "Anos Iniciais",
      courseId: "course-002",
      grade: "3º Ano",
      gradeId: "grade-003",
      school: "E.E. Maria Santos",
      schoolId: "school-002",
      municipality: "São Paulo",
      municipalityId: "sp-001",
      appliedAt: "2024-01-14T14:00:00Z",
      correctedAt: "2024-01-14T18:45:00Z",
      status: "completed",
      totalStudents: 25,
      completedStudents: 25,
      pendingStudents: 0,
      absentStudents: 0,
      averageRawScore: 6.8,
      averageProficiency: 580,
      distributionByLevel: {
        abaixo_do_basico: 4,
        basico: 9,
        adequado: 8,
        avancado: 4
      },
      classesPerformance: [
        {
          classId: "class-003",
          className: "3º A",
          averageProficiency: 590,
          averageScore: 7.0,
          totalStudents: 25,
          completedStudents: 25,
          distributionByLevel: {
            abaixo_do_basico: 4,
            basico: 9,
            adequado: 8,
            avancado: 4
          }
        }
      ],
      studentsData: generateStudentsData("port", 25)
    },
    {
      id: "result-3",
      evaluationId: "eval-3",
      evaluationTitle: "Prova de Ciências - 4º Ano",
      subject: "Ciências",
      subjectId: "sci-001",
      course: "Anos Iniciais",
      courseId: "course-002", 
      grade: "4º Ano",
      gradeId: "grade-004",
      school: "Colégio Dom Pedro",
      schoolId: "school-003",
      municipality: "São Paulo",
      municipalityId: "sp-001",
      appliedAt: "2024-01-16T10:00:00Z",
      status: "pending",
      totalStudents: 28,
      completedStudents: 15,
      pendingStudents: 13,
      absentStudents: 0,
      averageRawScore: 5.2,
      averageProficiency: 420,
      distributionByLevel: {
        abaixo_do_basico: 6,
        basico: 5,
        adequado: 3,
        avancado: 1
      },
      classesPerformance: [
        {
          classId: "class-004",
          className: "4º A",
          averageProficiency: 430,
          averageScore: 5.4,
          totalStudents: 14,
          completedStudents: 8,
          distributionByLevel: {
            abaixo_do_basico: 3,
            basico: 3,
            adequado: 2,
            avancado: 0
          }
        },
        {
          classId: "class-005",
          className: "4º B", 
          averageProficiency: 410,
          averageScore: 5.0,
          totalStudents: 14,
          completedStudents: 7,
          distributionByLevel: {
            abaixo_do_basico: 3,
            basico: 2,
            adequado: 1,
            avancado: 1
          }
        }
      ],
      studentsData: generateStudentsData("sci", 15)
    },
    {
      id: "result-4",
      evaluationId: "eval-4",
      evaluationTitle: "Avaliação de História - 6º Ano",
      subject: "História", 
      subjectId: "hist-001",
      course: "Anos Finais",
      courseId: "course-001",
      grade: "6º Ano",
      gradeId: "grade-006",
      school: "E.E. Santos Dumont",
      schoolId: "school-004",
      municipality: "São Paulo",
      municipalityId: "sp-001",
      appliedAt: "2024-01-12T08:30:00Z",
      correctedAt: "2024-01-12T16:00:00Z",
      status: "completed",
      totalStudents: 30,
      completedStudents: 30,
      pendingStudents: 0,
      absentStudents: 0,
      averageRawScore: 8.1,
      averageProficiency: 780,
      distributionByLevel: {
        abaixo_do_basico: 1,
        basico: 4,
        adequado: 15,
        avancado: 10
      },
      classesPerformance: [
        {
          classId: "class-006",
          className: "6º A",
          averageProficiency: 790,
          averageScore: 8.3,
          totalStudents: 15,
          completedStudents: 15,
          distributionByLevel: {
            abaixo_do_basico: 0,
            basico: 2,
            adequado: 8,
            avancado: 5
          }
        },
        {
          classId: "class-007",
          className: "6º B",
          averageProficiency: 770,
          averageScore: 7.9,
          totalStudents: 15,
          completedStudents: 15,
          distributionByLevel: {
            abaixo_do_basico: 1,
            basico: 2,
            adequado: 7,
            avancado: 5
          }
        }
      ],
      studentsData: generateStudentsData("hist", 30)
    }
  ];
}

function generateStudentsData(subject: string, count: number): StudentProficiency[] {
  const names = [
    "Ana Silva Santos", "Carlos Eduardo Lima", "Maria Fernanda Costa", "Pedro Henrique Oliveira",
    "Julia Martins Silva", "Roberto Santos Lima", "Larissa Oliveira Costa", "Gabriel Souza Pereira",
    "Beatriz Almeida Rocha", "Lucas Ferreira Nunes", "Camila Santos Barbosa", "Rafael Costa Mendes",
    "Isabela Rodrigues Dias", "Matheus Silva Cardoso", "Fernanda Oliveira Gomes", "João Pedro Alves",
    "Sophia Pereira Castro", "Enzo Gabriel Santos", "Valentina Costa Lima", "Arthur Rodrigues Silva",
    "Helena Martins Souza", "Davi Almeida Ferreira", "Alice Santos Rocha", "Bernardo Costa Neves",
    "Manuela Oliveira Dias", "Samuel Silva Barbosa", "Lívia Pereira Gomes", "Miguel Santos Alves",
    "Laura Rodrigues Castro", "Heitor Costa Martins", "Giovanna Silva Lima", "Nicolas Almeida Santos"
  ];

  const classes = ["A", "B", "C"];
  
  return Array.from({ length: count }, (_, index) => {
    // Gerar nota base com distribuição mais realista
    const baseScore = Math.random() * 10;
    const rawScore = Math.max(0, Math.min(10, baseScore + (Math.random() - 0.5) * 2));
    
    // Calcular proficiência
    const proficiencyData = calculateProficiency(rawScore, 20);
    
    // Gerar dados de questões
    const totalQuestions = 20;
    const correctAnswers = Math.round((rawScore / 10) * totalQuestions);
    const wrongAnswers = Math.max(0, totalQuestions - correctAnswers - Math.floor(Math.random() * 3));
    const blankAnswers = totalQuestions - correctAnswers - wrongAnswers;
    
    return {
      studentId: `student-${index + 1}`,
      studentName: names[index % names.length],
      studentClass: `${subject.charAt(0).toUpperCase()}${Math.floor(index / 10) + 1}º ${classes[index % 3]}`,
      rawScore: Number(rawScore.toFixed(1)),
      proficiencyScore: proficiencyData.proficiencyScore,
      proficiencyLevel: proficiencyData.proficiencyLevel,
      classification: proficiencyData.classification,
      answeredQuestions: totalQuestions,
      correctAnswers,
      wrongAnswers,
      blankAnswers,
      timeSpent: Math.floor(Math.random() * 60) + 30, // 30-90 minutos
      status: Math.random() > 0.95 ? 'pending' : 'completed' as any
    };
  });
} 