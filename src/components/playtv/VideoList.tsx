import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Calendar, School, BookOpen, GraduationCap, Trash2 } from 'lucide-react';
import { PlayTvVideo } from '@/types/playtv';
import { useNavigate } from 'react-router-dom';
import { getVideoThumbnail } from '@/lib/utils';
import { useState } from 'react';

interface VideoListProps {
  videos: PlayTvVideo[];
  isLoading?: boolean;
  onVideoClick?: (video: PlayTvVideo) => void;
  onDeleteVideo?: (videoId: string) => void;
  userRole?: string;
}

export const VideoList = ({ videos, isLoading, onVideoClick, onDeleteVideo, userRole }: VideoListProps) => {
  const navigate = useNavigate();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleVideoClick = (video: PlayTvVideo) => {
    if (onVideoClick) {
      onVideoClick(video);
    } else {
      // Navegar para página de visualização baseado na rota atual
      const isStudent = window.location.pathname.includes('/aluno');
      navigate(isStudent ? `/aluno/play-tv/${video.id}` : `/app/play-tv/${video.id}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation(); // Prevenir que o clique no botão dispare o clique no card
    if (onDeleteVideo) {
      onDeleteVideo(videoId);
    }
  };

  const handleImageError = (videoId: string) => {
    setImageErrors(prev => new Set(prev).add(videoId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando vídeos...</span>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <Play className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">Nenhum vídeo disponível</p>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => {
        const thumbnail = getVideoThumbnail(video.url);
        const hasImageError = imageErrors.has(video.id);
        const showThumbnail = thumbnail && !hasImageError;

        return (
          <Card
            key={video.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/50 overflow-hidden"
            onClick={() => handleVideoClick(video)}
          >
            {/* Preview/Thumbnail do Vídeo */}
            <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
              {showThumbnail ? (
                <img
                  src={thumbnail}
                  alt={video.title || 'Preview do vídeo'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={() => handleImageError(video.id)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="relative">
                    <Play className="w-16 h-16 text-primary/60" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                  </div>
                </div>
              )}
              
              {/* Overlay com botão de play */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Badge de disciplina no canto superior */}
              <div className="absolute top-3 left-3">
                <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-md">
                  {video.subject.name}
                </Badge>
              </div>

              {/* Botão de deletar (apenas para admin) */}
              {isAdmin && onDeleteVideo && (
                <div className="absolute top-3 right-3">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 bg-destructive/90 backdrop-blur-sm hover:bg-destructive shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    onClick={(e) => handleDeleteClick(e, video.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {video.title || 'Vídeo sem título'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {/* Informações do vídeo */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="w-4 h-4 flex-shrink-0 text-primary/70" />
                  <span className="truncate">{video.grade.name}</span>
                </div>
                
                {video.schools.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <School className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/70" />
                    <div className="flex-1 min-w-0">
                      {video.schools.length === 1 ? (
                        <span className="truncate">{video.schools[0].name}</span>
                      ) : (
                        <span>{video.schools.length} escolas</span>
                      )}
                    </div>
                  </div>
                )}

                {video.created_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-primary/70" />
                    <span>{new Date(video.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

