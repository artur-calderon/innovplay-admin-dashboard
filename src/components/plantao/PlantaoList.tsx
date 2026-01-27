import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, School, BookOpen, GraduationCap, Trash2, ExternalLink, Copy, Headset, Link as LinkIcon } from 'lucide-react';
import { PlantaoOnline } from '@/types/plantao';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PlantaoListProps {
  plantoes: PlantaoOnline[];
  isLoading?: boolean;
  onPlantaoClick?: (plantao: PlantaoOnline) => void;
  onDeletePlantao?: (plantaoId: string) => void;
  userRole?: string;
  canDeletePlantao?: (plantao: PlantaoOnline) => boolean;
}

export const PlantaoList = ({ 
  plantoes, 
  isLoading, 
  onPlantaoClick, 
  onDeletePlantao, 
  userRole,
  canDeletePlantao 
}: PlantaoListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePlantaoClick = (plantao: PlantaoOnline) => {
    if (onPlantaoClick) {
      onPlantaoClick(plantao);
    } else {
      // Abrir link da reunião em nova aba
      window.open(plantao.link, '_blank');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, plantaoId: string) => {
    e.stopPropagation(); // Prevenir que o clique no botão dispare o clique no card
    if (onDeletePlantao) {
      onDeletePlantao(plantaoId);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent, link: string, title?: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link copiado',
        description: `Link do plantão ${title ? `"${title}"` : ''} copiado para a área de transferência!`,
      });
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando plantões...</span>
      </div>
    );
  }

  if (plantoes.length === 0) {
    return (
      <div className="text-center py-12">
        <Headset className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">Nenhum plantão disponível</p>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';
  const canDelete = canDeletePlantao || (() => isAdmin);

  // Agrupar plantões por disciplina
  const plantoesBySubject = plantoes.reduce((acc, plantao) => {
    const subjectName = plantao.subject.name || 'Sem disciplina';
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(plantao);
    return acc;
  }, {} as Record<string, typeof plantoes>);

  return (
    <div className="space-y-8">
      {Object.entries(plantoesBySubject).map(([subjectName, subjectPlantoes]) => (
        <div key={subjectName} className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {subjectName}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjectPlantoes.map((plantao) => {
              const showDeleteButton = onDeletePlantao && canDelete(plantao);
              
              return (
                <Card
                  key={plantao.id}
                  className="hover:shadow-lg transition-all duration-200 relative group border-2 hover:border-primary/20"
                >
                  {showDeleteButton && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteClick(e, plantao.id)}
                      title="Excluir plantão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Headset className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold line-clamp-2 leading-tight">
                          {plantao.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {plantao.subject.name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Link da reunião - melhorado */}
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Link da Reunião</p>
                      </div>
                      <p className="text-xs break-all font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-900 p-2 rounded border">
                        {plantao.link}
                      </p>
                    </div>

                    {/* Informações do plantão - melhorado */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-muted rounded">
                          <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{plantao.grade.name}</span>
                      </div>

                      {plantao.schools.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <div className="p-1.5 bg-muted rounded mt-0.5">
                            <School className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            {plantao.schools.length === 1 ? (
                              <span className="font-medium">{plantao.schools[0].name}</span>
                            ) : (
                              <span className="font-medium">{plantao.schools.length} escolas</span>
                            )}
                          </div>
                        </div>
                      )}

                      {plantao.created_at && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="p-1.5 bg-muted rounded">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <span>{new Date(plantao.created_at).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}</span>
                        </div>
                      )}

                      {plantao.created_by && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 bg-muted rounded">
                            <span className="text-xs">👤</span>
                          </div>
                          <span className="text-muted-foreground">
                            Por <strong className="text-foreground">{plantao.created_by.name}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botões de ação - melhorado */}
                    <div className="flex flex-col gap-2 pt-3 border-t">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(plantao.link, '_blank');
                        }}
                        className="w-full"
                        size="sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Entrar na Reunião
                      </Button>
                      <Button
                        onClick={(e) => handleCopyLink(e, plantao.link, plantao.title)}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
