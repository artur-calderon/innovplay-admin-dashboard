import { useMemo } from 'react';
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

export const useTurmaPercentages = (questoes: QuestionData[] | undefined, totalQuestions: number) => {
  const turmaPercentages = useMemo(() => {
    // ✅ EXCLUSIVAMENTE: Usar apenas dados reais da API
    if (!questoes || questoes.length === 0) {
      console.warn('❌ Dados de questões não disponíveis para calcular porcentagens da turma');
      return Array.from({ length: totalQuestions }, () => 0);
    }

    return Array.from({ length: totalQuestions }, (_, i) => {
      const questao = questoes[i];
      if (questao && typeof questao.porcentagem_acertos === 'number') {
        return questao.porcentagem_acertos;
      }
      
      console.warn(`❌ Porcentagem não disponível para questão ${i + 1}`);
      return 0;
    });
  }, [questoes, totalQuestions]);

  return turmaPercentages;
};

export const useStudentAnswers = (student: any, totalQuestions: number, detailedReport?: any) => {
  const answers = useMemo(() => {
    // ✅ EXCLUSIVAMENTE: Usar apenas dados reais da API
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

    // ✅ Processar apenas dados reais das respostas
    const answersArray = Array.from({ length: totalQuestions }, (_, questionIndex) => {
      const questionNumber = questionIndex + 1;
      
      // ✅ DEBUG: Log para verificar a busca de respostas
      console.log(`🔍 Buscando resposta para questão ${questionNumber}:`, {
        totalRespostas: alunoData.respostas.length,
        respostasDisponiveis: alunoData.respostas.map((r: any) => r.questao_numero),
        questaoBuscada: questionNumber
      });
      
      // Buscar resposta específica para esta questão
      const resposta = alunoData.respostas.find((r: any) => r.questao_numero === questionNumber);
      
      if (resposta) {
        // ✅ Retornar true se acertou, false se errou
        console.log(`✅ Questão ${questionNumber}: ${resposta.resposta_correta ? 'ACERTOU' : 'ERROU'}`);
        return resposta.resposta_correta;
      }
      
      // ✅ Se não encontrou resposta, verificar se a questão existe
      const questaoExiste = detailedReport.questoes?.some((q: any) => q.numero === questionNumber);
      if (questaoExiste) {
        // Questão existe mas não foi respondida
        console.log(`❌ Questão ${questionNumber}: NÃO RESPONDIDA`);
        return null;
      }
      
      // Questão não existe na avaliação
      console.log(`❓ Questão ${questionNumber}: NÃO EXISTE`);
      return undefined;
    });
    
    return answersArray;
  }, [student, totalQuestions, detailedReport]);

  return answers;
};

// ✅ NOVO: Hook para usar dados reais baseado nas respostas individuais
export const useRealStudentData = (student: any, detailedReport?: any) => {
  const realData = useMemo(() => {
    if (!detailedReport?.alunos) {
      return student; // Retornar dados originais se não há dados detalhados
    }

    const alunoData = detailedReport.alunos.find((a: any) => a.id === student.id);
    if (!alunoData || !alunoData.respostas || alunoData.respostas.length === 0) {
      return student; // Retornar dados originais se não há respostas
    }

    // ✅ Calcular dados reais baseado nas respostas individuais
    const totalQuestions = detailedReport.questoes?.length || 0;
    const respostas = alunoData.respostas;
    
    // Contar acertos, erros e não respondidas
    const acertosReais = respostas.filter((r: any) => r.resposta_correta === true).length;
    const errosReais = respostas.filter((r: any) => r.resposta_correta === false).length;
    const naoRespondidas = totalQuestions - acertosReais - errosReais;
    
    // Calcular nota real (0-10)
    const percentualAcertos = totalQuestions > 0 ? (acertosReais / totalQuestions) * 100 : 0;
    const notaReal = (percentualAcertos / 100) * 10;
    
    // Estimar proficiência real
    const proficienciaReal = notaReal * 40; // 10 = 400, 5 = 200, etc.
    
    // Determinar classificação real
    let classificacaoReal = 'Abaixo do Básico';
    if (notaReal >= 7.5) classificacaoReal = 'Avançado';
    else if (notaReal >= 6.0) classificacaoReal = 'Adequado';
    else if (notaReal >= 4.0) classificacaoReal = 'Básico';
    
    console.log(`✅ Usando dados reais do aluno ${student.nome}:`, {
      dados_incorretos: { acertos: student.acertos, nota: student.nota, proficiencia: student.proficiencia },
      dados_reais: { acertos: acertosReais, nota: notaReal, proficiencia: proficienciaReal }
    });
    
    return {
      ...student,
      acertos: acertosReais,
      erros: errosReais,
      em_branco: naoRespondidas,
      questoes_respondidas: acertosReais + errosReais,
      nota: notaReal,
      proficiencia: proficienciaReal,
      classificacao: classificacaoReal
    };
  }, [student, detailedReport]);

  return realData;
}; 