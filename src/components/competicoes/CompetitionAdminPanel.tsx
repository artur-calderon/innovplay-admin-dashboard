import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Coins, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Eye,
  FileText,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { QuestionBank } from '@/components/evaluations/QuestionBank';
import { ClassSelector } from './ClassSelector';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { CompetitionsApiService } from '@/services/competitionsApi';
import { getErrorMessage, getErrorSuggestion } from '@/utils/errorHandler';
import type { 
  CompetitionFormData, 
  Competition, 
  CompetitionAdminPanelProps,
  CompetitionDifficulty,
  QuestionSelectionMode
} from '@/types/competition-types';

interface Subject {
  id: string;
  name: string;
}

interface SelectedQuestion {
  id: string;
  titulo?: string;
  text?: string;
  difficulty?: string;
  formatted_text?: string;
  alternatives?: Array<{
    id: string;
    text: string;
    letter?: string;
    is_correct?: boolean;
  }>;
  subject?: { id: string; name: string };
  skill?: string;
}

interface QuestionDetails {
  id: string;
  title?: string;
  text?: string;
  formatted_text?: string;
  formattedText?: string;
  difficulty_level?: string;
  difficulty?: string;
  alternatives?: Array<{
    id: string;
    text: string;
    letter?: string;
    is_correct?: boolean;
  }>;
  subject?: { id: string; name: string };
  skill?: string | string[];
  correct_answer?: string;
  image_url?: string;
  images?: string[];
}

// Opções de dificuldade disponíveis
const DIFFICULTY_OPTIONS = [
  { value: 'facil', label: 'Fácil', color: 'bg-green-500' },
  { value: 'medio', label: 'Médio', color: 'bg-yellow-500' },
  { value: 'dificil', label: 'Difícil', color: 'bg-red-500' },
];

export const CompetitionAdminPanel = ({ 
  onSuccess, 
  onCancel, 
  editingCompetition 
}: CompetitionAdminPanelProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  
  // Estados para validação em tempo real
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('informacoes');
  
  // Refs para scroll
  const formRef = useRef<HTMLDivElement>(null);
  
  // Estados do formulário
  const [formData, setFormData] = useState<CompetitionFormData>({
    titulo: editingCompetition?.titulo || '',
    disciplina_id: editingCompetition?.disciplina_id || '',
    dataInicio: editingCompetition?.data_inicio 
      ? new Date(editingCompetition.data_inicio) 
      : new Date(),
    dataFim: editingCompetition?.data_fim 
      ? new Date(editingCompetition.data_fim) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 dia
    duracao: editingCompetition?.duracao || 45,
    maxParticipantes: editingCompetition?.max_participantes || 500,
    recompensas: editingCompetition?.recompensas || { ouro: 100, prata: 60, bronze: 30, participacao: 5 },
    turmas: editingCompetition?.turmas || [],
    questoes: editingCompetition?.questoes || [],
    modo_selecao: 'manual',
    quantidade_questoes: 20,
    dificuldades: ['facil', 'medio', 'dificil'], // Todas selecionadas por padrão
    descricao: editingCompetition?.descricao || '',
    instrucoes: editingCompetition?.instrucoes || '',
    icone: editingCompetition?.icone || '🏆',
    cor: editingCompetition?.cor || '#3B82F6'
  });

  // Estados dos modais
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showQuestionsPreview, setShowQuestionsPreview] = useState(false);
  
  // Estados para preview de questões
  const [questionsDetails, setQuestionsDetails] = useState<QuestionDetails[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState('');
  
  // Estados de validação
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar disciplinas ao montar
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await api.get('/subjects/');
        setSubjects(response.data);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        // Fallback com disciplinas padrão
        setSubjects([
          { id: 'matematica', name: 'Matemática' },
          { id: 'portugues', name: 'Português' },
          { id: 'ciencias', name: 'Ciências' },
          { id: 'historia', name: 'História' },
          { id: 'geografia', name: 'Geografia' },
          { id: 'ingles', name: 'Inglês' },
          { id: 'arte', name: 'Arte' },
          { id: 'educacao_fisica', name: 'Educação Física' }
        ]);
      }
    };

    loadSubjects();
  }, []);

  // Validar formulário
  // Validações por aba para indicadores visuais
  const getTabErrors = (): { informacoes: number; questoes: number; turmas: number; recompensas: number } => {
    let informacoes = 0;
    let questoes = 0;
    let turmas = 0;
    let recompensas = 0;

    // Validações Informações
    if (!formData.titulo.trim() || formData.titulo.trim().length < 3) informacoes++;
    if (!editingCompetition && formData.dataInicio < new Date()) informacoes++;
    const diffHoras = (formData.dataFim.getTime() - formData.dataInicio.getTime()) / (1000 * 60 * 60);
    if (formData.dataFim <= formData.dataInicio || diffHoras < 1) informacoes++;
    if (formData.duracao < 5 || formData.duracao > 240) informacoes++;
    if (formData.maxParticipantes < 1) informacoes++;

    // Validações Questões
    if (!formData.disciplina_id) questoes++;
    if (formData.modo_selecao === 'manual' && formData.questoes.length === 0) questoes++;
    if (formData.modo_selecao === 'automatico' && 
        (!formData.quantidade_questoes || formData.quantidade_questoes < 1 || formData.quantidade_questoes > 50)) {
      questoes++;
    }

    // Validações Turmas
    if (formData.turmas.length === 0) turmas++;

    // Validações Recompensas
    if (formData.recompensas.ouro < 1) recompensas++;
    if (formData.recompensas.prata < 0) recompensas++;
    if (formData.recompensas.bronze < 0) recompensas++;
    if (formData.recompensas.participacao < 0) recompensas++;

    return { informacoes, questoes, turmas, recompensas };
  };

  const tabErrors = getTabErrors();
  const totalErrors = tabErrors.informacoes + tabErrors.questoes + tabErrors.turmas + tabErrors.recompensas;

  // Função para marcar campo como tocado (para validação onBlur)
  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]));
  };

  // Verificar se deve mostrar erro para um campo
  const shouldShowError = (fieldName: string): boolean => {
    return hasTriedSubmit || touchedFields.has(fieldName);
  };

  // Navegar para a primeira aba com erro
  const navigateToFirstErrorTab = () => {
    if (tabErrors.informacoes > 0) {
      setActiveTab('informacoes');
      return 'informacoes';
    }
    if (tabErrors.questoes > 0) {
      setActiveTab('questoes');
      return 'questoes';
    }
    if (tabErrors.turmas > 0) {
      setActiveTab('turmas');
      return 'turmas';
    }
    if (tabErrors.recompensas > 0) {
      setActiveTab('recompensas');
      return 'recompensas';
    }
    return null;
  };

  // Scroll suave para o topo do formulário
  const scrollToTop = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // === VALIDAÇÕES ABA INFORMAÇÕES ===
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    } else if (formData.titulo.trim().length < 3) {
      newErrors.titulo = 'Título deve ter no mínimo 3 caracteres';
    }

    // Validar data de início (não pode ser no passado para novas competições)
    if (!editingCompetition && formData.dataInicio < new Date()) {
      newErrors.dataInicio = 'Data de início não pode ser no passado';
    }

    // Validar data de término
    if (formData.dataFim <= formData.dataInicio) {
      newErrors.dataFim = 'Data de término deve ser posterior à data de início';
    } else {
      // Diferença mínima de 1 hora
      const diffHoras = (formData.dataFim.getTime() - formData.dataInicio.getTime()) / (1000 * 60 * 60);
      if (diffHoras < 1) {
        newErrors.dataFim = 'Diferença mínima entre início e término deve ser de 1 hora';
      }
    }

    if (formData.duracao < 5 || formData.duracao > 240) {
      newErrors.duracao = 'Duração deve ser entre 5 e 240 minutos';
    }

    if (formData.maxParticipantes < 1) {
      newErrors.maxParticipantes = 'Máximo de participantes deve ser pelo menos 1';
    }

    // === VALIDAÇÕES ABA QUESTÕES ===
    if (!formData.disciplina_id) {
      newErrors.disciplina_id = 'Disciplina é obrigatória';
    }

    if (formData.modo_selecao === 'manual' && formData.questoes.length === 0) {
      newErrors.questoes = 'Selecione pelo menos uma questão';
    }

    if (formData.modo_selecao === 'automatico') {
      if (!formData.quantidade_questoes || formData.quantidade_questoes < 1) {
        newErrors.quantidade_questoes = 'Informe a quantidade de questões (mínimo 1)';
      } else if (formData.quantidade_questoes > 50) {
        newErrors.quantidade_questoes = 'Quantidade máxima de questões é 50';
      }
    }

    // === VALIDAÇÕES ABA TURMAS ===
    if (formData.turmas.length === 0) {
      newErrors.turmas = 'Selecione pelo menos uma turma';
    }

    // === VALIDAÇÕES ABA RECOMPENSAS ===
    if (formData.recompensas.ouro < 1) {
      newErrors.recompensas_ouro = '1º lugar deve receber pelo menos 1 moeda';
    }

    if (formData.recompensas.prata < 0) {
      newErrors.recompensas_prata = '2º lugar não pode ser negativo';
    }

    if (formData.recompensas.bronze < 0) {
      newErrors.recompensas_bronze = '3º lugar não pode ser negativo';
    }

    if (formData.recompensas.participacao < 0) {
      newErrors.recompensas_participacao = 'Recompensa por participação não pode ser negativa';
    }

    if (formData.recompensas.ouro <= 0) {
      newErrors.recompensas = 'Recompensa do 1º lugar deve ser maior que zero';
    }

    // Validação: Ouro deve ser maior que prata, prata maior que bronze
    if (formData.recompensas.ouro <= formData.recompensas.prata) {
      newErrors.recompensas_ouro = '1º lugar deve receber mais moedas que o 2º lugar';
    }
    if (formData.recompensas.prata <= formData.recompensas.bronze && formData.recompensas.bronze > 0) {
      newErrors.recompensas_prata = '2º lugar deve receber mais moedas que o 3º lugar';
    }

    // Validação: Verificar se há questões suficientes para a quantidade de participantes
    const totalQuestoes = formData.modo_selecao === 'manual' 
      ? formData.questoes.length 
      : (formData.quantidade_questoes || 0);
    
    if (totalQuestoes === 0) {
      newErrors.questoes = 'É necessário ter pelo menos uma questão na competição';
    } else if (totalQuestoes > 100) {
      newErrors.questoes = 'Número máximo de questões é 100';
    }

    // Validação: Verificar se há turmas suficientes
    if (formData.turmas.length === 0) {
      newErrors.turmas = 'Selecione pelo menos uma turma para a competição';
    } else if (formData.turmas.length > 100) {
      newErrors.turmas = 'Número máximo de turmas é 100';
    }

    // Validação: Verificar se a data de início não é muito distante (máximo 1 ano)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (formData.dataInicio > oneYearFromNow) {
      newErrors.dataInicio = 'Data de início não pode ser mais de 1 ano no futuro';
    }

    // Validação: Verificar se a data de término não é muito distante (máximo 1 ano)
    if (formData.dataFim > oneYearFromNow) {
      newErrors.dataFim = 'Data de término não pode ser mais de 1 ano no futuro';
    }

    // Validação: Verificar se o título não é muito longo
    if (formData.titulo.length > 200) {
      newErrors.titulo = 'Título deve ter no máximo 200 caracteres';
    }

    // Validação: Verificar se a descrição não é muito longa
    if (formData.descricao && formData.descricao.length > 1000) {
      newErrors.descricao = 'Descrição deve ter no máximo 1000 caracteres';
    }

    // Validação: Verificar se as instruções não são muito longas
    if (formData.instrucoes && formData.instrucoes.length > 2000) {
      newErrors.instrucoes = 'Instruções devem ter no máximo 2000 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler de questão selecionada do banco
  const handleQuestionSelected = (question: SelectedQuestion) => {
    // Verificar se já está selecionada
    if (formData.questoes.includes(question.id)) {
      toast({
        title: "Questão já selecionada",
        description: "Esta questão já foi adicionada à competição.",
        variant: "destructive",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      questoes: [...prev.questoes, question.id]
    }));

    setSelectedQuestions(prev => [...prev, question]);

    toast({
      title: "Questão adicionada",
      description: "Questão adicionada à competição com sucesso.",
    });
  };

  // Remover questão
  const handleRemoveQuestion = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      questoes: prev.questoes.filter(id => id !== questionId)
    }));
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  // Handler de turmas selecionadas
  const handleClassesSelected = (classIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      turmas: classIds
    }));
  };

  // Carregar detalhes das questões selecionadas
  const loadQuestionsDetails = async () => {
    if (formData.questoes.length === 0) return;
    
    setLoadingQuestions(true);
    try {
      const details: QuestionDetails[] = [];
      
      // Buscar detalhes de cada questão
      for (const questionId of formData.questoes) {
        try {
          const response = await api.get(`/questions/${questionId}`);
          if (response.data) {
            details.push(response.data);
          }
        } catch (err) {
          console.error(`Erro ao buscar questão ${questionId}:`, err);
          // Adicionar placeholder para questões que não foram encontradas
          details.push({
            id: questionId,
            title: `Questão ${questionId}`,
            text: 'Detalhes não disponíveis'
          });
        }
      }
      
      setQuestionsDetails(details);
    } catch (error) {
      console.error('Erro ao carregar detalhes das questões:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes das questões.",
        variant: "destructive",
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Abrir modal de visualização
  const handleOpenQuestionsPreview = () => {
    setShowQuestionsPreview(true);
    loadQuestionsDetails();
  };

  // Filtrar questões no modal
  const filteredQuestionsDetails = questionsDetails.filter(q => {
    if (!questionSearch) return true;
    const search = questionSearch.toLowerCase();
    return (
      q.title?.toLowerCase().includes(search) ||
      q.text?.toLowerCase().includes(search) ||
      q.id.toLowerCase().includes(search)
    );
  });

  // Gerar questões automaticamente
  const handleGenerateQuestions = async () => {
    if (!formData.disciplina_id) {
      toast({
        title: "Selecione uma disciplina",
        description: "É necessário selecionar uma disciplina antes de gerar questões automaticamente.",
        variant: "destructive",
      });
      return;
    }

    // Encontrar nome da disciplina para exibição
    const disciplinaSelecionada = subjects.find(s => s.id === formData.disciplina_id);
    console.log('Gerando questões para:', {
      disciplina_id: formData.disciplina_id,
      disciplina_nome: disciplinaSelecionada?.name,
      quantidade: formData.quantidade_questoes || 20,
      dificuldades: formData.dificuldades
    });

    try {
      setIsLoading(true);
      const result = await CompetitionsApiService.generateAutoQuestions({
        disciplina_id: formData.disciplina_id,
        quantidade: formData.quantidade_questoes || 20,
        dificuldades: formData.dificuldades
      });

      if (result.question_ids.length === 0) {
        toast({
          title: "Nenhuma questão encontrada",
          description: "Não há questões disponíveis para os critérios selecionados. Tente alterar a disciplina ou dificuldade.",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        questoes: result.question_ids
      }));

      // Atualizar lista de questões selecionadas com preview
      if (result.questions_preview) {
        setSelectedQuestions(result.questions_preview.map(q => ({
          id: q.id,
          titulo: q.titulo,
          difficulty: q.dificuldade
        })));
      }

      const quantidadeDesejada = formData.quantidade_questoes || 20;
      const mensagem = result.total_generated < quantidadeDesejada
        ? `${result.total_generated} questões encontradas (de ${quantidadeDesejada} solicitadas).`
        : `${result.total_generated} questões foram selecionadas automaticamente.`;

      toast({
        title: "Questões geradas com sucesso!",
        description: mensagem,
      });
    } catch (error) {
      console.error('Erro ao gerar questões:', error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível gerar as questões automaticamente.";
      toast({
        title: "Erro ao gerar questões",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submeter formulário
  const handleSubmit = async () => {
    setHasTriedSubmit(true);
    
    if (!validateForm()) {
      // Navegar para a primeira aba com erro e fazer scroll
      const errorTab = navigateToFirstErrorTab();
      scrollToTop();
      
      toast({
        title: "Formulário inválido",
        description: errorTab 
          ? `Corrija os erros na aba "${errorTab === 'informacoes' ? 'Informações' : errorTab === 'questoes' ? 'Questões' : errorTab === 'turmas' ? 'Turmas' : 'Recompensas'}".`
          : "Por favor, corrija os erros antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      let competition: Competition;
      
      if (editingCompetition) {
        competition = await CompetitionsApiService.updateCompetition(
          editingCompetition.id, 
          formData
        );
        toast({
          title: "Competição atualizada",
          description: "A competição foi atualizada com sucesso.",
        });
      } else {
        competition = await CompetitionsApiService.createCompetition(formData);
        toast({
          title: "Competição criada",
          description: "A competição foi criada com sucesso.",
        });
      }

      onSuccess?.(competition);
    } catch (error) {
      console.error('Erro ao salvar competição:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível salvar a competição. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao salvar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Formatar data para input datetime-local
  const formatDateForInput = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  return (
    <div ref={formRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {editingCompetition ? 'Editar Competição' : 'Criar Nova Competição'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure os detalhes da competição
            </p>
          </div>
        </div>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="informacoes" className="relative gap-2">
            Informações
            {hasTriedSubmit && tabErrors.informacoes > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                {tabErrors.informacoes}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="turmas" className="relative gap-2">
            Turmas
            {hasTriedSubmit && tabErrors.turmas > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                {tabErrors.turmas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="questoes" className="relative gap-2">
            Questões
            {hasTriedSubmit && tabErrors.questoes > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                {tabErrors.questoes}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recompensas" className="relative gap-2">
            Recompensas
            {hasTriedSubmit && tabErrors.recompensas > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                {tabErrors.recompensas}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Informações Básicas */}
        <TabsContent value="informacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Defina o título, disciplina e período da competição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da Competição *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Desafio Matemático Semanal"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  onBlur={() => handleFieldBlur('titulo')}
                  className={shouldShowError('titulo') && errors.titulo ? 'border-red-500' : ''}
                />
                {shouldShowError('titulo') && errors.titulo && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.titulo}
                  </p>
                )}
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva a competição para os alunos..."
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Instruções Especiais */}
              <div className="space-y-2">
                <Label htmlFor="instrucoes">Instruções Especiais</Label>
                <Textarea
                  id="instrucoes"
                  placeholder="Instruções adicionais para os alunos (regras, dicas, etc.)..."
                  value={formData.instrucoes || ''}
                  onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Estas instruções serão exibidas antes do aluno iniciar a competição.
                </p>
              </div>

              {/* Ícone e Cor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícone da Competição</Label>
                  <IconPicker
                    value={formData.icone || '🏆'}
                    onChange={(icon) => setFormData({ ...formData, icone: icon })}
                    color={formData.cor || '#3B82F6'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Escolha um emoji para identificar visualmente a competição
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cor Personalizada</Label>
                  <ColorPicker
                    value={formData.cor || '#3B82F6'}
                    onChange={(color) => setFormData({ ...formData, cor: color })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cor do tema da competição (cards e badges)
                  </p>
                </div>
              </div>

              {/* Preview da Competição */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
                    style={{ backgroundColor: formData.cor || '#3B82F6' }}
                  >
                    {formData.icone || '🏆'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      {formData.titulo || 'Título da Competição'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {formData.descricao || 'Descrição da competição...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data/Hora de Início *
                  </Label>
                  <Input
                    id="dataInicio"
                    type="datetime-local"
                    value={formatDateForInput(formData.dataInicio)}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dataInicio: new Date(e.target.value) 
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataFim">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data/Hora de Término *
                  </Label>
                  <Input
                    id="dataFim"
                    type="datetime-local"
                    value={formatDateForInput(formData.dataFim)}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dataFim: new Date(e.target.value) 
                    })}
                    className={errors.dataFim ? 'border-red-500' : ''}
                  />
                  {errors.dataFim && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.dataFim}
                    </p>
                  )}
                </div>
              </div>

              {/* Duração e Máx. Participantes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duracao">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Duração (minutos) *
                  </Label>
                  <Input
                    id="duracao"
                    type="number"
                    min={5}
                    max={240}
                    value={formData.duracao}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      duracao: Number(e.target.value) 
                    })}
                    className={errors.duracao ? 'border-red-500' : ''}
                  />
                  {errors.duracao && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.duracao}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipantes">
                    <Users className="w-4 h-4 inline mr-1" />
                    Máx. Participantes
                  </Label>
                  <Input
                    id="maxParticipantes"
                    type="number"
                    min={1}
                    value={formData.maxParticipantes}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      maxParticipantes: Number(e.target.value) 
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seleção de Turmas */}
        <TabsContent value="turmas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Turmas Participantes
              </CardTitle>
              <CardDescription>
                Selecione as turmas que poderão participar da competição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setShowClassSelector(true)}
                variant="outline"
                className="w-full h-20 border-dashed"
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus className="w-6 h-6" />
                  <span>
                    {formData.turmas.length > 0
                      ? `${formData.turmas.length} turma(s) selecionada(s) - Clique para editar`
                      : 'Clique para selecionar turmas'}
                  </span>
                </div>
              </Button>

              {shouldShowError('turmas') && errors.turmas && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.turmas}
                </p>
              )}

              {formData.turmas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.turmas.map((turmaId, index) => (
                    <Badge key={turmaId} variant="secondary" className="px-3 py-1">
                      Turma {index + 1}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          turmas: prev.turmas.filter(id => id !== turmaId)
                        }))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seleção de Questões */}
        <TabsContent value="questoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Questões da Competição
              </CardTitle>
              <CardDescription>
                Selecione a disciplina e as questões da competição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Disciplina - Agora na aba de questões */}
              <div className="space-y-2">
                <Label htmlFor="disciplina">Disciplina *</Label>
                <Select
                  value={formData.disciplina_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, disciplina_id: value, questoes: [] });
                    setSelectedQuestions([]);
                    handleFieldBlur('disciplina_id');
                  }}
                >
                  <SelectTrigger className={shouldShowError('disciplina_id') && errors.disciplina_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shouldShowError('disciplina_id') && errors.disciplina_id && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.disciplina_id}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  A disciplina define quais questões estarão disponíveis para seleção
                </p>
              </div>

              {/* Aviso se disciplina não selecionada */}
              {!formData.disciplina_id && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Selecione uma disciplina para continuar com a seleção de questões
                  </p>
                </div>
              )}

              {/* Modo de Seleção - Só aparece se disciplina foi selecionada */}
              {formData.disciplina_id && (
              <>
              <div className="space-y-2">
                <Label>Modo de Seleção</Label>
                <Select
                  value={formData.modo_selecao}
                  onValueChange={(value: QuestionSelectionMode) => setFormData({ 
                    ...formData, 
                    modo_selecao: value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Seleção Manual
                      </div>
                    </SelectItem>
                    <SelectItem value="automatico">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Seleção Automática
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.modo_selecao === 'manual' ? (
                /* Seleção Manual */
                <div className="space-y-4">
                  <Button
                    onClick={() => setShowQuestionBank(true)}
                    variant="outline"
                    className="w-full"
                    disabled={!formData.disciplina_id}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar questões do banco
                  </Button>

                  {!formData.disciplina_id && (
                    <p className="text-xs text-muted-foreground text-center">
                      Selecione uma disciplina primeiro
                    </p>
                  )}

                  {shouldShowError('questoes') && errors.questoes && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.questoes}
                    </p>
                  )}

                  {/* Lista de questões selecionadas */}
                  {selectedQuestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Questões Selecionadas ({selectedQuestions.length})</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenQuestionsPreview}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar Todas
                        </Button>
                      </div>
                      <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                        {selectedQuestions.map((question, index) => (
                          <div key={question.id} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="shrink-0">
                                {index + 1}
                              </Badge>
                              <span className="text-sm truncate max-w-md">
                                {question.titulo || question.text || `Questão ${question.id}`}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveQuestion(question.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Seleção Automática */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade de Questões</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        placeholder="Ex: 20"
                        value={formData.quantidade_questoes || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          quantidade_questoes: Number(e.target.value)
                        })}
                        className={shouldShowError('quantidade_questoes') && errors.quantidade_questoes ? 'border-red-500' : ''}
                        onBlur={() => handleFieldBlur('quantidade_questoes')}
                      />
                      {shouldShowError('quantidade_questoes') && errors.quantidade_questoes && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.quantidade_questoes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Níveis de Dificuldade</Label>
                      <div className="flex flex-wrap gap-2">
                        {DIFFICULTY_OPTIONS.map((option) => {
                          const isSelected = formData.dificuldades?.includes(option.value as CompetitionDifficulty) ?? false;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                const current = formData.dificuldades || [];
                                const newDificuldades = isSelected
                                  ? current.filter(d => d !== option.value)
                                  : [...current, option.value as CompetitionDifficulty];
                                // Garantir que pelo menos uma dificuldade está selecionada
                                if (newDificuldades.length > 0) {
                                  setFormData({ ...formData, dificuldades: newDificuldades });
                                }
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                                  : 'border-muted hover:border-blue-300'
                              }`}
                            >
                              <div className={`w-3 h-3 rounded-full ${option.color}`} />
                              <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                                {option.label}
                              </span>
                              {isSelected && <CheckCircle className="w-4 h-4 text-blue-500" />}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selecione um ou mais níveis de dificuldade
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateQuestions}
                    disabled={!formData.disciplina_id || isLoading}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isLoading ? 'Gerando...' : 'Gerar Questões Automaticamente'}
                  </Button>

                  {formData.questoes.length > 0 && (
                    <div className="space-y-3">
                      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {formData.questoes.length} questões selecionadas automaticamente
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleOpenQuestionsPreview}
                              className="text-green-700 border-green-300 hover:bg-green-100"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Todas
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, questoes: [] }));
                                setSelectedQuestions([]);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Limpar
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Lista de questões geradas */}
                      {selectedQuestions.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                          {selectedQuestions.slice(0, 10).map((question, index) => (
                            <div key={question.id} className="p-2 flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="shrink-0 w-6 h-6 flex items-center justify-center p-0">
                                {index + 1}
                              </Badge>
                              <span className="truncate flex-1 text-muted-foreground">
                                {question.titulo || `Questão ${question.id}`}
                              </span>
                              {question.difficulty && (
                                <Badge variant="secondary" className="shrink-0 text-xs">
                                  {question.difficulty}
                                </Badge>
                              )}
                            </div>
                          ))}
                          {selectedQuestions.length > 10 && (
                            <div className="p-2 text-center text-xs text-muted-foreground bg-muted/50">
                              + {selectedQuestions.length - 10} outras questões
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Recompensas */}
        <TabsContent value="recompensas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                Recompensas (InnovCoins)
              </CardTitle>
              <CardDescription>
                Configure as moedas que os alunos receberão ao completar a competição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shouldShowError('recompensas') && errors.recompensas && (
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.recompensas}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {/* 1º Lugar */}
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl md:text-4xl">🥇</span>
                  </div>
                  <Label className="text-yellow-600 dark:text-yellow-400 font-semibold text-sm">
                    1º Lugar *
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.recompensas.ouro}
                    onChange={(e) => setFormData({
                      ...formData,
                      recompensas: { ...formData.recompensas, ouro: Number(e.target.value) }
                    })}
                    onBlur={() => handleFieldBlur('recompensas_ouro')}
                    className={`text-center text-lg font-bold ${shouldShowError('recompensas_ouro') && errors.recompensas_ouro ? 'border-red-500' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">InnovCoins</p>
                </div>

                {/* 2º Lugar */}
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl md:text-4xl">🥈</span>
                  </div>
                  <Label className="text-gray-600 dark:text-gray-400 font-semibold text-sm">
                    2º Lugar
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.recompensas.prata}
                    onChange={(e) => setFormData({
                      ...formData,
                      recompensas: { ...formData.recompensas, prata: Number(e.target.value) }
                    })}
                    className="text-center text-lg font-bold"
                  />
                  <p className="text-xs text-muted-foreground">InnovCoins</p>
                </div>

                {/* 3º Lugar */}
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl md:text-4xl">🥉</span>
                  </div>
                  <Label className="text-orange-600 dark:text-orange-400 font-semibold text-sm">
                    3º Lugar
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.recompensas.bronze}
                    onChange={(e) => setFormData({
                      ...formData,
                      recompensas: { ...formData.recompensas, bronze: Number(e.target.value) }
                    })}
                    className="text-center text-lg font-bold"
                  />
                  <p className="text-xs text-muted-foreground">InnovCoins</p>
                </div>

                {/* Participação */}
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl md:text-4xl">🎖️</span>
                  </div>
                  <Label className="text-green-600 dark:text-green-400 font-semibold text-sm">
                    Participação *
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.recompensas.participacao}
                    onChange={(e) => setFormData({
                      ...formData,
                      recompensas: { ...formData.recompensas, participacao: Number(e.target.value) }
                    })}
                    onBlur={() => handleFieldBlur('recompensas_participacao')}
                    className={`text-center text-lg font-bold ${shouldShowError('recompensas_participacao') && errors.recompensas_participacao ? 'border-red-500' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">Por aluno</p>
                </div>
              </div>

              {/* Nota sobre participação */}
              <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Todos os alunos que completarem a competição recebem a recompensa por participação.
                </p>
              </div>

              {/* Resumo */}
              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-2">
                <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-3">
                  Resumo das Recompensas
                </h4>
                <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <p>
                    <strong>Top 3:</strong>{' '}
                    {formData.recompensas.ouro + formData.recompensas.prata + formData.recompensas.bronze} InnovCoins
                  </p>
                  <p>
                    <strong>Por participante:</strong>{' '}
                    {formData.recompensas.participacao} InnovCoins
                  </p>
                  {formData.maxParticipantes > 0 && (
                    <p className="pt-2 border-t border-yellow-300 dark:border-yellow-700">
                      <strong>Total máximo estimado:</strong>{' '}
                      {formData.recompensas.ouro + formData.recompensas.prata + formData.recompensas.bronze + (formData.recompensas.participacao * formData.maxParticipantes)} InnovCoins{' '}
                      <span className="text-xs opacity-75">
                        (top 3 + {formData.maxParticipantes} participantes)
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          className="relative"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {editingCompetition ? 'Salvar Alterações' : 'Criar Competição'}
              {totalErrors > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md">
                  {totalErrors}
                </span>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Modal de Banco de Questões */}
      {showQuestionBank && (
        <QuestionBank
          open={showQuestionBank}
          onClose={() => setShowQuestionBank(false)}
          subjectId={formData.disciplina_id}
          onQuestionSelected={handleQuestionSelected}
        />
      )}

      {/* Modal de Seleção de Turmas */}
      {showClassSelector && (
        <ClassSelector
          open={showClassSelector}
          onClose={() => setShowClassSelector(false)}
          selectedClasses={formData.turmas}
          onClassesSelected={handleClassesSelected}
        />
      )}

      {/* Modal de Visualização de Questões */}
      <Dialog open={showQuestionsPreview} onOpenChange={setShowQuestionsPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Questões Selecionadas ({formData.questoes.length})
            </DialogTitle>
            <DialogDescription>
              Visualize e revise as questões que serão utilizadas na competição
            </DialogDescription>
          </DialogHeader>

          {/* Barra de busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar questão por título ou texto..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de questões */}
          <ScrollArea className="flex-1 pr-4">
            {loadingQuestions ? (
              <div className="space-y-4 py-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredQuestionsDetails.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {questionSearch ? 'Nenhuma questão encontrada' : 'Nenhuma questão selecionada'}
                </h3>
                <p className="text-muted-foreground">
                  {questionSearch ? 'Tente ajustar sua busca' : 'Selecione questões para visualizá-las aqui'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {filteredQuestionsDetails.map((question, index) => {
                  const isExpanded = expandedQuestion === question.id;
                  const questionNumber = formData.questoes.indexOf(question.id) + 1;
                  
                  return (
                    <Card 
                      key={question.id} 
                      className={`transition-all ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <CardHeader 
                        className="cursor-pointer py-3"
                        onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Badge className="shrink-0 mt-0.5">
                              {questionNumber}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-2">
                                {question.title || question.text?.substring(0, 100) || `Questão ${question.id}`}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {question.difficulty_level || question.difficulty ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {question.difficulty_level || question.difficulty}
                                  </Badge>
                                ) : null}
                                {question.subject?.name && (
                                  <Badge variant="outline" className="text-xs">
                                    {question.subject.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      
                      {isExpanded && (
                        <CardContent className="pt-0 pb-4">
                          <div className="space-y-4">
                            {/* Imagem da questão (se houver URL separada) */}
                            {question.image_url && (
                              <div className="flex justify-center">
                                <img 
                                  src={question.image_url} 
                                  alt="Imagem da questão" 
                                  className="max-w-full max-h-64 object-contain rounded-lg border"
                                />
                              </div>
                            )}

                            {/* Texto da questão (pode conter HTML com imagens) */}
                            <div className="bg-muted/50 p-4 rounded-lg overflow-x-auto">
                              <div 
                                className="prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2"
                                dangerouslySetInnerHTML={{ 
                                  __html: question.formatted_text || question.formattedText || question.text || 'Texto não disponível' 
                                }}
                              />
                            </div>

                            {/* Alternativas */}
                            {question.alternatives && question.alternatives.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Alternativas:</p>
                                <div className="space-y-2">
                                  {question.alternatives.map((alt, altIndex) => (
                                    <div 
                                      key={alt.id || altIndex}
                                      className={`flex items-start gap-2 p-2 rounded-lg border ${
                                        alt.is_correct 
                                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                                          : 'bg-background'
                                      }`}
                                    >
                                      <Badge 
                                        variant={alt.is_correct ? "default" : "outline"}
                                        className={`shrink-0 ${alt.is_correct ? 'bg-green-500' : ''}`}
                                      >
                                        {alt.letter || String.fromCharCode(65 + altIndex)}
                                      </Badge>
                                      <span className="text-sm flex-1">{alt.text}</span>
                                      {alt.is_correct && (
                                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Habilidade/Skill */}
                            {question.skill && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Habilidade: </span>
                                {Array.isArray(question.skill) ? question.skill.join(', ') : question.skill}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {filteredQuestionsDetails.length} de {questionsDetails.length} questões
            </div>
            <Button onClick={() => setShowQuestionsPreview(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompetitionAdminPanel;

