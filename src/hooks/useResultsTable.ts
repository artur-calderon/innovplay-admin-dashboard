import { useMemo, useState, useEffect } from 'react';
import { EvaluationResultsApiService } from '../services/evaluation/evaluationResultsApi';
import { 
  QuestionData, 
  QuestionWithSkills, 
  SkillsBySubject, 
  DetailedReport,
  SkillCodeGeneratorParams 
} from '../types/results-table';

export const useSkillCodeGenerator = () => {
  const normalizeUUID = (uuid: string) => {
    return uuid.replace(/[{}]/g, '').trim().toLowerCase();
  };

  const generateHabilidadeCode = ({
    questionNumber,
    questao,
    skillsMapping,
    detailedReport,
    questionsWithSkills
  }: SkillCodeGeneratorParams): string => {
    // Verificar se temos dados válidos
    if (!questao) {
      const disciplina = detailedReport?.avaliacao?.disciplina?.toLowerCase() || '';
      const isMathematics = disciplina.includes('matemática') || disciplina.includes('matematica');
      const grade = Math.min(Math.floor(questionNumber / 10) + 1, 9);
      const skillNumber = ((questionNumber - 1) % 10) + 1;
      return isMathematics ? `${grade}N1.${skillNumber}` : `LP${grade}L1.${skillNumber}`;
    }

    // Normalizar UUID para comparação
    const normalizedUUID = normalizeUUID(questao.codigo_habilidade || '');
    
    // Tentar mapeamento direto primeiro
    if (skillsMapping && questao.codigo_habilidade) {
      if (skillsMapping[questao.codigo_habilidade]) {
        return skillsMapping[questao.codigo_habilidade];
      }
      
      if (skillsMapping[normalizedUUID]) {
        return skillsMapping[normalizedUUID];
      }
    }
    
    // Determinar disciplina
    let disciplina = '';
    
    if (questao.subject && questao.subject.name) {
      disciplina = questao.subject.name.toLowerCase();
    } else if (questionsWithSkills && questionsWithSkills.length > 0) {
      const questionWithSkill = questionsWithSkills.find(q => q.number === questionNumber);
      if (questionWithSkill && questionWithSkill.subject) {
        disciplina = questionWithSkill.subject.name.toLowerCase();
      }
    } else {
      disciplina = detailedReport?.avaliacao?.disciplina?.toLowerCase() || '';
    }
    
    // Determinar série
    let grade = 1;
    if (detailedReport?.avaliacao?.disciplina) {
      const serieMatch = detailedReport.avaliacao.disciplina.match(/(\d+)/);
      if (serieMatch) {
        grade = parseInt(serieMatch[1]);
      } else {
        grade = Math.min(Math.floor(questionNumber / 10) + 1, 9);
      }
    }
    
    const skillNumber = ((questionNumber - 1) % 10) + 1;
    
    // Detectar disciplina
    const isMathematics = disciplina.includes('matemática') || 
                         disciplina.includes('matematica') ||
                         disciplina.includes('math') ||
                         disciplina.includes('mathematics');
    const isPortuguese = disciplina.includes('português') || 
                        disciplina.includes('portugues') || 
                        disciplina.includes('língua') ||
                        disciplina.includes('lingua') ||
                        disciplina.includes('portuguese') ||
                        disciplina.includes('portuguesa') ||
                        disciplina.includes('lingua portuguesa') ||
                        disciplina.includes('língua portuguesa') ||
                        disciplina.includes('lp') ||
                        disciplina.includes('l.p.') ||
                        disciplina.includes('lingua p') ||
                        disciplina.includes('língua p') ||
                        disciplina.includes('portuguese language');
    const isScience = disciplina.includes('ciências') || 
                     disciplina.includes('ciencias') || 
                     disciplina.includes('science') ||
                     disciplina.includes('ciência') ||
                     disciplina.includes('ciencia');
    const isHistory = disciplina.includes('história') || 
                     disciplina.includes('historia') || 
                     disciplina.includes('history');
    const isGeography = disciplina.includes('geografia') || 
                       disciplina.includes('geography');
    
    // Gerar código baseado na disciplina
    if (isMathematics) {
      return `${grade}N1.${skillNumber}`;
    } else if (isPortuguese) {
      return `LP${grade}L1.${skillNumber}`;
    } else if (isScience) {
      return `CN${grade}L1.${skillNumber}`;
    } else if (isHistory) {
      return `HI${grade}L1.${skillNumber}`;
    } else if (isGeography) {
      return `GE${grade}L1.${skillNumber}`;
    } else {
      return `LP${grade}L1.${skillNumber}`;
    }
  };

  return { generateHabilidadeCode };
};

export const useSkillDescription = (skillsBySubject?: SkillsBySubject) => {
  const getSkillDescription = (skillCode: string): string | null => {
    if (!skillsBySubject) return null;
    
    for (const [subjectId, skills] of Object.entries(skillsBySubject)) {
      const skill = skills.find(s => s.code === skillCode);
      if (skill) {
        return skill.description;
      }
    }
    return null;
  };

  return { getSkillDescription };
};

export const useTurmaPercentages = (questoes: QuestionData[] | undefined, totalQuestions: number, detailedReport?: any) => {
  const turmaPercentages = useMemo(() => {
    // ✅ CALCULAR PORCENTAGENS REAIS baseado nas respostas individuais
    if (!detailedReport?.alunos || detailedReport.alunos.length === 0) {
      return Array.from({ length: totalQuestions }, () => 0);
    }

    // Calcular porcentagens reais baseado nas respostas individuais
    const percentages = Array.from({ length: totalQuestions }, (_, questionIndex) => {
      const questionNumber = questionIndex + 1;
      
      // ✅ Contar quantos alunos responderam esta questão (não em branco)
      let totalRespondentes = 0;
      let totalAcertos = 0;
      let totalNaoRespondidas = 0;
      
      detailedReport.alunos.forEach((aluno: any) => {
        if (aluno.respostas && aluno.respostas.length > 0) {
          const resposta = aluno.respostas.find((r: any) => r.questao_numero === questionNumber);
          if (resposta) {
            // ✅ Se a questão foi respondida (não está em branco)
            if (!resposta.resposta_em_branco) {
              totalRespondentes++;
              if (resposta.resposta_correta === true) {
                totalAcertos++;
              }
            } else {
              // ✅ Questão em branco - não conta para porcentagem
              totalNaoRespondidas++;
            }
          } else {
            // ✅ Questão não respondida - não conta para porcentagem
            totalNaoRespondidas++;
          }
        } else {
          // ✅ Aluno sem respostas - não conta para porcentagem
          totalNaoRespondidas++;
        }
      });
      
      // ✅ Calcular porcentagem apenas se há respondentes
      let porcentagemReal = 0;
      if (totalRespondentes > 0) {
        porcentagemReal = (totalAcertos / totalRespondentes) * 100;
      } else {
        // ✅ Se não há respondentes, retornar -1 para indicar N/A
        porcentagemReal = -1; // Usar -1 para indicar N/A
      }
      
      return porcentagemReal;
    });
    
    return percentages;
  }, [questoes, totalQuestions, detailedReport]);

  return turmaPercentages;
};

export const useStudentAnswers = (student: any, totalQuestions: number, detailedReport?: any) => {
  const answers = useMemo(() => {
    // ✅ Usar APENAS dados do backend
    if (!detailedReport?.alunos) {
      return Array.from({ length: totalQuestions }, () => null);
    }

    const alunoData = detailedReport.alunos.find((a: any) => a.id === student.id);
    if (!alunoData) {
      return Array.from({ length: totalQuestions }, () => null);
    }

    if (!alunoData.respostas || alunoData.respostas.length === 0) {
      return Array.from({ length: totalQuestions }, () => null);
    }

    // ✅ Processar APENAS dados do backend
    const answersArray = Array.from({ length: totalQuestions }, (_, questionIndex) => {
      const questionNumber = questionIndex + 1;
      
      // ✅ Buscar resposta específica para esta questão
      const resposta = alunoData.respostas.find((r: any) => r.questao_numero === questionNumber);
      
             if (resposta) {
         // ✅ Verificar se a resposta está correta
         // Se resposta_em_branco é true, a questão está errada
         if (resposta.resposta_em_branco) {
           return false; // Questão em branco = errada
         }
         const isCorrect = resposta.resposta_correta;
         return isCorrect;
       }
      
      // ✅ Se não encontrou resposta, verificar se a questão existe
      const questaoExiste = detailedReport.questoes?.some((q: any) => q.numero === questionNumber);
      if (questaoExiste) {
        return null;
      }
      return undefined;
    });
    
    return answersArray;
  }, [student, totalQuestions, detailedReport]);

  return answers;
};

// ✅ SIMPLIFICADO: Hook para usar dados do backend (sem cálculos)
export const useRealStudentData = (student: any, detailedReport?: any) => {
  const realData = useMemo(() => {
    if (!detailedReport?.alunos) {
      return student; // Retornar dados originais se não há dados detalhados
    }

    const alunoData = detailedReport.alunos.find((a: any) => a.id === student.id);
    if (!alunoData) {
      return student; // Retornar dados originais se não há dados do aluno
    }

    // Retornar dados EXATAMENTE como vêm do backend
    return {
      ...student,
      acertos: alunoData.total_acertos || 0,
      erros: alunoData.total_erros || 0,
      em_branco: alunoData.total_em_branco || 0,
      questoes_respondidas: (alunoData.total_acertos || 0) + (alunoData.total_erros || 0),
      nota: alunoData.nota_final || 0,
      proficiencia: alunoData.proficiencia || 0,
      classificacao: alunoData.classificacao || 'Abaixo do Básico'
    };
  }, [student, detailedReport]);

  return realData;
};

// ✅ CORREÇÃO: Hook para dados corretos do aluno usando endpoint de alunos
export const useCorrectStudentDataSimple = (student: any, evaluationId: string) => {
  const [correctData, setCorrectData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCorrectData = async () => {
      if (!evaluationId || !student?.id) return;
      
      setLoading(true);
      try {
        // ✅ CORREÇÃO: Usar o método correto que existe na API
        const response = await EvaluationResultsApiService.getStudentsByEvaluation(evaluationId);

        // Encontrar o aluno específico nos dados
        const alunoCorreto = response.find((a: any) => {
          const matchById = a.id === student.id;
          const matchByName = a.nome?.toLowerCase() === student.nome?.toLowerCase();
          return matchById || matchByName;
        });
        
        if (alunoCorreto) {
          const dadosDoBackend = {
            id: alunoCorreto.id,
            nome: alunoCorreto.nome,
            turma: alunoCorreto.turma,
            acertos: alunoCorreto.acertos || 0,
            erros: alunoCorreto.erros || 0,
            em_branco: alunoCorreto.em_branco || 0,
            nota: alunoCorreto.nota || 0,
            proficiencia: alunoCorreto.proficiencia || 0,
            classificacao: alunoCorreto.classificacao || 'Abaixo do Básico',
            status: alunoCorreto.status || 'concluida'
          };
          setCorrectData(dadosDoBackend);
        } else {
          setCorrectData(student);
        }
      } catch (error) {
        setCorrectData(student);
      } finally {
        setLoading(false);
      }
    };

    fetchCorrectData();
  }, [evaluationId, student?.id, student?.nome]);
  
  return { correctData, loading };
};

// ✅ CORREÇÃO: Hook para respostas corretas do aluno usando endpoint específico de respostas
export const useCorrectStudentAnswers = (student: any, totalQuestions: number, evaluationId: string) => {
  const [correctAnswers, setCorrectAnswers] = useState<Array<boolean | null>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCorrectAnswers = async () => {
      if (!student?.id || !evaluationId) {
        setCorrectAnswers(Array.from({ length: totalQuestions }, () => null));
        return;
      }
      
      setLoading(true);
      
      try {
        // ✅ CORREÇÃO: Usar o método correto que existe na API
        const response = await EvaluationResultsApiService.getStudentDetailedResults(evaluationId, student.id, true);
        
        if (response && response.answers && response.answers.length > 0) {
          const answersArray = Array.from({ length: totalQuestions }, (_, questionIndex) => {
            const questionNumber = questionIndex + 1;
            const answer = response.answers.find((a: any) => a.question_number === questionNumber);
            if (answer) return answer.is_correct;
            return null;
          });
          setCorrectAnswers(answersArray);
        } else {
          setCorrectAnswers(Array.from({ length: totalQuestions }, () => null));
        }
      } catch (error) {
        setCorrectAnswers(Array.from({ length: totalQuestions }, () => null));
      } finally {
        setLoading(false);
      }
    };

    fetchCorrectAnswers();
  }, [student?.id, totalQuestions, evaluationId]);

  return { correctAnswers, loading };
}; 

// ✅ SIMPLIFICADO: Hook único para dados do aluno usando apenas uma fonte confiável
export const useStudentData = (student: any, evaluationId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ FUNÇÃO DE VALIDAÇÃO DE DADOS
  const validateStudentData = (rawData: any): any => {
    if (!rawData) return null;

    const requiredFields = ['id', 'nome'];
    const missingFields = requiredFields.filter(field => !rawData[field]);
    if (missingFields.length > 0) return null;

    // ✅ Validar tipos de dados
    const validationErrors: string[] = [];

    // Validar acertos (deve ser número >= 0)
    if (typeof rawData.acertos !== 'number' || rawData.acertos < 0) {
      validationErrors.push(`acertos inválido: ${rawData.acertos} (deve ser número >= 0)`);
    }

    // Validar erros (deve ser número >= 0)
    if (typeof rawData.erros !== 'number' || rawData.erros < 0) {
      validationErrors.push(`erros inválido: ${rawData.erros} (deve ser número >= 0)`);
    }

    // Validar em_branco (deve ser número >= 0)
    if (typeof rawData.em_branco !== 'number' || rawData.em_branco < 0) {
      validationErrors.push(`em_branco inválido: ${rawData.em_branco} (deve ser número >= 0)`);
    }

    // Validar nota (deve ser número entre 0 e 10)
    if (typeof rawData.nota !== 'number' || rawData.nota < 0 || rawData.nota > 10) {
      validationErrors.push(`nota inválida: ${rawData.nota} (deve ser número entre 0 e 10)`);
    }

    // Validar proficiência (deve ser número >= 0)
    if (typeof rawData.proficiencia !== 'number' || rawData.proficiencia < 0) {
      validationErrors.push(`proficiencia inválida: ${rawData.proficiencia} (deve ser número >= 0)`);
    }

    // Validar classificação (deve ser string válida)
    const validClassifications = ['Abaixo do Básico', 'Básico', 'Proficiente', 'Avançado'];
    if (typeof rawData.classificacao !== 'string' || !validClassifications.includes(rawData.classificacao)) {
      validationErrors.push(`classificacao inválida: ${rawData.classificacao} (deve ser uma das: ${validClassifications.join(', ')})`);
    }

    if (validationErrors.length > 0) return null;

    const totalQuestions = (rawData.acertos || 0) + (rawData.erros || 0) + (rawData.em_branco || 0);
    if (rawData.acertos > totalQuestions) return null;

    // Dados válidos - retornar objeto limpo
    const validatedData = {
      id: rawData.id,
      nome: rawData.nome,
      turma: rawData.turma || 'N/A',
      acertos: rawData.acertos || 0,
      erros: rawData.erros || 0,
      em_branco: rawData.em_branco || 0,
      nota: Number(rawData.nota.toFixed(2)), // Arredondar para 2 casas decimais
      proficiencia: Math.round(rawData.proficiencia || 0), // Arredondar para inteiro
      classificacao: rawData.classificacao || 'Abaixo do Básico',
      status: rawData.status || 'concluida',
      respostas: rawData.respostas || [],
      // ✅ Campos calculados para validação
      total_questions: totalQuestions,
      percentual_acertos: totalQuestions > 0 ? ((rawData.acertos || 0) / totalQuestions * 100).toFixed(1) : '0.0'
    };

    return validatedData;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!evaluationId || !student?.id) {
        setData(student);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await EvaluationResultsApiService.getStudentsByEvaluation(evaluationId);
        
        // ✅ Encontrar o aluno específico
        const alunoData = response.find((a: any) => {
          const matchById = a.id === student.id;
          const matchByName = a.nome?.toLowerCase() === student.nome?.toLowerCase();
          return matchById || matchByName;
        });
        
        if (alunoData) {
          // ✅ VALIDAR DADOS ANTES DE USAR
          const validatedData = validateStudentData(alunoData);
          
          if (validatedData) {
            setData(validatedData);
          } else {
            setData(student);
            setError('Dados inválidos recebidos da API');
          }
        } else {
          setData(student);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
        setData(student); // Fallback para dados originais
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [evaluationId, student?.id, student?.nome]);
  
  return { data, loading, error };
}; 

// ✅ TESTE: Dados conhecidos para verificar consistência
export const useTestWithKnownData = () => {
  // ✅ DADOS CONHECIDOS DO BANCO (baseados nos mocks existentes)
  const knownTestData = {
    evaluationId: 'test-evaluation-123',
    totalQuestions: 20,
    students: [
      {
        id: '1',
        nome: 'Ana Silva',
        turma: '9º A',
        acertos: 17,
        erros: 3,
        em_branco: 0,
        nota: 8.5,
        proficiencia: 350,
        classificacao: 'Adequado',
        status: 'concluida'
      },
      {
        id: '2',
        nome: 'João Santos',
        turma: '9º A',
        acertos: 18,
        erros: 2,
        em_branco: 0,
        nota: 9.2,
        proficiencia: 425,
        classificacao: 'Avançado',
        status: 'concluida'
      },
      {
        id: '3',
        nome: 'Maria Oliveira',
        turma: '9º B',
        acertos: 14,
        erros: 6,
        em_branco: 0,
        nota: 6.8,
        proficiencia: 280,
        classificacao: 'Básico',
        status: 'concluida'
      },
      {
        id: '4',
        nome: 'Pedro Costa',
        turma: '9º A',
        acertos: 0,
        erros: 0,
        em_branco: 20,
        nota: 0,
        proficiencia: 0,
        classificacao: 'Abaixo do Básico',
        status: 'pendente'
      }
    ]
  };

  const testValidation = () => {
    const results = knownTestData.students.map(student => {
      const validateStudentData = (rawData: any): any => {
        if (!rawData) return null;

        const requiredFields = ['id', 'nome'];
        const missingFields = requiredFields.filter(field => !rawData[field]);
        if (missingFields.length > 0) return null;

        // ✅ Validar tipos de dados
        const validationErrors: string[] = [];

        // Validar acertos (deve ser número >= 0)
        if (typeof rawData.acertos !== 'number' || rawData.acertos < 0) {
          validationErrors.push(`acertos inválido: ${rawData.acertos} (deve ser número >= 0)`);
        }

        // Validar erros (deve ser número >= 0)
        if (typeof rawData.erros !== 'number' || rawData.erros < 0) {
          validationErrors.push(`erros inválido: ${rawData.erros} (deve ser número >= 0)`);
        }

        // Validar em_branco (deve ser número >= 0)
        if (typeof rawData.em_branco !== 'number' || rawData.em_branco < 0) {
          validationErrors.push(`em_branco inválido: ${rawData.em_branco} (deve ser número >= 0)`);
        }

        // Validar nota (deve ser número entre 0 e 10)
        if (typeof rawData.nota !== 'number' || rawData.nota < 0 || rawData.nota > 10) {
          validationErrors.push(`nota inválida: ${rawData.nota} (deve ser número entre 0 e 10)`);
        }

        // Validar proficiência (deve ser número >= 0)
        if (typeof rawData.proficiencia !== 'number' || rawData.proficiencia < 0) {
          validationErrors.push(`proficiencia inválida: ${rawData.proficiencia} (deve ser número >= 0)`);
        }

        // Validar classificação (deve ser string válida)
        const validClassifications = ['Abaixo do Básico', 'Básico', 'Proficiente', 'Avançado'];
        if (typeof rawData.classificacao !== 'string' || !validClassifications.includes(rawData.classificacao)) {
          validationErrors.push(`classificacao inválida: ${rawData.classificacao} (deve ser uma das: ${validClassifications.join(', ')})`);
        }

        if (validationErrors.length > 0) return null;

        const totalQuestions = (rawData.acertos || 0) + (rawData.erros || 0) + (rawData.em_branco || 0);
        if (rawData.acertos > totalQuestions) return null;

        // Dados válidos
        const validatedData = {
          id: rawData.id,
          nome: rawData.nome,
          turma: rawData.turma || 'N/A',
          acertos: rawData.acertos || 0,
          erros: rawData.erros || 0,
          em_branco: rawData.em_branco || 0,
          nota: Number(rawData.nota.toFixed(2)), // Arredondar para 2 casas decimais
          proficiencia: Math.round(rawData.proficiencia || 0), // Arredondar para inteiro
          classificacao: rawData.classificacao || 'Abaixo do Básico',
          status: rawData.status || 'concluida',
          respostas: rawData.respostas || [],
          // ✅ Campos calculados para validação
          total_questions: totalQuestions,
          percentual_acertos: totalQuestions > 0 ? ((rawData.acertos || 0) / totalQuestions * 100).toFixed(1) : '0.0'
        };

        return validatedData;
      };

      const validatedData = validateStudentData(student);
      return {
        student: student.nome,
        isValid: validatedData !== null,
        data: validatedData,
        issues: validatedData ? [] : ['Dados inválidos detectados']
      };
    });

    return results;
  };

  return {
    knownTestData,
    testValidation
  };
}; 