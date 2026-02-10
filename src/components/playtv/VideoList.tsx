import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Calendar, School, BookOpen, GraduationCap, Trash2 } from 'lucide-react';
import { PlayTvVideo } from '@/types/playtv';
import { useNavigate } from 'react-router-dom';
import { getVideoThumbnailAttempts } from '@/lib/utils';

interface VideoListProps {
  videos: PlayTvVideo[];
  isLoading?: boolean;
  onVideoClick?: (video: PlayTvVideo) => void;
  onDeleteVideo?: (videoId: string) => void;
  userRole?: string;
  canDeleteVideo?: (video: PlayTvVideo) => boolean;
}

// Componente para thumbnail com fallbacks robustos
const VideoThumbnail = ({ videoUrl, title }: { videoUrl: string; title?: string }) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const attemptRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Lista completa de tentativas usando a nova função
  const allAttempts = useMemo(() => {
    return getVideoThumbnailAttempts(videoUrl);
  }, [videoUrl]);

  // Inicializar com primeira tentativa
  useEffect(() => {
    if (allAttempts.length > 0) {
      setCurrentSrc(allAttempts[0]);
      attemptRef.current = 0;
      setImageLoaded(false);
      setShowPlaceholder(false);
    } else {
      // Se não há tentativas, mostrar placeholder imediatamente
      setShowPlaceholder(true);
      setCurrentSrc(null);
    }
  }, [allAttempts]);

  // Timeout de 5 segundos como fallback adicional
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!imageLoaded && currentSrc && !showPlaceholder && allAttempts.length > 0) {
      timeoutRef.current = setTimeout(() => {
        // Se passou 5 segundos e a imagem não carregou, tentar próxima ou mostrar placeholder
        if (attemptRef.current < allAttempts.length - 1) {
          attemptRef.current++;
          setCurrentSrc(allAttempts[attemptRef.current]);
          setImageLoaded(false);
        } else {
          // Todas as tentativas foram esgotadas, mostrar placeholder
          setShowPlaceholder(true);
          setCurrentSrc(null);
        }
      }, 5000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentSrc, imageLoaded, showPlaceholder, allAttempts]);

  // Lógica de erro melhorada
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    
    // Limpar timeout se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    attemptRef.current++;
    if (attemptRef.current < allAttempts.length) {
      // Tentar próxima opção imediatamente
      setCurrentSrc(allAttempts[attemptRef.current]);
      setImageLoaded(false);
    } else {
      // Todas as tentativas falharam, mostrar placeholder imediatamente
      setShowPlaceholder(true);
      setCurrentSrc(null);
      setImageLoaded(false);
    }
  };

  // Verificação de carregamento bem-sucedido
  const handleLoad = () => {
    setImageLoaded(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Componente de placeholder
  const PlaceholderComponent = () => (
    <>
      <div className="w-full h-full flex items-center justify-center bg-white">
        <img 
          src="/AFIRME-PLAY-ico.png" 
          alt="Afirme Play" 
          className="w-24 h-24 object-contain opacity-80"
          onError={(e) => {
            // Se o logo também falhar, esconder e mostrar apenas o ícone de play
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
        </div>
      </div>
    </>
  );

  // Garantir placeholder sempre visível quando necessário
  if (showPlaceholder || !currentSrc || allAttempts.length === 0) {
    return <PlaceholderComponent />;
  }

  // Renderizar imagem com fallbacks
  return (
    <>
      <img
        ref={imageRef}
        key={`thumb-${attemptRef.current}-${currentSrc}`}
        src={currentSrc}
        alt={title || 'Vídeo'}
        className="w-full h-full object-cover"
        onError={handleError}
        onLoad={handleLoad}
        style={{ display: imageLoaded ? 'block' : 'block' }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
        </div>
      </div>
    </>
  );
};

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

  // Agrupar vídeos por disciplina
  const videosBySubject = videos.reduce((acc, video) => {
    const subjectName = video.subject.name || 'Sem disciplina';
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(video);
    return acc;
  }, {} as Record<string, typeof videos>);

  return (
    <div className="space-y-8">
      {Object.entries(videosBySubject).map(([subjectName, subjectVideos]) => (
        <div key={subjectName} className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {subjectName}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjectVideos.map((video) => {
              const showDeleteButton = onDeleteVideo && canDelete(video);
              
              return (
                <Card
                  key={video.id}
                  className="hover:shadow-md transition-shadow relative group"
                  onClick={() => handleVideoClick(video)}
                >
                  {showDeleteButton && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteClick(e, video.id)}
                      title="Excluir vídeo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg line-clamp-2">{video.title || 'Vídeo sem título'}</CardTitle>
                    </div>
                  </CardHeader>
                <CardContent className="space-y-4">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <VideoThumbnail videoUrl={video.url} title={video.title} />
                  </div>

                  {/* Informações do vídeo */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="w-4 h-4" />
                      <span>{video.grade.name}</span>
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
        </div>
      ))}
    </div>
  );
};

