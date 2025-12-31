import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, School, BookOpen, GraduationCap, User } from 'lucide-react';
import { api } from '@/lib/api';
import { VideoPlayer } from '@/components/playtv/VideoPlayer';
import { PlayTvVideo } from '@/types/playtv';

export default function PlayTvVideoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<PlayTvVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchVideo();
    }
  }, [id]);

  const fetchVideo = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/play-tv/videos/${id}`);
      setVideo(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar vídeo:', error);
      // Se o endpoint não existir (404), mostrar mensagem amigável
      if (error.response?.status === 404) {
        setError('Vídeo não encontrado ou endpoint ainda não implementado');
      } else {
        setError('Erro ao carregar o vídeo');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button onClick={handleBack} variant="outline" size="sm" className="shadow-sm flex-shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight line-clamp-2">{video.title || 'Vídeo sem título'}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              {video.subject && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {video.subject.name}
                </div>
              )}
              {video.grade && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  {video.grade.name}
                </div>
              )}
              {video.created_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(video.created_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>

        <Badge variant="secondary" className="text-sm px-3 py-1.5 shadow-sm">Play TV</Badge>
      </div>

      {/* Player de Vídeo */}
      <div className="rounded-lg overflow-hidden shadow-lg border border-border/50">
        <VideoPlayer url={video.url} title={video.title} />
      </div>

      {/* Informações do Vídeo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Informações do Vídeo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {video.title && (
              <div>
                <h4 className="font-medium mb-2">Título</h4>
                <p className="text-muted-foreground">{video.title}</p>
              </div>
            )}

            {video.subject && (
              <div>
                <h4 className="font-medium mb-2">Disciplina</h4>
                <p className="text-muted-foreground">{video.subject.name}</p>
              </div>
            )}

            {video.grade && (
              <div>
                <h4 className="font-medium mb-2">Série</h4>
                <p className="text-muted-foreground">{video.grade.name}</p>
              </div>
            )}

            {video.schools && video.schools.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Escolas</h4>
                <div className="flex flex-wrap gap-2">
                  {video.schools.map((school) => (
                    <Badge key={school.id} variant="outline">
                      <School className="w-3 h-3 mr-1" />
                      {school.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {video.created_at && (
              <div>
                <h4 className="font-medium mb-2">Data de Publicação</h4>
                <p className="text-muted-foreground">
                  {new Date(video.created_at).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {video.created_by && (
              <div>
                <h4 className="font-medium mb-2">Criado por</h4>
                <p className="text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {video.created_by.name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Como Assistir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  1
                </div>
                <p className="text-sm text-muted-foreground">
                  Clique no botão de play para iniciar o vídeo
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  2
                </div>
                <p className="text-sm text-muted-foreground">
                  Use os controles do player para pausar, ajustar volume ou mudar a qualidade
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  3
                </div>
                <p className="text-sm text-muted-foreground">
                  Assista o vídeo completo para aproveitar todo o conteúdo educativo
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  4
                </div>
                <p className="text-sm text-muted-foreground">
                  Você pode voltar a qualquer momento para rever o material
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

