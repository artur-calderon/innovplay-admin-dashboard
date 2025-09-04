import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, UserX, Medal, Award, Star, TrendingUp, Users } from "lucide-react";

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
    if (position === 1) return <Trophy className="h-6 w-6 text-amber-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-slate-600">{position}</span>;
  };

  // Função para obter cor de fundo do ranking
  const getRankingBackground = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200';
    if (position === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
    if (position === 3) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
    return 'bg-white border-gray-200';
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
      case 'Avançado': return 'bg-green-100 text-green-800 border-green-200';
      case 'Adequado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Básico': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Abaixo do Básico': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Ranking dos Melhores Alunos */}
      <Card className="border border-gray-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-lg">
                <Trophy className="h-6 w-6 text-purple-200" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Ranking dos Melhores</h1>
                <p className="text-purple-100 text-sm">
                  Classificação por proficiência
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-purple-100">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {rankedStudents.length} {rankedStudents.length === 1 ? 'aluno' : 'alunos'}
                </span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {rankedStudents.length > 0 ? (
            <div className="space-y-4">
              {rankedStudents.map((student, index) => {
                const position = index + 1;

                return (
                  <div
                    key={student.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getRankingBackground(position)}`}
                  >
                    {/* Posição no ranking */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white border border-gray-200 shadow-sm">
                      {getRankingIcon(position)}
                    </div>

                    {/* Informações do aluno */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate text-base">
                          {student.nome}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {student.turma}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Nota:</span>
                          <span className="font-semibold text-gray-900">{(student.nota || 0).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Proficiência:</span>
                          <span className="font-semibold text-gray-900">{(student.proficiencia || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Nível de proficiência */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-gray-500 font-medium">Nível</div>
                      <Badge className={`${getLevelBadgeColor(student.classificacao)} text-xs font-medium border`}>
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

      {/* Alunos Ausentes */}
      {absentStudents.length > 0 && (
        <Card className="border border-gray-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-lg">
                  <UserX className="h-6 w-6 text-red-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Alunos Ausentes</h2>
                  <p className="text-gray-300 text-sm">
                    Alunos que não participaram da avaliação
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {absentStudents.length} {absentStudents.length === 1 ? 'aluno' : 'alunos'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {absentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserX className="h-4 w-4 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate text-sm">{student.nome}</h4>
                    <p className="text-xs text-gray-500">{student.turma}</p>
                  </div>

                  <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                    Ausente
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
