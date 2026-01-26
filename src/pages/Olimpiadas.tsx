import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Plus, Search, Loader2, Medal, Eye, Edit, Play, CalendarDays, Clock, BarChart3, Users, Trash2, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import { api } from '@/lib/api';
import { OlimpiadaCardData, OlimpiadaStatus } from '@/types/olimpiada-types';
import { OlimpiadaCard } from '@/components/olimpiadas/OlimpiadaCard';
import { CreateOlimpiadaModal } from '@/components/olimpiadas/CreateOlimpiadaModal';
import { OlimpiadaResultsModal } from '@/components/olimpiadas/OlimpiadaResultsModal';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { convertDateTimeLocalToISO } from '@/utils/date';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Olimpiadas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [olimpiadas, setOlimpiadas] = useState<OlimpiadaCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OlimpiadaStatus | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'participants' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedOlimpiadaId, setSelectedOlimpiadaId] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applyingOlimpiadaId, setApplyingOlimpiadaId] = useState<string | null>(null);
  const [applyStartDateTime, setApplyStartDateTime] = useState('');
  const [applyEndDateTime, setApplyEndDateTime] = useState('');
  const [applyingOlimpiada, setApplyingOlimpiada] = useState<OlimpiadaCardData | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showAllResultsModal, setShowAllResultsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [olimpiadaToDelete, setOlimpiadaToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadOlimpiadas();
  }, []);

  const loadOlimpiadas = async () => {
    setLoading(true);
    try {
      const response = await OlimpiadasApiService.getOlimpiadas();
      // Garantir que response.data seja um array
      const olimpiadasArray = Array.isArray(response.data) ? response.data : [];
      
      // Mapear dados das olimpíadas e buscar informações das turmas para filtros
      const olimpiadasData = await Promise.all(
        olimpiadasArray.map(async (olimpiada: any) => {
          // ✅ LOG: Verificar o que está vindo do backend na lista
          if (olimpiada.selected_students) {
            console.log('📋 [Olimpiadas] Olimpíada na lista com selected_students:', {
              id: olimpiada.id,
              title: olimpiada.title,
              selected_students_count: Array.isArray(olimpiada.selected_students) ? olimpiada.selected_students.length : 'não é array',
              selected_students: olimpiada.selected_students,
              classes: olimpiada.classes
            });
          }
          
          // Tentar obter dados do backend primeiro
          let totalStudents = olimpiada.total_students || 
                             olimpiada.total_alunos || 
                             olimpiada.totalStudents || 
                             0;
          let completedStudents = olimpiada.completed_students || 
                                 olimpiada.alunos_participantes || 
                                 olimpiada.completedStudents || 
                                 0;

          // ✅ IMPORTANTE: Garantir que selected_students seja um array de strings
          let selectedStudents: string[] = [];
          if (olimpiada.selected_students) {
            if (Array.isArray(olimpiada.selected_students)) {
              selectedStudents = olimpiada.selected_students.map((id: any) => String(id));
            } else {
              console.warn('⚠️ [Olimpiadas] selected_students não é array:', olimpiada.selected_students);
            }
          }

          return {
            id: olimpiada.id,
            title: olimpiada.title,
            description: olimpiada.description,
            status: getStatus(olimpiada),
            startDateTime: olimpiada.startDateTime || olimpiada.time_limit,
            endDateTime: olimpiada.endDateTime || olimpiada.end_time,
            totalStudents,
            completedStudents,
            subjects: olimpiada.subjects || olimpiada.subjects_info || [],
            created_at: olimpiada.created_at || olimpiada.createdAt,
            classes: olimpiada.classes || [],
            schools: olimpiada.schools || [],
            municipalities: olimpiada.municipalities || [],
            selected_students: selectedStudents, // ✅ Alunos individuais selecionados (garantido como array)
          };
        })
      );
      
      setOlimpiadas(olimpiadasData);
    } catch (error) {
      console.error('Erro ao carregar olimpíadas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar olimpíadas',
        variant: 'destructive',
      });
      // Garantir que olimpiadas seja um array vazio em caso de erro
      setOlimpiadas([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (olimpiada: any): OlimpiadaStatus => {
    // Verificar se a olimpíada foi aplicada
    // Pode estar em is_applied, is_active, ou ter applied_classes com turmas aplicadas
    const hasAppliedClasses = olimpiada.applied_classes && 
                              Array.isArray(olimpiada.applied_classes) && 
                              olimpiada.applied_classes.length > 0 &&
                              olimpiada.applied_classes.some((ac: any) => ac.class_test_id !== null || ac.status === 'applied');
    
    const isApplied = olimpiada.is_applied || olimpiada.is_active || hasAppliedClasses;
    
    // Se não foi aplicada ainda, considerar como agendada (não rascunho)
    // Isso evita o status "draft" que não deve existir para olimpíadas
    if (!isApplied) {
      // Se tem turmas selecionadas mas ainda não aplicada, considerar como agendada
      if (olimpiada.classes && Array.isArray(olimpiada.classes) && olimpiada.classes.length > 0) {
        return 'scheduled';
      }
      // Se não tem turmas, ainda considerar como agendada (será aplicada automaticamente)
      return 'scheduled';
    }
    
    // Se foi aplicada, determinar status baseado nas datas
    const now = new Date();
    const startDate = olimpiada.startDateTime || olimpiada.time_limit;
    const endDate = olimpiada.endDateTime || olimpiada.end_time;
    
    if (startDate && new Date(startDate) > now) {
      return 'scheduled';
    }
    if (endDate && new Date(endDate) < now) {
      return 'completed';
    }
    return 'active';
  };

  // Extrair todas as disciplinas únicas para o filtro
  const allSubjects = useMemo(() => {
    const subjectsSet = new Set<string>();
    olimpiadas.forEach(olimpiada => {
      olimpiada.subjects?.forEach(subject => {
        subjectsSet.add(subject.id);
      });
    });
    return Array.from(subjectsSet).map(id => {
      const olimpiada = olimpiadas.find(o => o.subjects?.some(s => s.id === id));
      const subject = olimpiada?.subjects?.find(s => s.id === id);
      return { id, name: subject?.name || id };
    });
  }, [olimpiadas]);

  const filteredOlimpiadas = useMemo(() => {
    let filtered = olimpiadas;

    // Filtro de busca por texto
    if (searchTerm) {
      filtered = filtered.filter(olimpiada =>
        olimpiada.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        olimpiada.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(olimpiada => olimpiada.status === statusFilter);
    }

    // Filtro por disciplina
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(olimpiada =>
        olimpiada.subjects?.some(subject => subject.id === subjectFilter)
      );
    }


    // Filtro por data
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(olimpiada => {
        if (!olimpiada.startDateTime) return false;
        const startDate = new Date(olimpiada.startDateTime);
        
        switch (dateFilter) {
          case 'today':
            return startDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return startDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return startDate >= monthAgo;
          case 'past':
            return startDate < now;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [olimpiadas, searchTerm, statusFilter, subjectFilter, dateFilter]);

  // Verificar se há filtros ativos
  const hasActiveFilters = 
    statusFilter !== 'all' || 
    subjectFilter !== 'all' || 
    dateFilter !== 'all' || 
    searchTerm.length > 0;

  // Ordenar olimpíadas
  const sortedOlimpiadas = useMemo(() => {
    const sorted = [...filteredOlimpiadas];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'pt-BR');
          break;
        case 'date':
          const dateA = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
          const dateB = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'participants':
          const participantsA = a.completedStudents || 0;
          const participantsB = b.completedStudents || 0;
          comparison = participantsA - participantsB;
          break;
        case 'status':
          const statusOrder: Record<OlimpiadaStatus, number> = {
            'active': 1,
            'scheduled': 2,
            'completed': 3,
            'draft': 4,
            'cancelled': 5,
          };
          comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredOlimpiadas, sortBy, sortOrder]);

  const handleView = (id: string) => {
    navigate(`/app/olimpiada/${id}`);
  };

  const handleViewResults = (id: string) => {
    // Verificar se há alunos participantes antes de abrir o modal
    const olimpiada = olimpiadas.find(o => o.id === id);
    if (olimpiada && (olimpiada.completedStudents || 0) === 0) {
      toast({
        title: 'Nenhum resultado disponível',
        description: 'Ainda não há alunos que completaram esta olimpíada.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedOlimpiadaId(id);
    setShowResultsModal(true);
  };

  const handleDelete = (id: string) => {
    setOlimpiadaToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!olimpiadaToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/test/${olimpiadaToDelete}`);

      toast({
        title: 'Sucesso',
        description: 'Olimpíada excluída com sucesso',
      });

      // Recarregar lista de olimpíadas
      await loadOlimpiadas();
    } catch (error: unknown) {
      const apiError = error as { 
        message?: string; 
        response?: { 
          status?: number; 
          data?: { 
            error?: string;
            details?: string;
          } 
        } 
      };
      
      console.error("❌ Erro detalhado ao excluir olimpíada:", {
        error,
        message: apiError.message,
        response: apiError.response,
        status: apiError.response?.status,
        data: apiError.response?.data
      });

      let errorMessage = 'Erro ao excluir olimpíada';

      if (apiError.response?.status === 404) {
        errorMessage = 'Olimpíada não encontrada';
      } else if (apiError.response?.status === 403) {
        errorMessage = 'Você não tem permissão para excluir esta olimpíada';
      } else if (apiError.response?.status === 401) {
        errorMessage = 'Não autorizado';
      } else if (apiError.response?.status === 500) {
        // Erro interno do servidor - pode ser problema de banco de dados
        const errorData = apiError.response?.data;
        const errorDetails = errorData?.details || '';
        const errorText = errorData?.error || '';
        
        // Verificar se é erro de tabela não existente
        if (errorDetails.includes('does not exist') || 
            errorDetails.includes('relation') || 
            errorDetails.includes('competition_results') ||
            errorText.includes('competition_results')) {
          errorMessage = 'Erro no banco de dados. Entre em contato com o suporte técnico.';
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
        }
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      toast({
        title: 'Erro ao excluir olimpíada',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setOlimpiadaToDelete(null);
    }
  };

  const handleApply = async (id: string) => {
    setApplyingOlimpiadaId(id);
    setIsApplying(false);
    
    // Buscar dados da olimpíada para preencher datas padrão
    try {
      const olimpiada = await OlimpiadasApiService.getOlimpiada(id);
      const olimpiadaCard = olimpiadas.find(o => o.id === id);
      // ✅ Garantir que selected_students seja incluído
      setApplyingOlimpiada(olimpiadaCard ? {
        ...olimpiadaCard,
        selected_students: olimpiada.selected_students || []
      } : null);
      
      // Preencher datas padrão se existirem
      if (olimpiada.startDateTime && olimpiada.endDateTime) {
        // Converter ISO para datetime-local
        const startDate = new Date(olimpiada.startDateTime);
        const endDate = new Date(olimpiada.endDateTime);
        
        // Formato datetime-local: YYYY-MM-DDTHH:mm
        const formatDateTimeLocal = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        
        setApplyStartDateTime(formatDateTimeLocal(startDate));
        setApplyEndDateTime(formatDateTimeLocal(endDate));
      } else {
        // Se não tiver datas, usar data/hora atual e adicionar 1 hora
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        const formatDateTimeLocal = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        
        setApplyStartDateTime(formatDateTimeLocal(now));
        setApplyEndDateTime(formatDateTimeLocal(oneHourLater));
      }
    } catch (error) {
      console.error('Erro ao buscar dados da olimpíada:', error);
      // Usar valores padrão mesmo se falhar
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      const formatDateTimeLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      
      setApplyStartDateTime(formatDateTimeLocal(now));
      setApplyEndDateTime(formatDateTimeLocal(oneHourLater));
    }
    
    setShowApplyDialog(true);
  };

  const confirmApply = async () => {
    if (!applyingOlimpiadaId) return;

    setIsApplying(true);

    try {
      // Buscar dados completos da olimpíada
      const olimpiada = await OlimpiadasApiService.getOlimpiada(applyingOlimpiadaId);
      
      // ✅ DETECTAR AUTOMATICAMENTE: Verificar se há alunos individuais selecionados
      const hasIndividualStudents = olimpiada.selected_students && 
                                     Array.isArray(olimpiada.selected_students) && 
                                     olimpiada.selected_students.length > 0;
      
      // Se houver alunos individuais, aplicar para eles
      if (hasIndividualStudents) {
        const studentIds = olimpiada.selected_students.map((id: any) => String(id));
        
        // Validar datas
        if (!applyStartDateTime || !applyEndDateTime) {
          toast({
            title: 'Erro',
            description: 'Preencha as datas de início e término',
            variant: 'destructive',
          });
          setIsApplying(false);
          return;
        }

        // Converter datas para ISO
        const isISOFormat = (dateStr: string) => /[+-]\d{2}:\d{2}$/.test(dateStr);
        const startDateTimeISO = isISOFormat(applyStartDateTime)
          ? applyStartDateTime
          : convertDateTimeLocalToISO(applyStartDateTime);
        const endDateTimeISO = isISOFormat(applyEndDateTime)
          ? applyEndDateTime
          : convertDateTimeLocalToISO(applyEndDateTime);

        // Validar datas
        const startDateObj = new Date(startDateTimeISO);
        const endDateObj = new Date(endDateTimeISO);
        const now = new Date();

        if (endDateObj <= now) {
          toast({
            title: 'Erro',
            description: 'A data de término deve ser posterior ao momento atual',
            variant: 'destructive',
          });
          setIsApplying(false);
          return;
        }

        if (endDateObj <= startDateObj) {
          toast({
            title: 'Erro',
            description: 'A data de término deve ser posterior à data de início',
            variant: 'destructive',
          });
          setIsApplying(false);
          return;
        }

        // Aplicar para alunos individuais
        await OlimpiadasApiService.applyOlimpiadaToStudents(
          applyingOlimpiadaId,
          studentIds,
          startDateTimeISO,
          endDateTimeISO
        );

        toast({
          title: 'Olimpíada aplicada!',
          description: `A olimpíada foi enviada para ${studentIds.length} aluno(s) selecionado(s)`,
        });
        setShowApplyDialog(false);
        setApplyingOlimpiadaId(null);
        setApplyStartDateTime('');
        setApplyEndDateTime('');
        setApplyingOlimpiada(null);
        loadOlimpiadas();
        setIsApplying(false);
        return;
      }

      // Modo turmas (código original) - aplicar para todas as turmas
      // Processar classes no mesmo formato usado em ViewEvaluation.tsx
      let classIds: string[] = [];
      
      if (olimpiada.classes && Array.isArray(olimpiada.classes) && olimpiada.classes.length > 0) {
        const firstItem = olimpiada.classes[0];
        // Verificar se é array de objetos com propriedade id
        if (typeof firstItem === 'object' && firstItem !== null && 'id' in firstItem) {
          classIds = olimpiada.classes.map((item: any) => String(item.id));
        } else {
          // Array direto de strings/números
          classIds = olimpiada.classes.map((item: any) => String(item));
        }
      } else if (olimpiada.applied_classes && Array.isArray(olimpiada.applied_classes)) {
        // Usar applied_classes como fallback
        const firstItem = olimpiada.applied_classes[0];
        if (typeof firstItem === 'object' && firstItem !== null && 'id' in firstItem) {
          classIds = olimpiada.applied_classes.map((item: any) => String(item.id));
        } else {
          classIds = olimpiada.applied_classes.map((item: any) => String(item));
        }
      }
      
      // Verificar se temos classes
      if (classIds.length === 0) {
        toast({
          title: 'Erro',
          description: 'A olimpíada não possui turmas associadas',
          variant: 'destructive',
        });
        setIsApplying(false);
        return;
      }

      // ✅ USAR HORÁRIO ATUAL DO NAVEGADOR (não do formulário)
      // Capturar data/hora exata no momento do clique
      const now = new Date();
      
      // Data de início: agora
      const startDateTime = now;
      
      // Data de término: usar a data do formulário se fornecida, caso contrário usar duração padrão
      let endDateTime: Date;
      if (applyEndDateTime) {
        // Se o admin forneceu data de término, converter de datetime-local para Date
        // datetime-local vem sem timezone, então interpretar como hora local
        endDateTime = new Date(applyEndDateTime);
        
        // Validar que a data de término é posterior à de início
        if (endDateTime <= now) {
          toast({
            title: 'Erro',
            description: 'A data de término deve ser posterior ao momento atual',
            variant: 'destructive',
          });
          setIsApplying(false);
          return;
        }
      } else {
        // Caso contrário, usar duração da olimpíada + margem de segurança
        // Adicionar 30 minutos extras além da duração para garantir que não expire durante a realização
        const durationMinutes = olimpiada.duration || 120;
        const safetyMarginMinutes = 30; // Margem de segurança
        const totalMinutes = durationMinutes + safetyMarginMinutes;
        const durationMs = totalMinutes * 60 * 1000; // converter minutos para ms
        endDateTime = new Date(now.getTime() + durationMs);
        
        console.log('⏰ Calculando data de término:', {
          duracao_olimpiada_minutos: durationMinutes,
          margem_seguranca_minutos: safetyMarginMinutes,
          total_minutos: totalMinutes,
          inicio: now.toLocaleString('pt-BR'),
          termino_calculado: endDateTime.toLocaleString('pt-BR'),
          diferenca_minutos: totalMinutes
        });
      }
      
      // Converter para ISO com timezone usando a função que preserva o horário local
      const startDateTimeISO = convertDateTimeLocalToISO(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      
      const endDateTimeISO = convertDateTimeLocalToISO(
        `${endDateTime.getFullYear()}-${String(endDateTime.getMonth() + 1).padStart(2, '0')}-${String(endDateTime.getDate()).padStart(2, '0')}T${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`
      );
      
      // ✅ VALIDAÇÃO CRÍTICA: Verificar se a data de término é posterior à de início
      const startDateObj = new Date(startDateTimeISO);
      const endDateObj = new Date(endDateTimeISO);
      
      if (endDateObj <= startDateObj) {
        toast({
          title: 'Erro',
          description: 'A data de término deve ser posterior à data de início',
          variant: 'destructive',
        });
        setIsApplying(false);
        return;
      }

      // Obter timezone do usuário
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Log SUPER detalhado para debug de timezone
      console.log('🚀 Aplicando olimpíada (Olimpiadas.tsx) - USANDO HORÁRIO ATUAL:');
      console.log('1️⃣ Horário no momento do clique:');
      console.log('   - Data/hora atual:', now.toISOString());
      console.log('   - Hora local:', now.toLocaleString('pt-BR'));
      console.log('   - Timezone do navegador:', userTimezone);
      console.log('   - Offset (minutos):', now.getTimezoneOffset());
      
      console.log('2️⃣ Datas calculadas:');
      console.log('   - Início:', {
        local: startDateTime.toLocaleString('pt-BR'),
        iso: startDateTime.toISOString(),
        timestamp: startDateTime.getTime()
      });
      console.log('   - Término:', {
        local: endDateTime.toLocaleString('pt-BR'),
        iso: endDateTime.toISOString(),
        timestamp: endDateTime.getTime(),
        diferenca_minutos: (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
      });
      
      console.log('3️⃣ Conversão para ISO com timezone:');
      console.log('   - Início convertido:', startDateTimeISO);
      console.log('   - Término convertido:', endDateTimeISO);
      console.log('   - Validação:', {
        startDateObj: new Date(startDateTimeISO).toISOString(),
        endDateObj: new Date(endDateTimeISO).toISOString(),
        isEndAfterStart: new Date(endDateTimeISO) > new Date(startDateTimeISO),
        diferenca_minutos: (new Date(endDateTimeISO).getTime() - new Date(startDateTimeISO).getTime()) / (1000 * 60)
      });
      
      console.log('4️⃣ Dados que serão enviados ao backend:', {
        olimpiadaId: applyingOlimpiadaId,
        classes: classIds,
        startDateTime: startDateTimeISO,
        endDateTime: endDateTimeISO,
        timezone: userTimezone
      });

      // Aplicar a olimpíada com as datas selecionadas
      await OlimpiadasApiService.applyOlimpiada(
        applyingOlimpiadaId,
        classIds,
        startDateTimeISO,
        endDateTimeISO,
        userTimezone
      );

      toast({
        title: 'Olimpíada aplicada!',
        description: 'A olimpíada foi enviada para os alunos',
      });
      setShowApplyDialog(false);
      setApplyingOlimpiadaId(null);
      setApplyStartDateTime('');
      setApplyEndDateTime('');
      setApplyingOlimpiada(null);
      loadOlimpiadas();
    } catch (error) {
      console.error('Erro ao aplicar olimpíada:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao aplicar olimpíada',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateSuccess = () => {
    loadOlimpiadas();
    setShowCreateModal(false);
    setSelectedOlimpiadaId(null);
  };

  const stats = {
    total: olimpiadas.length,
    active: olimpiadas.filter(o => o.status === 'active').length,
    completed: olimpiadas.filter(o => o.status === 'completed').length,
    scheduled: olimpiadas.filter(o => o.status === 'scheduled').length,
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-blue-600" />
            Olimpíadas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie olimpíadas para treinamento de alunos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAllResultsModal(true)}
            className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Resultados
          </Button>
          <Button
            onClick={() => {
              setSelectedOlimpiadaId(undefined);
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Olimpíada
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              Total de Olimpíadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Agendadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.scheduled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-4 space-y-4">
          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar olimpíadas por título ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Botão para expandir/recolher filtros */}
          <div className="flex items-center justify-between">
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros Avançados
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {[
                        statusFilter !== 'all' ? 1 : 0, 
                        subjectFilter !== 'all' ? 1 : 0, 
                        dateFilter !== 'all' ? 1 : 0, 
                        searchTerm.length > 0 ? 1 : 0
                      ].reduce((a, b) => a + b, 0)}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Filtro por Status */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OlimpiadaStatus | 'all')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="scheduled">Agendadas</SelectItem>
                        <SelectItem value="active">Ativas</SelectItem>
                        <SelectItem value="completed">Concluídas</SelectItem>
                        <SelectItem value="draft">Rascunhos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Disciplina */}
                  {allSubjects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Disciplina</Label>
                      <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todas as disciplinas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as disciplinas</SelectItem>
                          {allSubjects.map(subject => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Filtro por Data */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Data</Label>
                    <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as typeof dateFilter)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todas as datas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as datas</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Última semana</SelectItem>
                        <SelectItem value="month">Último mês</SelectItem>
                        <SelectItem value="past">Passadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ordenação - Botão de ícone */}
                <div className="flex items-center justify-end pt-2 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                        title={`Ordenar por ${sortBy === 'date' ? 'Data' : sortBy === 'title' ? 'Título' : sortBy === 'participants' ? 'Participantes' : 'Status'} (${sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})`}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSortBy('date');
                          if (sortBy === 'date') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortOrder('desc');
                          }
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>Data</span>
                        {sortBy === 'date' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortBy('title');
                          if (sortBy === 'title') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>Título</span>
                        {sortBy === 'title' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortBy('participants');
                          if (sortBy === 'participants') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortOrder('desc');
                          }
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>Participantes</span>
                        {sortBy === 'participants' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortBy('status');
                          if (sortBy === 'status') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>Status</span>
                        {sortBy === 'status' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Botão para limpar filtros */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setSubjectFilter('all');
                      setDateFilter('all');
                      setSortBy('date');
                      setSortOrder('desc');
                    }}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Olimpíadas Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      ) : sortedOlimpiadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma olimpíada encontrada' : 'Nenhuma olimpíada criada ainda'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Olimpíada
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {sortedOlimpiadas.map((olimpiada) => (
            <OlimpiadaCard
              key={olimpiada.id}
              olimpiada={olimpiada}
              onView={handleView}
              onViewResults={handleViewResults}
              onApply={handleApply}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateOlimpiadaModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedOlimpiadaId(null);
        }}
        onSuccess={handleCreateSuccess}
        olimpiadaId={selectedOlimpiadaId || undefined}
      />

      {selectedOlimpiadaId && (
        <OlimpiadaResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedOlimpiadaId(null);
          }}
          olimpiadaId={selectedOlimpiadaId}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta olimpíada? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setOlimpiadaToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Resultados de Todas as Olimpíadas */}
      <Dialog open={showAllResultsModal} onOpenChange={setShowAllResultsModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              Resultados das Olimpíadas
            </DialogTitle>
            <DialogDescription>
              Selecione uma olimpíada para ver os resultados detalhados
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
              </div>
            ) : filteredOlimpiadas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma olimpíada encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOlimpiadas.map((olimpiada) => (
                  <Card
                    key={olimpiada.id}
                    className="hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedOlimpiadaId(olimpiada.id);
                      setShowAllResultsModal(false);
                      setShowResultsModal(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                              {olimpiada.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                olimpiada.status === 'completed'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                  : olimpiada.status === 'active'
                                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                                  : 'bg-muted text-foreground'
                              }
                            >
                              {olimpiada.status === 'completed' ? 'Concluída' :
                               olimpiada.status === 'active' ? 'Ativa' :
                               olimpiada.status === 'scheduled' ? 'Agendada' : 'Rascunho'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>
                                {olimpiada.completedStudents || 0}/{olimpiada.totalStudents || 0} alunos
                              </span>
                            </div>
                            {olimpiada.subjects && olimpiada.subjects.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Medal className="h-3 w-3" />
                                <span>{olimpiada.subjects.map(s => s.name).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOlimpiadaId(olimpiada.id);
                            setShowAllResultsModal(false);
                            setShowResultsModal(true);
                          }}
                          className="ml-4"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Ver Resultados
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={(open) => {
        setShowApplyDialog(open);
        if (!open) {
          setApplyStartDateTime('');
          setApplyEndDateTime('');
          setApplyingOlimpiada(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-600" />
              Aplicar Olimpíada
            </DialogTitle>
            <DialogDescription>
              Configure quando a olimpíada ficará disponível para os alunos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Medal className="h-4 w-4" />
              <AlertDescription>
                {applyingOlimpiada && applyingOlimpiada.selected_students && applyingOlimpiada.selected_students.length > 0
                  ? `A olimpíada será enviada para ${applyingOlimpiada.selected_students.length} aluno(s) selecionado(s) no período configurado.`
                  : 'A olimpíada será enviada para todos os alunos das turmas selecionadas no período configurado.'}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Data e Hora de Início *
                </Label>
                <Input
                  type="datetime-local"
                  value={applyStartDateTime}
                  onChange={(e) => setApplyStartDateTime(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Quando a olimpíada ficará disponível
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data e Hora de Término *
                </Label>
                <Input
                  type="datetime-local"
                  value={applyEndDateTime}
                  onChange={(e) => setApplyEndDateTime(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Quando a olimpíada será encerrada
                </p>
              </div>
            </div>

            {applyStartDateTime && applyEndDateTime && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Período de disponibilidade
                  </span>
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                  <p>• <strong>Início:</strong> {new Date(applyStartDateTime).toLocaleString('pt-BR')}</p>
                  <p>• <strong>Término:</strong> {new Date(applyEndDateTime).toLocaleString('pt-BR')}</p>
                  <p>• <strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApplyDialog(false);
                setApplyStartDateTime('');
                setApplyEndDateTime('');
                setApplyingOlimpiada(null);
              }}
              disabled={isApplying}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmApply}
              disabled={isApplying || !applyStartDateTime || !applyEndDateTime}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Aplicar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
