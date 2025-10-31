import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Calendar, School, BookOpen, GraduationCap } from 'lucide-react';
import { PlayTvVideo } from '@/types/playtv';
import { useNavigate } from 'react-router-dom';

interface VideoListProps {
  videos: PlayTvVideo[];
  isLoading?: boolean;
  onVideoClick?: (video: PlayTvVideo) => void;
}

export const VideoList = ({ videos, isLoading, onVideoClick }: VideoListProps) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <Card
          key={video.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleVideoClick(video)}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg line-clamp-2">{video.title || 'Vídeo sem título'}</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {video.subject.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Thumbnail placeholder */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <Play className="w-12 h-12 text-muted-foreground" />
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
      ))}
    </div>
  );
};

