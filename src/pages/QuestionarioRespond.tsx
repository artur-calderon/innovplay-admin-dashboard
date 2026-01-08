import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  ArrowRight,
  Save, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Clock,
  FileText
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { Question, SubQuestion } from '@/types/forms';

interface QuestionarioData {
  formId: string;
  title: string;
  description: string;
  instructions?: string;
  deadline: string;
  questions: Question[];
  currentResponse?: {
    id: string;
    status: string;
    startedAt: string;
    responses: Record<string, any>;
    progress?: number;
  };
  progress?: number; // Progresso calculado pelo backend
}

const QuestionarioRespond = () => {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [questionario, setQuestionario] = useState<QuestionarioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const responsesInitializedRef = useRef<boolean>(false);

  // Função para obter questões visíveis (considerando dependências)
  const getVisibleQuestions = useCallback((): Question[] => {
    if (!questionario) return [];
    
    return questionario.questions.filter(question => {
      // Se não tem dependência, sempre visível
      if (!question.dependsOn) return true;
      
      // Verificar se a condição de dependência é atendida
      const dependsOnId = Array.isArray(question.dependsOn.id) 
        ? question.dependsOn.id[0] 
        : question.dependsOn.id;
      const dependsOnValue = Array.isArray(question.dependsOn.value) 
        ? question.dependsOn.value[0] 
        : question.dependsOn.value;
      const dependsOnResponse = responses[dependsOnId];
      
      return dependsOnResponse === dependsOnValue;
    });
  }, [questionario, responses]);

  // Função para verificar se uma questão foi respondida
  const isQuestionAnswered = useCallback((question: Question): boolean => {
    const questionId = question.id;
    const response = responses[questionId];
    const questionType = question.type || question.tipo;
    const subQuestions = question.subQuestions || question.subPerguntas || [];
    const hasSubQuestions = subQuestions.length > 0;
    
    if (response === undefined || response === null || response === '') {
      return false;
    }
    
    // Para questões de matriz/múltipla escolha
    if (typeof response === 'object' && !Array.isArray(response)) {
      // ✅ Se a questão tem subperguntas, verificar se todas foram respondidas
      // (qualquer valor é válido, incluindo todas "Não")
      if (hasSubQuestions) {
        // Verificar se todas as subperguntas têm resposta
        return subQuestions.every(subQ => {
          const subResponse = response[subQ.id];
          return subResponse !== undefined && subResponse !== null && subResponse !== '';
        });
      }
      
      // Se não tem subperguntas, usar lógica original
      if (questionType === 'multipla_escolha') {
        // Para múltipla escolha, verificar se pelo menos uma opção é "Sim"
        const hasAtLeastOneYes = Object.values(response).some(value => value === 'Sim');
        return hasAtLeastOneYes;
      } else {
        // Para outras matrizes, verificar se tem pelo menos uma resposta
        return Object.keys(response).length > 0;
      }
    }
    
    return true;
  }, [responses]);

  // ✅ Função para verificar se todas as subperguntas foram respondidas
  const areAllSubQuestionsAnswered = useCallback((question: Question): boolean => {
    const subQuestions = question.subQuestions || question.subPerguntas || [];
    
    // Se não tem subperguntas, considerar como completo
    if (subQuestions.length === 0) {
      return true;
    }
    
    const questionId = question.id;
    const response = responses[questionId];
    const questionType = question.type || question.tipo;
    
    // Se não há resposta ou não é um objeto, não está completo
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return false;
    }
    
    // Verificar cada subpergunta individualmente
    for (const subQ of subQuestions) {
      const subResponse = response[subQ.id];
      
      // Se a subpergunta não tem resposta, não está completo
      if (subResponse === undefined || subResponse === null) {
        return false;
      }
      
      // Validações específicas por tipo de questão
      if (questionType === 'matriz_selecao' || questionType === 'matriz_selecao_complexa') {
        // Para matriz de seleção, resposta não pode ser string vazia
        if (subResponse === '') {
          return false;
        }
      }
      
      // Para matriz_slider, verificar se é um número válido
      if (questionType === 'matriz_slider') {
        if (typeof subResponse !== 'number' || isNaN(subResponse)) {
          return false;
        }
      }
      
      // Para multipla_escolha, qualquer valor (incluindo "Não") é válido
      // desde que não seja undefined/null
    }
    
    // Todas as subperguntas foram respondidas
    return true;
  }, [responses]);

  // ✅ Função para reconstruir o formato aninhado a partir das respostas achatadas do backend
  // Definida antes dos useEffect para estar disponível quando necessário
  const unflattenMatrixResponses = (flattenedResponses: Record<string, any>, questionarioData?: QuestionarioData | null): Record<string, any> => {
    const questionsData = questionarioData || questionario;
    if (!questionsData) return flattenedResponses;
    
    const unflattened: Record<string, any> = {};
    const usedKeys = new Set<string>();
    
    // Primeiro, processar todas as questões com subperguntas
    questionsData.questions.forEach(question => {
      const subQuestions = question?.subQuestions || question?.subPerguntas || [];
      const hasSubQuestions = subQuestions.length > 0;
      
      if (hasSubQuestions) {
        // Reconstruir o objeto aninhado para esta questão
        const nestedResponse: Record<string, any> = {};
        
        subQuestions.forEach((subQ: SubQuestion) => {
          // ✅ Incluir todas as subperguntas que têm resposta, mesmo que seja vazia
          if (flattenedResponses[subQ.id] !== undefined) {
            nestedResponse[subQ.id] = flattenedResponses[subQ.id];
            usedKeys.add(subQ.id);
          }
        });
        
        // ✅ Sempre adicionar a questão principal se houver subperguntas definidas
        // Isso garante que questões parciais também sejam exibidas
        if (hasSubQuestions) {
          unflattened[question.id] = nestedResponse;
        }
      }
    });
    
    // Depois, adicionar todas as respostas que não foram usadas (questões simples)
    Object.entries(flattenedResponses).forEach(([key, value]) => {
      if (!usedKeys.has(key)) {
        unflattened[key] = value;
      }
    });
    
    return unflattened;
  };

  useEffect(() => {
    if (formId) {
      // Resetar flag de inicialização quando mudar de formulário
      responsesInitializedRef.current = false;
      fetchQuestionario();
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formId]);

  useEffect(() => {
    // ✅ Recarregar respostas quando o status mudar para "completed" ou quando o questionário for recarregado
    // Isso garante que as respostas finais sejam exibidas corretamente
    if (questionario?.currentResponse?.responses) {
      const shouldReload = 
        !responsesInitializedRef.current || // Primeira vez carregando
        questionario.currentResponse.status === 'completed'; // Formulário foi finalizado
      
      if (shouldReload) {
        // ✅ Reconstruir formato aninhado a partir das respostas achatadas do backend
        const unflattenedResponses = unflattenMatrixResponses(questionario.currentResponse.responses);
        setResponses(unflattenedResponses);
        responsesInitializedRef.current = true;
        
        // Carregar valores de sliders se existirem
        Object.entries(unflattenedResponses).forEach(([key, value]) => {
          if (typeof value === 'number') {
            setSliderValues(prev => ({ ...prev, [key]: value }));
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            // Para matriz slider, os valores podem estar dentro do objeto
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (typeof subValue === 'number') {
                setSliderValues(prev => ({ ...prev, [`${key}_${subKey}`]: subValue }));
              }
            });
          }
        });
      }
    }
  }, [questionario]);

  // Resetar índice quando as questões visíveis mudarem
  useEffect(() => {
    if (!questionario) return;
    const visibleQuestions = getVisibleQuestions();
    if (currentQuestionIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    }
  }, [questionario, responses, currentQuestionIndex, getVisibleQuestions]);

  const fetchQuestionario = async () => {
    if (!formId) return;
    
    setIsLoading(true);
    try {
      const response = await api.get(`/forms/${formId}/respond`);
      setQuestionario(response.data);
      
      // Resetar índice para primeira questão
      setCurrentQuestionIndex(0);
      
      // Inicializar respostas existentes
      if (response.data.currentResponse?.responses) {
        // ✅ Reconstruir formato aninhado a partir das respostas achatadas do backend
        // Passar response.data como parâmetro pois questionario ainda não foi setado
        const unflattenedResponses = unflattenMatrixResponses(response.data.currentResponse.responses, response.data);
        setResponses(unflattenedResponses);
        responsesInitializedRef.current = true;
      }
      
      // Marcar início se ainda não foi iniciado
      if (!response.data.currentResponse) {
        startTimeRef.current = new Date();
      }
    } catch (error: any) {
      console.error('Erro ao carregar questionário:', error);
      toast({
        title: "Erro ao carregar questionário",
        description: error.response?.data?.message || "Não foi possível carregar o questionário.",
        variant: "destructive",
      });
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Função auxiliar para limpar respostas de múltipla escolha que tenham todas as subperguntas como "Não"
  // ✅ CORREÇÃO: Questões obrigatórias NUNCA são removidas, mesmo se todas as respostas forem "Não"
  const cleanMultipleChoiceResponses = (responsesToClean: Record<string, any>): Record<string, any> => {
    const cleaned = { ...responsesToClean };
    
    if (!questionario) return cleaned;
    
    // Criar mapa de questões para acesso rápido
    const questionsMap = new Map(questionario.questions.map(q => [q.id, q]));
    
    Object.keys(cleaned).forEach(questionId => {
      const question = questionsMap.get(questionId);
      if (!question) return;
      
      const questionType = question.type || question.tipo;
      const isRequired = question.required !== undefined 
        ? question.required 
        : (question.obrigatoria !== undefined ? question.obrigatoria : false);
      const response = cleaned[questionId];
      
      // ✅ Questões obrigatórias NUNCA são removidas
      if (isRequired) {
        return; // Continuar para próxima questão
      }
      
      // Questões não obrigatórias: remover se todas forem "Não"
      if (questionType === 'multipla_escolha' && 
          typeof response === 'object' && 
          !Array.isArray(response) &&
          Object.keys(response).length > 0) {
        const allNo = Object.values(response).every(value => value === 'Não');
        if (allNo) {
          console.log(`🗑️ Removendo resposta de múltipla escolha ${questionId} - todas as subperguntas são "Não" (não obrigatória)`);
          delete cleaned[questionId];
        }
      }
    });
    
    return cleaned;
  };

  // ✅ Função para achatar respostas de matriz (subperguntas) para o formato esperado pelo backend
  // ✅ Garante que questões obrigatórias sempre são processadas corretamente
  const flattenMatrixResponses = (responsesToFlatten: Record<string, any>): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    if (!questionario) return flattened;
    
    // Criar mapa de questões para acesso rápido
    const questionsMap = new Map(questionario.questions.map(q => [q.id, q]));
    
    Object.entries(responsesToFlatten).forEach(([questionId, response]) => {
      const question = questionsMap.get(questionId);
      
      if (!question) {
        // Se não encontrou a questão, manter como está (questão simples)
        flattened[questionId] = response;
        return;
      }
      
      // Verificar tanto subQuestions quanto subPerguntas (para compatibilidade)
      const subQuestions = question.subQuestions || question.subPerguntas || [];
      const hasSubQuestions = subQuestions.length > 0;
      
      // Se é uma questão com subperguntas (matriz), achatar as subperguntas para o nível raiz
      if (hasSubQuestions && typeof response === 'object' && !Array.isArray(response)) {
        // Para questões de matriz, colocar cada subpergunta no nível raiz
        // ✅ Garante que todas as subperguntas são enviadas, mesmo se todas forem "Não"
        Object.entries(response).forEach(([subQuestionId, subResponse]) => {
          flattened[subQuestionId] = subResponse;
        });
      } else {
        // Para questões simples, manter como está
        flattened[questionId] = response;
      }
    });
    
    return flattened;
  };

  const saveResponse = useCallback(async (isComplete: boolean = false) => {
    if (!formId || !questionario) return;

    // ✅ Limpar respostas de múltipla escolha antes de salvar
    const cleanedResponses = cleanMultipleChoiceResponses(responses);
    
    // ✅ Achatar respostas de matriz para o formato esperado pelo backend
    const flattenedResponses = flattenMatrixResponses(cleanedResponses);

    setIsSaving(true);
    try {
      const response = await api.post(`/forms/${formId}/responses`, {
        responses: flattenedResponses,
        isComplete
      });
      
      // Atualizar progresso se retornado pela API
      if (response.data?.progress !== undefined && questionario) {
        setQuestionario(prev => prev ? {
          ...prev,
          currentResponse: prev.currentResponse ? {
            ...prev.currentResponse,
            progress: response.data.progress
          } : undefined,
          progress: response.data.progress
        } : null);
      }
      
      if (isComplete) {
        toast({
          title: "Resposta salva!",
          description: "Sua resposta foi salva com sucesso.",
        });
      }
    } catch (error: any) {
      console.error('Erro ao salvar resposta:', error);
      toast({
        title: "Erro ao salvar",
        description: error.response?.data?.message || "Não foi possível salvar sua resposta.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [formId, questionario, responses, toast]);

  // Auto-save com debounce
  useEffect(() => {
    if (Object.keys(responses).length === 0) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveResponse(false);
    }, 2000); // Salvar após 2 segundos de inatividade

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [responses, saveResponse]);

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Limpar erro de validação se existir
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  // Função para navegar para a questão anterior
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex === 0) {
      // Se estiver na primeira questão, voltar para a lista
      const basePath = user?.role === 'aluno' ? '/aluno/questionario' : '/app/questionario';
      navigate(basePath);
      return;
    }
    setCurrentQuestionIndex(prev => prev - 1);
    // Limpar erro de validação ao voltar
    setValidationErrors({});
  };

  // Função para navegar para a próxima questão
  const goToNextQuestion = async () => {
    const visibleQuestions = getVisibleQuestions();
    if (currentQuestionIndex >= visibleQuestions.length - 1) return;
    
    const currentQuestion = visibleQuestions[currentQuestionIndex];
    const isRequired = currentQuestion.required !== undefined 
      ? currentQuestion.required 
      : (currentQuestion.obrigatoria !== undefined ? currentQuestion.obrigatoria : false);
    
    // ✅ Verificar se a questão tem subperguntas e se todas foram respondidas
    const subQuestions = currentQuestion.subQuestions || currentQuestion.subPerguntas || [];
    const hasSubQuestions = subQuestions.length > 0;
    
    if (hasSubQuestions && !areAllSubQuestionsAnswered(currentQuestion)) {
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: 'Todas as subperguntas devem ser respondidas'
      }));
      toast({
        title: "Subperguntas não respondidas",
        description: "Por favor, responda todas as subperguntas antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    
    // ✅ Validar se a questão foi respondida (se for obrigatória)
    // Para questões com subperguntas, se todas foram respondidas, considerar como respondida
    // (mesmo que todas sejam "Não")
    if (isRequired) {
      const isAnswered = hasSubQuestions 
        ? areAllSubQuestionsAnswered(currentQuestion) // Se tem subperguntas, verificar se todas foram respondidas
        : isQuestionAnswered(currentQuestion); // Se não tem, usar validação normal
      
      if (!isAnswered) {
        setValidationErrors(prev => ({
          ...prev,
          [currentQuestion.id]: hasSubQuestions 
            ? 'Todas as subperguntas devem ser respondidas'
            : 'Esta questão é obrigatória'
        }));
        toast({
          title: hasSubQuestions 
            ? "Subperguntas não respondidas"
            : "Questão obrigatória não respondida",
          description: hasSubQuestions
            ? "Por favor, responda todas as subperguntas antes de continuar."
            : "Por favor, responda esta questão antes de continuar.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Salvar antes de avançar
    await saveResponse(false);
    
    // Avançar para próxima questão
    setCurrentQuestionIndex(prev => prev + 1);
    // Limpar erro de validação ao avançar
    setValidationErrors({});
  };

  const handleSliderChange = (questionId: string, value: number) => {
    setSliderValues(prev => ({
      ...prev,
      [questionId]: value
    }));
    handleResponseChange(questionId, value);
  };

  const handleMatrixResponse = (questionId: string, subQuestionId: string, value: string | number) => {
    const currentValue = responses[questionId];
    let newValue: any;
    
    if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
      newValue = {
        ...currentValue,
        [subQuestionId]: value
      };
    } else {
      newValue = {
        [subQuestionId]: value
      };
    }
    
    handleResponseChange(questionId, newValue);
  };

  const validateResponses = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!questionario) return false;

    questionario.questions.forEach(question => {
      const isRequired = question.required !== undefined ? question.required : (question.obrigatoria !== undefined ? question.obrigatoria : false);
      
      if (isRequired) {
        const questionId = question.id;
        const response = responses[questionId];
        const subQuestions = question.subQuestions || question.subPerguntas || [];
        const hasSubQuestions = subQuestions.length > 0;
        
        // Verificar dependências
        if (question.dependsOn) {
          const dependsOnId = Array.isArray(question.dependsOn.id) ? question.dependsOn.id[0] : question.dependsOn.id;
          const dependsOnValue = Array.isArray(question.dependsOn.value) ? question.dependsOn.value[0] : question.dependsOn.value;
          const dependsOnResponse = responses[dependsOnId];
          
          // Se a condição não for atendida, não validar esta questão
          if (dependsOnResponse !== dependsOnValue) {
            return;
          }
        }
        
        // ✅ CORREÇÃO: Usar a mesma lógica da navegação
        // Se a questão tem subperguntas, verificar se todas foram respondidas
        // (qualquer valor é válido, incluindo todas "Não")
        let isEmpty = false;
        
        if (hasSubQuestions) {
          // Para questões com subperguntas, verificar se todas foram respondidas
          isEmpty = !areAllSubQuestionsAnswered(question);
        } else {
          // Para questões sem subperguntas, usar validação normal
          const questionType = question.type || question.tipo;
          
          if (response === undefined || response === null || response === '') {
            isEmpty = true;
          } else if (typeof response === 'object' && !Array.isArray(response)) {
            // Para questões de múltipla escolha sem subperguntas, verificar se pelo menos uma opção foi marcada como "Sim"
            if (questionType === 'multipla_escolha') {
              const hasAtLeastOneYes = Object.values(response).some(value => value === 'Sim');
              isEmpty = !hasAtLeastOneYes;
            } else {
              // Para outras matrizes, verificar se pelo menos uma resposta foi dada
              isEmpty = Object.keys(response).length === 0;
            }
          }
        }
        
        if (isEmpty) {
          errors[questionId] = hasSubQuestions 
            ? 'Todas as subperguntas devem ser respondidas'
            : 'Esta questão é obrigatória';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFinalize = async () => {
    if (!validateResponses()) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: "Por favor, preencha todas as questões obrigatórias antes de finalizar.",
        variant: "destructive",
      });
      
      // Scroll para o primeiro erro
      const firstErrorId = Object.keys(validationErrors)[0];
      if (firstErrorId) {
        const element = document.getElementById(`question-${firstErrorId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    // ✅ Limpar respostas de múltipla escolha que tenham todas as subperguntas como "Não"
    // Isso evita enviar objetos vazios para o backend
    const cleanedResponses = cleanMultipleChoiceResponses(responses);
    
    // ✅ Achatar respostas de matriz para o formato esperado pelo backend
    const flattenedResponses = flattenMatrixResponses(cleanedResponses);

    // Log das respostas antes de enviar
    console.log('📤 Enviando respostas para finalizar:', {
      totalQuestions: questionario?.questions.length,
      responsesCount: Object.keys(flattenedResponses).length,
      originalResponsesCount: Object.keys(responses).length,
      cleanedResponsesCount: Object.keys(cleanedResponses).length,
      responses: flattenedResponses,
      progressBefore: calculateProgress()
    });

    setIsSubmitting(true);
    try {
      // Salvar resposta final
      const response = await api.post(`/forms/${formId}/responses/finalize`, {
        responses: flattenedResponses
      });

      // Verificar se o progresso foi retornado e está em 100%
      console.log('📥 Resposta da API após finalizar:', {
        data: response.data,
        progress: response.data?.progress,
        status: response.data?.status
      });

      if (response.data?.progress !== undefined) {
        console.log('✅ Progresso retornado pela API após finalizar:', response.data.progress);
        if (response.data.progress < 100) {
          console.warn('⚠️ ATENÇÃO: Progresso não está em 100% após finalizar:', response.data.progress);
          console.warn('Isso pode indicar que o backend não está contando todas as questões corretamente.');
        }
      } else {
        console.warn('⚠️ API não retornou progresso após finalizar');
      }

      toast({
        title: "Questionário finalizado!",
        description: "Sua resposta foi enviada com sucesso.",
      });

      // Redirecionar de volta para a lista com flag de refresh
      const basePath = user?.role === 'aluno' ? '/aluno/questionario' : '/app/questionario';
      navigate(basePath, { state: { refresh: true } });
    } catch (error: any) {
      console.error('Erro ao finalizar questionário:', error);
      toast({
        title: "Erro ao finalizar",
        description: error.response?.data?.message || "Não foi possível finalizar o questionário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProgress = (): number => {
    if (!questionario || questionario.questions.length === 0) return 0;
    
    // Priorizar progresso do backend se disponível
    if (questionario.progress !== undefined) {
      return questionario.progress;
    }
    
    if (questionario.currentResponse?.progress !== undefined) {
      return questionario.currentResponse.progress;
    }
    
    // Calcular progresso baseado em TODAS as questões (não apenas visíveis)
    // para ficar consistente com o cálculo do backend
    const totalQuestions = questionario.questions.length;
    
    const answeredQuestions = questionario.questions.filter(question => {
      const response = responses[question.id];
      
      if (response === undefined || response === null || response === '') {
        return false;
      }
      
      // Para objetos (matrizes), verificar se tem pelo menos uma resposta
      if (typeof response === 'object' && !Array.isArray(response)) {
        const hasAnswers = Object.keys(response).length > 0;
        return hasAnswers;
      }
      
      return true;
    }).length;

    const calculatedProgress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    
    return calculatedProgress;
  };

  const renderQuestion = (question: Question) => {
    const questionId = question.id;
    const questionText = question.text || question.texto || '';
    const questionType = question.type || question.tipo || 'selecao_unica';
    const isRequired = question.required !== undefined ? question.required : (question.obrigatoria !== undefined ? question.obrigatoria : false);
    const options = question.options || question.opcoes || [];
    const subQuestions = question.subQuestions || question.subPerguntas || [];
    const hasError = !!validationErrors[questionId];

    const currentResponse = responses[questionId];
    const sliderValue = sliderValues[questionId] ?? (question.min !== undefined ? question.min : 0);

    return (
      <div 
        key={questionId} 
        id={`question-${questionId}`}
        className={`w-full max-w-3xl mx-auto ${hasError ? 'border-red-500' : ''}`}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {questionText}
          </h2>
          {isRequired && (
            <Badge variant="destructive" className="text-xs">
              Obrigatória
            </Badge>
          )}
          {hasError && (
            <p className="text-sm text-red-600 mt-2">{validationErrors[questionId]}</p>
          )}
        </div>

        <div>
            {/* Seleção Única */}
            {(questionType === 'selecao_unica') && (
              <div className="space-y-3 mt-6">
                {options.map((option: string, optIndex: number) => (
                  <label 
                    key={optIndex} 
                    className={`flex items-center gap-4 cursor-pointer p-4 rounded-lg border-2 transition-all ${
                      currentResponse === option 
                        ? 'bg-blue-50 border-blue-500 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:bg-opacity-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={questionId}
                      value={option}
                      checked={currentResponse === option}
                      onChange={(e) => handleResponseChange(questionId, e.target.value)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className={`text-base ${currentResponse === option ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Múltipla Escolha - Tabela */}
            {(questionType === 'multipla_escolha') && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Item</th>
                      {options.map((option: string, optIndex: number) => (
                        <th key={optIndex} className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                          {option}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subQuestions.map((subQ: SubQuestion, subIndex: number) => {
                      // ✅ CORREÇÃO: Não definir valor padrão - deixar undefined se não houver resposta salva
                      const subResponse = currentResponse?.[subQ.id];
                      return (
                        <tr 
                          key={subQ.id} 
                          className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                            subIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-6 py-4 text-base text-gray-900 font-medium">
                            {subQ.text || subQ.texto}
                          </td>
                          {options.map((option: string, optIndex: number) => {
                            // ✅ CORREÇÃO: Só marcar se houver resposta salva e ela corresponder à opção
                            const isSelected = subResponse !== undefined && subResponse === option;
                            return (
                              <td key={optIndex} className="px-6 py-4 text-center">
                                <label className="flex items-center justify-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`${questionId}_${subQ.id}`}
                                    value={option}
                                    checked={isSelected}
                                    onChange={(e) => handleMatrixResponse(questionId, subQ.id, e.target.value)}
                                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Matriz de Seleção - Tabela */}
            {(questionType === 'matriz_selecao') && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Item</th>
                      {options.map((option: string, optIndex: number) => (
                        <th key={optIndex} className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                          {option}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subQuestions.map((subQ: SubQuestion, subIndex: number) => {
                      // ✅ CORREÇÃO: Não definir valor padrão - deixar undefined se não houver resposta salva
                      const subResponse = (currentResponse && typeof currentResponse === 'object' && !Array.isArray(currentResponse))
                        ? currentResponse[subQ.id]
                        : undefined;
                      return (
                        <tr 
                          key={subQ.id} 
                          className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                            subIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-6 py-4 text-base text-gray-900 font-medium">
                            {subQ.text || subQ.texto}
                          </td>
                          {options.map((option: string, optIndex: number) => {
                            // ✅ CORREÇÃO: Só marcar se houver resposta salva e ela corresponder à opção
                            const isSelected = subResponse !== undefined && subResponse === option;
                            return (
                              <td key={optIndex} className="px-6 py-4 text-center">
                                <label className="flex items-center justify-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`${questionId}_${subQ.id}`}
                                    value={option}
                                    checked={isSelected}
                                    onChange={(e) => handleMatrixResponse(questionId, subQ.id, e.target.value)}
                                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Matriz de Seleção Complexa */}
            {(questionType === 'matriz_selecao_complexa') && (
              <div className="space-y-6 mt-6">
                {subQuestions.map((subQ: SubQuestion) => {
                  const subResponse = (currentResponse && typeof currentResponse === 'object' && !Array.isArray(currentResponse))
                    ? (currentResponse[subQ.id] || '')
                    : '';
                  return (
                    <div key={subQ.id}>
                      <p className="text-base font-medium text-gray-900 mb-3">
                        {subQ.text || subQ.texto}
                      </p>
                      <div className="space-y-3">
                        {options.map((option: string, optIndex: number) => {
                          const isSelected = subResponse === option;
                          return (
                            <label 
                              key={optIndex}
                              className={`flex items-center gap-4 cursor-pointer p-4 rounded-lg border-2 transition-all ${
                                isSelected 
                                  ? 'bg-blue-50 border-blue-500 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:bg-opacity-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`${questionId}_${subQ.id}`}
                                value={option}
                                checked={isSelected}
                                onChange={(e) => handleMatrixResponse(questionId, subQ.id, e.target.value)}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2"
                              />
                              <span className={`text-base ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                                {option}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Slider */}
            {(questionType === 'slider') && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="range"
                    min={question.min || 0}
                    max={question.max || 100}
                    value={sliderValue}
                    onChange={(e) => handleSliderChange(questionId, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((sliderValue - (question.min || 0)) / ((question.max || 100) - (question.min || 0))) * 100}%, #e5e7eb ${((sliderValue - (question.min || 0)) / ((question.max || 100) - (question.min || 0))) * 100}%, #e5e7eb 100%)`,
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{question.min || 0}</span>
                    <span className="font-medium text-gray-700">
                      Valor: <span className="text-blue-600 font-semibold">{sliderValue}</span>
                    </span>
                    <span>{question.max || 100}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Slider com Opção */}
            {(questionType === 'slider_com_opcao') && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="range"
                    min={question.min || 0}
                    max={question.max || 100}
                    value={sliderValue}
                    onChange={(e) => handleSliderChange(questionId, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((sliderValue - (question.min || 0)) / ((question.max || 100) - (question.min || 0))) * 100}%, #e5e7eb ${((sliderValue - (question.min || 0)) / ((question.max || 100) - (question.min || 0))) * 100}%, #e5e7eb 100%)`,
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{question.min || 0}</span>
                    <span className="font-medium text-gray-700">
                      Valor: <span className="text-blue-600 font-semibold">{sliderValue}</span>
                    </span>
                    <span>{question.max || 100}</span>
                  </div>
                </div>
                {question.optionText && (
                  <div className="mt-2">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={currentResponse?.optionChecked || false}
                        onChange={(e) => handleResponseChange(questionId, { value: sliderValue, optionChecked: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-600">{question.optionText}</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Matriz Slider */}
            {(questionType === 'matriz_slider') && (
              <div className="space-y-3">
                {subQuestions.map((subQ: SubQuestion) => {
                  const subSliderValue = sliderValues[`${questionId}_${subQ.id}`] ?? (question.min !== undefined ? question.min : 0);
                  return (
                    <div key={subQ.id} className="ml-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {subQ.text || subQ.texto}
                      </p>
                      <div className="relative">
                        <input
                          type="range"
                          min={question.min || 0}
                          max={question.max || 100}
                          value={subSliderValue}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setSliderValues(prev => ({ ...prev, [`${questionId}_${subQ.id}`]: value }));
                            handleMatrixResponse(questionId, subQ.id, value);
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((subSliderValue - (question.min || 0)) / ((question.max || 100) - (question.min || 0))) * 100}%, #e5e7eb ${((subSliderValue - (question.min || 0)) / ((question.max || 100) - (question.min || 0))) * 100}%, #e5e7eb 100%)`,
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>{question.min || 0}</span>
                          <span className="font-medium text-gray-700">
                            Valor: <span className="text-blue-600 font-semibold">{subSliderValue}</span>
                          </span>
                          <span>{question.max || 100}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Textarea */}
            {(questionType === 'textarea') && (
              <div className="space-y-2">
                <Textarea
                  value={currentResponse || ''}
                  onChange={(e) => handleResponseChange(questionId, e.target.value)}
                  rows={4}
                  className="w-full"
                  placeholder="Digite sua resposta aqui..."
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Resposta livre</span>
                  <span>{(currentResponse as string)?.length || 0} caracteres</span>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Carregando questionário...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!questionario) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Questionário não encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              O questionário solicitado não foi encontrado ou você não tem permissão para acessá-lo.
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress();
  const isDeadlineExpired = new Date(questionario.deadline) < new Date();
  const visibleQuestions = getVisibleQuestions();
  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const currentQuestionNumber = currentQuestionIndex + 1;
  const totalQuestions = visibleQuestions.length;
  const remainingQuestions = totalQuestions - currentQuestionNumber;

  // Verificar se pode avançar
  // ✅ Se a questão tem subperguntas, verificar se todas foram respondidas
  // ✅ Se não tem subperguntas, usar a validação normal
  const canProceed = currentQuestion ? (() => {
    const subQuestions = currentQuestion.subQuestions || currentQuestion.subPerguntas || [];
    const hasSubQuestions = subQuestions.length > 0;
    
    if (hasSubQuestions) {
      // Para questões com subperguntas, verificar se todas foram respondidas
      return areAllSubQuestionsAnswered(currentQuestion);
    } else {
      // Para questões sem subperguntas, usar validação normal
      return isQuestionAnswered(currentQuestion);
    }
  })() : false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Moderno */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-blue-600 mb-1">
                {questionario.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{totalQuestions} questões</span>
                <span>•</span>
                <span>Questão {currentQuestionNumber} de {totalQuestions}</span>
                {remainingQuestions > 0 && (
                  <>
                    <span>•</span>
                    <span>{remainingQuestions} {remainingQuestions === 1 ? 'restante' : 'restantes'}</span>
                  </>
                )}
              </div>
            </div>
            {isSaving && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </Badge>
            )}
          </div>
          
          {/* Barra de Progresso */}
          <div className="mt-4">
            <Progress 
              value={progress} 
              className="h-2"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-6 py-8">
        {currentQuestion ? (
          <div className="bg-white rounded-lg shadow-sm p-8 min-h-[400px]">
            {renderQuestion(currentQuestion)}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma questão disponível no momento.</p>
          </div>
        )}

        {/* Avisos */}
        {questionario.instructions && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{questionario.instructions}</p>
            </div>
          </div>
        )}

        {isDeadlineExpired && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">
                O prazo para responder este questionário expirou. Você ainda pode visualizar suas respostas, mas não pode mais editá-las.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Botões de Navegação Fixos */}
      <div className="fixed bottom-0 left-0 md:left-16 lg:left-64 right-0 bg-white border-t shadow-lg z-[60]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousQuestion}
              disabled={isSubmitting || isSaving || isDeadlineExpired}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {isFirstQuestion ? 'Voltar' : 'Anterior'}
            </Button>
            
            {isLastQuestion ? (
              <Button
                onClick={handleFinalize}
                disabled={!canProceed || isSubmitting || isSaving || isDeadlineExpired}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Finalizar Questionário
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={goToNextQuestion}
                disabled={!canProceed || isSubmitting || isSaving || isDeadlineExpired}
                className="flex items-center gap-2"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Espaçamento para os botões fixos */}
      <div className="h-20"></div>
    </div>
  );
};

export default QuestionarioRespond;

