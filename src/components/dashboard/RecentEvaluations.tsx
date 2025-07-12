import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Wifi, WifiOff, Clock, Users, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { mockEvaluations } from "@/lib/mockData";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Evaluation {
  id: string;
  title: string;
  subject?: string | { id: string; name: string };
  createdAt?: string;
  created_at?: string;
  status?: string;
  questions_count?: number;
  questions?: number | { length?: number };
  active_applications?: number;
  total_students?: number;
  completion_rate?: number;
}

interface DashboardStats {
  totalEvaluations: number;
  activeEvaluations: number;
  completedEvaluations: number;
  totalStudents: number;
  averageCompletion: number;
  lastSync: string;
}

// ✅ NOVO: Sistema de Cache Inteligente
class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: any, ttlMs: number = 300000) { // 5 minutos default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// ✅ NOVO: Teste de conectividade
const testConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Primeiro, tenta fazer uma requisição simples
    const response = await api.get('/dashboard/stats');
    return {
      success: true,
      message: `Conectado com sucesso! Status: ${response.status}`
    };
  } catch (error: any) {
    console.error("Erro no teste de conectividade:", error);
    
    if (error.code === 'ERR_NETWORK') {
      return {
        success: false,
        message: "Erro de rede - verifique se o servidor está rodando"
      };
    } else if (error.response?.status === 401) {
      return {
        success: false,
        message: "Não autorizado - token inválido ou expirado"
      };
    } else if (error.response?.status === 404) {
      return {
        success: false,
        message: "Endpoint não encontrado - verifique a configuração do backend"
      };
    } else {
      return {
        success: false,
        message: `Erro: ${error.message || 'Erro desconhecido'}`
      };
    }
  }
};

export default function RecentEvaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();
  const cache = CacheManager.getInstance();

  // ✅ NOVO: Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Recarregar dados quando voltar online
      fetchRecentEvaluations();
      toast({
        title: "Conectado!",
        description: "Dados atualizados com sucesso.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Sem conexão",
        description: "Usando dados em cache.",
        variant: "default",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ NOVO: Buscar avaliações com fallback inteligente
  const fetchRecentEvaluations = async (useCache = true) => {
    try {
      setIsLoading(true);
      setError(null);

      // Verificar cache primeiro
      const cacheKey = 'recent-evaluations';
      if (useCache && isOnline) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          setEvaluations(cachedData.evaluations);
          setStats(cachedData.stats);
          setIsLoading(false);
          return;
        }
      }

      let evaluationsData: Evaluation[] = [];
      let dashboardStats: DashboardStats | null = null;

      if (isOnline) {
        try {
          // Buscar avaliações reais da API
          const [evaluationsResponse, statsResponse] = await Promise.all([
            api.get('/test/?per_page=5&sort=created_at&order=desc'),
            api.get('/dashboard/stats')
          ]);

          if (evaluationsResponse.data?.data && Array.isArray(evaluationsResponse.data.data)) {
            evaluationsData = evaluationsResponse.data.data.map((test: any) => ({
              id: test.id,
              title: test.title,
              subject: test.subject ? test.subject.name : 'Sem disciplina',
              createdAt: test.created_at,
              status: mapTestStatus(test.status),
              questions_count: test.questions?.length || 0,
              active_applications: test.active_applications || 0,
              total_students: test.total_students || 0,
              completion_rate: test.completion_rate || 0
            }));
          }

          if (statsResponse.data) {
            dashboardStats = {
              totalEvaluations: statsResponse.data.total_evaluations || 0,
              activeEvaluations: statsResponse.data.active_evaluations || 0,
              completedEvaluations: statsResponse.data.completed_evaluations || 0,
              totalStudents: statsResponse.data.total_students || 0,
              averageCompletion: statsResponse.data.average_completion || 0,
              lastSync: new Date().toISOString()
            };
          }

          // Salvar no cache
          cache.set(cacheKey, {
            evaluations: evaluationsData,
            stats: dashboardStats
          }, 300000); // 5 minutos

        } catch (apiError: any) {
          console.error("Erro na API:", apiError);
          
          // Log detalhado do erro
          if (apiError.code === 'ERR_NETWORK') {
            console.error("Erro de rede - possível servidor offline ou problema de conectividade");
          } else if (apiError.response) {
            console.error("Erro HTTP:", apiError.response.status, apiError.response.data);
          } else {
            console.error("Erro desconhecido:", apiError.message);
          }
          
          // Fallback para dados mock se API falhar
          evaluationsData = mockEvaluations.slice(0, 5).map(evaluation => ({
            id: evaluation.id,
            title: evaluation.title,
            subject: evaluation.subject,
            createdAt: evaluation.createdAt,
            status: evaluation.status,
            questions_count: evaluation.questions,
            active_applications: Math.floor(Math.random() * 5) + 1,
            total_students: Math.floor(Math.random() * 100) + 10,
            completion_rate: Math.floor(Math.random() * 100) + 1
          }));

          dashboardStats = {
            totalEvaluations: 12,
            activeEvaluations: 4,
            completedEvaluations: 8,
            totalStudents: 234,
            averageCompletion: 78,
            lastSync: new Date().toISOString()
          };

          // Mensagem de erro mais específica
          let errorMessage = "Erro na conexão com o servidor";
          if (apiError.code === 'ERR_NETWORK') {
            errorMessage = "Servidor offline - usando dados locais";
          } else if (apiError.response?.status === 401) {
            errorMessage = "Não autorizado - faça login novamente";
          } else if (apiError.response?.status === 404) {
            errorMessage = "Endpoints não encontrados - verifique o backend";
          } else if (apiError.response?.status >= 500) {
            errorMessage = "Erro interno do servidor";
          }

          setError(errorMessage);
          toast({
            title: "Problema de conectividade",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } else {
        // Modo offline - usar cache ou dados mock
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          evaluationsData = cachedData.evaluations;
          dashboardStats = cachedData.stats;
        } else {
          // Fallback para dados mock
          evaluationsData = mockEvaluations.slice(0, 5);
          dashboardStats = {
            totalEvaluations: 12,
            activeEvaluations: 4,
            completedEvaluations: 8,
            totalStudents: 234,
            averageCompletion: 78,
            lastSync: new Date().toISOString()
          };
        }
        setError("Sem conexão - dados em cache");
      }

      setEvaluations(evaluationsData);
      setStats(dashboardStats);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
      setError("Erro ao carregar dados");
      setEvaluations([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NOVO: Mapear status do teste
  const mapTestStatus = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return 'active';
      case 'correction':
      case 'reviewing':
        return 'correction';
      case 'completed':
      case 'finished':
        return 'completed';
      default:
        return 'active';
    }
  };

  // ✅ NOVO: Refresh manual
  const handleRefresh = () => {
    cache.clear();
    fetchRecentEvaluations(false);
  };

  useEffect(() => {
    fetchRecentEvaluations();
  }, []);

  // ✅ NOVO: Auto-refresh a cada 30 segundos se online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      fetchRecentEvaluations(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Avaliações Recentes
          </CardTitle>
          <CardDescription>Últimas avaliações criadas no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded border">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Avaliações Recentes
              {/* Status de conectividade */}
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>
              Últimas avaliações criadas no sistema
              {stats && (
                <span className="ml-2 text-xs">
                  • {stats.totalEvaluations} total • {stats.activeEvaluations} ativas
                </span>
              )}
            </CardDescription>
          </div>
          
          {/* Botão de refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Alerta de status */}
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Estatísticas rápidas */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">{stats.activeEvaluations}</div>
              <div className="text-xs text-muted-foreground">Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{stats.totalStudents}</div>
              <div className="text-xs text-muted-foreground">Alunos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{stats.averageCompletion}%</div>
              <div className="text-xs text-muted-foreground">Conclusão</div>
            </div>
          </div>
        )}

        {/* Lista de avaliações */}
        {evaluations.length > 0 ? (
          evaluations.map((evaluation) => (
            <div key={evaluation.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="space-y-1 flex-1">
                <p className="font-medium text-sm line-clamp-1">{evaluation.title}</p>
                <div className="flex items-center gap-4">
                  {evaluation.subject && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      {typeof evaluation.subject === 'string' 
                        ? evaluation.subject 
                        : evaluation.subject.name || evaluation.subject
                      }
                    </div>
                  )}
                  {(evaluation.questions_count || evaluation.questions) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {evaluation.questions_count || evaluation.questions || 0} questões
                    </div>
                  )}
                  {evaluation.total_students && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {evaluation.total_students} alunos
                    </div>
                  )}
                  {evaluation.completion_rate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {evaluation.completion_rate}% concluído
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant={
                    evaluation.status === "active" ? "default" :
                    evaluation.status === "correction" ? "secondary" :
                    evaluation.status === "completed" ? "outline" :
                    "outline"
                  }
                  className="text-xs"
                >
                  {evaluation.status === "active" ? "Ativa" :
                   evaluation.status === "correction" ? "Correção" :
                   evaluation.status === "completed" ? "Concluída" :
                   evaluation.status || "Ativa"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {new Date(evaluation.createdAt || evaluation.created_at || Date.now()).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma avaliação encontrada
          </p>
        )}

        {/* Timestamp da última atualização */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}
