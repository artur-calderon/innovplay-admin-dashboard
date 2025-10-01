import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Minus, Eye, CheckCircle2, Target, Gauge, Award, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { TableHeader } from './results-table/TableHeader';
import { TableRow } from './results-table/TableRow';

interface TabelaDetalhadaQuestao {
  numero: number;
  habilidade: string;
  codigo_habilidade: string;
  question_id: string;
}

interface TabelaDetalhadaAluno {
  id: string;
  nome: string;
  escola: string;
  serie: string;
  turma: string;
  respostas_por_questao: Array<{
    questao: number;
    acertou: boolean;
    respondeu: boolean;
    resposta: string;
  }>;
  total_acertos: number;
  total_erros: number;
  total_respondidas: number;
  total_questoes_disciplina: number;
  nivel_proficiencia: string;
  nota: number;
  proficiencia: number;
}

interface TabelaDetalhadaDisciplina {
  id: string;
  nome: string;
  questoes: TabelaDetalhadaQuestao[];
  alunos: TabelaDetalhadaAluno[];
}

interface TabelaDetalhadaGeralAluno {
  id: string;
  nome: string;
  escola: string;
  serie: string;
  turma: string;
  nota_geral: number;
  proficiencia_geral: number;
  nivel_proficiencia_geral: string;
  total_acertos_geral: number;
  total_questoes_geral: number;
  total_respondidas_geral: number;
  total_em_branco_geral: number;
  percentual_acertos_geral: number;
  status_geral: string;
}

interface QuestaoConsolidada extends TabelaDetalhadaQuestao {
  disciplina: string;
}

interface DisciplineTablesProps {
  tabelaDetalhada: {
    disciplinas: TabelaDetalhadaDisciplina[];
    geral?: {
      alunos: TabelaDetalhadaGeralAluno[];
    };
  };
  onViewStudentDetails?: (studentId: string) => void;
  // ✅ NOVO: Função para abrir em nova guia
  onOpenInNewTab?: (studentId: string) => void;
}

export const DisciplineTables: React.FC<DisciplineTablesProps> = ({
  tabelaDetalhada,
  onViewStudentDetails,
  onOpenInNewTab
}) => {
  // ✅ NOVO: Estado para gerenciar visualização de muitas questões
  const [currentQuestionWindow, setCurrentQuestionWindow] = useState(0);
  const [currentDisciplineWindow, setCurrentDisciplineWindow] = useState<{[key: string]: number}>({});
  
  // ✅ NOVO: Configurações para visualização otimizada
  const QUESTIONS_PER_WINDOW = 15; // Mostrar 15 questões por vez
  const MAX_QUESTIONS_FOR_FULL_VIEW = 25; // Acima disso, usar visualização em janelas

  // ✅ NOVO: Funções para gerenciar visualização em janelas
  const getQuestionWindow = (questions: QuestaoConsolidada[] | TabelaDetalhadaQuestao[], windowIndex: number) => {
    const start = windowIndex * QUESTIONS_PER_WINDOW;
    const end = start + QUESTIONS_PER_WINDOW;
    return questions.slice(start, end);
  };

  const getTotalWindows = (totalQuestions: number) => {
    return Math.ceil(totalQuestions / QUESTIONS_PER_WINDOW);
  };

  const getCurrentWindowForDiscipline = (disciplinaId: string) => {
    return currentDisciplineWindow[disciplinaId] || 0;
  };

  const setCurrentWindowForDiscipline = (disciplinaId: string, windowIndex: number) => {
    setCurrentDisciplineWindow(prev => ({
      ...prev,
      [disciplinaId]: windowIndex
    }));
  };

  // Função para calcular estatísticas de uma questão
  const getQuestionStats = (disciplina: TabelaDetalhadaDisciplina, questaoNumero: number) => {
    if (!disciplina.alunos.length) return { correct: 0, total: 0, percentage: 0 };

    let correct = 0;
    let total = 0;

    disciplina.alunos.forEach(aluno => {
      const resposta = aluno.respostas_por_questao.find(r => r.questao === questaoNumero);
      if (resposta && resposta.respondeu) {
        total++;
        if (resposta.acertou) {
          correct++;
        }
      }
    });
    
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, total, percentage };
  };

  // Função para obter cor do nível
  const getLevelColor = (classificacao: string) => {
    switch (classificacao) {
      case 'Avançado': return 'bg-green-600';
      case 'Adequado': return 'bg-green-400';
      case 'Básico': return 'bg-yellow-500';
      case 'Abaixo do Básico': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // ✅ NOVO: Consolidar todas as questões de todas as disciplinas (com memoização para performance)
  const getAllQuestions = useMemo(() => {
    const allQuestions: QuestaoConsolidada[] = [];

    tabelaDetalhada.disciplinas.forEach((disciplina, disciplinaIndex) => {
      disciplina.questoes.forEach((questao, questaoIndex) => {
        allQuestions.push({
          numero: questao.numero,
          habilidade: questao.habilidade,
          codigo_habilidade: questao.codigo_habilidade,
          question_id: questao.question_id,
          disciplina: disciplina.nome
        });
      });
    });

    const sortedQuestions = allQuestions.sort((a, b) => a.numero - b.numero);

    return sortedQuestions;
  }, [tabelaDetalhada.disciplinas]);

  // ✅ NOVO: Consolidar dados dos alunos de todas as disciplinas (com memoização para performance)
  const getConsolidatedStudents = useMemo(() => {
    if (!tabelaDetalhada.disciplinas.length) return [];

    // Pegar alunos da primeira disciplina como base (todos devem ter os mesmos alunos)
    const baseStudents = tabelaDetalhada.disciplinas[0].alunos;
    
    // ✅ CORRIGIDO: Filtrar apenas alunos que responderam pelo menos uma questão
    const studentsWithAnswers = baseStudents.filter(aluno => {
      // Verificar se o aluno respondeu pelo menos uma questão em qualquer disciplina
      return tabelaDetalhada.disciplinas.some(disciplina => {
        const disciplinaAluno = disciplina.alunos.find(a => a.id === aluno.id);
        return disciplinaAluno && disciplinaAluno.respostas_por_questao.some(resposta => resposta.respondeu);
      });
    });
    
    return studentsWithAnswers.map(aluno => {
      // Consolidar todas as respostas do aluno de todas as disciplinas
      const allResponses: Array<{
        questao: number;
        acertou: boolean;
        respondeu: boolean;
        resposta: string;
      }> = [];

      // Coletar respostas de todas as disciplinas
      tabelaDetalhada.disciplinas.forEach(disciplina => {
        const disciplinaAluno = disciplina.alunos.find(a => a.id === aluno.id);
        if (disciplinaAluno) {
          allResponses.push(...disciplinaAluno.respostas_por_questao);
        }
      });

      // Calcular totais consolidados
      const totalAcertos = allResponses.filter(r => r.respondeu && r.acertou).length;
      const totalRespondidas = allResponses.filter(r => r.respondeu).length;
      const totalQuestoes = allResponses.length;
      const totalErros = totalRespondidas - totalAcertos;
      const totalEmBranco = totalQuestoes - totalRespondidas;

      // ✅ CORRIGIDO: Usar APENAS dados da tabelaDetalhada.geral para nota e proficiência
      let nota = 0;
      let proficiencia = 0;
      let nivelProficiencia = 'Abaixo do Básico';
      
      // Prioridade 1: Usar dados da tabela geral se disponível (dados consolidados do backend)
      if (tabelaDetalhada.geral?.alunos) {
        const alunoGeral = tabelaDetalhada.geral.alunos.find(a => a.id === aluno.id);
        if (alunoGeral) {
          nota = alunoGeral.nota_geral;
          proficiencia = alunoGeral.proficiencia_geral;
          nivelProficiencia = alunoGeral.nivel_proficiencia_geral;
        }
      }
      
      // Prioridade 2: Se não encontrou na tabela geral, usar dados da primeira disciplina (fallback)
      if (nota === 0 && proficiencia === 0) {
        const primeiraDisciplina = tabelaDetalhada.disciplinas[0];
        const alunoPrimeiraDisciplina = primeiraDisciplina?.alunos.find(a => a.id === aluno.id);
        if (alunoPrimeiraDisciplina) {
          nota = alunoPrimeiraDisciplina.nota;
          proficiencia = alunoPrimeiraDisciplina.proficiencia;
          nivelProficiencia = alunoPrimeiraDisciplina.nivel_proficiencia;
        }
      }

      return {
        id: aluno.id,
        nome: aluno.nome,
        escola: aluno.escola,
        serie: aluno.serie,
        turma: aluno.turma,
        respostas_por_questao: allResponses,
        total_acertos: totalAcertos,
        total_erros: totalErros,
        total_respondidas: totalRespondidas,
        total_questoes_disciplina: totalQuestoes,
        nivel_proficiencia: nivelProficiencia,
        nota: nota,
        proficiencia: proficiencia
      };
    });
  }, [tabelaDetalhada.disciplinas, tabelaDetalhada.geral?.alunos]);

  // ✅ NOVO: Dados consolidados para a visão geral (já memoizados)
  const allQuestions = getAllQuestions;
  const consolidatedStudents = getConsolidatedStudents;

  // ✅ NOVO: Componente para controles de navegação
  const QuestionNavigationControls = ({ 
    currentWindow, 
    totalWindows, 
    onPrevious, 
    onNext, 
    onGoToWindow,
    totalQuestions,
    questionsPerWindow,
    colorScheme = "purple"
  }: {
    currentWindow: number;
    totalWindows: number;
    onPrevious: () => void;
    onNext: () => void;
    onGoToWindow: (window: number) => void;
    totalQuestions: number;
    questionsPerWindow: number;
    colorScheme?: "purple" | "blue";
  }) => {
    if (totalWindows <= 1) return null;

    const startQuestion = currentWindow * questionsPerWindow + 1;
    const endQuestion = Math.min((currentWindow + 1) * questionsPerWindow, totalQuestions);
    const colorClasses = colorScheme === "purple" 
      ? "bg-purple-50 border-purple-200 text-purple-700" 
      : "bg-blue-50 border-blue-200 text-blue-700";

    return (
      <div className={`${colorClasses} border-b px-4 py-3 flex items-center justify-between text-sm`}>
        <div className="flex items-center gap-2">
          <span className="font-medium">
            Questões {startQuestion}-{endQuestion} de {totalQuestions}
          </span>
          <span className="text-xs opacity-75">
            (Janela {currentWindow + 1} de {totalWindows})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={currentWindow === 0}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          {/* Indicadores de janela */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalWindows, 5) }, (_, i) => {
              const windowIndex = i;
              const isActive = windowIndex === currentWindow;
              return (
                <button
                  key={windowIndex}
                  onClick={() => onGoToWindow(windowIndex)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isActive 
                      ? (colorScheme === "purple" ? "bg-purple-600" : "bg-blue-600")
                      : (colorScheme === "purple" ? "bg-purple-300" : "bg-blue-300")
                  }`}
                  title={`Ir para janela ${windowIndex + 1}`}
                />
              );
            })}
            {totalWindows > 5 && (
              <MoreHorizontal className="h-3 w-3 opacity-50" />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={currentWindow === totalWindows - 1}
            className="h-7 px-2"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* ✅ NOVO: Visão Geral - Todas as Questões */}
      {allQuestions.length > 0 && consolidatedStudents.length > 0 && (
        <Card className="shadow-xl border-2 border-purple-200 hover:shadow-2xl transition-shadow duration-300 overflow-hidden w-full">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg px-0">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 gap-3 sm:gap-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold">V</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Visão Geral - Todas as Questões</h2>
                  <p className="text-purple-100 text-xs sm:text-sm">
                    {consolidatedStudents.length} {consolidatedStudents.length === 1 ? 'aluno' : 'alunos'} • {allQuestions.length} {allQuestions.length === 1 ? 'questão' : 'questões'} de todas as disciplinas
                    {allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW && (
                      <span className="block text-purple-200 text-xs mt-1">
                        📊 Visualização otimizada: {QUESTIONS_PER_WINDOW} questões por janela
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/90 text-purple-700 font-bold text-xs sm:text-sm flex-shrink-0">
                VISÃO GERAL
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* ✅ NOVO: Controles de navegação para muitas questões */}
            {allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW && (
              <QuestionNavigationControls
                currentWindow={currentQuestionWindow}
                totalWindows={getTotalWindows(allQuestions.length)}
                onPrevious={() => setCurrentQuestionWindow(prev => Math.max(0, prev - 1))}
                onNext={() => setCurrentQuestionWindow(prev => Math.min(getTotalWindows(allQuestions.length) - 1, prev + 1))}
                onGoToWindow={(window) => setCurrentQuestionWindow(window)}
                totalQuestions={allQuestions.length}
                questionsPerWindow={QUESTIONS_PER_WINDOW}
                colorScheme="purple"
              />
            )}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-w-full">
              <table className="min-w-full border border-gray-300 text-center text-xs sm:text-sm shadow-md rounded-lg border-separate border-spacing-0 bg-white">
                <TableHeader
                  totalQuestions={allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                    ? getQuestionWindow(allQuestions, currentQuestionWindow).length 
                    : allQuestions.length}
                  startQuestionNumber={allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                    ? currentQuestionWindow * QUESTIONS_PER_WINDOW + 1 
                    : 1}
                  visibleFields={{
                    turma: false,
                    habilidade: allQuestions.length <= 15, // ✅ NOVO: Ocultar habilidades se muitas questões
                    questoes: true,
                    percentualTurma: allQuestions.length <= 20, // ✅ NOVO: Ocultar % se muitas questões
                    total: true,
                    nota: true,
                    proficiencia: true,
                    nivel: true
                  }}
                  tabelaDetalhada={{
                    disciplinas: (allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                      ? getQuestionWindow(allQuestions, currentQuestionWindow) 
                      : allQuestions).map((q, index) => ({
                      id: `disciplina-${q.numero}-${index}`,
                      nome: (q as QuestaoConsolidada).disciplina,
                      questoes: [{
                        numero: q.numero,
                        habilidade: q.habilidade,
                        codigo_habilidade: q.codigo_habilidade,
                        question_id: q.question_id
                      }]
                    }))
                  }}
                  students={consolidatedStudents.map(aluno => ({
                    id: aluno.id,
                    nome: aluno.nome,
                    acertos: aluno.total_acertos,
                    erros: aluno.total_erros,
                    em_branco: aluno.total_questoes_disciplina - aluno.total_respondidas,
                    respostas: aluno.respostas_por_questao.map(resposta => ({
                      questao_id: `q${resposta.questao}`,
                      questao_numero: resposta.questao,
                      resposta_correta: resposta.acertou,
                      resposta_em_branco: !resposta.respondeu,
                      tempo_gasto: 0
                    }))
                  }))}
                  successThreshold={60}
                />
                <tbody>
                  {consolidatedStudents.map((aluno, studentIndex) => (
                    <TableRow
                      key={`visao-geral-${aluno.id}`}
                      student={{
                        id: aluno.id,
                        nome: aluno.nome,
                        turma: aluno.turma,
                        nota: aluno.nota,
                        proficiencia: aluno.proficiencia,
                        classificacao: (aluno.nivel_proficiencia || 'Abaixo do Básico') as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
                        questoes_respondidas: aluno.total_respondidas,
                        acertos: aluno.total_acertos,
                        erros: aluno.total_erros,
                        em_branco: aluno.total_questoes_disciplina - aluno.total_respondidas,
                        tempo_gasto: 0,
                        status: 'concluida' as const,
                        respostas: aluno.respostas_por_questao.map(resposta => ({
                          questao_id: `q${resposta.questao}`,
                          questao_numero: resposta.questao,
                          resposta_correta: resposta.acertou,
                          resposta_em_branco: !resposta.respondeu,
                          tempo_gasto: 0
                        }))
                      }}
                      studentIndex={studentIndex}
                      totalQuestions={allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                        ? getQuestionWindow(allQuestions, currentQuestionWindow).length 
                        : allQuestions.length}
                      visibleFields={{
                        turma: false,
                        habilidade: allQuestions.length <= 15, // ✅ NOVO: Ocultar habilidades se muitas questões
                        questoes: true,
                        percentualTurma: allQuestions.length <= 20, // ✅ NOVO: Ocultar % se muitas questões
                        total: true,
                        nota: true,
                        proficiencia: true,
                        nivel: true
                      }}
                      onViewStudentDetails={onViewStudentDetails}
                      onOpenInNewTab={onOpenInNewTab}
                      evaluationId="visao-geral"
                      tabelaDetalhada={{
                        disciplinas: (allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                          ? getQuestionWindow(allQuestions, currentQuestionWindow) 
                          : allQuestions).map((q, index) => ({
                          id: `disciplina-${q.numero}-${index}`,
                          nome: (q as QuestaoConsolidada).disciplina,
                          questoes: [{
                            numero: q.numero,
                            habilidade: q.habilidade,
                            codigo_habilidade: q.codigo_habilidade,
                            question_id: q.question_id
                          }]
                        }))
                      }}
                    />
                  ))}
                </tbody>
              </table>
              {/* ✅ NOVO: Contador de questões no final */}
              {allQuestions.length > MAX_QUESTIONS_FOR_FULL_VIEW && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-600 text-center">
                  Total: {allQuestions.length} questões • {consolidatedStudents.length} alunos • 
                  Janela {currentQuestionWindow + 1} de {getTotalWindows(allQuestions.length)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Tabelas por Disciplina */}
      {tabelaDetalhada.disciplinas.map((disciplina) => (
        <Card key={disciplina.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden w-full">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg px-0">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 gap-3 sm:gap-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold">{disciplina.nome.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold truncate">{disciplina.nome}</h2>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    {disciplina.alunos.length} {disciplina.alunos.length === 1 ? 'aluno' : 'alunos'} • {disciplina.questoes.length} {disciplina.questoes.length === 1 ? 'questão' : 'questões'}
                    {disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW && (
                      <span className="block text-blue-200 text-xs mt-1">
                        📊 Visualização otimizada: {QUESTIONS_PER_WINDOW} questões por janela
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/90 text-blue-700 font-bold text-xs sm:text-sm flex-shrink-0">
                {disciplina.nome.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* ✅ NOVO: Controles de navegação para muitas questões */}
            {disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW && (
              <QuestionNavigationControls
                currentWindow={getCurrentWindowForDiscipline(disciplina.id)}
                totalWindows={getTotalWindows(disciplina.questoes.length)}
                onPrevious={() => setCurrentWindowForDiscipline(disciplina.id, Math.max(0, getCurrentWindowForDiscipline(disciplina.id) - 1))}
                onNext={() => setCurrentWindowForDiscipline(disciplina.id, Math.min(getTotalWindows(disciplina.questoes.length) - 1, getCurrentWindowForDiscipline(disciplina.id) + 1))}
                onGoToWindow={(window) => setCurrentWindowForDiscipline(disciplina.id, window)}
                totalQuestions={disciplina.questoes.length}
                questionsPerWindow={QUESTIONS_PER_WINDOW}
                colorScheme="blue"
              />
            )}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-w-full">
              <table className="min-w-full border border-gray-300 text-center text-xs sm:text-sm shadow-md rounded-lg border-separate border-spacing-0 bg-white">
                <TableHeader
                  totalQuestions={disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                    ? getQuestionWindow(disciplina.questoes, getCurrentWindowForDiscipline(disciplina.id)).length 
                    : disciplina.questoes.length}
                  startQuestionNumber={disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                    ? getCurrentWindowForDiscipline(disciplina.id) * QUESTIONS_PER_WINDOW + 1 
                    : 1}
                  visibleFields={{
                    turma: false,
                    habilidade: disciplina.questoes.length <= 15, // ✅ NOVO: Ocultar habilidades se muitas questões
                    questoes: true,
                    percentualTurma: disciplina.questoes.length <= 20, // ✅ NOVO: Ocultar % se muitas questões
                    total: true,
                    nota: true,
                    proficiencia: true,
                    nivel: true
                  }}
                  tabelaDetalhada={{
                    disciplinas: [{
                      ...disciplina,
                      questoes: disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                        ? getQuestionWindow(disciplina.questoes, getCurrentWindowForDiscipline(disciplina.id))
                        : disciplina.questoes
                    }]
                  }}
                  students={disciplina.alunos.map(aluno => ({
                    id: aluno.id,
                    nome: aluno.nome,
                    acertos: aluno.total_acertos,
                    erros: aluno.total_erros,
                    em_branco: aluno.total_questoes_disciplina - aluno.total_respondidas,
                    respostas: aluno.respostas_por_questao.map(resposta => ({
                      questao_id: `q${resposta.questao}`,
                      questao_numero: resposta.questao,
                      resposta_correta: resposta.acertou,
                      resposta_em_branco: !resposta.respondeu,
                      tempo_gasto: 0
                    }))
                  }))}
                  successThreshold={60}
                />
                <tbody>
                  {disciplina.alunos.filter(aluno => {
                    // ✅ CORRIGIDO: Filtrar apenas alunos que responderam pelo menos uma questão
                    return aluno.respostas_por_questao.some(resposta => resposta.respondeu);
                  }).map((aluno, studentIndex) => (
                    <TableRow
                      key={`${disciplina.id}-${aluno.id}`}
                      student={{
                        id: aluno.id,
                        nome: aluno.nome,
                        turma: aluno.turma,
                        nota: aluno.nota,
                        proficiencia: aluno.proficiencia,
                        classificacao: (aluno.nivel_proficiencia || 'Abaixo do Básico') as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
                        questoes_respondidas: aluno.total_respondidas,
                        acertos: aluno.total_acertos,
                        erros: aluno.total_erros,
                        em_branco: aluno.total_questoes_disciplina - aluno.total_respondidas,
                        tempo_gasto: 0,
                        status: 'concluida' as const,
                        respostas: aluno.respostas_por_questao.map(resposta => ({
                          questao_id: `q${resposta.questao}`,
                          questao_numero: resposta.questao,
                          resposta_correta: resposta.acertou,
                          resposta_em_branco: !resposta.respondeu,
                          tempo_gasto: 0
                        }))
                      }}
                      studentIndex={studentIndex}
                      totalQuestions={disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                        ? getQuestionWindow(disciplina.questoes, getCurrentWindowForDiscipline(disciplina.id)).length 
                        : disciplina.questoes.length}
                      visibleFields={{
                        turma: false,
                        habilidade: disciplina.questoes.length <= 15, // ✅ NOVO: Ocultar habilidades se muitas questões
                        questoes: true,
                        percentualTurma: disciplina.questoes.length <= 20, // ✅ NOVO: Ocultar % se muitas questões
                        total: true,
                        nota: true,
                        proficiencia: true,
                        nivel: true
                      }}
                      onViewStudentDetails={onViewStudentDetails}
                      onOpenInNewTab={onOpenInNewTab}
                      evaluationId={disciplina.id}
                      tabelaDetalhada={{
                        disciplinas: [{
                          ...disciplina,
                          questoes: disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW 
                            ? getQuestionWindow(disciplina.questoes, getCurrentWindowForDiscipline(disciplina.id))
                            : disciplina.questoes
                        }]
                      }}
                    />
                  ))}
                </tbody>
              </table>
              {/* ✅ NOVO: Contador de questões no final */}
              {disciplina.questoes.length > MAX_QUESTIONS_FOR_FULL_VIEW && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-600 text-center">
                  {disciplina.nome}: {disciplina.questoes.length} questões • {disciplina.alunos.length} alunos • 
                  Janela {getCurrentWindowForDiscipline(disciplina.id) + 1} de {getTotalWindows(disciplina.questoes.length)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};