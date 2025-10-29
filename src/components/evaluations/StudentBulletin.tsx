import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Minus, Filter, BookOpen } from "lucide-react";
import { EvaluationApiService } from "@/services/evaluationApi";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import type { StudentDetailedResult } from "@/services/evaluationResultsApi";
import { Question, TestData } from "@/types/evaluation-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateProficiency, calculateGrade } from "@/utils/evaluationCalculator";

// Mapeamento de séries para cursos (duplicado de evaluation-results.ts para uso local)
const GRADE_TO_COURSE_MAPPING: Record<string, string> = {
  // Educação Infantil
  'Grupo 3': 'Anos Iniciais',
  'Grupo 4': 'Anos Iniciais', 
  'Grupo 5': 'Anos Iniciais',
  // Anos Iniciais
  '1º Ano': 'Anos Iniciais',
  '2º Ano': 'Anos Iniciais',
  '3º Ano': 'Anos Iniciais',
  '4º Ano': 'Anos Iniciais',
  '5º Ano': 'Anos Iniciais',
  // Anos Finais
  '6º Ano': 'Anos Finais',
  '7º Ano': 'Anos Finais',
  '8º Ano': 'Anos Finais',
  '9º Ano': 'Anos Finais',
  // Ensino Médio
  '1º Ano EM': 'Ensino Médio',
  '2º Ano EM': 'Ensino Médio',
  '3º Ano EM': 'Ensino Médio'
};

/**
 * Função auxiliar para mapear série/grade para nome do curso
 */
function mapGradeToCourse(grade?: string | null): string | null {
  if (!grade) return null;
  
  // Normalizar série (remover espaços extras, converter para título)
  const normalized = grade.trim();
  
  // Tentar match exato primeiro
  if (GRADE_TO_COURSE_MAPPING[normalized]) {
    return GRADE_TO_COURSE_MAPPING[normalized];
  }
  
  // Tentar match case-insensitive
  const lowerNormalized = normalized.toLowerCase();
  for (const [gradeKey, courseValue] of Object.entries(GRADE_TO_COURSE_MAPPING)) {
    if (gradeKey.toLowerCase() === lowerNormalized) {
      return courseValue;
    }
  }
  
  // Tentar extrair número da série de formatos como "6º Ano", "6 ano", etc
  const numberMatch = normalized.match(/(\d+)/);
  if (numberMatch) {
    const yearNumber = parseInt(numberMatch[1], 10);
    if (yearNumber >= 1 && yearNumber <= 5) {
      return 'Anos Iniciais';
    } else if (yearNumber >= 6 && yearNumber <= 9) {
      return 'Anos Finais';
    }
  }
  
  // Tentar detectar por palavras-chave
  if (normalized.includes('EM') || normalized.includes('Médio') || normalized.includes('Medio')) {
    return 'Ensino Médio';
  }
  if (normalized.includes('Infantil')) {
    return 'Educação Infantil';
  }
  
  return null;
}

interface Alternative {
  id?: string;
  text: string;
  isCorrect?: boolean;
}

interface BulletinQuestion {
  question: Question;
  studentAnswer: string | null;
  isCorrect: boolean | null;
  selectedAlternative: Alternative | null;
  correctAlternative: Alternative | null;
  questionNumber: number;
  hasAnswer: boolean;
}

interface QuestionsBySubject {
  [subjectName: string]: BulletinQuestion[];
}

interface DisciplineStats {
  nota: number;
  proficiencia: number;
  totalQuestions: number;
  correctAnswers: number;
}

interface StudentBulletinProps {
  testId: string;
  studentId: string;
}

// Helper function para identificar alternativa selecionada com 4 métodos de matching
const getSelectedAlternative = (question: Question, studentAnswer: string | null): Alternative | null => {
  if (!studentAnswer || !question.alternatives?.length) return null;

  const alternatives = question.alternatives;
  const normalized = studentAnswer.trim().toLowerCase();

  // 1. Por ID (mais confiável)
  let selected = alternatives.find(alt => alt.id === studentAnswer || alt.id === normalized);
  if (selected) return selected;

  // 2. Por texto completo (case-insensitive)
  selected = alternatives.find(alt => 
    alt.text?.trim().toLowerCase() === normalized
  );
  if (selected) return selected;

  // 3. Por letra (A, B, C, D...)
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const letterIndex = letters.indexOf(studentAnswer.trim().toUpperCase());
  if (letterIndex >= 0 && alternatives[letterIndex]) {
    return alternatives[letterIndex];
  }

  // 4. Por índice numérico (se studentAnswer for "0", "1", "2"...)
  const numIndex = parseInt(studentAnswer.trim(), 10);
  if (!isNaN(numIndex) && numIndex >= 0 && numIndex < alternatives.length) {
    return alternatives[numIndex];
  }

  return null;
};

// Função para combinar questões e respostas com matching robusto
const combineQuestionsAndAnswers = (
  questions: Question[],
  answers: StudentDetailedResult | null
): BulletinQuestion[] => {
  // Verificar se as questões têm números válidos e únicos
  const validNumbers = questions
    .map(q => q.number)
    .filter((num): num is number => num !== undefined && num !== null && num > 0);
  const uniqueValidNumbers = new Set(validNumbers);
  const hasValidUniqueNumbers = uniqueValidNumbers.size === questions.length && questions.length > 0;
  
  // Se não há números válidos e únicos, usar sempre índice sequencial baseado em 1
  // Caso contrário, ordenar por número primeiro
  const sortedQuestions = hasValidUniqueNumbers 
    ? [...questions].sort((a, b) => {
        const numA = (a.number && a.number > 0) ? a.number : Infinity;
        const numB = (b.number && b.number > 0) ? b.number : Infinity;
        return numA - numB;
      })
    : [...questions]; // Manter ordem original se não há números válidos únicos

  if (!answers?.answers || !Array.isArray(answers.answers)) {
    // Se não há respostas, retornar questões sem marcação
    return sortedQuestions.map((question, index) => {
      const correctAlt = question.alternatives?.find(alt => alt.isCorrect) || null;
      // Se tem números válidos e únicos, usar o número da questão, senão sempre usar índice sequencial
      const questionNumber = hasValidUniqueNumbers && question.number && question.number > 0
        ? question.number
        : (index + 1);
      return {
        question,
        studentAnswer: null,
        isCorrect: null,
        selectedAlternative: null,
        correctAlternative: correctAlt,
        questionNumber,
        hasAnswer: false
      };
    });
  }

  const answersMap = new Map<string, typeof answers.answers[0]>();
  
  // Indexar respostas por question_id E question_number
  answers.answers.forEach(answer => {
    if (answer.question_id) {
      answersMap.set(answer.question_id, answer);
    }
    if (answer.question_number) {
      answersMap.set(`num_${answer.question_number}`, answer);
    }
  });

  // Mapear e atribuir números sequenciais
  const result = sortedQuestions.map((question, index) => {
    // Tentar match por ID primeiro
    let studentAnswer = answersMap.get(question.id);
    
    // Se não encontrou, tentar por número (se válido)
    if (!studentAnswer && question.number && question.number > 0) {
      studentAnswer = answersMap.get(`num_${question.number}`);
    }
    
    const studentAnswerValue = studentAnswer?.student_answer || null;
    const selectedAlt = getSelectedAlternative(question, studentAnswerValue);
    const correctAlt = question.alternatives?.find(alt => alt.isCorrect) || null;
    
    // Se tem números válidos e únicos nas questões, usar o número da questão quando disponível
    // Senão, sempre usar índice sequencial baseado em 1 para garantir Q1, Q2, Q3...
    const questionNumber = hasValidUniqueNumbers && question.number && question.number > 0
      ? question.number
      : (index + 1);
    
    return {
      question,
      studentAnswer: studentAnswerValue,
      isCorrect: studentAnswer?.is_correct ?? (studentAnswerValue ? false : null),
      selectedAlternative: selectedAlt,
      correctAlternative: correctAlt,
      questionNumber,
      hasAnswer: !!studentAnswerValue
    };
  });

  // Ordenar por questionNumber para garantir ordem correta
  return result.sort((a, b) => a.questionNumber - b.questionNumber);
};

// Função para agrupar questões por disciplina
const groupQuestionsBySubject = (questions: BulletinQuestion[]): QuestionsBySubject => {
  const grouped: QuestionsBySubject = {};

  questions.forEach(question => {
    const subjectName = question.question.subject?.name || 'Sem disciplina';
    if (!grouped[subjectName]) {
      grouped[subjectName] = [];
    }
    grouped[subjectName].push(question);
  });

  // Ordenar questões dentro de cada disciplina por número
  Object.keys(grouped).forEach(subjectName => {
    grouped[subjectName].sort((a, b) => a.questionNumber - b.questionNumber);
  });

  return grouped;
};

type FilterType = 'all' | 'correct' | 'incorrect' | 'unanswered';

export default function StudentBulletin({ testId, studentId }: StudentBulletinProps) {
  const [bulletinQuestions, setBulletinQuestions] = useState<BulletinQuestion[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loadingState, setLoadingState] = useState<{
    questions: boolean;
    answers: boolean;
  }>({ questions: true, answers: true });
  const [error, setError] = useState<string | null>(null);
  const [disciplineStats, setDisciplineStats] = useState<Record<string, DisciplineStats>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!testId || !studentId) return;

      setLoadingState({ questions: true, answers: true });
      setError(null);

      try {
        const [questionsData, answersData, detailedReportData] = await Promise.allSettled([
          EvaluationApiService.getTestData(testId),
          EvaluationResultsApiService.getStudentDetailedResults(testId, studentId, true),
          EvaluationResultsApiService.getDetailedReport(testId)
        ]);

        setLoadingState({ questions: false, answers: false });

        // Processar questões e obter dados do teste
        let questions: Question[] = [];
        let testData: TestData | null = null;
        let courseName = 'Anos Iniciais'; // Padrão - será sobrescrito se encontrarmos informação
        
        if (questionsData.status === 'fulfilled' && questionsData.value) {
          testData = questionsData.value;
          questions = Array.isArray(testData.questions) 
            ? testData.questions 
            : [];
          
          // Tentar obter nome do curso/nível educacional do teste
          // A API pode retornar em diferentes campos, então verificamos o objeto completo
          const testDataObj = testData as TestData & Record<string, unknown>;
          if (testDataObj.course && typeof testDataObj.course === 'string') {
            courseName = testDataObj.course;
          } else if (testDataObj.course_name && typeof testDataObj.course_name === 'string') {
            courseName = testDataObj.course_name;
          } else if (testDataObj.courseName && typeof testDataObj.courseName === 'string') {
            courseName = testDataObj.courseName;
          } else if (testDataObj.education_stage && typeof testDataObj.education_stage === 'string') {
            courseName = testDataObj.education_stage;
          } else if (testDataObj.educationStage && typeof testDataObj.educationStage === 'string') {
            courseName = testDataObj.educationStage;
          }
        } else {
          console.warn('Erro ao buscar questões:', questionsData.status === 'rejected' ? questionsData.reason : 'Dados inválidos');
        }

        // Processar respostas
        let studentAnswers: StudentDetailedResult | null = null;
        if (answersData.status === 'fulfilled' && answersData.value) {
          studentAnswers = answersData.value;
        } else {
          console.warn('Erro ao buscar respostas do aluno:', answersData.status === 'rejected' ? answersData.reason : 'Dados inválidos');
        }

        // Buscar relatório detalhado para obter série/curso
        let detailedReport = null;
        if (detailedReportData.status === 'fulfilled' && detailedReportData.value) {
          detailedReport = detailedReportData.value;
        } else {
          console.warn('Erro ao buscar relatório detalhado:', detailedReportData.status === 'rejected' ? detailedReportData.reason : 'Dados inválidos');
        }

        // Detectar curso/nível educacional de múltiplas fontes
        let detectedCourse: string | null = null;
        let detectionSource = 'nenhuma';
        
        // Prioridade 1: Série do aluno no relatório detalhado
        if (detailedReport?.alunos) {
          const alunoNoRelatorio = detailedReport.alunos.find((a: { id: string }) => a.id === studentId);
          if (alunoNoRelatorio?.turma) {
            // Tentar extrair série da turma (formato como "6º Ano A", "7º Ano B", etc)
            const turma = alunoNoRelatorio.turma;
            const gradeFromTurma = mapGradeToCourse(turma);
            if (gradeFromTurma) {
              detectedCourse = gradeFromTurma;
              detectionSource = 'turma do aluno (relatório detalhado)';
            }
          }
        }

        // Prioridade 2: Série/curso direto do testData (se ainda não encontrado)
        if (!detectedCourse && testData) {
          const testDataObj = testData as TestData & Record<string, unknown>;
          
          // Verificar campos diretos de curso primeiro
          if (testDataObj.course && typeof testDataObj.course === 'string') {
            detectedCourse = testDataObj.course;
            detectionSource = 'campo course (testData)';
          } else if (testDataObj.course_name && typeof testDataObj.course_name === 'string') {
            detectedCourse = testDataObj.course_name;
            detectionSource = 'campo course_name (testData)';
          } else if (testDataObj.courseName && typeof testDataObj.courseName === 'string') {
            detectedCourse = testDataObj.courseName;
            detectionSource = 'campo courseName (testData)';
          } else if (testDataObj.education_stage && typeof testDataObj.education_stage === 'string') {
            detectedCourse = testDataObj.education_stage;
            detectionSource = 'campo education_stage (testData)';
          } else if (testDataObj.educationStage && typeof testDataObj.educationStage === 'string') {
            detectedCourse = testDataObj.educationStage;
            detectionSource = 'campo educationStage (testData)';
          }
        }

        // Prioridade 3: Tentar buscar alunos da avaliação para obter série
        if (!detectedCourse) {
          try {
            const studentsData = await EvaluationResultsApiService.getStudentsByEvaluation(testId);
            const studentData = studentsData?.find(s => s.id === studentId);
            if (studentData) {
              // Tentar extrair série de diferentes campos
              // getStudentsByEvaluation retorna StudentResult[], que tem campo 'grade'
              const possibleGrade = (studentData as { grade?: string; serie?: string; grade_name?: string }).grade 
                || (studentData as { grade?: string; serie?: string; grade_name?: string }).serie
                || (studentData as { grade?: string; serie?: string; grade_name?: string }).grade_name;
              if (possibleGrade) {
                const mappedCourse = mapGradeToCourse(possibleGrade);
                if (mappedCourse) {
                  detectedCourse = mappedCourse;
                  detectionSource = 'série do aluno (getStudentsByEvaluation)';
                }
              }
              
              // Tentar extrair da turma
              if (!detectedCourse && studentData.turma) {
                const gradeFromTurma = mapGradeToCourse(studentData.turma);
                if (gradeFromTurma) {
                  detectedCourse = gradeFromTurma;
                  detectionSource = 'turma do aluno (getStudentsByEvaluation)';
                }
              }
            }
          } catch (error) {
            console.warn('Erro ao buscar alunos para detectar série:', error);
          }
        }

        // Se encontrou um curso, usar ele; senão manter o padrão ou valor do testData
        if (detectedCourse) {
          courseName = detectedCourse;
          console.log(`✅ Curso detectado: "${courseName}" (fonte: ${detectionSource})`);
        } else {
          console.warn(`⚠️ Não foi possível detectar o curso. Usando padrão ou valor do testData: "${courseName}"`);
        }

        if (questions.length === 0) {
          setError('Não foi possível carregar as questões da avaliação. Verifique se a avaliação existe e tente novamente.');
          return;
        }

        // Debug: verificar números das questões
        console.log('🔍 Debug questões:', questions.map((q, i) => ({
          index: i,
          id: q.id,
          number: q.number,
          hasNumber: !!(q.number && q.number > 0)
        })));

        const combined = combineQuestionsAndAnswers(questions, studentAnswers);
        
        // Debug: verificar números finais atribuídos
        console.log('🔍 Debug números finais:', combined.map((bq, i) => ({
          index: i,
          questionNumber: bq.questionNumber,
          originalNumber: bq.question.number
        })));

        setBulletinQuestions(combined);

        // Calcular estatísticas por disciplina
        const statsByDiscipline: Record<string, DisciplineStats> = {};
        
        // Agrupar questões por disciplina
        const questionsByDiscipline: Record<string, BulletinQuestion[]> = {};
        combined.forEach(bq => {
          const subjectName = bq.question.subject?.name || 'Sem disciplina';
          if (!questionsByDiscipline[subjectName]) {
            questionsByDiscipline[subjectName] = [];
          }
          questionsByDiscipline[subjectName].push(bq);
        });

        // Calcular nota e proficiência para cada disciplina usando as fórmulas oficiais
        Object.entries(questionsByDiscipline).forEach(([subjectName, questions]) => {
          const totalQuestions = questions.length;
          const correctAnswers = questions.filter(q => q.isCorrect === true).length;
          
          // Calcular proficiência usando a fórmula oficial
          const proficiencia = calculateProficiency(
            correctAnswers,
            totalQuestions,
            courseName,
            subjectName
          );

          // Calcular nota usando a fórmula oficial baseada na proficiência
          const nota = calculateGrade(
            proficiencia,
            courseName,
            subjectName,
            false // Não usar cálculo simples
          );

          statsByDiscipline[subjectName] = {
            nota: parseFloat(nota.toFixed(1)),
            proficiencia: parseFloat(proficiencia.toFixed(2)),
            totalQuestions,
            correctAnswers
          };
        });

        setDisciplineStats(statsByDiscipline);

      } catch (err) {
        console.error('Erro ao carregar dados do boletim:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do boletim');
      }
    };

    fetchData();
  }, [testId, studentId]);

  const filteredQuestions = useMemo(() => {
    switch (filter) {
      case 'correct':
        return bulletinQuestions.filter(q => q.isCorrect === true);
      case 'incorrect':
        return bulletinQuestions.filter(q => q.isCorrect === false);
      case 'unanswered':
        return bulletinQuestions.filter(q => !q.hasAnswer);
      default:
        return bulletinQuestions;
    }
  }, [bulletinQuestions, filter]);

  // Agrupar questões filtradas por disciplina
  const questionsBySubject = useMemo(() => {
    return groupQuestionsBySubject(filteredQuestions);
  }, [filteredQuestions]);

  // Função auxiliar para normalizar nomes de disciplina (case-insensitive)
  const normalizeDisciplineName = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  };

  // Função para encontrar estatísticas de uma disciplina
  const getDisciplineStats = (subjectName: string): DisciplineStats | null => {
    // Primeiro tentar match exato
    if (disciplineStats[subjectName]) {
      return disciplineStats[subjectName];
    }

    // Depois tentar match case-insensitive
    const normalized = normalizeDisciplineName(subjectName);
    const statsKey = Object.keys(disciplineStats).find(key => 
      normalizeDisciplineName(key) === normalized
    );

    return statsKey ? disciplineStats[statsKey] : null;
  };

  const getStatusIcon = (question: BulletinQuestion) => {
    if (!question.hasAnswer) {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
    if (question.isCorrect) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const isLoading = loadingState.questions || loadingState.answers;

  // Se há erro mas temos questões carregadas, mostrar com aviso
  if (error && bulletinQuestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao Carregar Boletim</h3>
          <p className="text-gray-600 mb-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Boletim de Questões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {[1, 2].map((section) => (
              <div key={section}>
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bulletinQuestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Nenhuma questão encontrada nesta avaliação.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Boletim de Questões</CardTitle>
            {error && bulletinQuestions.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Algumas informações podem estar incompletas
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-44 h-9 border-gray-300">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ({bulletinQuestions.length})</SelectItem>
                <SelectItem value="correct">
                  Corretas ({bulletinQuestions.filter(q => q.isCorrect === true).length})
                </SelectItem>
                <SelectItem value="incorrect">
                  Incorretas ({bulletinQuestions.filter(q => q.isCorrect === false).length})
                </SelectItem>
                <SelectItem value="unanswered">
                  Não respondidas ({bulletinQuestions.filter(q => !q.hasAnswer).length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-6 space-y-8">
            {Object.entries(questionsBySubject).map(([subjectName, questions]) => (
              <div key={subjectName} className="space-y-4">
                {/* Cabeçalho da Disciplina */}
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">{subjectName}</h3>
                  
                  {(() => {
                    const stats = getDisciplineStats(subjectName);
                    if (stats) {
                      return (
                        <div className="flex items-center gap-3 ml-3 text-xs">
                          <span className="text-gray-600">
                            Nota: <span className="font-semibold text-gray-900">{stats.nota.toFixed(1)}</span>
                          </span>
                          <span className="text-gray-400">|</span>
                              <span className="text-gray-600">
                                Proficiência: <span className="font-semibold text-gray-900">{stats.proficiencia.toFixed(2)}</span>
                              </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <span className="text-xs text-gray-500 ml-auto">
                    {questions.length} {questions.length === 1 ? 'questão' : 'questões'}
                  </span>
                </div>

                {/* Tabela de Questões */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 w-20">Questão</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Alternativas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((bulletinQuestion, index) => {
                        const question = bulletinQuestion.question;
                        
                        return (
                          <tr
                            key={`${question.id}-${index}`}
                            id={`question-${bulletinQuestion.questionNumber}`}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            {/* Coluna Questão */}
                            <td className="py-3 px-3">
                              <span className="text-sm font-medium text-gray-700">
                                Q{bulletinQuestion.questionNumber}
                              </span>
                            </td>

                            {/* Coluna Alternativas */}
                            <td className="py-3 px-3">
                              {question.alternatives && question.alternatives.length > 0 ? (
                                <div className="space-y-1.5">
                                  {question.alternatives.map((alt, altIndex) => {
                                    const isSelected = bulletinQuestion.selectedAlternative?.id === alt.id;
                                    const isCorrect = alt.isCorrect;
                                    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                                    const letter = letters[altIndex] || `${altIndex + 1}`;

                                    // Determinar classes de fundo e texto baseado no status
                                    let bgClass = '';
                                    let textClass = '';
                                    let borderClass = '';
                                    
                                    if (isSelected && isCorrect) {
                                      // Alternativa selecionada e correta
                                      bgClass = 'bg-green-100';
                                      textClass = 'text-green-900';
                                      borderClass = 'border-green-300';
                                    } else if (isSelected && !isCorrect) {
                                      // Alternativa selecionada mas incorreta
                                      bgClass = 'bg-red-100';
                                      textClass = 'text-red-900';
                                      borderClass = 'border-red-300';
                                    } else if (isCorrect) {
                                      // Alternativa correta mas não selecionada
                                      bgClass = 'bg-green-50';
                                      textClass = 'text-green-800';
                                      borderClass = 'border-green-200';
                                    } else {
                                      // Alternativa neutra
                                      bgClass = 'bg-gray-50';
                                      textClass = 'text-gray-700';
                                      borderClass = 'border-gray-200';
                                    }

                                    return (
                                      <div
                                        key={alt.id || altIndex}
                                        className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${bgClass} ${textClass} ${borderClass}`}
                                      >
                                        <span className="font-medium w-4">{letter})</span>
                                        <span className="flex-1 truncate">{alt.text || 'Sem texto'}</span>
                                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                          {isSelected && (
                                            <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">Sua</span>
                                          )}
                                          {isCorrect && (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                          )}
                                          {isSelected && !isCorrect && (
                                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                // Questão discursiva
                                <div className="text-xs text-gray-600">
                                  <p className="font-medium mb-1">Resposta:</p>
                                  <p className="truncate max-w-md">
                                    {bulletinQuestion.studentAnswer || "Não respondida"}
                                  </p>
                                </div>
                              )}

                              {/* Caso: resposta não identificada */}
                              {bulletinQuestion.hasAnswer && 
                               !bulletinQuestion.selectedAlternative && 
                               bulletinQuestion.studentAnswer && (
                                <div className="mt-2 text-[10px] text-gray-500">
                                  Registrada: {bulletinQuestion.studentAnswer}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 text-gray-500 p-6">
            <p className="text-sm">Nenhuma questão encontrada com o filtro selecionado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}