import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Calendar, Clock, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import { Olimpiada } from '@/types/olimpiada-types';

export default function OlimpiadasStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [olimpiadas, setOlimpiadas] = useState<Olimpiada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOlimpiadas();
  }, []);

  const loadOlimpiadas = async () => {
    setLoading(true);
    try {
      const response = await OlimpiadasApiService.getStudentOlimpiadas();
      
      // Log para debug: verificar dados recebidos
      console.log('📋 Olimpíadas recebidas:', response.map(o => ({
        id: o.id,
        title: o.title,
        startDateTime: o.startDateTime,
        timeZone: o.timeZone,
        applicationTimeZone: o.applicationTimeZone,
        availability: o.availability
      })));
      
      setOlimpiadas(response);
    } catch (error) {
      console.error('Erro ao carregar olimpíadas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar olimpíadas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartOlimpiada = (id: string) => {
    navigate(`/aluno/olimpiada/${id}/fazer`);
  };

  // Funções para formatação de data com timezone (mesmo padrão usado em StudentEvaluations.tsx)
  const DEFAULT_TIME_ZONE = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    } catch (error) {
      return "America/Sao_Paulo";
    }
  })();

  function resolveTimeZone(candidate?: string): string {
    if (!candidate) {
      return DEFAULT_TIME_ZONE;
    }

    try {
      // Validar timezone usando Intl
      new Intl.DateTimeFormat("pt-BR", { timeZone: candidate });
      return candidate;
    } catch (error) {
      return DEFAULT_TIME_ZONE;
    }
  }

  function getOlimpiadaTimeZone(olimpiada?: Olimpiada): string {
    if (!olimpiada) {
      return DEFAULT_TIME_ZONE;
    }

    const candidate =
      olimpiada.applicationTimeZone ||
      olimpiada.timeZone ||
      olimpiada.availability?.time_zone ||
      olimpiada.availability?.timezone;

    return resolveTimeZone(candidate);
  }

  function formatDateTimeForDisplay(value?: string, timeZone?: string): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const safeTimeZone = resolveTimeZone(timeZone);

    const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: safeTimeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: safeTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    return `${dateFormatter.format(date)} às ${timeFormatter.format(date)}`;
  }

  const isAvailable = (olimpiada: Olimpiada) => {
    if (!olimpiada.startDateTime) return true;
    const now = new Date();
    const startDate = new Date(olimpiada.startDateTime);
    return now >= startDate;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
          <Trophy className="h-8 w-8 text-yellow-600" />
          Olimpíadas Disponíveis
        </h1>
        <p className="text-muted-foreground mt-1">
          Participe das olimpíadas e teste seus conhecimentos
        </p>
      </div>

      {olimpiadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma olimpíada disponível no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {olimpiadas.map((olimpiada) => (
            <Card
              key={olimpiada.id}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800"
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className="absolute top-4 right-4 text-6xl">🏆</div>
              </div>

              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <CardTitle className="text-xl font-bold text-yellow-900 dark:text-yellow-100 truncate">
                        {olimpiada.title}
                      </CardTitle>
                    </div>
                    {olimpiada.description && (
                      <p className="text-sm text-yellow-800/80 dark:text-yellow-200/80 line-clamp-2">
                        {olimpiada.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative space-y-4">
                {olimpiada.subjects && olimpiada.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {olimpiada.subjects.slice(0, 3).map((subject) => (
                      <Badge
                        key={subject.id}
                        variant="outline"
                        className="bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100"
                      >
                        {subject.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {olimpiada.startDateTime && (
                    <div className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                      <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span>
                        {(() => {
                          const timeZone = getOlimpiadaTimeZone(olimpiada);
                          return formatDateTimeForDisplay(olimpiada.startDateTime, timeZone) || "Data não definida";
                        })()}
                      </span>
                    </div>
                  )}
                  {olimpiada.duration && (
                    <div className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span>{olimpiada.duration} minutos</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleStartOlimpiada(olimpiada.id)}
                  disabled={!isAvailable(olimpiada)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isAvailable(olimpiada) ? 'Fazer Olimpíada' : 'Aguardando início'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
