/**
 * Lista de competições para o estudante.
 * Rota: /aluno/competitions
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Clock, Loader2, Eye, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAvailableCompetitions } from '@/services/competitionsApi';
import type { Competition } from '@/types/competition-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OPEN_STATUSES = ['aberta', 'enrollment_open', 'active', 'scheduled'];

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

function isOpenForStudent(c: Competition): boolean {
  const s = String(c.status).toLowerCase();
  return OPEN_STATUSES.some((open) => s === open);
}

export default function CompetitionsStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAvailableCompetitions();
      setCompetitions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar competições:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as competições.',
        variant: 'destructive',
      });
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  const openCompetitions = competitions.filter(isOpenForStudent);

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Trophy className="h-8 w-8 text-blue-600" />
          Competições
        </h1>
        <p className="mt-1 text-muted-foreground">
          Veja as competições abertas e inscreva-se.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : openCompetitions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhuma competição aberta no momento. Volte em breve!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openCompetitions.map((comp) => (
            <Card
              key={comp.id}
              className="flex flex-col transition-shadow hover:shadow-md"
            >
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{comp.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {comp.subject_name ?? comp.subject_id} · Nível {comp.level}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {String(comp.status).toLowerCase() === 'aberta' && 'Aberta'}
                    {String(comp.status).toLowerCase() === 'enrollment_open' && 'Inscrições abertas'}
                    {String(comp.status).toLowerCase() === 'active' && 'Ativa'}
                    {String(comp.status).toLowerCase() === 'scheduled' && 'Agendada'}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {comp.enrollment_end && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      Inscrição até: {formatDate(comp.enrollment_end)}
                    </p>
                  )}
                  {comp.application && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      Aplicação: {formatDate(comp.application)}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/aluno/competitions/${comp.id}`)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                  {comp.is_enrolled ? (
                    <Badge variant="secondary" className="self-center">
                      Inscrito
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/aluno/competitions/${comp.id}`)}
                    >
                      <UserPlus className="mr-1 h-4 w-4" />
                      Inscrever-se
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
