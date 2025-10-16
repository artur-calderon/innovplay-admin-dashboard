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
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { RelatorioCompleto } from "@/types/evaluation-results";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";
import { FilterComponentAnalise } from "@/components/filters";
import { getUserHierarchyContext, getRestrictionMessage, validateReportAccess, UserHierarchyContext } from "@/utils/userHierarchy";

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

// Interfaces para os filtros (movidas para FilterComponentAnalise)

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
  const [apiData, setApiData] = useState<RelatorioCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('all');

  // Estados para hierarquia do usuário
  const [userHierarchyContext, setUserHierarchyContext] = useState<UserHierarchyContext | null>(null);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(true);

  // Estados dos dados dos filtros (movidos para FilterComponentAnalise)

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (user && !['admin', 'professor', 'diretor', 'coordenador', 'tecadm'].includes(user.role)) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/app");
      return;
    }
  }, [user, navigate, toast]);

  // Carregar contexto hierárquico do usuário
  useEffect(() => {
    const loadUserHierarchy = async () => {
      if (!user?.id || !user?.role) {
        setIsLoadingHierarchy(false);
        return;
      }

      try {
        setIsLoadingHierarchy(true);
        const context = await getUserHierarchyContext(user.id, user.role);
        setUserHierarchyContext(context);

        // Pre-selecionar filtros baseado na hierarquia
        if (context.municipality) {
          setSelectedMunicipality(context.municipality.id);
        }

        if (context.school) {
          setSelectedSchool(context.school.id);
        }

        // Para professor, carregar escolas das suas turmas
        if (context.classes && context.classes.length > 0) {
          const uniqueSchools = Array.from(
            new Set(context.classes.map(c => ({ id: c.school_id, name: c.school_name })))
              .map(s => s.id)
          ).map(id => context.classes!.find(c => c.school_id === id))
            .filter(Boolean)
            .map(c => ({ id: c!.school_id, nome: c!.school_name }));
          
          // Se só tem uma escola, pre-selecionar
          if (uniqueSchools.length === 1) {
            setSelectedSchool(uniqueSchools[0].id);
          }
        }

      } catch (error) {
        console.error('Erro ao carregar contexto hierárquico:', error);
        toast({
          title: "Aviso",
          description: "Não foi possível carregar suas permissões. Algumas funcionalidades podem estar limitadas.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingHierarchy(false);
      }
    };

    loadUserHierarchy();
  }, [user?.id, user?.role, toast]);

  // Inicialização e carregamento de filtros movido para FilterComponentAnalise
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
      setIsLoading(false);
    };

    initializeData();
  }, [autoLogin, toast]);

  // Verificar se todos os filtros obrigatórios estão selecionados
  // Estado e Município são obrigatórios, Escola pode ser "Todas", Avaliação é obrigatória
  const allRequiredFiltersSelected = selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all';



  // Função para baixar relatório PDF
  const downloadReport = async () => {
    if (!selectedEvaluation || !apiData) return;
    
    // Validar acesso baseado na hierarquia
    if (userHierarchyContext && user?.role) {
      const validation = validateReportAccess(user.role, {
        state: selectedState,
        municipality: selectedMunicipality,
        school: selectedSchool,
        evaluation: selectedEvaluation
      }, userHierarchyContext);

      if (!validation.isValid) {
        toast({
          title: "Acesso Negado",
          description: validation.reason || "Você não tem permissão para gerar este relatório.",
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      setIsGeneratingReport(true);
      
      // Determinar qual tipo de relatório gerar baseado na seleção da escola
      let apiUrl: string;
      if (selectedSchool === 'all') {
        // Relatório para município inteiro (todas as escolas)
        apiUrl = `/reports/relatorio-pdf/${selectedEvaluation}?city_id=${selectedMunicipality}`;
      } else {
        // Relatório para escola específica
        apiUrl = `/reports/relatorio-pdf/${selectedEvaluation}?school_id=${selectedSchool}`;
      }
      
      // Buscar o relatório PDF diretamente do backend
      const response = await api.get(apiUrl, {
        responseType: 'blob' // Importante: receber como blob
      });
      
      // Criar URL do blob
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link de download
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Definir nome do arquivo
      const evaluationName = apiData?.avaliacao?.titulo || 'avaliacao';
      const sanitizedName = evaluationName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
      
      // Determinar o tipo de relatório para o nome do arquivo
      const reportType = selectedSchool === 'all' ? 'municipio' : 'escola';
      const fileName = `relatorio_${reportType}_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = fileName;
      
      // Simular clique para download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL do blob
      window.URL.revokeObjectURL(blobUrl);
      
      const reportTypeLabel = selectedSchool === 'all' ? 'municipal' : 'da escola';
      toast({
        title: "Relatório Baixado com Sucesso",
        description: `O relatório PDF ${reportTypeLabel} foi salvo no seu dispositivo.`,
      });
      
    } catch (error) {
      console.error("Erro ao baixar relatório:", error);
      toast({
        title: "Erro ao Baixar Relatório",
        description: "Não foi possível baixar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Carregar dados quando todos os filtros estiverem selecionados
  useEffect(() => {
    const loadData = async () => {
      if (allRequiredFiltersSelected) {
        try {
          setIsLoadingData(true);
          // Buscar relatório completo da avaliação selecionada
          const relatorio = await EvaluationResultsApiService.getRelatorioCompleto(selectedEvaluation);
          console.log("📊 Estrutura completa da resposta da API:", relatorio);
          console.log("📊 Estrutura de acertos_por_habilidade:", relatorio.acertos_por_habilidade);
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
          {user?.role && (
            <p className="text-sm text-blue-600 mt-1">
              {getRestrictionMessage(user.role)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {user?.role === 'admin' ? 'Administrador' : 
             user?.role === 'professor' ? 'Professor' :
             user?.role === 'diretor' ? 'Diretor' :
             user?.role === 'coordenador' ? 'Coordenador' : 'Técnico Administrativo'}
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <FilterComponentAnalise
        selectedState={selectedState}
        selectedMunicipality={selectedMunicipality}
        selectedSchool={selectedSchool}
        selectedEvaluation={selectedEvaluation}
        onStateChange={setSelectedState}
        onMunicipalityChange={setSelectedMunicipality}
        onSchoolChange={setSelectedSchool}
        onEvaluationChange={setSelectedEvaluation}
        isLoadingFilters={isLoadingFilters}
        onLoadingChange={setIsLoadingFilters}
        // Props para hierarquia
        userRole={user?.role}
        canSelectState={userHierarchyContext?.restrictions.canSelectState}
        canSelectMunicipality={userHierarchyContext?.restrictions.canSelectMunicipality}
        canSelectSchool={userHierarchyContext?.restrictions.canSelectSchool}
      />

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
              Para visualizar a análise das avaliações, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong> e <strong>Avaliação</strong>. A <strong>Escola</strong> pode ser "Todas" para ver todas as escolas do município.
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações da Avaliação
                </CardTitle>
                                 <Button 
                   onClick={downloadReport}
                   disabled={isGeneratingReport}
                   className="flex items-center gap-2"
                   variant="outline"
                 >
                   {isGeneratingReport ? (
                     <>
                       <RefreshCw className="h-4 w-4 animate-spin" />
                       Baixando Relatório...
                     </>
                   ) : (
                     <>
                       <Download className="h-4 w-4" />
                       Baixar Relatório
                     </>
                   )}
                 </Button>
              </div>
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
                    {apiData.avaliacao.disciplinas?.map((disciplina: string, index: number) => (
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
                    {apiData.total_alunos.por_turma?.map((turma, index: number) => (
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
                 {Object.entries(apiData.niveis_aprendizagem).map(([disciplina, dadosDisciplina]) => (
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
                           {dadosDisciplina.por_turma?.map((turma, index: number) => (
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
                 {Object.entries(apiData.proficiencia.por_disciplina).map(([disciplina, dadosDisciplina]) => (
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
                           {dadosDisciplina.por_turma?.map((turma, index: number) => (
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
                               <td className="border border-gray-300 px-4 py-2 text-center">{apiData.proficiencia.media_municipal_por_disciplina[disciplina]?.toFixed(2) || 'N/A'}</td>
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
                 {Object.entries(apiData.nota_geral.por_disciplina).map(([disciplina, dadosDisciplina]) => (
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
                           {dadosDisciplina.por_turma?.map((turma, index: number) => (
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
                               <td className="border border-gray-300 px-4 py-2 text-center">{apiData.nota_geral.media_municipal_por_disciplina[disciplina]?.toFixed(2) || 'N/A'}</td>
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
                  {Object.entries(apiData.acertos_por_habilidade).map(([disciplina, dadosDisciplina]) => (
                    <div key={disciplina} className="space-y-4">
                      <h4 className="text-xl font-bold text-gray-800 text-center uppercase">
                        {disciplina}
                      </h4>
                      
                      {/* Grid de questões */}
                      <div className="grid grid-cols-13 gap-0 border border-gray-300">
                        {dadosDisciplina.questoes && dadosDisciplina.questoes.length > 0 ? dadosDisciplina.questoes.map((questao, index: number) => (
                          <div key={index} className="flex flex-col">
                            {/* Header da questão */}
                            <div className="bg-blue-600 text-white text-center py-2 px-1 text-sm font-medium border-r border-gray-300 last:border-r-0">
                              {questao.numero_questao}ª Q
                            </div>
                            
                            {/* Código da habilidade */}
                            <div className="bg-yellow-400 text-black text-center py-2 px-1 text-sm font-medium border-r border-gray-300 last:border-r-0 border-t border-gray-300">
                              {questao.codigo}
                            </div>
                            
                            {/* Percentual com cor baseada no valor */}
                            <div 
                              className={`text-center py-2 px-1 text-sm font-medium border-r border-gray-300 last:border-r-0 border-t border-gray-300 ${
                                questao.percentual >= 70 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-white text-black'
                              }`}
                            >
                              {questao.percentual}%
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-13 text-center py-8 text-gray-500">
                            Nenhuma questão encontrada para esta disciplina.
                          </div>
                        )}
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

