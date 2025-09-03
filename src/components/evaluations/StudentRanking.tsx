import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, UserX, Medal } from "lucide-react";

interface Student {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  status: 'concluida' | 'pendente';
}

interface StudentRankingProps {
  students: Student[];
  maxStudents?: number;
}

export function StudentRanking({ 
  students, 
  maxStudents = 50
}: StudentRankingProps) {
  // Separar alunos que participaram da avaliação dos faltosos
  const { completedStudents, absentStudents } = useMemo(() => {
    const completed = students.filter(student => student.status === 'concluida');
    const absent = students.filter(student => student.status === 'pendente');
    
    return { completedStudents: completed, absentStudents: absent };
  }, [students]);

  // Ordenar alunos por proficiência (maior para menor)
  const rankedStudents = useMemo(() => {
    return completedStudents
      .sort((a, b) => (b.proficiencia || 0) - (a.proficiencia || 0))
      .slice(0, maxStudents);
  }, [completedStudents, maxStudents]);

  // Função para obter ícone do ranking
  const getRankingIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-8 w-8 text-yellow-600" />;
    if (position === 2) return <Medal className="h-8 w-8 text-gray-500" />;
    if (position === 3) return <Medal className="h-8 w-8 text-amber-600" />;
    return <span className="text-2xl font-bold text-blue-600">{position}</span>;
  };

  // Função para obter cor do nível
  const getLevelColor = (classificacao: string) => {
    switch (classificacao) {
      case 'Avançado': return 'bg-green-500';
      case 'Adequado': return 'bg-blue-500';
      case 'Básico': return 'bg-yellow-500';
      case 'Abaixo do Básico': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Função para obter cor do badge do nível
  const getLevelBadgeColor = (classificacao: string) => {
    switch (classificacao) {
      case 'Avançado': return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'Adequado': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'Básico': return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-900';
      case 'Abaixo do Básico': return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Ranking dos Melhores Alunos */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Trophy className="h-8 w-8 text-yellow-300" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">🏆 RANKING DOS MELHORES</h1>
                <p className="text-blue-100 text-sm font-medium">
                  Os melhores alunos desta avaliação!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <Badge variant="secondary" className="bg-white/90 text-blue-700 font-bold">
                  {rankedStudents.length} {rankedStudents.length === 1 ? 'ALUNO' : 'ALUNOS'}
                </Badge>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankedStudents.length > 0 ? (
            <div className="space-y-3">
              {rankedStudents.map((student, index) => {
                const position = index + 1;

                return (
                  <div
                    key={student.id}
                    className={`relative flex items-center gap-4 p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 overflow-hidden ${
                      position === 1
                        ? 'bg-gradient-to-br from-yellow-400 via-yellow-300 to-orange-400 border-yellow-500 shadow-yellow-200'
                        : position === 2
                        ? 'bg-gradient-to-br from-gray-300 via-gray-200 to-slate-300 border-gray-400 shadow-gray-200'
                        : position === 3
                        ? 'bg-gradient-to-br from-amber-300 via-orange-200 to-yellow-300 border-amber-400 shadow-amber-200'
                        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-blue-100 hover:bg-gradient-to-br hover:from-blue-100 hover:via-indigo-100 hover:to-purple-100'
                    }`}
                  >
                    {/* Elementos decorativos gamificados */}
                    {position <= 3 && (
                      <>
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse"></div>
                        <div className="absolute -top-2 -right-2 w-16 h-16 bg-yellow-300 rounded-full opacity-20 animate-bounce"></div>
                        <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-orange-300 rounded-full opacity-20 animate-pulse"></div>
                      </>
                    )}

                    {/* Efeito de brilho */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Posição no ranking com estilo gamificado */}
                    <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg border-2 border-white z-10">
                      {getRankingIcon(position)}
                      {position <= 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    {/* Informações do aluno com estilo gamificado */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-black ${
                            position === 1 ? 'text-yellow-600' :
                            position === 2 ? 'text-gray-500' :
                            position === 3 ? 'text-amber-600' :
                            'text-blue-600'
                          }`}>#{position}</span>
                          <h3 className="font-bold text-gray-900 truncate text-lg">{student.nome}</h3>
                          {position <= 3 && (
                            <div className="flex items-center gap-1">
                              {[...Array(position)].map((_, i) => (
                                <span key={`star-${student.id}-${i}`} className="text-yellow-400">⭐</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge className={`${
                          position <= 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold' : 'bg-blue-100 text-blue-700'
                        } text-xs px-2 py-1 rounded-full shadow-sm`}>
                          {student.turma}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                          <span className="text-blue-600 font-medium">📝 Nota:</span>
                          <span className="font-bold text-blue-700 text-lg">{(student.nota || 0).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                          <span className="text-purple-600 font-medium">🚀 Proficiência:</span>
                          <span className="font-bold text-purple-700 text-lg">{(student.proficiencia || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Nível com estilo gamificado */}
                    <div className="flex flex-col items-center gap-1 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full ${getLevelColor(student.classificacao)} shadow-sm`} />
                        <div className="text-xs font-medium text-gray-600">Nível</div>
                      </div>
                      <Badge className={`${getLevelBadgeColor(student.classificacao)} px-3 py-1 text-xs font-bold shadow-sm hover:scale-110 transition-transform duration-200`}>
                        {position <= 3 && '🏅 '}
                        {student.classificacao}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum aluno participou da avaliação
              </h3>
              <p className="text-gray-600">
                Não há dados de alunos que concluíram a avaliação para gerar o ranking.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alunos Faltosos */}
      {absentStudents.length > 0 && (
        <Card className="bg-gradient-to-br from-gray-50 via-red-50 to-orange-50 border-2 border-gray-300 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-600 via-red-600 to-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserX className="h-6 w-6 text-red-300" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full"></div>
                </div>
                <div>
                  <h2 className="text-xl font-bold">😴 ALUNOS AUSENTES</h2>
                  <p className="text-gray-100 text-sm font-medium">
                    Alunos que não participaram da batalha!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <Badge variant="secondary" className="bg-white/90 text-red-700 font-bold">
                    {absentStudents.length} {absentStudents.length === 1 ? 'AUSENTE' : 'AUSENTES'}
                  </Badge>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {absentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-sm">
                    <UserX className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate text-sm">{student.nome}</h4>
                    <p className="text-xs text-gray-600 font-medium">{student.turma}</p>
                  </div>

                  <Badge className="bg-gradient-to-r from-red-400 to-orange-400 text-white text-xs font-bold px-2 py-1 shadow-sm hover:scale-110 transition-transform duration-200">
                    😴 AUSENTE
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
