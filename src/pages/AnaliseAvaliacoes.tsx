import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  TrendingUp,
  Users,
  FileText,
  FileX,
  Eye,
  AlertTriangle,
  Target,
  Award,
  RefreshCw,
  School,
  MapPin,
  GraduationCap,
  Filter,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useAuth } from "@/context/authContext";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";

// Interfaces para os dados da API
interface EvaluationResult {
  id: string;
  titulo: string;
  disciplina: string;
  curso?: string;
  serie?: string;
  turma?: string;
  escola?: string;
  municipio?: string;
  estado?: string;
  data_aplicacao: string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes?: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
  distribuicao_classificacao: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
  status?: 'concluida' | 'em_andamento' | 'pendente' | string;
}

// Interfaces para os filtros
interface State {
  id: string;
  name: string;
  uf: string;
}

interface Municipality { 
  id: string; 
  name: string; 
  state: string; 
}

// Mapa de status estático
const getStatusConfig = (status: 'concluida' | 'em_andamento' | 'pendente' | string) => {
  const configs: Record<string, { label: string; color: string }> = {
    concluida: {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    em_andamento: {
      label: "Em Andamento",
      color: "bg-blue-100 text-blue-800 border-blue-300"
    },
    pendente: {
      label: "Pendente",
      color: "bg-gray-100 text-gray-800 border-gray-300"
    },
    agendada: {
      label: "Agendada",
      color: "bg-yellow-50 text-yellow-600 border-yellow-200"
    },
    'concluído': {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    'em andamento': {
      label: "Em Andamento",
      color: "bg-blue-100 text-blue-800 border-blue-300"
    },
    'finalizada': {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    'finalizado': {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    'agendado': {
      label: "Agendada",
      color: "bg-yellow-50 text-yellow-600 border-yellow-200"
    }
  };

  const config = configs[status] || {
    label: "Desconhecido",
    color: "bg-gray-100 text-gray-800 border-gray-300"
  };

  return config;
};

export default function AnaliseAvaliacoes() {
  const { autoLogin, user } = useAuth();
  const [apiData, setApiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('all');

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [evaluationsByMunicipality, setEvaluationsByMunicipality] = useState<Array<{ id: string; titulo: string; disciplina: string; status: string; data_aplicacao: string }>>([]);

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (user && !['admin', 'tecadm'].includes(user.role)) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/app");
      return;
    }
  }, [user, navigate, toast]);

  // Carregar filtros iniciais
  const loadInitialFilters = useCallback(async () => {
    try {
      setIsLoadingFilters(true);
      const statesData = await EvaluationResultsApiService.getFilterStates();
      setStates(statesData.map(state => ({
        id: state.id,
        name: state.nome,
        uf: state.id
      })));
    } catch (error) {
      console.error("Erro ao carregar filtros iniciais:", error);
      toast({
        title: "Erro ao carregar filtros",
        description: "Não foi possível carregar os filtros. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFilters(false);
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        try {
          await autoLogin();
        } catch (error) {
          console.error("Erro no login automático:", error);
          toast({
            title: "Erro de Autenticação",
            description: "Não foi possível fazer login automático. Verifique suas credenciais.",
            variant: "destructive",
          });
          return;
        }
      }
      await loadInitialFilters();
    };

    initializeData();
  }, [autoLogin, loadInitialFilters, toast]);

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState !== 'all') {
        try {
          setIsLoadingFilters(true);
          const municipalitiesData = await EvaluationResultsApiService.getFilterMunicipalities(selectedState);
          setMunicipalities(municipalitiesData.map(municipality => ({
            id: municipality.id,
            name: municipality.nome,
            state: selectedState
          })));
          setEvaluationsByMunicipality([]);
          setSelectedMunicipality('all');
          setSelectedEvaluation('all');
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        setEvaluationsByMunicipality([]);
        setSelectedMunicipality('all');
        setSelectedEvaluation('all');
      }
    };

    loadMunicipalities();
  }, [selectedState]);

  // Carregar avaliações quando município for selecionado
  useEffect(() => {
    const loadEvaluations = async () => {
      if (selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          const evaluationsData = await EvaluationResultsApiService.getFilterEvaluations({
            estado: selectedState,
            municipio: selectedMunicipality
          });
          setEvaluationsByMunicipality(evaluationsData.map(evaluation => ({
            id: evaluation.id,
            titulo: evaluation.titulo,
            disciplina: '',
            status: 'concluida',
            data_aplicacao: new Date().toISOString()
          })));
          setSelectedEvaluation('all');
        } catch (error) {
          console.error("Erro ao carregar avaliações:", error);
          setEvaluationsByMunicipality([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setEvaluationsByMunicipality([]);
        setSelectedEvaluation('all');
      }
    };

    loadEvaluations();
  }, [selectedMunicipality, selectedState]);

  // Verificar se todos os filtros obrigatórios estão selecionados
  const allRequiredFiltersSelected = selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all';

  // Carregar dados quando todos os filtros estiverem selecionados
  useEffect(() => {
    const loadData = async () => {
      if (allRequiredFiltersSelected) {
        try {
          setIsLoadingData(true);
          // Buscar relatório completo da avaliação selecionada
          const relatorio = await EvaluationResultsApiService.getRelatorioCompleto(selectedEvaluation);
          setApiData(relatorio);
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          toast({
            title: "Erro ao carregar dados",
            description: "Não foi possível carregar os dados da análise. Tente novamente.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    loadData();
  }, [allRequiredFiltersSelected, selectedState, selectedMunicipality, selectedEvaluation, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análise das Avaliações</h1>
          <p className="text-gray-600 mt-2">
            Análise detalhada das avaliações do seu município
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {user?.role === 'admin' ? 'Administrador' : 'Técnico Administrativo'}
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={selectedState}
                onValueChange={setSelectedState}
                disabled={isLoadingFilters}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {states.map(state => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Município */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Município</label>
              <Select
                value={selectedMunicipality}
                onValueChange={setSelectedMunicipality}
                disabled={isLoadingFilters || selectedState === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o município" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {municipalities.map(municipality => (
                    <SelectItem key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Avaliações */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Avaliações</label>
              <Select
                value={selectedEvaluation}
                onValueChange={setSelectedEvaluation}
                disabled={isLoadingFilters || selectedMunicipality === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a avaliação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {evaluationsByMunicipality.map(evaluation => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      {evaluation.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Informação sobre filtros */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>Hierarquia dos Filtros:</strong> Estado → Município → Avaliação
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Todos os filtros são obrigatórios para visualizar a análise.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem quando não há filtros suficientes */}
      {!allRequiredFiltersSelected && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione todos os filtros para continuar
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Para visualizar a análise das avaliações, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong> e <strong>Avaliação</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading dos dados */}
      {allRequiredFiltersSelected && isLoadingData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Carregando dados da análise...</p>
          </CardContent>
        </Card>
      )}

      {/* Dados da Análise */}
      {allRequiredFiltersSelected && !isLoadingData && apiData && (
        <div className="space-y-6">
          {/* Informações da Avaliação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações da Avaliação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-medium mb-2">{apiData.avaliacao.titulo}</h4>
                  <p className="text-gray-600">{apiData.avaliacao.descricao}</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Disciplinas:</h5>
                  <div className="flex flex-wrap gap-2">
                    {apiData.avaliacao.disciplinas.map((disciplina: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {disciplina}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Total de Alunos */}
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
                      <th className="border border-gray-300 px-4 py-2 text-left font-medium">Série/Turno</th>
                      <th className="border border-gray-300 px-4 py-2 text-center font-medium">Matriculados</th>
                      <th className="border border-gray-300 px-4 py-2 text-center font-medium">Avaliados</th>
                      <th className="border border-gray-300 px-4 py-2 text-center font-medium">Percentual</th>
                      <th className="border border-gray-300 px-4 py-2 text-center font-medium">Faltosos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiData.total_alunos.por_turma.map((turma: any, index: number) => (
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
                      <td className="border border-gray-300 px-4 py-2 text-center">{apiData.total_alunos.total_geral.matriculados}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{apiData.total_alunos.total_geral.avaliados}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{apiData.total_alunos.total_geral.percentual}%</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{apiData.total_alunos.total_geral.faltosos}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

                     {/* Tabela de Níveis de Aprendizagem */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Target className="h-5 w-5" />
                 Níveis de Aprendizagem por Turma
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-8">
                 {Object.entries(apiData.niveis_aprendizagem).map(([disciplina, dadosDisciplina]: [string, any]) => (
                   <div key={disciplina} className="space-y-4">
                     <h4 className="text-xl font-bold text-gray-800 text-center uppercase">
                       {disciplina}
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
                           {dadosDisciplina.por_turma.map((turma: any, index: number) => (
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

                     {/* Tabela de Proficiência */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <TrendingUp className="h-5 w-5" />
                 Proficiência por Turma
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-8">
                 {Object.entries(apiData.proficiencia.por_disciplina).map(([disciplina, dadosDisciplina]: [string, any]) => (
                   <div key={disciplina} className="space-y-4">
                     <h4 className="text-xl font-bold text-gray-800 text-center uppercase">
                       {disciplina}
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
                           {dadosDisciplina.por_turma.map((turma: any, index: number) => (
                             <tr key={index} className="hover:bg-gray-50">
                               <td className="border border-gray-300 px-4 py-2 font-medium">{turma.turma}</td>
                               <td className="border border-gray-300 px-4 py-2 text-center">{turma.proficiencia.toFixed(2)}</td>
                             </tr>
                           ))}
                           <tr className="bg-blue-50 font-semibold">
                             <td className="border border-gray-300 px-4 py-2">MÉDIA GERAL</td>
                             <td className="border border-gray-300 px-4 py-2 text-center">{dadosDisciplina.media_geral.toFixed(2)}</td>
                           </tr>
                           <tr className="bg-green-50 font-semibold">
                             <td className="border border-gray-300 px-4 py-2">MÉDIA MUNICIPAL</td>
                             <td className="border border-gray-300 px-4 py-2 text-center">{apiData.proficiencia.media_municipal_por_disciplina[disciplina].toFixed(2)}</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>

                     {/* Tabela de Nota Geral */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Award className="h-5 w-5" />
                 Nota Geral por Turma
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-8">
                 {Object.entries(apiData.nota_geral.por_disciplina).map(([disciplina, dadosDisciplina]: [string, any]) => (
                   <div key={disciplina} className="space-y-4">
                     <h4 className="text-xl font-bold text-gray-800 text-center uppercase">
                       {disciplina}
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
                           {dadosDisciplina.por_turma.map((turma: any, index: number) => (
                             <tr key={index} className="hover:bg-gray-50">
                               <td className="border border-gray-300 px-4 py-2 font-medium">{turma.turma}</td>
                               <td className="border border-gray-300 px-4 py-2 text-center">{turma.nota.toFixed(2)}</td>
                             </tr>
                           ))}
                           <tr className="bg-blue-50 font-semibold">
                             <td className="border border-gray-300 px-4 py-2">MÉDIA GERAL</td>
                             <td className="border border-gray-300 px-4 py-2 text-center">{dadosDisciplina.media_geral.toFixed(2)}</td>
                           </tr>
                           <tr className="bg-green-50 font-semibold">
                             <td className="border border-gray-300 px-4 py-2">MÉDIA MUNICIPAL</td>
                             <td className="border border-gray-300 px-4 py-2 text-center">{apiData.nota_geral.media_municipal_por_disciplina[disciplina].toFixed(2)}</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>

                                           {/* Tabela de Acertos por Habilidade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Acertos por Habilidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {Object.entries(apiData.acertos_por_habilidade).map(([disciplina, dadosDisciplina]: [string, any]) => (
                    <div key={disciplina} className="space-y-4">
                      <h4 className="text-xl font-bold text-gray-800 text-center uppercase">
                        {disciplina}
                      </h4>
                      
                      {/* Grid de habilidades */}
                      <div className="grid grid-cols-13 gap-0 border border-gray-300">
                        {dadosDisciplina.habilidades.map((habilidade: any, index: number) => (
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
                                habilidade.percentual >= 70 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-white text-black'
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
                          <span>≥ 70%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-white border border-gray-300"></div>
                          <span>&lt; 70%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
