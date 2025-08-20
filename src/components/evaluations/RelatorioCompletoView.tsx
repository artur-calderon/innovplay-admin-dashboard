import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelatorioCompleto } from "@/types/evaluation-results";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Award, 
  GraduationCap,
  BarChart3,
  BookOpen,
  Brain
} from "lucide-react";

interface RelatorioCompletoViewProps {
  data: RelatorioCompleto;
}

export function RelatorioCompletoView({ data }: RelatorioCompletoViewProps) {
  // Função para obter a cor baseada no percentual
  const getPercentualColor = (percentual: number) => {
    if (percentual >= 80) return 'bg-green-500 text-white';
    if (percentual >= 60) return 'bg-yellow-500 text-white';
    if (percentual >= 40) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  // Função para obter a cor baseada no nível de aprendizagem
  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'abaixo_do_basico': return 'bg-red-100 text-red-800 border-red-300';
      case 'basico': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'adequado': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'avancado': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header da Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Informações da Avaliação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-lg font-medium mb-2">{data.avaliacao.titulo}</h4>
              <p className="text-gray-600">{data.avaliacao.descricao}</p>
            </div>
            <div>
              <h5 className="font-medium mb-2">Disciplinas:</h5>
              <div className="flex flex-wrap gap-2">
                {data.avaliacao.disciplinas.map((disciplina, index) => (
                  <Badge key={index} variant="secondary">
                    {disciplina}
                  </Badge>
                ))}
                <Badge variant="default" className="bg-purple-600">
                  GERAL
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total de Alunos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Total de Alunos por Turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left font-medium">Turma</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-medium">Matriculados</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-medium">Avaliados</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-medium">Percentual</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-medium">Faltosos</th>
                </tr>
              </thead>
              <tbody>
                {data.total_alunos.por_turma.map((turma, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{turma.turma}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{turma.matriculados}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{turma.avaliados}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{turma.percentual}%</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{turma.faltosos}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold">
                  <td className="border border-gray-300 px-4 py-2">TOTAL GERAL</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{data.total_alunos.total_geral.matriculados}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{data.total_alunos.total_geral.avaliados}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{data.total_alunos.total_geral.percentual}%</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{data.total_alunos.total_geral.faltosos}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Níveis de Aprendizagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Níveis de Aprendizagem por Turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(data.niveis_aprendizagem).map(([disciplina, dadosDisciplina]) => (
              <div key={disciplina} className="space-y-4">
                <h4 className={`text-xl font-bold text-center uppercase ${
                  disciplina === 'GERAL' ? 'text-purple-700 bg-purple-100 p-2 rounded-lg' : 'text-gray-800'
                }`}>
                  {disciplina === 'GERAL' ? '🎯 GERAL (Combinação de Todas as Disciplinas)' : disciplina}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium">Turma</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-medium bg-red-100">Abaixo do Básico</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-medium bg-yellow-100">Básico</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-medium bg-blue-100">Adequado</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-medium bg-green-100">Avançado</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosDisciplina.por_turma.map((turma, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">{turma.turma}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center bg-red-50">{turma.abaixo_do_basico}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-50">{turma.basico}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center bg-blue-50">{turma.adequado}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center bg-green-50">{turma.avancado}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center font-medium">{turma.total}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-semibold">
                        <td className="border border-gray-300 px-4 py-2">TOTAL GERAL</td>
                        <td className="border border-gray-300 px-4 py-2 text-center bg-red-100">{dadosDisciplina.geral.abaixo_do_basico}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-100">{dadosDisciplina.geral.basico}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center bg-blue-100">{dadosDisciplina.geral.adequado}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center bg-green-100">{dadosDisciplina.geral.avancado}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{dadosDisciplina.geral.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proficiência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Proficiência por Turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(data.proficiencia.por_disciplina).map(([disciplina, dadosDisciplina]) => (
              <div key={disciplina} className="space-y-4">
                <h4 className={`text-xl font-bold text-center uppercase ${
                  disciplina === 'GERAL' ? 'text-purple-700 bg-purple-100 p-2 rounded-lg' : 'text-gray-800'
                }`}>
                  {disciplina === 'GERAL' ? '📊 GERAL (Média das Disciplinas)' : disciplina}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium">Turma</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Proficiência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosDisciplina.por_turma.map((turma, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">{turma.turma}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{turma.proficiencia.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-semibold">
                        <td className="border border-gray-300 px-4 py-2">MÉDIA GERAL</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{dadosDisciplina.media_geral.toFixed(2)}</td>
                      </tr>
                      {disciplina !== 'GERAL' && (
                        <tr className="bg-green-50 font-semibold">
                          <td className="border border-gray-300 px-4 py-2">MÉDIA MUNICIPAL</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {data.proficiencia.media_municipal_por_disciplina[disciplina]?.toFixed(2) || 'N/A'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nota Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Nota Geral por Turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(data.nota_geral.por_disciplina).map(([disciplina, dadosDisciplina]) => (
              <div key={disciplina} className="space-y-4">
                <h4 className={`text-xl font-bold text-center uppercase ${
                  disciplina === 'GERAL' ? 'text-purple-700 bg-purple-100 p-2 rounded-lg' : 'text-gray-800'
                }`}>
                  {disciplina === 'GERAL' ? '🏆 GERAL (Média das Disciplinas)' : disciplina}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium">Turma</th>
                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosDisciplina.por_turma.map((turma, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">{turma.turma}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{turma.nota.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-semibold">
                        <td className="border border-gray-300 px-4 py-2">MÉDIA GERAL</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{dadosDisciplina.media_geral.toFixed(2)}</td>
                      </tr>
                      {disciplina !== 'GERAL' && (
                        <tr className="bg-green-50 font-semibold">
                          <td className="border border-gray-300 px-4 py-2">MÉDIA MUNICIPAL</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {data.nota_geral.media_municipal_por_disciplina[disciplina]?.toFixed(2) || 'N/A'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acertos por Habilidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Acertos por Habilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(data.acertos_por_habilidade).map(([disciplina, dadosDisciplina]) => (
              <div key={disciplina} className="space-y-4">
                <h4 className={`text-xl font-bold text-center uppercase ${
                  disciplina === 'GERAL' ? 'text-purple-700 bg-purple-100 p-2 rounded-lg' : 'text-gray-800'
                }`}>
                  {disciplina === 'GERAL' ? '🧠 GERAL (Ranking Combinado)' : disciplina}
                </h4>
                
                {/* Grid de habilidades */}
                <div className="grid grid-cols-13 gap-0 border border-gray-300">
                  {dadosDisciplina.habilidades.map((habilidade, index) => (
                    <div key={index} className="flex flex-col">
                      {/* Header da questão */}
                      <div className="bg-blue-600 text-white text-center py-2 px-1 text-sm font-medium border-r border-gray-300 last:border-r-0">
                        {index + 1}ª Q
                      </div>
                      
                      {/* Código da habilidade */}
                      <div className="bg-yellow-400 text-black text-center py-2 px-1 text-sm font-medium border-r border-gray-300 last:border-r-0 border-t border-gray-300">
                        {habilidade.codigo}
                      </div>
                      
                      {/* Percentual com cor baseada no valor */}
                      <div 
                        className={`text-center py-2 px-1 text-sm font-medium border-r border-gray-300 last:border-r-0 border-t border-gray-300 ${
                          getPercentualColor(habilidade.percentual)
                        }`}
                      >
                        {habilidade.percentual}%
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Legenda */}
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 border border-gray-300"></div>
                    <span>≥ 80%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 border border-gray-300"></div>
                    <span>60-79%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 border border-gray-300"></div>
                    <span>40-59%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 border border-gray-300"></div>
                    <span>&lt; 40%</span>
                  </div>
                </div>

                {/* Tabela detalhada das habilidades */}
                <div className="mt-4">
                  <h5 className="font-medium mb-2">Detalhamento das Habilidades:</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-center">Ranking</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Código</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Descrição</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Acertos</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Total</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Percentual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosDisciplina.habilidades.map((habilidade, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                              #{habilidade.ranking}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                              {habilidade.codigo}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {habilidade.descricao}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {habilidade.acertos}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {habilidade.total}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <Badge 
                                variant="outline" 
                                className={getPercentualColor(habilidade.percentual)}
                              >
                                {habilidade.percentual}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
