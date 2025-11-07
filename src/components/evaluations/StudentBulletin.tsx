import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Minus, Filter, BookOpen, Download } from "lucide-react";
import { EvaluationApiService } from "@/services/evaluationApi";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import type { StudentDetailedResult } from "@/services/evaluationResultsApi";
import { Question, TestData } from "@/types/evaluation-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateProficiency, calculateGrade } from "@/utils/evaluationCalculator";
import { useToast } from "@/hooks/use-toast";

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

// Helper robusto para extrair série e turma de uma string de turma
function parseGradeAndClassFromTurma(input?: string | null): { grade?: string; classLetter?: string } {
  if (!input) return {};
  const text = input.replace(/\(.*?\)/g, '').replace(/turma/gi, '').replace(/-+/g, ' ').trim();
  // Captura a última letra (A-Z) como turma
  const letterMatch = text.match(/([A-Za-z])\s*$/);
  if (letterMatch) {
    const classLetter = letterMatch[1].toUpperCase();
    const grade = text.slice(0, Math.max(0, text.lastIndexOf(classLetter))).trim();
    return { grade: grade || undefined, classLetter };
  }
  return { grade: text || undefined };
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
    
    // Determinar se a resposta está correta
    // Prioridade 1: Usar is_correct da API se disponível
    // Prioridade 2: Comparar a alternativa selecionada com a correta
    let isCorrect: boolean | null = null;
    if (studentAnswer?.is_correct !== undefined && studentAnswer?.is_correct !== null) {
      isCorrect = studentAnswer.is_correct;
    } else if (studentAnswerValue && selectedAlt && correctAlt) {
      // Comparar IDs das alternativas
      isCorrect = selectedAlt.id === correctAlt.id;
    } else if (studentAnswerValue && !selectedAlt) {
      // Se há resposta mas não encontramos a alternativa, marcar como incorreta
      isCorrect = false;
    } else if (!studentAnswerValue) {
      // Se não há resposta, marcar como null
      isCorrect = null;
    }
    
    // Se tem números válidos e únicos nas questões, usar o número da questão quando disponível
    // Senão, sempre usar índice sequencial baseado em 1 para garantir Q1, Q2, Q3...
    const questionNumber = hasValidUniqueNumbers && question.number && question.number > 0
      ? question.number
      : (index + 1);
    
    return {
      question,
      studentAnswer: studentAnswerValue,
      isCorrect,
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
  const [studentName, setStudentName] = useState<string | null>(null);
  const [evaluationTitle, setEvaluationTitle] = useState<string | null>(null);
  const [studentGrade, setStudentGrade] = useState<string | null>(null);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const studentNameRef = useRef<string | null>(null);
  const studentGradeRef = useRef<string | null>(null);
  const studentClassRef = useRef<string | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  studentNameRef.current = studentName;
  studentGradeRef.current = studentGrade;
  studentClassRef.current = studentClass;

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
          
          // Tentar obter título da avaliação
          const testDataObj = testData as TestData & Record<string, unknown>;
          if (testDataObj.title && typeof testDataObj.title === 'string') {
            setEvaluationTitle(testDataObj.title);
          } else if (testDataObj.titulo && typeof testDataObj.titulo === 'string') {
            setEvaluationTitle(testDataObj.titulo);
          } else if (testDataObj.name && typeof testDataObj.name === 'string') {
            setEvaluationTitle(testDataObj.name);
          }
          
          // Tentar obter nome do curso/nível educacional do teste
          // A API pode retornar em diferentes campos, então verificamos o objeto completo
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
        }

        // Processar respostas
        let studentAnswers: StudentDetailedResult | null = null;
        if (answersData.status === 'fulfilled' && answersData.value) {
          studentAnswers = answersData.value;
          
          // Tentar obter nome do aluno dos dados de resposta se disponível
          if (!studentNameRef.current && studentAnswers.student_name) {
            studentNameRef.current = studentAnswers.student_name;
            setStudentName(studentAnswers.student_name);
          }
        }

        // Buscar relatório detalhado para obter série/curso
        let detailedReport = null;
        if (detailedReportData.status === 'fulfilled' && detailedReportData.value) {
          detailedReport = detailedReportData.value;
        }

        // Detectar curso/nível educacional de múltiplas fontes
        let detectedCourse: string | null = null;
        
        // Prioridade 1: Série/Turma do aluno no relatório detalhado
        if (detailedReport?.alunos) {
          const alunoNoRelatorio = detailedReport.alunos.find((a: { id: string }) => a.id === studentId);
          if (alunoNoRelatorio?.turma) {
            // Tentar extrair série da turma (formato como "6º Ano A", "7º Ano B", etc)
            const turma = alunoNoRelatorio.turma;
            const gradeFromTurma = mapGradeToCourse(turma);
            const parsed = parseGradeAndClassFromTurma(turma);
            if (parsed.grade && !studentGradeRef.current) setStudentGrade(parsed.grade);
            if (parsed.classLetter && !studentClassRef.current) setStudentClass(parsed.classLetter);
            if (gradeFromTurma) {
              detectedCourse = gradeFromTurma;
            }
          }
        }

        // Prioridade 2: Série/curso direto do testData (se ainda não encontrado)
        if (!detectedCourse && testData) {
          const testDataObj = testData as TestData & Record<string, unknown>;
          
          // Verificar campos diretos de curso primeiro
          if (testDataObj.course && typeof testDataObj.course === 'string') {
            detectedCourse = testDataObj.course;
          } else if (testDataObj.course_name && typeof testDataObj.course_name === 'string') {
            detectedCourse = testDataObj.course_name;
          } else if (testDataObj.courseName && typeof testDataObj.courseName === 'string') {
            detectedCourse = testDataObj.courseName;
          } else if (testDataObj.education_stage && typeof testDataObj.education_stage === 'string') {
            detectedCourse = testDataObj.education_stage;
          } else if (testDataObj.educationStage && typeof testDataObj.educationStage === 'string') {
            detectedCourse = testDataObj.educationStage;
          }
        }

        // Prioridade 3: Tentar buscar alunos da avaliação para obter série, turma e nome do aluno
        // ⚠️ Esta chamada requer permissões de admin/professor, então é opcional
        // Se falhar, continuamos com os dados já obtidos do detailedReport
        if (!detectedCourse || !studentNameRef.current || !studentGradeRef.current || !studentClassRef.current) {
          try {
            const studentsData = await EvaluationResultsApiService.getStudentsByEvaluation(testId);
            const studentData = studentsData?.find(s => s.id === studentId);
            if (studentData) {
              // Buscar nome do aluno
              if (!studentNameRef.current) {
                const foundName = studentData.nome || (studentData as { name?: string }).name || null;
                if (foundName) {
                  studentNameRef.current = foundName;
                  setStudentName(foundName);
                }
              }
              
              // Tentar extrair série de diferentes campos
              // getStudentsByEvaluation retorna StudentResult[], que tem campo 'grade'
              if (!detectedCourse) {
                const possibleGrade = (studentData as { grade?: string; serie?: string; grade_name?: string }).grade 
                  || (studentData as { grade?: string; serie?: string; grade_name?: string }).serie
                  || (studentData as { grade?: string; serie?: string; grade_name?: string }).grade_name;
                 if (possibleGrade) {
                  if (!studentGradeRef.current) setStudentGrade(possibleGrade);
                  const mappedCourse = mapGradeToCourse(possibleGrade);
                  if (mappedCourse) {
                    detectedCourse = mappedCourse;
                  }
                }
                
                // Tentar extrair da turma
                if (studentData.turma) {
                  const turmaText = String(studentData.turma);
                  const parsed = parseGradeAndClassFromTurma(turmaText);
                  if (parsed.grade && !studentGradeRef.current) setStudentGrade(parsed.grade);
                  if (parsed.classLetter && !studentClassRef.current) setStudentClass(parsed.classLetter);
                  const gradeFromTurma = mapGradeToCourse(turmaText);
                  if (!detectedCourse && gradeFromTurma) {
                    detectedCourse = gradeFromTurma;
                  }
                }
              }
            }
          } catch (error: unknown) {
            // ⚠️ Erro 403 (Forbidden) é esperado para alunos - não é um erro crítico
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status === 403) {
              console.log('ℹ️ Acesso negado ao endpoint de alunos (esperado para alunos) - usando dados alternativos');
            } else {
              console.warn('⚠️ Erro ao buscar alunos para detectar série:', error);
            }
            // Continuar sem esses dados - não é crítico
          }
        }

        if (detectedCourse) {
          courseName = detectedCourse;
        }

        // ✅ MELHORADO: Fallback mais robusto se ainda não encontrou o curso
        if (!courseName || courseName === 'Anos Iniciais') {
          // Tentar extrair das questões se tiverem informações de série/curso
          if (questions.length > 0) {
            const firstQuestion = questions[0];
            const questionObj = firstQuestion as Question & Record<string, unknown>;
            
            // Verificar se a questão tem informações de curso/série
            if (questionObj.grade && typeof questionObj.grade === 'string') {
              const mappedFromQuestion = mapGradeToCourse(questionObj.grade);
              if (mappedFromQuestion) {
                courseName = mappedFromQuestion;
                console.log(`📚 CourseName detectado da questão: "${courseName}"`);
              }
            } else if (questionObj.course && typeof questionObj.course === 'string') {
              courseName = questionObj.course;
              console.log(`📚 CourseName detectado do campo course da questão: "${courseName}"`);
            }
          }
        }

        // ✅ ÚLTIMO FALLBACK: Se ainda não encontrou, tentar inferir das disciplinas
        // Se tiver questões de Ensino Médio (ex: Física, Química), provavelmente é Ensino Médio
        if (!courseName || courseName === 'Anos Iniciais') {
          const subjectNames = questions
            .map(q => q.subject?.name?.toLowerCase() || '')
            .filter(Boolean);
          
          const hasHighSchoolSubjects = subjectNames.some(name => 
            ['física', 'fisica', 'química', 'quimica', 'biologia', 'filosofia', 'sociologia'].includes(name)
          );
          
          if (hasHighSchoolSubjects) {
            courseName = 'Ensino Médio';
            console.log(`📚 CourseName inferido das disciplinas: "${courseName}"`);
          } else if (subjectNames.some(name => 
            ['matemática', 'matematica', 'português', 'portugues', 'história', 'historia', 'geografia'].includes(name)
          )) {
            // Se tiver disciplinas básicas, pode ser Anos Finais ou Ensino Médio
            // Por padrão, vamos usar Anos Finais se não tiver certeza
            if (courseName === 'Anos Iniciais') {
              courseName = 'Anos Finais';
              console.log(`📚 CourseName inferido como Anos Finais (padrão): "${courseName}"`);
            }
          }
        }

        console.log(`📚 CourseName final detectado: "${courseName}"`, {
          detectedCourse,
          testDataCourse: (testData as TestData & Record<string, unknown>).course,
          questionsCount: questions.length,
          hasDetailedReport: !!detailedReport,
          hasStudentAnswers: !!studentAnswers
        });

        if (questions.length === 0) {
          setError('Não foi possível carregar as questões da avaliação. Verifique se a avaliação existe e tente novamente.');
          return;
        }

        const combined = combineQuestionsAndAnswers(questions, studentAnswers);
        
        console.log(`📊 Questões combinadas:`, {
          total: combined.length,
          withAnswers: combined.filter(q => q.hasAnswer).length,
          correct: combined.filter(q => q.isCorrect === true).length,
          incorrect: combined.filter(q => q.isCorrect === false).length,
          unanswered: combined.filter(q => !q.hasAnswer).length
        });

        setBulletinQuestions(combined);

        // Calcular estatísticas por disciplina
        const statsByDiscipline: Record<string, DisciplineStats> = {};
        
        // Agrupar questões por disciplina
        const questionsByDiscipline: Record<string, BulletinQuestion[]> = {};
        combined.forEach(bq => {
          // ✅ MELHORADO: Identificação robusta de disciplina
          const subjectNameRaw = bq.question.subject?.name || 
                             (bq.question as Question & Record<string, unknown>).subject_name ||
                             (bq.question as Question & Record<string, unknown>).disciplina ||
                             'Sem disciplina';
          
          // Normalizar nome da disciplina (remover espaços extras)
          const subjectName = typeof subjectNameRaw === 'string' ? subjectNameRaw.trim() : String(subjectNameRaw).trim();
          const normalizedSubjectName = subjectName;
          
          if (!questionsByDiscipline[normalizedSubjectName]) {
            questionsByDiscipline[normalizedSubjectName] = [];
          }
          questionsByDiscipline[normalizedSubjectName].push(bq);
        });
        
        console.log(`📚 Disciplinas identificadas:`, {
          disciplines: Object.keys(questionsByDiscipline),
          courseName,
          totalQuestions: combined.length,
          questionsPerDiscipline: Object.entries(questionsByDiscipline).map(([name, qs]) => ({
            name,
            count: qs.length
          }))
        });

        // ✅ NOVO: Verificar se temos dados do backend (grade e proficiência já calculados)
        const hasBackendData = studentAnswers && 
          (studentAnswers.grade !== undefined && studentAnswers.grade !== null) &&
          (studentAnswers.proficiencia !== undefined && studentAnswers.proficiencia !== null);
        
        console.log(`📊 Dados do backend disponíveis:`, {
          hasBackendData,
          backendGrade: studentAnswers?.grade,
          backendProficiencia: studentAnswers?.proficiencia,
          backendClassificacao: studentAnswers?.classificacao
        });

        // Calcular nota e proficiência para cada disciplina
        Object.entries(questionsByDiscipline).forEach(([subjectName, questions]) => {
          const totalQuestions = questions.length;
          const correctAnswers = questions.filter(q => q.isCorrect === true).length;
          
          console.log(`📊 Calculando estatísticas para disciplina: ${subjectName}`, {
            totalQuestions,
            correctAnswers,
            courseName,
            hasBackendData
          });
          
          // ✅ VALIDAÇÃO: Verificar se temos dados válidos antes de calcular
          if (totalQuestions === 0) {
            console.warn(`⚠️ Nenhuma questão encontrada para ${subjectName}`);
            statsByDiscipline[subjectName] = {
              nota: 0,
              proficiencia: 0,
              totalQuestions: 0,
              correctAnswers: 0
            };
            return; // Pular esta disciplina
          }

          // ✅ NOVO: Priorizar dados do backend quando disponíveis
          // Como o backend retorna dados gerais (não por disciplina), vamos usar como referência
          // e calcular por disciplina localmente, mas validar com os dados do backend
          let nota = 0;
          let proficiencia = 0;
          
          if (hasBackendData && studentAnswers) {
            // ✅ Usar dados do backend como base e calcular proporcionalmente por disciplina
            // Se temos dados gerais do backend, podemos usar como referência
            const totalQuestionsAll = studentAnswers.total_questions || totalQuestions;
            const correctAnswersAll = studentAnswers.correct_answers || correctAnswers;
            
            // Calcular proporção desta disciplina em relação ao total
            const disciplineProportion = totalQuestionsAll > 0 ? totalQuestions / totalQuestionsAll : 1;
            const disciplineCorrectProportion = correctAnswersAll > 0 ? correctAnswers / correctAnswersAll : 0;
            
            // Se a proporção for próxima de 1 (é a única disciplina), usar dados do backend diretamente
            if (disciplineProportion >= 0.95 || Object.keys(questionsByDiscipline).length === 1) {
              console.log(`📊 Usando dados do backend diretamente para ${subjectName} (única disciplina ou proporção >= 95%)`);
              nota = studentAnswers.grade || 0;
              proficiencia = studentAnswers.proficiencia || 0;
            } else {
              // Calcular localmente, mas usar dados do backend como validação
              console.log(`📊 Calculando localmente para ${subjectName} (múltiplas disciplinas)`);
              
              // ✅ VALIDAÇÃO: Verificar se courseName é válido
              if (!courseName || courseName.trim() === '') {
                console.warn(`⚠️ CourseName inválido para ${subjectName}, usando padrão "Anos Iniciais"`);
                courseName = 'Anos Iniciais';
              }

              // Calcular proficiência usando a fórmula oficial
              try {
                proficiencia = calculateProficiency(
                  correctAnswers,
                  totalQuestions,
                  courseName,
                  subjectName
                );
                
                // ✅ VALIDAÇÃO: Verificar se proficiência é válida
                if (isNaN(proficiencia) || !isFinite(proficiencia)) {
                  console.warn(`⚠️ Proficiência inválida calculada para ${subjectName}:`, proficiencia);
                  proficiencia = 0;
                }
              } catch (error) {
                console.error(`❌ Erro ao calcular proficiência para ${subjectName}:`, error);
                proficiencia = 0;
              }

              // Calcular nota usando a fórmula oficial baseada na proficiência
              try {
                nota = calculateGrade(
                  proficiencia,
                  courseName,
                  subjectName,
                  false // Não usar cálculo simples
                );
                
                // ✅ VALIDAÇÃO: Verificar se nota é válida
                if (isNaN(nota) || !isFinite(nota)) {
                  console.warn(`⚠️ Nota inválida calculada para ${subjectName}:`, nota);
                  // Fallback: calcular nota simples baseada em acertos
                  nota = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 10 : 0;
                }
              } catch (error) {
                console.error(`❌ Erro ao calcular nota para ${subjectName}:`, error);
                // Fallback: calcular nota simples baseada em acertos
                nota = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 10 : 0;
              }
            }
          } else {
            // ✅ FALLBACK: Calcular localmente se dados do backend não estiverem disponíveis
            console.log(`📊 Dados do backend não disponíveis, calculando localmente para ${subjectName}`);
            
            // ✅ VALIDAÇÃO: Verificar se courseName é válido
            if (!courseName || courseName.trim() === '') {
              console.warn(`⚠️ CourseName inválido para ${subjectName}, usando padrão "Anos Iniciais"`);
              courseName = 'Anos Iniciais';
            }

            // Calcular proficiência usando a fórmula oficial
            try {
              proficiencia = calculateProficiency(
                correctAnswers,
                totalQuestions,
                courseName,
                subjectName
              );
              
              // ✅ VALIDAÇÃO: Verificar se proficiência é válida
              if (isNaN(proficiencia) || !isFinite(proficiencia)) {
                console.warn(`⚠️ Proficiência inválida calculada para ${subjectName}:`, proficiencia);
                proficiencia = 0;
              }
            } catch (error) {
              console.error(`❌ Erro ao calcular proficiência para ${subjectName}:`, error);
              proficiencia = 0;
            }

            // Calcular nota usando a fórmula oficial baseada na proficiência
            try {
              nota = calculateGrade(
                proficiencia,
                courseName,
                subjectName,
                false // Não usar cálculo simples
              );
              
              // ✅ VALIDAÇÃO: Verificar se nota é válida
              if (isNaN(nota) || !isFinite(nota)) {
                console.warn(`⚠️ Nota inválida calculada para ${subjectName}:`, nota);
                // Fallback: calcular nota simples baseada em acertos
                nota = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 10 : 0;
              }
            } catch (error) {
              console.error(`❌ Erro ao calcular nota para ${subjectName}:`, error);
              // Fallback: calcular nota simples baseada em acertos
              nota = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 10 : 0;
            }
          }

          console.log(`📊 Estatísticas finais para ${subjectName}:`, {
            nota,
            proficiencia,
            totalQuestions,
            correctAnswers,
            source: hasBackendData && (Object.keys(questionsByDiscipline).length === 1 || (totalQuestions / (studentAnswers?.total_questions || totalQuestions)) >= 0.95) ? 'backend' : 'local'
          });

          // ✅ VALIDAÇÃO FINAL: Garantir valores dentro dos limites
          const finalNota = isNaN(nota) || nota < 0 ? 0 : Math.max(0, Math.min(10, parseFloat(nota.toFixed(1))));
          const finalProficiencia = isNaN(proficiencia) || proficiencia < 0 ? 0 : parseFloat(proficiencia.toFixed(2));
          
          statsByDiscipline[subjectName] = {
            nota: finalNota,
            proficiencia: finalProficiencia,
            totalQuestions,
            correctAnswers
          };
          
          console.log(`✅ Estatísticas salvas para ${subjectName}:`, statsByDiscipline[subjectName]);
        });

        console.log(`📊 Todas as estatísticas calculadas:`, statsByDiscipline);
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
    console.log(`🔍 Buscando estatísticas para disciplina: "${subjectName}"`);
    console.log(`📊 Estatísticas disponíveis:`, Object.keys(disciplineStats));
    
    // Primeiro tentar match exato
    if (disciplineStats[subjectName]) {
      console.log(`✅ Match exato encontrado para "${subjectName}"`);
      return disciplineStats[subjectName];
    }

    // Depois tentar match case-insensitive
    const normalized = normalizeDisciplineName(subjectName);
    const statsKey = Object.keys(disciplineStats).find(key => 
      normalizeDisciplineName(key) === normalized
    );

    if (statsKey) {
      console.log(`✅ Match case-insensitive encontrado: "${subjectName}" -> "${statsKey}"`);
      return disciplineStats[statsKey];
    }
    
    console.warn(`⚠️ Nenhuma estatística encontrada para "${subjectName}"`);
    return null;
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

  const handleExportToPDF = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) {
      toast({
        title: "Erro ao Exportar PDF",
        description: "Não foi possível capturar o conteúdo do boletim.",
        variant: "destructive",
      });
      return;
    }

    setIsExportingPDF(true);

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Criar clone offscreen para captura sem alterar a UI
      const offscreenRoot = document.createElement('div');
      offscreenRoot.setAttribute('aria-hidden', 'true');
      offscreenRoot.style.position = 'fixed';
      offscreenRoot.style.left = '-10000px';
      offscreenRoot.style.top = '-10000px';
      offscreenRoot.style.zIndex = '-1';

      const clonedCard = cardElement.cloneNode(true) as HTMLElement;
      offscreenRoot.appendChild(clonedCard);
      document.body.appendChild(offscreenRoot);

      // Ocultar controles e header no clone
      const clonedHeader = clonedCard.querySelector('[data-pdf-header]') as HTMLElement | null;
      const clonedControls = clonedCard.querySelector('[data-pdf-controls]') as HTMLElement | null;
      if (clonedHeader) clonedHeader.style.display = 'none';
      if (clonedControls) clonedControls.style.display = 'none';

      // Expandir áreas roláveis no clone
      const clonedScrollArea = clonedCard.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (clonedScrollArea) {
        clonedScrollArea.style.height = 'auto';
        clonedScrollArea.style.maxHeight = 'none';
        clonedScrollArea.style.overflow = 'visible';
      }
      const clonedScrollRoot = clonedCard.querySelector('[data-radix-scroll-area]') as HTMLElement | null;
      if (clonedScrollRoot) {
        clonedScrollRoot.style.height = 'auto';
        clonedScrollRoot.style.maxHeight = 'none';
        clonedScrollRoot.style.overflow = 'visible';
      }
      // Remover truncamento/overflow horizontal no clone
      clonedCard.querySelectorAll('.truncate').forEach((el) => {
        const e = el as HTMLElement;
        e.className = e.className.replace(/\btruncate\b/g, '').trim();
        e.style.whiteSpace = 'normal';
        e.style.overflow = 'visible';
        e.style.textOverflow = 'clip';
      });
      clonedCard.querySelectorAll('.overflow-x-auto').forEach((el) => {
        const e = el as HTMLElement;
        e.className = e.className.replace(/\boverflow-x-auto\b/g, '').trim();
        e.style.overflowX = 'visible';
        e.style.overflow = 'visible';
      });

      const canvasOptions = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      } as const;

      // Seções no clone
      const subjectSections = Array.from(
        clonedCard.querySelectorAll('[data-subject-section]')
      ) as HTMLElement[];

      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Capa
      const coverTitle = 'Boletim do Aluno';
      const nameLine = `Aluno: ${studentNameRef.current || studentName || 'Não informado'}`;
      const gradeLine = `Série: ${studentGrade || 'Não informada'}`;
      const classLine = `Turma: ${studentClass || 'Não informada'}`;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;
      pdf.text(coverTitle, centerX, centerY, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      const footerStartY = pageHeight - margin - 20;
      const lineHeight = 6;
      pdf.text(nameLine, margin, footerStartY);
      pdf.text(gradeLine, margin, footerStartY + lineHeight);
      pdf.text(classLine, margin, footerStartY + lineHeight * 2);

      // Conteúdo
      pdf.addPage();

      if (subjectSections.length > 0) {
        for (let s = 0; s < subjectSections.length; s += 1) {
          const sectionElement = subjectSections[s];

          // Preparar header da seção
          const headerEl = sectionElement.querySelector('[data-section-header]') as HTMLElement | null;
          let headerImgData: string | null = null;
          let headerImgHeight = 0;
          if (headerEl) {
            const headerCanvas = await html2canvas(headerEl, canvasOptions);
            headerImgData = headerCanvas.toDataURL('image/png');
            headerImgHeight = (headerCanvas.height * usableWidth) / headerCanvas.width;
          }

          // Função para desenhar header (se existir)
          function drawHeaderIfAny(currentY: number): number {
            if (!headerImgData) return currentY;
            pdf.addImage(headerImgData, 'PNG', margin, currentY, usableWidth, headerImgHeight);
            return currentY + headerImgHeight + 2; // pequeno espaçamento
          }

          let currentY = margin;
          currentY = drawHeaderIfAny(currentY);

          // Pegar linhas da tabela
          const rowNodes = Array.from(
            sectionElement.querySelectorAll('tbody > tr')
          ) as HTMLElement[];

          // Se não houver linhas (fallback), renderizar a seção inteira como antes
          if (rowNodes.length === 0) {
            const sectionCanvas = await html2canvas(sectionElement, canvasOptions);
            const sectionImgData = sectionCanvas.toDataURL('image/png');
            const sectionImgHeight = (sectionCanvas.height * usableWidth) / sectionCanvas.width;

            if (currentY + sectionImgHeight > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
              currentY = drawHeaderIfAny(currentY);
            }

            pdf.addImage(sectionImgData, 'PNG', margin, currentY, usableWidth, sectionImgHeight);
            // Após seção, começar nova página para próxima seção
            if (s < subjectSections.length - 1) {
              pdf.addPage();
            }
            continue;
          }

          // Paginar linha a linha
          for (let r = 0; r < rowNodes.length; r += 1) {
            const rowCanvas = await html2canvas(rowNodes[r], canvasOptions);
            const rowImgData = rowCanvas.toDataURL('image/png');
            const rowImgHeight = (rowCanvas.height * usableWidth) / rowCanvas.width;

            if (currentY + rowImgHeight > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
              currentY = drawHeaderIfAny(currentY);
            }

            pdf.addImage(rowImgData, 'PNG', margin, currentY, usableWidth, rowImgHeight);
            currentY += rowImgHeight + 2;
          }

          // Após seção, começar nova página para a próxima seção
          if (s < subjectSections.length - 1) {
            pdf.addPage();
          }
        }
      } else {
        const fallbackCanvas = await html2canvas(clonedCard, canvasOptions);
        const fallbackImgData = fallbackCanvas.toDataURL('image/png');
        const fallbackImgHeight = (fallbackCanvas.height * usableWidth) / fallbackCanvas.width;
        let heightLeft = fallbackImgHeight;
        let position = margin;

        pdf.addImage(fallbackImgData, 'PNG', margin, position, usableWidth, fallbackImgHeight);
        heightLeft -= usableHeight;

        while (heightLeft > 0) {
          position = margin - (fallbackImgHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(fallbackImgData, 'PNG', margin, position, usableWidth, fallbackImgHeight);
          heightLeft -= usableHeight;
        }
      }

      const sanitizeFileName = (text: string | null): string => {
        if (!text) return '';
        return text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .substring(0, 50);
      };

      const studentNameSanitized = sanitizeFileName(studentName);
      const evaluationTitleSanitized = sanitizeFileName(evaluationTitle);
      const dateStr = new Date().toISOString().split('T')[0];
      const nameParts = ['boletim', studentNameSanitized || 'aluno', evaluationTitleSanitized || 'avaliacao', dateStr].filter(Boolean);
      const fileName = `${nameParts.join('-')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Exportado com Sucesso",
        description: `O boletim foi salvo como ${fileName}`,
      });

      // Limpar clone
      document.body.removeChild(offscreenRoot);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro ao Exportar PDF",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
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
    <Card ref={cardRef}>
      <CardHeader data-pdf-header className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900">Boletim de Questões</CardTitle>
            {error && bulletinQuestions.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Algumas informações podem estar incompletas
              </p>
            )}
          </div>
          <div ref={controlsRef} className="flex items-center gap-2 flex-shrink-0" data-pdf-controls>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToPDF}
              disabled={isExportingPDF}
              className="h-9 whitespace-nowrap shrink-0 border-border hover:bg-muted"
              type="button"
              aria-label={isExportingPDF ? 'Exportando PDF' : 'Exportar PDF'}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExportingPDF ? 'Exportando...' : 'Exportar PDF'}
            </Button>
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
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-[600px]">
          <div className="p-6 space-y-8">
            {Object.entries(questionsBySubject).map(([subjectName, questions]) => (
              <div
                key={subjectName}
                data-subject-section
                data-subject-name={subjectName}
                className="space-y-4"
              >
                {/* Cabeçalho da Disciplina */}
                <div data-section-header className="flex items-center gap-2 pb-2 border-b border-border">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{subjectName}</h3>
                  
                  {(() => {
                    const stats = getDisciplineStats(subjectName);
                    if (stats) {
                      return (
                        <div className="flex items-center gap-3 ml-3 text-xs">
                          <span className="text-muted-foreground">
                            Nota: <span className="font-semibold text-foreground">{stats.nota.toFixed(1)}</span>
                          </span>
                          <span className="text-muted-foreground">|</span>
                              <span className="text-muted-foreground">
                                Proficiência: <span className="font-semibold text-foreground">{stats.proficiencia.toFixed(2)}</span>
                              </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <span className="text-xs text-muted-foreground ml-auto">
                    {questions.length} {questions.length === 1 ? 'questão' : 'questões'}
                  </span>
                </div>

                {/* Tabela de Questões */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-20">Questão</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Alternativas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((bulletinQuestion, index) => {
                        const question = bulletinQuestion.question;
                        
                        return (
                          <tr
                            key={`${question.id}-${index}`}
                            id={`question-${bulletinQuestion.questionNumber}`}
                            className="border-b border-border hover:bg-muted transition-colors"
                          >
                            {/* Coluna Questão */}
                            <td className="py-3 px-3">
                              <span className="text-sm font-medium text-foreground">
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
                                      bgClass = 'bg-muted';
                                      textClass = 'text-foreground';
                                      borderClass = 'border-border';
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
                                <div className="text-xs text-muted-foreground">
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
          <div className="text-center py-12 text-muted-foreground p-6">
            <p className="text-sm">Nenhuma questão encontrada com o filtro selecionado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}