import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Pause } from "lucide-react";

interface EvaluationTimerProps {
  timeRemaining: number; // em segundos
  isTimeUp: boolean;
  isPaused?: boolean; // ✅ NOVO: estado de pausa
  showWarning?: boolean;
  timeLimitMinutes?: number; // ✅ NOVO: tempo limite em minutos
  remainingMinutes?: number; // ✅ NOVO: tempo restante em minutos
}

export function EvaluationTimer({
  timeRemaining,
  isTimeUp,
  isPaused = false,
  showWarning,
  timeLimitMinutes,
  remainingMinutes
}: EvaluationTimerProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getTimerColor = () => {
    if (isTimeUp) return "destructive";
    if (isPaused) return "secondary"; // ✅ NOVO: cor especial para pausado
    if (timeRemaining <= 300) return "destructive"; // 5 minutos
    if (timeRemaining <= 900) return "secondary"; // 15 minutos
    return "default";
  };

  const getTimerIcon = () => {
    if (isPaused) return <Pause className="h-4 w-4" />; // ✅ NOVO: ícone de pausa
    if (isTimeUp || timeRemaining <= 300) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getTimerText = () => {
    if (isTimeUp) return "TEMPO ESGOTADO";
    if (isPaused) return `PAUSADO - ${formatTime(timeRemaining)}`; // ✅ NOVO: texto de pausado
    return formatTime(timeRemaining);
  };

  // ✅ NOVO: Calcular porcentagem de tempo restante
  const getTimePercentage = () => {
    if (!timeLimitMinutes) return 0;
    const totalSeconds = timeLimitMinutes * 60;
    return Math.max(0, (timeRemaining / totalSeconds) * 100);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge
        variant={getTimerColor()}
        className={`flex items-center gap-1 font-mono text-sm px-3 py-1 ${showWarning || timeRemaining <= 300 ? 'animate-pulse' : ''
          } ${isPaused ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}`} // ✅ NOVO: estilo especial para pausado
      >
        {getTimerIcon()}
        {getTimerText()}
      </Badge>

    </div>
  );
} 