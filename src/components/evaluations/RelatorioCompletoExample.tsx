import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatorioCompletoView } from './RelatorioCompletoView';
import { RelatorioCompleto } from '@/types/evaluation-results';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, Eye } from 'lucide-react';

interface RelatorioCompletoExampleProps {
  evaluationId?: string;
}

export function RelatorioCompletoExample({ evaluationId }: RelatorioCompletoExampleProps) {
  const [data, setData] = useState<RelatorioCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Dados de exemplo para demonstração
  const exampleData: RelatorioCompleto = {
    avaliacao: {
      id: "046f73e4-06a4-4f40-915e-9522cc171599",
      titulo: "Avaliação Professor1",
      descricao: "Avaliação criada via painel administrativo",
      disciplinas: ["Português", "Matemática"]
    },
    total_alunos: {
      por_turma: [
        {
          turma: "9º A",
          matriculados: 25,
          avaliados: 23,
          percentual: 92.0,
          faltosos: 2
        },
        {
          turma: "9º B",
          matriculados: 28,
          avaliados: 26,
          percentual: 92.9,
          faltosos: 2
        }
      ],
      total_geral: {
        matriculados: 53,
        avaliados: 49,
        percentual: 92.5,
        faltosos: 4
      }
    },
    niveis_aprendizagem: {
      "Português": {
        por_turma: [
          {
            turma: "9º A",
            abaixo_do_basico: 2,
            basico: 8,
            adequado: 10,
            avancado: 3,
            total: 23
          },
          {
            turma: "9º B",
            abaixo_do_basico: 3,
            basico: 12,
            adequado: 8,
            avancado: 3,
            total: 26
          }
        ],
        geral: {
          abaixo_do_basico: 5,
          basico: 20,
          adequado: 18,
          avancado: 6,
          total: 49
        }
      },
      "Matemática": {
        por_turma: [
          {
            turma: "9º A",
            abaixo_do_basico: 1,
            basico: 6,
            adequado: 12,
            avancado: 4,
            total: 23
          },
          {
            turma: "9º B",
            abaixo_do_basico: 2,
            basico: 10,
            adequado: 11,
            avancado: 3,
            total: 26
          }
        ],
        geral: {
          abaixo_do_basico: 3,
          basico: 16,
          adequado: 23,
          avancado: 7,
          total: 49
        }
      },
      "GERAL": {
        por_turma: [
          {
            turma: "9º A",
            abaixo_do_basico: 3,
            basico: 14,
            adequado: 22,
            avancado: 7,
            total: 46
          },
          {
            turma: "9º B",
            abaixo_do_basico: 5,
            basico: 22,
            adequado: 19,
            avancado: 6,
            total: 52
          }
        ],
        geral: {
          abaixo_do_basico: 8,
          basico: 36,
          adequado: 41,
          avancado: 13,
          total: 98
        }
      }
    },
    proficiencia: {
      por_disciplina: {
        "Português": {
          por_turma: [
            {
              turma: "9º A",
              proficiencia: 7.85
            },
            {
              turma: "9º B",
              proficiencia: 6.92
            }
          ],
          media_geral: 7.38
        },
        "Matemática": {
          por_turma: [
            {
              turma: "9º A",
              proficiencia: 8.12
            },
            {
              turma: "9º B",
              proficiencia: 7.15
            }
          ],
          media_geral: 7.63
        },
        "GERAL": {
          por_turma: [
            {
              turma: "9º A",
              proficiencia: 7.98
            },
            {
              turma: "9º B",
              proficiencia: 7.03
            }
          ],
          media_geral: 7.50
        }
      },
      media_municipal_por_disciplina: {
        "Português": 6.77,
        "Matemática": 5.85
      }
    },
    nota_geral: {
      por_disciplina: {
        "Português": {
          por_turma: [
            {
              turma: "9º A",
              nota: 8.25
            },
            {
              turma: "9º B",
              nota: 7.45
            }
          ],
          media_geral: 7.85
        },
        "Matemática": {
          por_turma: [
            {
              turma: "9º A",
              nota: 8.79
            },
            {
              turma: "9º B",
              nota: 7.42
            }
          ],
          media_geral: 8.10
        },
        "GERAL": {
          por_turma: [
            {
              turma: "9º A",
              nota: 8.52
            },
            {
              turma: "9º B",
              nota: 7.44
            }
          ],
          media_geral: 7.98
        }
      },
      media_municipal_por_disciplina: {
        "Português": 6.77,
        "Matemática": 5.85
      }
    },
    acertos_por_habilidade: {
      "Português": {
        habilidades: [
          {
            ranking: 1,
            codigo: "EF69LP01",
            descricao: "Habilidade EF69LP01",
            acertos: 42,
            total: 49,
            percentual: 85.7,
            questoes: [
              {
                numero: 1,
                numero_questao: 1,
                acertos: 42,
                total: 49,
                percentual: 85.7,
                codigo: "EF69LP01",
                descricao: "Habilidade EF69LP01"
              }
            ]
          },
          {
            ranking: 2,
            codigo: "EF69LP02",
            descricao: "Habilidade EF69LP02",
            acertos: 38,
            total: 49,
            percentual: 77.6,
            questoes: [
              {
                numero: 2,
                numero_questao: 2,
                acertos: 38,
                total: 49,
                percentual: 77.6,
                codigo: "EF69LP02",
                descricao: "Habilidade EF69LP02"
              }
            ]
          }
        ]
      },
      "Matemática": {
        habilidades: [
          {
            ranking: 1,
            codigo: "EF69MA01",
            descricao: "Habilidade EF69MA01",
            acertos: 45,
            total: 49,
            percentual: 91.8,
            questoes: [
              {
                numero: 3,
                numero_questao: 3,
                acertos: 45,
                total: 49,
                percentual: 91.8,
                codigo: "EF69MA01",
                descricao: "Habilidade EF69MA01"
              }
            ]
          },
          {
            ranking: 2,
            codigo: "EF69MA02",
            descricao: "Habilidade EF69MA02",
            acertos: 41,
            total: 49,
            percentual: 83.7,
            questoes: [
              {
                numero: 4,
                numero_questao: 4,
                acertos: 41,
                total: 49,
                percentual: 83.7,
                codigo: "EF69MA02",
                descricao: "Habilidade EF69MA02"
              }
            ]
          }
        ]
      },
      "GERAL": {
        habilidades: [
          {
            ranking: 1,
            codigo: "EF69MA01",
            descricao: "Habilidade EF69MA01",
            acertos: 45,
            total: 49,
            percentual: 91.8,
            questoes: [
              {
                numero: 3,
                numero_questao: 3,
                acertos: 45,
                total: 49,
                percentual: 91.8,
                codigo: "EF69MA01",
                descricao: "Habilidade EF69MA01"
              }
            ]
          },
          {
            ranking: 2,
            codigo: "EF69LP01",
            descricao: "Habilidade EF69LP01",
            acertos: 42,
            total: 49,
            percentual: 85.7,
            questoes: [
              {
                numero: 1,
                numero_questao: 1,
                acertos: 42,
                total: 49,
                percentual: 85.7,
                codigo: "EF69LP01",
                descricao: "Habilidade EF69LP01"
              }
            ]
          },
          {
            ranking: 3,
            codigo: "EF69MA02",
            descricao: "Habilidade EF69MA02",
            acertos: 41,
            total: 49,
            percentual: 83.7,
            questoes: [
              {
                numero: 4,
                numero_questao: 4,
                acertos: 41,
                total: 49,
                percentual: 83.7,
                codigo: "EF69MA02",
                descricao: "Habilidade EF69MA02"
              }
            ]
          },
          {
            ranking: 4,
            codigo: "EF69LP02",
            descricao: "Habilidade EF69LP02",
            acertos: 38,
            total: 49,
            percentual: 77.6,
            questoes: [
              {
                numero: 2,
                numero_questao: 2,
                acertos: 38,
                total: 49,
                percentual: 77.6,
                codigo: "EF69LP02",
                descricao: "Habilidade EF69LP02"
              }
            ]
          }
        ]
      }
    }
  };

  const loadRealData = async () => {
    if (!evaluationId) {
      toast({
        title: "Erro",
        description: "ID da avaliação não fornecido",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const realData = await EvaluationResultsApiService.getRelatorioCompleto(evaluationId);
      setData(realData);
      toast({
        title: "Sucesso",
        description: "Dados reais carregados com sucesso",
      });
    } catch (error) {
      console.error("Erro ao carregar dados reais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados reais",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadExampleData = () => {
    setData(exampleData);
    toast({
      title: "Dados de Exemplo",
      description: "Dados de demonstração carregados",
    });
  };

  const exportToPDF = () => {
    // Implementar exportação para PDF
    toast({
      title: "Exportar PDF",
      description: "Funcionalidade de exportação será implementada em breve",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Relatório Completo de Avaliação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={loadExampleData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Carregar Dados de Exemplo
            </Button>
            
            {evaluationId && (
              <Button 
                onClick={loadRealData}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Carregando...' : 'Carregar Dados Reais'}
              </Button>
            )}
            
            <Button 
              onClick={exportToPDF}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Sobre a Nova Estrutura</h4>
            <p className="text-blue-800 text-sm">
              Esta nova estrutura inclui o campo <strong>"GERAL"</strong> que combina os dados de todas as disciplinas, 
              fornecendo uma visão consolidada do desempenho dos alunos. O campo GERAL aparece em:
            </p>
            <ul className="text-blue-800 text-sm mt-2 list-disc list-inside">
              <li><strong>Níveis de Aprendizagem:</strong> Combinação dos níveis de todas as disciplinas</li>
              <li><strong>Proficiência:</strong> Média das proficiências de todas as disciplinas</li>
              <li><strong>Nota Geral:</strong> Média das notas de todas as disciplinas</li>
              <li><strong>Acertos por Habilidade:</strong> Ranking combinado de todas as habilidades</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Relatório */}
      {data && (
        <RelatorioCompletoView data={data} />
      )}

      {/* Mensagem quando não há dados */}
      {!data && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Eye className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum dado carregado
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Use os botões acima para carregar dados de exemplo ou dados reais de uma avaliação.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
