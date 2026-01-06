import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Calendar, School, BookOpen, GraduationCap, Trash2 } from 'lucide-react';
import { PlayTvVideo } from '@/types/playtv';
import { useNavigate } from 'react-router-dom';
import { getVideoThumbnail } from '@/lib/utils';

interface VideoListProps {
  videos: PlayTvVideo[];
  isLoading?: boolean;
  onVideoClick?: (video: PlayTvVideo) => void;
  onDeleteVideo?: (videoId: string) => void;
  userRole?: string;
  canDeleteVideo?: (video: PlayTvVideo) => boolean;
}

export const VideoList = ({ 
  videos, 
  isLoading, 
  onVideoClick, 
  onDeleteVideo, 
  userRole,
  canDeleteVideo 
}: VideoListProps) => {
  const navigate = useNavigate();

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
  const canDelete = canDeleteVideo || (() => isAdmin);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => {
        const showDeleteButton = onDeleteVideo && canDelete(video);
        
        return (
          <Card
            key={video.id}
            className="group cursor-pointer hover:shadow-lg transition-shadow relative"
            onClick={() => handleVideoClick(video)}
          >
            {showDeleteButton && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteClick(e, video.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{video.title || 'Vídeo sem título'}</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {video.subject.name}
                </Badge>
              </div>
            </CardHeader>
          <CardContent className="space-y-4">
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {(() => {
                const thumbnailUrl = getVideoThumbnail(video.url);
                if (thumbnailUrl) {
                  return (
                    <>
                      <img
                        src={thumbnailUrl}
                        alt={video.title || 'Vídeo'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Se a imagem falhar ao carregar, esconder e mostrar placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.parentElement?.querySelector('.thumbnail-placeholder') as HTMLElement;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="thumbnail-placeholder hidden absolute inset-0 items-center justify-center bg-muted">
                        <Play className="w-12 h-12 text-muted-foreground" />
                      </div>
                      {/* Overlay com ícone de play no centro */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                        </div>
                      </div>
                    </>
                  );
                }
                return (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-muted-foreground" />
                  </div>
                );
              })()}
            </div>

            {/* Informações do vídeo */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="w-4 h-4" />
                <span>{video.grade.name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>{video.subject.name}</span>
              </div>

              {video.schools.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <School className="w-4 h-4 mt-0.5" />
                  <div className="flex-1">
                    {video.schools.length === 1 ? (
                      <span>{video.schools[0].name}</span>
                    ) : (
                      <span>{video.schools.length} escolas</span>
                    )}
                  </div>
                </div>
              )}

              {video.created_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
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

