import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Eye, CheckCircle2, Target, Gauge, Award } from "lucide-react";
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

interface DisciplineTablesProps {
  tabelaDetalhada: {
    disciplinas: TabelaDetalhadaDisciplina[];
    geral?: {
      alunos: TabelaDetalhadaGeralAluno[];
    };
  };
  onViewStudentDetails?: (studentId: string) => void;
}

export const DisciplineTables: React.FC<DisciplineTablesProps> = ({
  tabelaDetalhada,
  onViewStudentDetails
}) => {
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

  return (
    <div className="space-y-8">
      {/* Tabela Geral */}
      {tabelaDetalhada.geral && tabelaDetalhada.geral.alunos && (
        <Card className="shadow-xl border-2 border-blue-200 hover:shadow-2xl transition-shadow duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg px-0">
            <CardTitle className="flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">G</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Resultados Gerais</h2>
                  <p className="text-blue-100 text-sm">
                    {tabelaDetalhada.geral.alunos.length} {tabelaDetalhada.geral.alunos.length === 1 ? 'aluno' : 'alunos'} • Média de todas as disciplinas
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/90 text-blue-700 font-bold">
                GERAL
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-max border border-gray-300 text-center text-sm shadow-md rounded-lg border-separate border-spacing-0 bg-white">
                <TableHeader
                  totalQuestions={0}
                  startQuestionNumber={1}
                  visibleFields={{
                    turma: false,
                    habilidade: false, // ✅ CORRIGIDO: Desabilitar para tabela geral
                    questoes: false,
                    percentualTurma: false, // ✅ CORRIGIDO: Desabilitar para tabela geral
                    total: true,
                    nota: true,
                    proficiencia: true,
                    nivel: true
                  }}
                  tabelaDetalhada={{
                    disciplinas: []
                  }}
                  students={tabelaDetalhada.geral.alunos.map(aluno => ({
                    id: aluno.id,
                    nome: aluno.nome,
                    acertos: aluno.total_acertos_geral,
                    erros: aluno.total_questoes_geral - aluno.total_acertos_geral,
                    em_branco: aluno.total_em_branco_geral,
                    respostas: []
                  }))}
                  successThreshold={60}
                />
                <tbody>
                  {tabelaDetalhada.geral.alunos.map((aluno, studentIndex) => (
                    <TableRow
                      key={aluno.id}
                      student={{
                        id: aluno.id,
                        nome: aluno.nome,
                        turma: 'Geral',
                        nota: aluno.nota_geral,
                        proficiencia: aluno.proficiencia_geral,
                        classificacao: aluno.nivel_proficiencia_geral as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
                        questoes_respondidas: aluno.total_respondidas_geral,
                        acertos: aluno.total_acertos_geral,
                        erros: Math.max(0, aluno.total_questoes_geral - aluno.total_acertos_geral),
                        em_branco: aluno.total_em_branco_geral,
                        tempo_gasto: 0,
                        status: 'concluida' as const,
                        respostas: []
                      }}
                      studentIndex={studentIndex}
                      totalQuestions={0}
                      visibleFields={{
                        turma: false,
                        habilidade: false, // ✅ CORRIGIDO: Desabilitar para tabela geral
                        questoes: false,
                        percentualTurma: false, // ✅ CORRIGIDO: Desabilitar para tabela geral
                        total: true,
                        nota: true,
                        proficiencia: true,
                        nivel: true
                      }}
                      onViewStudentDetails={onViewStudentDetails}
                      evaluationId="geral"
                      tabelaDetalhada={{
                        disciplinas: []
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabelas por Disciplina */}
      {tabelaDetalhada.disciplinas.map((disciplina) => (
        <Card key={disciplina.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg px-0">
            <CardTitle className="flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">{disciplina.nome.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{disciplina.nome}</h2>
                  <p className="text-blue-100 text-sm">
                    {disciplina.alunos.length} {disciplina.alunos.length === 1 ? 'aluno' : 'alunos'} • {disciplina.questoes.length} {disciplina.questoes.length === 1 ? 'questão' : 'questões'}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/90 text-blue-700 font-bold">
                {disciplina.nome.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-max border border-gray-300 text-center text-sm shadow-md rounded-lg border-separate border-spacing-0 bg-white">
                <TableHeader
                  totalQuestions={disciplina.questoes.length}
                  startQuestionNumber={1}
                  visibleFields={{
                    turma: false,
                    habilidade: true,
                    questoes: true,
                    percentualTurma: true,
                    total: true,
                    nota: true,
                    proficiencia: true,
                    nivel: true
                  }}
                  tabelaDetalhada={{
                    disciplinas: [disciplina]
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
                  {disciplina.alunos.map((aluno, studentIndex) => (
                    <TableRow
                      key={aluno.id}
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
                      totalQuestions={disciplina.questoes.length}
                      visibleFields={{
                        turma: false,
                        habilidade: true,
                        questoes: true,
                        percentualTurma: true,
                        total: true,
                        nota: true,
                        proficiencia: true,
                        nivel: true
                      }}
                      onViewStudentDetails={onViewStudentDetails}
                      evaluationId={disciplina.id}
                      tabelaDetalhada={{
                        disciplinas: [disciplina]
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
