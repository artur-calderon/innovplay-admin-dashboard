import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Eye, CheckCircle2, Target, Gauge, Award } from "lucide-react";

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
        <Card className="shadow-lg border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
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
            <div className="overflow-x-auto">
              <table className="min-w-max border border-gray-300 text-center text-sm shadow-md rounded-lg">
                <thead>
                  {/* Linha 1: Cabeçalhos principais */}
                  <tr className="bg-gray-100">
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">ALUNO</th>
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        TOTAL
                      </div>
                    </th>
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-4 w-4" />
                        NOTA
                      </div>
                    </th>
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Gauge className="h-4 w-4" />
                        PROFICIÊNCIA
                      </div>
                    </th>
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="h-4 w-4" />
                        NÍVEL
                      </div>
                    </th>
                  </tr>
                  
                  {/* Linha 2: HABILIDADE */}
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-blue-600">HABILIDADE</div>
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-blue-600">GERAL</div>
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-blue-600">GERAL</div>
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-blue-600">GERAL</div>
                    </td>
                  </tr>
                  
                  {/* Linha 3: % DA TURMA */}
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-green-600">% DA TURMA</div>
                      <div className="text-xs text-green-500">(SÓ QUEM FEZ)</div>
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-green-600">100%</div>
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-green-600">100%</div>
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-green-600">100%</div>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {tabelaDetalhada.geral.alunos.map((aluno) => (
                    <tr 
                      key={aluno.id}
                      className="border-b hover:bg-gray-50 cursor-pointer group"
                      onClick={() => onViewStudentDetails?.(aluno.id)}
                      title="Clique para ver resultados detalhados do aluno"
                    >
                      {/* Nome do Aluno */}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap border border-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{aluno.nome}</span>
                          <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>

                      {/* Total de acertos */}
                      <td className="px-4 py-3 text-sm font-semibold text-center border border-gray-300">
                        {aluno.total_acertos_geral}
                      </td>

                      {/* Nota */}
                      <td className="px-4 py-3 text-sm text-center border border-gray-300">
                        {aluno.nota_geral.toFixed(1)}
                      </td>

                      {/* Proficiência */}
                      <td className="px-4 py-3 text-sm text-center border border-gray-300">
                        {aluno.proficiencia_geral.toFixed(0)}
                      </td>

                      {/* Nível */}
                      <td className="px-4 py-3 text-sm font-medium text-center border border-gray-300">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-white ${
                          aluno.nivel_proficiencia_geral === 'Avançado'
                            ? 'bg-green-600'
                            : aluno.nivel_proficiencia_geral === 'Adequado'
                            ? 'bg-green-400'
                            : aluno.nivel_proficiencia_geral === 'Básico'
                            ? 'bg-yellow-500'
                            : aluno.nivel_proficiencia_geral === 'Abaixo do Básico'
                            ? 'bg-red-500'
                            : 'bg-red-500'
                        }`}>
                          {aluno.nivel_proficiencia_geral || 'Abaixo do Básico'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabelas por Disciplina */}
      {tabelaDetalhada.disciplinas.map((disciplina) => (
        <Card key={disciplina.id} className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
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
            <div className="overflow-x-auto">
              <table className="min-w-max border border-gray-300 text-center text-sm shadow-md rounded-lg">
                <thead>
                  {/* Linha 1: Cabeçalhos principais */}
                  <tr className="bg-gray-100">
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">ALUNO</th>
                    {disciplina.questoes.map((questao) => (
                      <th key={questao.question_id} className="border border-gray-300 p-1 text-center font-semibold">
                        <div className="text-xs font-bold">Q{questao.numero}</div>
                        <div className="text-xs text-gray-600 mt-1">{disciplina.nome}</div>
                      </th>
                    ))}
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        TOTAL
                      </div>
                    </th>
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-4 w-4" />
                        NOTA
                      </div>
                    </th>
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Gauge className="h-4 w-4" />
                        PROFICIÊNCIA
                      </div>
                    </th>
                    <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="h-4 w-4" />
                        NÍVEL
                      </div>
                    </th>
                  </tr>
                  
                  {/* Linha 2: HABILIDADE */}
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-blue-600">HABILIDADE</div>
                    </td>
                    {disciplina.questoes.map((questao) => (
                      <td key={`skill-${questao.question_id}`} className="border border-gray-300 p-1 text-center">
                        <div 
                          className="text-xs font-semibold text-blue-600 cursor-help"
                          title={questao.habilidade}
                        >
                          {questao.codigo_habilidade}
                        </div>
                      </td>
                    ))}
                    <td className="border border-gray-300 p-1 text-center"></td>
                    <td className="border border-gray-300 p-1 text-center"></td>
                    <td className="border border-gray-300 p-1 text-center"></td>
                    <td className="border border-gray-300 p-1 text-center"></td>
                  </tr>
                  
                  {/* Linha 3: % DA TURMA */}
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="text-xs font-semibold text-green-600">% DA TURMA</div>
                      <div className="text-xs text-green-500">(SÓ QUEM FEZ)</div>
                    </td>
                    {disciplina.questoes.map((questao) => {
                      const stats = getQuestionStats(disciplina, questao.numero);
                      return (
                        <td key={`stats-${questao.question_id}`} className="border border-gray-300 p-1 text-center">
                          <div className="text-xs font-semibold text-green-600">{stats.percentage}%</div>
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 p-1 text-center"></td>
                    <td className="border border-gray-300 p-1 text-center"></td>
                    <td className="border border-gray-300 p-1 text-center"></td>
                    <td className="border border-gray-300 p-1 text-center"></td>
                  </tr>
                </thead>
                <tbody>
                  {disciplina.alunos.map((aluno) => (
                    <tr 
                      key={aluno.id}
                      className="border-b hover:bg-gray-50 cursor-pointer group"
                      onClick={() => onViewStudentDetails?.(aluno.id)}
                      title="Clique para ver resultados detalhados do aluno"
                    >
                      {/* Nome do Aluno */}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap border border-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{aluno.nome}</span>
                          <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>

                      {/* Questões individuais */}
                      {disciplina.questoes.map((questao) => {
                        const resposta = aluno.respostas_por_questao.find(r => r.questao === questao.numero);
                        
                        return (
                          <td key={`${aluno.id}-q${questao.numero}`} className="px-2 py-3 text-center border border-gray-300">
                            {resposta ? (
                              // Aluno respondeu
                              resposta.acertou ? (
                                <Check className="w-4 h-4 text-green-700 mx-auto" title={`Q${questao.numero} - ${disciplina.nome}: Acertou`} />
                              ) : (
                                <X className="w-4 h-4 text-red-600 mx-auto" title={`Q${questao.numero} - ${disciplina.nome}: Errou`} />
                              )
                            ) : (
                              // Aluno não respondeu
                              <Minus className="w-4 h-4 text-gray-400 mx-auto" title={`Q${questao.numero} - ${disciplina.nome}: Não respondeu`} />
                            )}
                          </td>
                        );
                      })}

                      {/* Total de acertos */}
                      <td className="px-4 py-3 text-sm font-semibold text-center border border-gray-300">
                        {aluno.total_acertos}
                      </td>

                      {/* Nota */}
                      <td className="px-4 py-3 text-sm text-center border border-gray-300">
                        {aluno.nota.toFixed(1)}
                      </td>

                      {/* Proficiência */}
                      <td className="px-4 py-3 text-sm text-center border border-gray-300">
                        {aluno.proficiencia.toFixed(0)}
                      </td>

                      {/* Nível */}
                      <td className="px-4 py-3 text-sm font-medium text-center border border-gray-300">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-white ${
                          aluno.nivel_proficiencia === 'Avançado'
                            ? 'bg-green-600'
                            : aluno.nivel_proficiencia === 'Adequado'
                            ? 'bg-green-400'
                            : aluno.nivel_proficiencia === 'Básico'
                            ? 'bg-yellow-500'
                            : aluno.nivel_proficiencia === 'Abaixo do Básico'
                            ? 'bg-red-500'
                            : 'bg-red-500'
                        }`}>
                          {aluno.nivel_proficiencia || 'Abaixo do Básico'}
                        </span>
                      </td>
                    </tr>
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
