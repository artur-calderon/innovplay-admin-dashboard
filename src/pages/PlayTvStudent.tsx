import { useState, useEffect, useCallback, useRef } from 'react';
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

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function PlayTvStudent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<PlayTvVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStudentInfo, setIsLoadingStudentInfo] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [debouncedSubject, setDebouncedSubject] = useState<string>('all');
  const [studentGrade, setStudentGrade] = useState<string | null>(null);
  const [studentSchool, setStudentSchool] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce para o filtro de disciplina (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSubject(selectedSubject);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedSubject]);

  const loadVideos = useCallback(async () => {
    // Só carregar vídeos se tiver a série do aluno (o backend precisa disso para filtrar)
    if (!studentGrade) {
      return;
    }

    setIsLoading(true);
    try {
      // Passar parâmetros para o backend fazer a filtragem
      // O backend já filtra automaticamente por grade e school para alunos
      const params = new URLSearchParams();
      if (debouncedSubject !== 'all') {
        params.append('subject', debouncedSubject);
      }
      // Passar grade como parâmetro para garantir filtragem no backend
      if (studentGrade) {
        params.append('grade', studentGrade);
      }

      const response = await api.get(`/play-tv/videos?${params.toString()}`);
      // O backend já filtra por grade e school para alunos, então não precisa filtrar no frontend
      setVideos(response.data || []);
    } catch (err) {
      const error = err as ApiError;
      // Se o endpoint não existir (404), apenas definir lista vazia sem mostrar erro
      const is404 = error.response?.status === 404 || 
                    error.message?.includes('não encontrado') ||
                    error.message?.includes('Not Found');
      
      if (is404) {
        setVideos([]);
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
  }, [debouncedSubject, studentGrade, toast]);

  const loadStudentInfo = useCallback(async () => {
    setIsLoadingStudentInfo(true);
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
    } catch (err) {
      const error = err as ApiError;
      console.error('Erro ao carregar informações do aluno:', error);
      // Não chamar loadVideos aqui - deixar que o useEffect faça isso quando studentGrade estiver disponível
    } finally {
      setIsLoadingStudentInfo(false);
    }
  }, [user.id]);

  const loadSubjects = useCallback(async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    }
  }, []);

  // Verificar permissões e carregar dados iniciais
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
  }, [user.id, user.role, navigate, toast, loadStudentInfo, loadSubjects]);

  // Carregar vídeos quando a série do aluno estiver disponível ou quando o filtro de disciplina mudar
  useEffect(() => {
    if (studentGrade && !isLoadingStudentInfo) {
      loadVideos();
    }
  }, [studentGrade, debouncedSubject, loadVideos, isLoadingStudentInfo]);


  const handleVideoClick = (video: PlayTvVideo) => {
    navigate(`/aluno/play-tv/${video.id}`);
  };

  const handleRefresh = () => {
    loadVideos();
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-4 border-b">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            <Tv className="w-10 h-10 text-blue-600" />
            Play TV
          </h1>
          <p className="text-muted-foreground text-lg">
            Assista aos vídeos educacionais disponíveis para sua série
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="shadow-sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtro de Disciplina */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Filtros
          </CardTitle>
          <CardDescription>Filtre os vídeos por disciplina</CardDescription>
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
      <VideoList videos={videos} isLoading={isLoading || isLoadingStudentInfo} onVideoClick={handleVideoClick} />
    </div>
  );
}

