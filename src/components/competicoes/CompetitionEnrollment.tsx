import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Zap, 
  Clock, 
  CheckCircle, 
  Loader2,
  PlayCircle,
  Timer,
  Award,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { CompetitionsApiService } from '@/services/competitionsApi';
import { getErrorMessage, getErrorSuggestion } from '@/utils/errorHandler';
import type { Competition, CompetitionEnrollmentProps, CompetitionEnrollmentStatus } from '@/types/competition-types';

export const CompetitionEnrollment = ({ 
  competition, 
  onEnrolled, 
  onStarted 
}: CompetitionEnrollmentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [enrollmentStatus, setEnrollmentStatus] = useState<CompetitionEnrollmentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStart, setIsCheckingStart] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [startReason, setStartReason] = useState<string | null>(null);

  // Verificar status de inscrição ao montar
  useEffect(() => {
    checkEnrollmentStatus();
  }, [competition.id]);

  // Verificar se pode iniciar quando inscrito
  useEffect(() => {
    if (enrollmentStatus?.is_enrolled && !enrollmentStatus?.has_finished) {
      checkCanStart();
    }
  }, [enrollmentStatus?.is_enrolled]);

  const checkEnrollmentStatus = async () => {
    try {
      const status = await CompetitionsApiService.getEnrollmentStatus(competition.id);
      setEnrollmentStatus(status);
    } catch (error) {
      console.error('Erro ao verificar inscrição:', error);
      // Assumir não inscrito em caso de erro, mas não mostrar toast para não poluir
      setEnrollmentStatus({
        is_enrolled: false,
        can_enroll: true
      });
    }
  };

  const checkCanStart = async () => {
    try {
      setIsCheckingStart(true);
      const response = await CompetitionsApiService.canStartCompetition(competition.id);
      setCanStart(response.can_start);
      setStartReason(response.reason || null);
    } catch (error) {
      console.error('Erro ao verificar início:', error);
      setCanStart(false);
    } finally {
      setIsCheckingStart(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setIsLoading(true);
      const result = await CompetitionsApiService.enrollInCompetition(competition.id);
      
      if (result.success) {
        toast({
          title: "Inscrição realizada!",
          description: "Você foi inscrito na competição com sucesso.",
        });
        setEnrollmentStatus({
          ...enrollmentStatus,
          is_enrolled: true,
          can_enroll: false
        });
        onEnrolled?.();
        // Verificar se já pode iniciar
        checkCanStart();
      } else {
        toast({
          title: "Não foi possível inscrever",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao inscrever:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível completar sua inscrição. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro na inscrição",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      setIsLoading(true);
      
      // Verificar mais uma vez se pode iniciar
      const canStartResponse = await CompetitionsApiService.canStartCompetition(competition.id);
      
      if (!canStartResponse.can_start) {
        toast({
          title: "Não é possível iniciar",
          description: canStartResponse.reason || "A competição ainda não está disponível.",
          variant: "destructive",
        });
        setCanStart(false);
        setStartReason(canStartResponse.reason || null);
        return;
      }

      // Navegar para a página de execução
      const basePath = user?.role === 'aluno' ? '/aluno' : '/app';
      navigate(`${basePath}/competicao/${competition.id}`);
      onStarted?.();
    } catch (error) {
      console.error('Erro ao iniciar:', error);
      toast({
        title: "Erro ao iniciar",
        description: "Não foi possível iniciar a competição. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determinar estado do botão
  const getButtonState = () => {
    // Competição finalizada
    if (competition.status === 'finalizada') {
      return {
        disabled: true,
        variant: 'outline' as const,
        icon: <Award className="w-4 h-4 mr-2" />,
        text: 'Finalizada',
        className: ''
      };
    }

    // Já completou a competição
    if (enrollmentStatus?.has_finished) {
      return {
        disabled: true,
        variant: 'outline' as const,
        icon: <CheckCircle className="w-4 h-4 mr-2" />,
        text: 'Já Participou',
        className: ''
      };
    }

    // Está inscrito
    if (enrollmentStatus?.is_enrolled) {
      if (canStart) {
        return {
          disabled: isLoading,
          variant: 'default' as const,
          icon: isLoading 
            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            : <Zap className="w-4 h-4 mr-2" />,
          text: isLoading ? 'Iniciando...' : 'Iniciar Competição',
          className: 'bg-blue-600 hover:bg-blue-700'
        };
      } else if (isCheckingStart) {
        return {
          disabled: true,
          variant: 'outline' as const,
          icon: <Loader2 className="w-4 h-4 mr-2 animate-spin" />,
          text: 'Verificando...',
          className: ''
        };
      } else {
        return {
          disabled: true,
          variant: 'outline' as const,
          icon: <Timer className="w-4 h-4 mr-2" />,
          text: startReason || 'Aguardando Liberação',
          className: ''
        };
      }
    }

    // Não está inscrito - verificar se pode inscrever
    if (!enrollmentStatus?.can_enroll) {
      return {
        disabled: true,
        variant: 'outline' as const,
        icon: <Lock className="w-4 h-4 mr-2" />,
        text: enrollmentStatus?.reason || 'Inscrições Encerradas',
        className: ''
      };
    }

    // Pode se inscrever
    if (competition.status === 'aberta' || competition.status === 'agendada') {
      return {
        disabled: isLoading,
        variant: 'default' as const,
        icon: isLoading 
          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          : <Trophy className="w-4 h-4 mr-2" />,
        text: isLoading ? 'Inscrevendo...' : 'Inscrever-se',
        className: 'bg-green-600 hover:bg-green-700'
      };
    }

    // Competição em andamento, não inscrito
    if (competition.status === 'em_andamento') {
      return {
        disabled: true,
        variant: 'outline' as const,
        icon: <Clock className="w-4 h-4 mr-2" />,
        text: 'Em Andamento',
        className: ''
      };
    }

    // Estado padrão
    return {
      disabled: true,
      variant: 'outline' as const,
      icon: <Clock className="w-4 h-4 mr-2" />,
      text: 'Indisponível',
      className: ''
    };
  };

  const buttonState = getButtonState();

  // Handler de clique
  const handleClick = () => {
    if (enrollmentStatus?.is_enrolled && canStart) {
      handleStart();
    } else if (!enrollmentStatus?.is_enrolled && enrollmentStatus?.can_enroll) {
      handleEnroll();
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleClick}
        disabled={buttonState.disabled}
        variant={buttonState.variant}
        className={`w-full ${buttonState.className}`}
      >
        {buttonState.icon}
        {buttonState.text}
      </Button>

      {/* Badge adicional de status */}
      {enrollmentStatus?.is_enrolled && !enrollmentStatus?.has_finished && !canStart && (
        <div className="mt-2 text-center">
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Inscrito - Aguardando liberação
          </Badge>
        </div>
      )}

      {/* Mostrar resultado se já participou */}
      {enrollmentStatus?.has_finished && enrollmentStatus?.result && (
        <div className="mt-2 text-center">
          <Badge className="bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">
            <Trophy className="w-3 h-3 mr-1" />
            Posição: {enrollmentStatus.result.posicao}º | 
            Moedas: {enrollmentStatus.result.moedas_ganhas}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default CompetitionEnrollment;

