import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Pencil, Trash2, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Question } from "@/components/evaluations/types";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { AxiosError } from "axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import QuestionPreview from "@/components/evaluations/questions/QuestionPreview";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

// Estilos customizados para skeleton mais fluído
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
`;

const shimmerStyle = {
  background: 'linear-gradient(90deg, #f0f0f0 0px, #e0e0e0 40px, #f0f0f0 80px)',
  backgroundSize: '200px 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
} as React.CSSProperties;

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface QuestionApiResponse {
  id: string;
  title: string;
  text: string;
  type: string;
  difficulty: string;
  value: number;
  skills: string[] | string;
  topics: string[] | string;
  subject?: { id: string; name: string };
  grade?: { id: string; name: string };
  created_by: string;
}

interface Filters {
  subject: string;
  difficulty: string;
  grade: string;
  type: string;
}

const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'];
const QUESTION_TYPES = [
  { value: 'multipleChoice', label: 'Múltipla Escolha' },
  { value: 'open', label: 'Dissertativa' }
];
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

// Hook para debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Componentes de Loading mais fluídos
const SkeletonRow = ({ index }: { index: number }) => (
  <tr 
    className="border-b" 
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <td className="p-3">
      <div className="h-4 w-4 rounded" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="h-4 w-8 rounded" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="h-4 w-32 rounded" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="h-4 w-20 rounded" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="h-4 w-16 rounded" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="h-6 w-12 rounded-full" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="h-4 w-24 rounded" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="h-4 w-8 rounded" style={shimmerStyle} />
    </td>
    <td className="px-3 py-2">
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 rounded" style={shimmerStyle} />
        <div className="h-8 w-8 rounded" style={shimmerStyle} />
        <div className="h-8 w-8 rounded" style={shimmerStyle} />
      </div>
    </td>
  </tr>
);

const SkeletonCard = ({ index }: { index: number }) => (
  <div 
    className="border rounded-lg p-3 bg-background"
    style={{ animationDelay: `${index * 75}ms` }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-6 rounded" style={shimmerStyle} />
          <div className="h-4 w-40 rounded" style={shimmerStyle} />
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          <div className="h-5 w-16 rounded-full" style={shimmerStyle} />
          <div className="h-5 w-12 rounded-full" style={shimmerStyle} />
          <div className="h-5 w-14 rounded-full" style={shimmerStyle} />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-3 w-24 rounded" style={shimmerStyle} />
          <div className="h-3 w-16 rounded" style={shimmerStyle} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-4 w-4 rounded" style={shimmerStyle} />
        <div className="h-8 w-8 rounded" style={shimmerStyle} />
        <div className="h-8 w-8 rounded" style={shimmerStyle} />
        <div className="h-8 w-8 rounded" style={shimmerStyle} />
      </div>
    </div>
  </div>
);

const QuestionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Debug mode
  const isDebugMode = new URLSearchParams(window.location.search).has('debug') || 
                     import.meta.env.VITE_DEBUG_MODE === 'true';

  // Injetar estilos de shimmer no documento
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = shimmerKeyframes;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Estado principal
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsCache, setQuestionsCache] = useState<Record<string, Question[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Estados para controle de requisições múltiplas e otimização
  // - fetchedKeys: chaves que já foram buscadas (evita buscas redundantes)
  // - isCurrentlyFetching: chave sendo buscada no momento (evita calls simultâneos)
  // - emptyResults: chaves que retornaram vazio (evita re-buscar resultados vazios)
  const [fetchedKeys, setFetchedKeys] = useState<Set<string>>(new Set());
  const [isCurrentlyFetching, setIsCurrentlyFetching] = useState<string | null>(null);
  const [emptyResults, setEmptyResults] = useState<Set<string>>(new Set());

  // Estado de filtros e pesquisa
  const [filterType, setFilterType] = useState<'my' | 'all'>('my');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<Filters>({
    subject: 'all',
    difficulty: 'all',
    grade: 'all',
    type: 'all'
  });

  // Estado de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Estado de modais e seleção
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Questões filtradas e paginadas (otimizado)
  const filteredQuestions = useMemo(() => {
    if (questions.length === 0) return [];

    return questions.filter(question => {
      // Early returns para melhor performance
      if (debouncedSearchTerm !== '' && 
          !question.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
          !question.id.includes(debouncedSearchTerm)) {
        return false;
      }

      if (filters.subject !== 'all' && question.subject?.id !== filters.subject) {
        return false;
      }

      if (filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) {
        return false;
      }

      if (filters.grade !== 'all' && question.grade?.id !== filters.grade) {
        return false;
      }

      if (filters.type !== 'all' && question.type !== filters.type) {
        return false;
      }

      return true;
    });
  }, [questions, debouncedSearchTerm, filters]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Fetch inicial de dados (executar em paralelo)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Carregar subjects e grades em paralelo, sem bloquear questões
        const promises = [
          api.get("/subjects").then(res => setSubjects(res.data)),
          api.get("/grades").then(res => setGrades(res.data))
        ];
        
        await Promise.allSettled(promises);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch questões com cache e retry
  const fetchQuestions = useCallback(async (isRetry = false, forceRefresh = false) => {
    const cacheKey = `${filterType}-${user.id || 'all'}`;
    
    // Verificar se já está fazendo fetch da mesma chave
    if (!forceRefresh && isCurrentlyFetching === cacheKey) {
      if (isDebugMode) {
        console.log('🚫 Fetch já em andamento para:', cacheKey);
      }
      return;
    }
    
    // Verificar cache primeiro (exceto se for retry ou forceRefresh)
    if (!isRetry && !forceRefresh && questionsCache[cacheKey]) {
      setQuestions(questionsCache[cacheKey]);
      setLoading(false);
      setError(null);
      setLoadingProgress(0);
      if (isDebugMode) {
        console.log('📦 Usando cache para:', cacheKey, questionsCache[cacheKey].length, 'itens');
      }
      return;
    }
    
    // Verificar se já foi buscado e retornou vazio (exceto retry ou forceRefresh)
    if (!isRetry && !forceRefresh && emptyResults.has(cacheKey)) {
      setQuestions([]);
      setLoading(false);
      setError(null);
      setLoadingProgress(0);
      if (isDebugMode) {
        console.log('🗳️ Resultado vazio conhecido para:', cacheKey);
      }
      return;
    }

    // Marcar que está fazendo fetch desta chave
    setIsCurrentlyFetching(cacheKey);
    
    if (!isRetry) {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      
      // Animação de progresso
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 100);
    }

    try {
      const params: { created_by?: string } = {};

      if (filterType === 'my' && user.id) {
        params.created_by = user.id;
      }

      if (isDebugMode) {
        console.log('📡 Fazendo requisição para /questions com params:', params);
      }
      
      const response = await api.get("/questions", { params });
      
      if (isDebugMode) {
        console.log('✅ Resposta recebida:', response.status, response.data?.length);
      }
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Dados inválidos recebidos do servidor');
      }

      const normalizedQuestions: Question[] = response.data.map((q: QuestionApiResponse) => ({
        id: q.id,
        title: q.title,
        text: q.text,
        type: q.type as "multipleChoice" | "open" | "trueFalse",
        subjectId: q.subject?.id || '',
        subject: q.subject || { id: '', name: '' },
        grade: q.grade || { id: '', name: '' },
        difficulty: q.difficulty,
        value: q.value.toString(),
        solution: '',
        options: [],
        skills: Array.isArray(q.skills) ? q.skills : (q.skills && typeof q.skills === 'string' ? q.skills.split(',').map(s => s.trim()) : []),
        created_by: q.created_by,
        educationStage: null
      }));
      
      // Salvar no cache
      setQuestionsCache(prev => ({
        ...prev,
        [cacheKey]: normalizedQuestions
      }));
      
      // Marcar como buscado
      setFetchedKeys(prev => new Set(prev).add(cacheKey));
      
      // Se resultado vazio, marcar para evitar buscas futuras
      if (normalizedQuestions.length === 0) {
        setEmptyResults(prev => new Set(prev).add(cacheKey));
        if (isDebugMode) {
          console.log('🗳️ Marcando resultado vazio para:', cacheKey);
        }
      } else {
        // Remover dos resultados vazios se agora tem dados
        setEmptyResults(prev => {
          const newSet = new Set(prev);
          newSet.delete(cacheKey);
          return newSet;
        });
      }
      
      setQuestions(normalizedQuestions);
      setError(null);
      setRetryCount(0);
      setLoadingProgress(100);
      
      // Completar progresso suavemente
      setTimeout(() => {
        setLoadingProgress(0);
        setIsInitialLoad(false);
      }, 300);

      // Sem toast para loading bem-sucedido - mais fluído

    } catch (error) {
      if (isDebugMode) {
        console.error("❌ Erro ao buscar questões:", error);
      }
      
      let errorMessage = "Erro desconhecido";
      
              if (error instanceof AxiosError) {
          // Erro de resposta do servidor
          if (error.response) {
            const status = error.response.status;
            if (isDebugMode) {
              console.log('🔍 Status do erro:', status, error.response.data);
            }
          
          switch (status) {
            case 400:
              errorMessage = "Dados da requisição inválidos";
              break;
            case 401:
              errorMessage = "Não autorizado. Faça login novamente";
              break;
            case 403:
              errorMessage = "Acesso negado";
              break;
            case 404:
              errorMessage = "Endpoint não encontrado";
              break;
            case 500:
              errorMessage = "Erro interno do servidor";
              break;
            case 502:
            case 503:
            case 504:
              errorMessage = "Servidor temporariamente indisponível";
              break;
            default:
              errorMessage = `Erro do servidor (${status})`;
          }
        } else if (error.request) {
          // Erro de rede
          errorMessage = "Erro de conectividade. Verifique sua internet";
        } else {
          // Erro de configuração
          errorMessage = error.message || "Erro ao processar requisição";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);

      // Tentar usar cache antigo se disponível
      if (questionsCache[cacheKey] && questionsCache[cacheKey].length > 0) {
        if (isDebugMode) {
          console.log('📦 Usando dados do cache devido ao erro');
        }
        setQuestions(questionsCache[cacheKey]);
        setError(`${errorMessage} (usando dados em cache)`);
      } else {
        setQuestions([]);
      }

      // Retry automático para erros temporários (mas não para resultados vazios conhecidos)
      if (!isRetry && retryCount < 2 && !emptyResults.has(cacheKey) && error instanceof AxiosError && (
        (error.response?.status && error.response.status >= 500) || 
        error.code === 'NETWORK_ERROR' ||
        error.code === 'ECONNABORTED'
      )) {
        if (isDebugMode) {
          console.log(`🔄 Tentativa ${retryCount + 1}/3 em 2 segundos...`);
        }
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchQuestions(true);
        }, 2000);
      } else if (!questionsCache[cacheKey] || questionsCache[cacheKey].length === 0) {
        // Só mostrar toast se não há dados em cache
        toast({
          title: "Erro ao carregar questões",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      // Limpar flag de fetch em andamento
      setIsCurrentlyFetching(null);
      
      // Delay mínimo para UX mais suave
      setTimeout(() => {
        setLoading(false);
      }, isInitialLoad ? 400 : 100);
    }
  }, [user.id, filterType, questionsCache, retryCount, toast, isCurrentlyFetching, emptyResults, fetchedKeys, isDebugMode, isInitialLoad]);

  useEffect(() => {
    if (user.id || filterType === 'all') {
      fetchQuestions();
    }
  }, [user.id, filterType, fetchQuestions]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters, filterType]);

  // Limpar estados de controle quando filtros principais mudam
  useEffect(() => {
    const cacheKey = `${filterType}-${user.id || 'all'}`;
    
    // Só limpar se estiver mudando para uma chave diferente
    if (!fetchedKeys.has(cacheKey)) {
      setError(null);
      setRetryCount(0);
    }
  }, [filterType, user.id, fetchedKeys]);

  // Limpar resultados vazios antigos periodicamente (limpeza de memória)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutos
      
      // Por simplicidade, limpar todos os resultados vazios a cada 10 minutos
      // Em produção, seria melhor armazenar timestamps
      setEmptyResults(new Set());
      
      if (isDebugMode) {
        console.log('🧹 Limpeza periódica de resultados vazios');
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(cleanupInterval);
  }, [isDebugMode]);

  // Event handlers
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDelete = async () => {
    if (!deleteQuestionId) return;

    try {
      await api.delete(`/questions/${deleteQuestionId}`);
      toast({
        title: "Sucesso!",
        description: "A questão foi excluída.",
      });
      setDeleteQuestionId(null);
      // Limpar cache e refetch
      setQuestionsCache({});
      fetchQuestions();
    } catch (error) {
      console.error("Failed to delete question", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a questão.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete("/questions", { data: { ids: selectedIds } });
      toast({
        title: "Sucesso!",
        description: `${selectedIds.length} questões foram excluídas.`,
      });
      setSelectedIds([]);
      // Limpar cache e refetch
      setQuestionsCache({});
      fetchQuestions();
    } catch (error) {
      console.error("Failed to delete questions", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir as questões selecionadas.",
        variant: "destructive",
      });
    } finally {
      setDeleteQuestionId(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedQuestions.map((q) => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRetry = () => {
    const cacheKey = `${filterType}-${user.id || 'all'}`;
    
    setError(null);
    setRetryCount(0);
    
    // Limpar cache e estados de controle para esta chave específica
    setQuestionsCache(prev => {
      const newCache = { ...prev };
      delete newCache[cacheKey];
      return newCache;
    });
    
    setFetchedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(cacheKey);
      return newSet;
    });
    
    setEmptyResults(prev => {
      const newSet = new Set(prev);
      newSet.delete(cacheKey);
      return newSet;
    });
    
    // Forçar nova busca
    fetchQuestions(false, true);
  };



    const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-1 py-3 border-t bg-muted/20">
        <div className="text-sm text-muted-foreground">
          Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredQuestions.length)} de {filteredQuestions.length}
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>

          {pages.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page)}
              className="h-8 w-8 p-0 text-xs"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const FiltersContent = () => (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Disciplina</label>
        <Select onValueChange={(value) => handleFilterChange('subject', value)} value={filters.subject}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas as Disciplinas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Disciplinas</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Série</label>
        <Select onValueChange={(value) => handleFilterChange('grade', value)} value={filters.grade}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas as Séries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Séries</SelectItem>
            {grades.map((grade) => (
              <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Dificuldade</label>
        <Select onValueChange={(value) => handleFilterChange('difficulty', value)} value={filters.difficulty}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas as Dificuldades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Dificuldades</SelectItem>
            {DIFFICULTIES.map((difficulty) => (
              <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Tipo</label>
        <Select onValueChange={(value) => handleFilterChange('type', value)} value={filters.type}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os Tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const QuestionCard = React.memo(({ question, index }: { question: Question; index: number }) => {
    const handleView = useCallback(() => setViewQuestion(question), [question]);
    const handleEdit = useCallback(() => navigate(`/app/cadastros/questao/editar/${question.id}`), [question.id, navigate]);
    const handleDeleteClick = useCallback(() => setDeleteQuestionId(question.id), [question.id]);
    const handleSelect = useCallback((checked: boolean) => handleSelectOne(question.id, checked), [question.id]);

    return (
      <div 
        className="border rounded-lg p-3 bg-background hover:bg-muted/20 transition-all duration-200 animate-in fade-in-0 slide-in-from-left-4"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">#{((currentPage - 1) * pageSize) + index + 1}</span>
              <h3 className="font-medium truncate">{question.title}</h3>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="secondary" className="text-xs">{question.subject?.name}</Badge>
              <Badge variant="outline" className="text-xs">{question.grade?.name}</Badge>
              <Badge 
                variant="outline"
                className={`text-xs ${
                  question.difficulty === 'Fácil' 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : question.difficulty === 'Médio' 
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                {question.difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{question.type === "multipleChoice" ? "Múltipla Escolha" : "Dissertativa"}</span>
              <span>Valor: {question.value}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox
              checked={selectedIds.includes(question.id)}
              onCheckedChange={handleSelect}
              aria-label={`Selecionar ${question.title}`}
            />
            <Button variant="ghost" size="sm" onClick={handleView}>
              <Eye className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeleteClick}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* Loading Progress Bar */}
      {(loading || loadingProgress > 0) && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out rounded-r-full"
            style={{ 
              width: `${loadingProgress}%`,
              boxShadow: '0 0 10px rgba(var(--primary), 0.5)'
            }}
          />
        </div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Questões</h1>
          {error && (
            <Badge variant="destructive" className="text-xs">
              Erro de Conexão
            </Badge>
          )}
          {loading && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-current animate-bounce"></div>
                Carregando...
              </div>
            </Badge>
          )}
          {retryCount > 0 && (
            <Badge variant="outline" className="text-xs">
              Tentativa {retryCount}/3
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteQuestionId("bulk")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir ({selectedIds.length})
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => navigate("/app/cadastros/questao/criar")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Questão
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar por título ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as 'my' | 'all')}>
            <TabsList className="h-9">
              <TabsTrigger value="my" className="text-sm">Minhas Questões</TabsTrigger>
              {user.role === 'admin' && <TabsTrigger value="all" className="text-sm">Todas as Questões</TabsTrigger>}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">Por página:</span>
            <Select onValueChange={(value) => setPageSize(Number(value))} value={pageSize.toString()}>
              <SelectTrigger className="w-16 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{filteredQuestions.length} questão(ões) encontrada(s)</span>
          {searchTerm !== debouncedSearchTerm && (
            <div className="flex items-center gap-1 text-xs animate-in fade-in-0 slide-in-from-left-2 duration-200">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="animate-pulse">Buscando...</span>
            </div>
          )}

        </div>
        {paginatedQuestions.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={paginatedQuestions.length > 0 && selectedIds.length === paginatedQuestions.length}
              onCheckedChange={handleSelectAll}
              aria-label="Selecionar todas da página"
            />
            <span>Selecionar todas da página</span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4 animate-in fade-in-0 duration-300">
          {/* Desktop Skeleton */}
          <div className="hidden md:block border rounded-lg overflow-hidden bg-background">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 w-12"><Skeleton className="h-4 w-4" /></th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Número</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Título</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Disciplina</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Série</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Dificuldade</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Valor</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: pageSize }).map((_, index) => (
                  <SkeletonRow key={index} index={index} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Skeleton */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: pageSize }).map((_, index) => (
              <SkeletonCard key={index} index={index} />
            ))}
          </div>
        </div>
      ) : paginatedQuestions.length > 0 ? (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Desktop Table */}
          <div className="hidden md:block border rounded-lg overflow-hidden bg-background">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 w-12">
                    <Checkbox
                      checked={paginatedQuestions.length > 0 && selectedIds.length === paginatedQuestions.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todas"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Número</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Título</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Disciplina</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Série</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Dificuldade</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Valor</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuestions.map((question, index) => (
                  <tr 
                    key={question.id} 
                    className="border-b hover:bg-muted/20 transition-all duration-200 animate-in fade-in-0 slide-in-from-right-4" 
                    style={{ animationDelay: `${index * 25}ms` }}
                    data-state={selectedIds.includes(question.id) && "selected"}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedIds.includes(question.id)}
                        onCheckedChange={(checked) => handleSelectOne(question.id, !!checked)}
                        aria-label={`Selecionar ${question.title}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm font-mono">{((currentPage - 1) * pageSize) + index + 1}</td>
                    <td className="px-3 py-2 max-w-xs truncate font-medium">{question.title}</td>
                    <td className="px-3 py-2 text-sm">{question.subject?.name}</td>
                    <td className="px-3 py-2 text-sm">{question.grade?.name}</td>
                    <td className="px-3 py-2">
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          question.difficulty === 'Fácil' 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : question.difficulty === 'Médio' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {question.difficulty}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {question.type === "multipleChoice" ? "Múltipla Escolha" : "Dissertativa"}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono">{question.value}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewQuestion(question)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/app/cadastros/questao/editar/${question.id}`)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteQuestionId(question.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedQuestions.map((question, index) => (
              <QuestionCard key={question.id} question={question} index={index} />
            ))}
          </div>

          {/* Pagination */}
          {renderPagination()}
        </div>
      ) : error ? (
        <div className="border rounded-lg p-12 text-center bg-background">
          <div className="space-y-4">
            <div className="text-destructive">
              <p className="text-lg font-semibold">Erro ao carregar questões</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button onClick={handleRetry} size="sm">
                Tentar Novamente
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/app/cadastros/questao/criar")}
              >
                Criar Nova Questão
              </Button>
            </div>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Tentativa {retryCount}/3 realizada
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-background">
          <div className="space-y-2">
            <p className="text-lg">Nenhuma questão encontrada</p>
            <p className="text-sm">Tente ajustar seus filtros ou termos de pesquisa</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <Dialog open={!!viewQuestion} onOpenChange={(isOpen) => !isOpen && setViewQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
          </DialogHeader>
          {viewQuestion && <QuestionPreview question={viewQuestion} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteQuestionId} onOpenChange={(isOpen) => !isOpen && setDeleteQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteQuestionId === 'bulk'
                ? `Tem certeza que deseja excluir as ${selectedIds.length} questões selecionadas?`
                : "Tem certeza que deseja excluir esta questão?"
              }
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteQuestionId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteQuestionId === 'bulk' ? handleBulkDelete : handleDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuestionsPage; 