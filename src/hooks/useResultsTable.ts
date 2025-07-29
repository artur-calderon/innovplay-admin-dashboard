import { useMemo, useState, useEffect } from 'react';
import { EvaluationResultsApiService } from '../services/evaluationResultsApi';
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
      console.warn('❌ Dados de alunos não disponíveis para calcular porcentagens reais da turma');
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
      
      console.log(`📊 Questão ${questionNumber}: ${totalAcertos}/${totalRespondentes} acertos, ${totalNaoRespondidas} não respondidas = ${porcentagemReal === -1 ? 'N/A' : porcentagemReal.toFixed(1) + '%'}`);
      
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
      console.warn('❌ Dados detalhados não disponíveis para processar respostas');
      return Array.from({ length: totalQuestions }, () => null);
    }

    const alunoData = detailedReport.alunos.find((a: any) => a.id === student.id);
    if (!alunoData) {
      console.warn(`❌ Dados do aluno ${student.id} não encontrados`);
      return Array.from({ length: totalQuestions }, () => null);
    }

    if (!alunoData.respostas || alunoData.respostas.length === 0) {
      console.warn(`❌ Nenhuma resposta encontrada para o aluno ${student.nome}`);
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
           console.log(`❌ Questão ${questionNumber}: EM BRANCO = ERRADA (backend)`);
           return false; // Questão em branco = errada
         }
         // Se não está em branco, usar o valor de resposta_correta
         const isCorrect = resposta.resposta_correta;
         console.log(`✅ Questão ${questionNumber}: ${isCorrect ? 'ACERTOU' : 'ERROU'} (backend) - correta: ${resposta.resposta_correta}, em_branco: ${resposta.resposta_em_branco}`);
         return isCorrect;
       }
      
      // ✅ Se não encontrou resposta, verificar se a questão existe
      const questaoExiste = detailedReport.questoes?.some((q: any) => q.numero === questionNumber);
      if (questaoExiste) {
        // Questão existe mas não foi respondida
        console.log(`❌ Questão ${questionNumber}: NÃO RESPONDIDA (backend)`);
        return null;
      }
      
      // Questão não existe na avaliação
      console.log(`❓ Questão ${questionNumber}: NÃO EXISTE (backend)`);
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

    // ✅ USAR APENAS DADOS DO BACKEND (sem cálculos)
    console.log(`✅ Usando dados do backend para ${student.nome}:`, {
      dados_backend: {
        total_acertos: alunoData.total_acertos,
        total_erros: alunoData.total_erros,
        total_em_branco: alunoData.total_em_branco,
        nota_final: alunoData.nota_final,
        proficiencia: alunoData.proficiencia,
        classificacao: alunoData.classificacao
      }
    });
    
    // ✅ Retornar dados EXATAMENTE como vêm do backend
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

// ✅ SIMPLIFICADO: Hook para usar dados do endpoint original (sem cálculos)
export const useCorrectStudentDataSimple = (student: any, evaluationId: string) => {
  const [correctData, setCorrectData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCorrectData = async () => {
      if (!evaluationId || !student?.id) return;
      
      setLoading(true);
      try {
        // ✅ Usar APENAS o endpoint original
        const response = await EvaluationResultsApiService.getCorrectStudentResults(evaluationId);
        
        console.log('✅ Dados do endpoint original:', response);
        
                 // ✅ Verificar se a resposta tem a estrutura esperada
         let data = response;
         if (response && response.data && Array.isArray(response.data)) {
           data = { alunos: response.data };
         }
         
         console.log('🔍 Estrutura da resposta do endpoint /alunos (dados):', {
           temResponse: !!response,
           temData: !!response?.data,
           temAlunos: !!response?.alunos,
           responseKeys: response ? Object.keys(response) : [],
           dataKeys: response?.data ? Object.keys(response.data) : [],
           alunosKeys: response?.alunos ? Object.keys(response.alunos) : []
         });
         
         // ✅ Encontrar o aluno específico nos dados
         const alunoCorreto = data?.alunos?.find((a: any) => {
           const matchById = a.id === student.id;
           const matchByName = a.nome?.toLowerCase() === student.nome?.toLowerCase();
           return matchById || matchByName;
         });
        
        if (alunoCorreto) {
          console.log('✅ Dados do endpoint original encontrados para', student.nome, ':', {
            id: alunoCorreto.id,
            nome: alunoCorreto.nome,
            turma: alunoCorreto.turma,
            acertos: alunoCorreto.acertos,
            erros: alunoCorreto.erros,
            em_branco: alunoCorreto.em_branco,
            nota: alunoCorreto.nota,
            grade: alunoCorreto.grade,
            proficiencia: alunoCorreto.proficiencia,
            classificacao: alunoCorreto.classificacao,
            status: alunoCorreto.status,
            respostas: alunoCorreto.respostas
          });
          
          // ✅ DEBUG: Verificar estrutura do aluno
          console.log('✅ Dados do endpoint /alunos encontrados para', student.nome, ':', {
            acertos: alunoCorreto.acertos,
            nota: alunoCorreto.nota,
            proficiencia: alunoCorreto.proficiencia,
            classificacao: alunoCorreto.classificacao,
            respostas: alunoCorreto.respostas?.length || 0
          });
          
          // ✅ Usar dados EXATAMENTE como vêm do backend (sem cálculos)
          const dadosDoBackend = {
            id: alunoCorreto.id,
            nome: alunoCorreto.nome,
            turma: alunoCorreto.turma || alunoCorreto.grade || 'A',
            acertos: alunoCorreto.acertos || 0,
            erros: alunoCorreto.erros || 0,
            em_branco: alunoCorreto.em_branco || 0,
            nota: alunoCorreto.nota || 0,
            proficiencia: alunoCorreto.proficiencia || 0,
            classificacao: alunoCorreto.classificacao || 'Abaixo do Básico',
            status: alunoCorreto.status || 'concluida',
            respostas: alunoCorreto.respostas || []
          };
          
          console.log('✅ Dados do backend para exibição:', dadosDoBackend);
          setCorrectData(dadosDoBackend);
        } else {
          console.warn('⚠️ Aluno não encontrado no endpoint original:', student.nome);
          // ✅ Fallback: usar dados do relatório detalhado se disponível
          setCorrectData(student);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados do endpoint original:', error);
        // ✅ Fallback: usar dados do relatório detalhado
        setCorrectData(student);
      } finally {
        setLoading(false);
      }
    };

    fetchCorrectData();
  }, [evaluationId, student?.id, student?.nome]);
  return { correctData, loading };
};

// ✅ SIMPLIFICADO: Hook para respostas do endpoint /alunos (que tem as respostas individuais)
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
        // ✅ Buscar dados do endpoint /alunos que contém as respostas individuais
        const response = await EvaluationResultsApiService.getCorrectStudentResults(evaluationId);
        
                 // ✅ Verificar se a resposta tem a estrutura esperada
         let data = response;
         if (response && response.data && Array.isArray(response.data)) {
           data = { alunos: response.data };
         }
         
         console.log('🔍 Estrutura da resposta do endpoint /alunos:', {
           temResponse: !!response,
           temData: !!response?.data,
           temAlunos: !!response?.alunos,
           responseKeys: response ? Object.keys(response) : [],
           dataKeys: response?.data ? Object.keys(response.data) : [],
           alunosKeys: response?.alunos ? Object.keys(response.alunos) : [],
           dataAlunosLength: data?.alunos?.length || 0
         });
         
         if (data?.alunos && data.alunos.length > 0) {
           // ✅ Encontrar o aluno específico
           const alunoCorreto = data.alunos.find((a: any) => a.id === student.id);
          
                     console.log('🔍 Aluno encontrado:', {
             id: alunoCorreto.id,
             nome: alunoCorreto.nome,
             temRespostas: !!alunoCorreto.respostas,
             respostasLength: alunoCorreto.respostas?.length || 0,
             respostasKeys: alunoCorreto.respostas ? Object.keys(alunoCorreto.respostas[0] || {}) : []
           });
           
           if (alunoCorreto && alunoCorreto.respostas && alunoCorreto.respostas.length > 0) {
             console.log('✅ Processando respostas do endpoint /alunos para', student.nome, ':', alunoCorreto.respostas.length, 'respostas');
            
            // ✅ Processar respostas do endpoint /alunos
            const answersArray = Array.from({ length: totalQuestions }, (_, questionIndex) => {
              const questionNumber = questionIndex + 1;
              
              // ✅ Buscar resposta específica para esta questão
              const resposta = alunoCorreto.respostas.find((r: any) => r.questao === questionNumber);
              
                             if (resposta) {
                 // ✅ Verificar se a resposta está correta
                 // Se em_branco é true, a questão está errada (mesmo que correta seja false)
                 if (resposta.em_branco) {
                   console.log(`❌ Questão ${questionNumber}: EM BRANCO = ERRADA`);
                   return false; // Questão em branco = errada
                 }
                 // Se não está em branco, usar o valor de correta
                 const isCorrect = resposta.correta;
                 console.log(`✅ Questão ${questionNumber}: ${isCorrect ? 'ACERTOU' : 'ERROU'} (correta: ${resposta.correta}, em_branco: ${resposta.em_branco})`);
                 return isCorrect;
               }
              return null;
            });
            
            setCorrectAnswers(answersArray);
          } else {
            console.warn('⚠️ Respostas não encontradas no endpoint /alunos para:', student.nome);
            setCorrectAnswers(Array.from({ length: totalQuestions }, () => null));
          }
        } else {
          console.warn('⚠️ Dados do endpoint /alunos não disponíveis');
          setCorrectAnswers(Array.from({ length: totalQuestions }, () => null));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar respostas do endpoint /alunos:', error);
        setCorrectAnswers(Array.from({ length: totalQuestions }, () => null));
      } finally {
        setLoading(false);
      }
    };

    fetchCorrectAnswers();
  }, [student?.id, totalQuestions, evaluationId]);

  return { correctAnswers, loading };
}; 