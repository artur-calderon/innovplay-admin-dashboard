import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tv, RefreshCw, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { VideoList } from '@/components/playtv/VideoList';
import { PlayTvVideo } from '@/types/playtv';

export default function PlayTvStudent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<PlayTvVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [studentGrade, setStudentGrade] = useState<string | null>(null);
  const [studentSchool, setStudentSchool] = useState<string | null>(null);

  useEffect(() => {
    if (user.role !== 'aluno') {
      toast({
        title: 'Acesso Negado',
        description: 'Esta página é apenas para alunos.',
        variant: 'destructive',
      });
      navigate('/aluno');
      return;
    }

    loadStudentInfo();
    loadSubjects();
  }, [user.id]);

  useEffect(() => {
    if (studentGrade) {
      loadVideos();
    }
  }, [studentGrade, selectedSubject]);

  const loadStudentInfo = async () => {
    try {
      // Buscar informações do aluno (série e escola)
      const response = await api.get(`/students/${user.id}`);
      const studentData = response.data;

      if (studentData.grade_id) {
        setStudentGrade(studentData.grade_id);
      }
      if (studentData.school_id) {
        setStudentSchool(studentData.school_id);
      }

      // Se não encontrar na resposta direta, tentar buscar via turma
      if (!studentData.grade_id && studentData.class_id) {
        const classResponse = await api.get(`/classes/${studentData.class_id}`);
        const classData = classResponse.data;
        if (classData.grade_id) {
          setStudentGrade(classData.grade_id);
        }
        if (classData.school_id) {
          setStudentSchool(classData.school_id);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar informações do aluno:', error);
      // Tentar carregar vídeos mesmo sem informações específicas
      // O backend deve filtrar automaticamente
      loadVideos();
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    }
  };

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      // Buscar vídeos filtrados automaticamente pela série do aluno
      // O backend deve filtrar baseado na série e escola do aluno
      const params = new URLSearchParams();
      if (selectedSubject !== 'all') {
        params.append('subject', selectedSubject);
      }

      const response = await api.get(`/play-tv/videos?${params.toString()}`);
      // Filtrar vídeos que correspondem à série do aluno e às suas escolas
      let filteredVideos = response.data || [];

      if (studentGrade) {
        filteredVideos = filteredVideos.filter((video: PlayTvVideo) => video.grade.id === studentGrade);
      }

      if (studentSchool) {
        filteredVideos = filteredVideos.filter((video: PlayTvVideo) =>
          video.schools.some(school => school.id === studentSchool)
        );
      }

      setVideos(filteredVideos);
    } catch (error: any) {
      // Se o endpoint não existir (404), apenas definir lista vazia sem mostrar erro
      // O interceptor transforma o erro, então verificamos a mensagem ou o status original
      const is404 = error.response?.status === 404 || 
                    error.message?.includes('não encontrado') ||
                    error.message?.includes('Not Found');
      
      if (is404) {
        setVideos([]);
        // Não logar erro para 404 em endpoints que podem não estar implementados ainda
        return;
      }
      
      console.error('Erro ao carregar vídeos:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || error.message || 'Não foi possível carregar os vídeos.',
        variant: 'destructive',
      });
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoClick = (video: PlayTvVideo) => {
    navigate(`/aluno/play-tv/${video.id}`);
  };

  const handleRefresh = () => {
    loadVideos();
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Tv className="w-8 h-8 text-blue-500" />
            Play TV
          </h1>
          <p className="text-muted-foreground">
            Assista aos vídeos educacionais disponíveis para sua série
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtro de Disciplina */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Disciplina
              </label>
              <Select
                value={selectedSubject}
                onValueChange={(value) => setSelectedSubject(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as disciplinas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as disciplinas</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Vídeos */}
      <VideoList videos={videos} isLoading={isLoading} onVideoClick={handleVideoClick} />
    </div>
  );
}

