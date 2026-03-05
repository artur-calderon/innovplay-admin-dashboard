import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, School, BookOpen, GraduationCap, User } from 'lucide-react';
import { api } from '@/lib/api';
import { VideoPlayer } from '@/components/playtv/VideoPlayer';
import { PlayTvVideo } from '@/types/playtv';

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function PlayTvVideoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<PlayTvVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVideo = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const response = await api.get(`/play-tv/videos/${id}`);
      setVideo(response.data);
    } catch (err) {
      const error = err as ApiError;
      // Se o endpoint não existir (404), mostrar mensagem amigável
      if (error.response?.status === 404) {
        setError('Vídeo não encontrado ou endpoint ainda não implementado');
      } else {
        setError('Erro ao carregar o vídeo');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchVideo();
    }
  }, [id, fetchVideo]);

  const handleBack = () => {
    // Verificar se o usuário é aluno ou admin/professor
    const isStudent = window.location.pathname.includes('/aluno');
    navigate(isStudent ? '/aluno/play-tv' : '/app/play-tv');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando vídeo...</span>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || 'Vídeo não encontrado'}</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
      {/* Header com gradiente roxo sutil */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-primary/10">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button 
            onClick={handleBack} 
            variant="outline" 
            size="sm" 
            className="shadow-sm flex-shrink-0 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight line-clamp-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {video.title || 'Vídeo sem título'}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              {video.subject && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-medium">{video.subject.name}</span>
                </div>
              )}
              {video.grade && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span className="font-medium">{video.grade.name}</span>
                </div>
              )}
              {video.created_at && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-medium">{new Date(video.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player de Vídeo - agora com estilo próprio */}
      <div className="w-full">
        <VideoPlayer url={video.url} title={video.title} />
      </div>

      {/* Informações do Vídeo - layout vertical único */}
      <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-4 border-b border-primary/10">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Informações do Vídeo
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {video.title && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Título
              </h4>
              <p className="text-muted-foreground pl-3.5">{video.title}</p>
            </div>
          )}

          {video.subject && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Disciplina
              </h4>
              <p className="text-muted-foreground pl-3.5">{video.subject.name}</p>
            </div>
          )}

          {video.grade && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Série
              </h4>
              <p className="text-muted-foreground pl-3.5">{video.grade.name}</p>
            </div>
          )}

          {video.schools && video.schools.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Escolas
              </h4>
              <div className="flex flex-wrap gap-2 pl-3.5">
                {video.schools.map((school) => (
                  <Badge 
                    key={school.id} 
                    variant="outline" 
                    className="break-words whitespace-normal max-w-full border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <School className="w-3 h-3 mr-1.5 flex-shrink-0 text-primary" />
                    <span className="break-words">{school.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {video.created_at && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Data de Publicação
              </h4>
              <p className="text-muted-foreground pl-3.5">
                {new Date(video.created_at).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          {video.created_by && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Criado por
              </h4>
              <p className="text-muted-foreground flex items-center gap-2 pl-3.5">
                <User className="w-4 h-4 text-primary" />
                {video.created_by.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

