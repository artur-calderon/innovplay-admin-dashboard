import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Medal, Trophy, TrendingUp, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import { OlimpiadaRanking } from '@/types/olimpiada-types';
import { AvatarPreview } from '@/components/profile/AvatarPreview';

interface OlimpiadaResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  olimpiadaId: string;
}

export function OlimpiadaResultsModal({
  isOpen,
  onClose,
  olimpiadaId,
}: OlimpiadaResultsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<OlimpiadaRanking[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    completedStudents: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (isOpen && olimpiadaId) {
      loadResults();
    }
  }, [isOpen, olimpiadaId]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const results = await OlimpiadasApiService.getOlimpiadaResults(olimpiadaId);
      setRanking(results.ranking);
      setStats({
        totalStudents: results.totalStudents,
        completedStudents: results.completedStudents,
        averageScore: results.averageScore,
      });
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar resultados da olimpíada',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-600 dark:text-yellow-400';
    if (position === 2) return 'text-gray-400 dark:text-gray-500';
    if (position === 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  const getClassificationColor = (classification: string) => {
    if (classification.includes('Avançado') || classification.includes('Adequado')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (classification.includes('Básico')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Resultados da Olimpíada
          </DialogTitle>
          <DialogDescription>
            Ranking e estatísticas dos participantes
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participantes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                    {stats.completedStudents}/{stats.totalStudents}
                  </div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {stats.totalStudents > 0
                      ? Math.round((stats.completedStudents / stats.totalStudents) * 100)
                      : 0}% concluíram
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Média de Notas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.averageScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Pontuação média
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
                    <Medal className="h-4 w-4" />
                    Top 3
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {ranking.slice(0, 3).length}
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    Medalhistas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ranking */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Ranking
              </h3>
              {ranking.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Medal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum resultado disponível ainda
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {ranking.map((student, index) => {
                    const medal = getMedalIcon(student.position);
                    return (
                      <Card
                        key={student.student_id}
                        className={`transition-all hover:shadow-md ${
                          student.position <= 3
                            ? 'border-yellow-300 dark:border-yellow-700 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20'
                            : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Position */}
                            <div className="flex items-center justify-center w-12">
                              {medal ? (
                                <span className="text-3xl">{medal}</span>
                              ) : (
                                <span
                                  className={`text-xl font-bold ${getPositionColor(
                                    student.position
                                  )}`}
                                >
                                  {student.position}º
                                </span>
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {student.student_avatar ? (
                                <AvatarPreview
                                  config={JSON.parse(student.student_avatar)}
                                  size={48}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg">
                                  {student.student_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-lg truncate">
                                {student.student_name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {student.school && (
                                  <span className="text-sm text-muted-foreground">
                                    {student.school}
                                  </span>
                                )}
                                {student.class && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-sm text-muted-foreground">
                                      {student.class}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Nota</div>
                                <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                                  {student.score.toFixed(1)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Acertos</div>
                                <div className="text-lg font-semibold">
                                  {student.correct_answers}/{student.total_questions}
                                </div>
                              </div>
                              <div>
                                <Badge
                                  className={getClassificationColor(student.classification)}
                                >
                                  {student.classification}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
