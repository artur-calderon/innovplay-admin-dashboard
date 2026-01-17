import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headset, Copy, ExternalLink, Loader2, AlertCircle, Video, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface PlantaoOnline {
  id: string;
  link: string;
  titulo?: string;
  descricao?: string;
  data_criacao?: string;
  professor_nome?: string;
  turma_nome?: string;
}

export default function PlantaoOnlineStudent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plantoes, setPlantoes] = useState<PlantaoOnline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    loadPlantoes();
  }, [user.id, user.role]);

  const loadPlantoes = async () => {
    setIsLoading(true);
    try {
      // TODO: Substituir por chamada real à API quando endpoint estiver disponível
      // const response = await api.get('/plantao-online/student');
      // setPlantoes(response.data || []);

      // Dados mockados para demonstração
      const mockPlantoes: PlantaoOnline[] = [
        {
          id: '1',
          link: 'https://meet.google.com/abc-defg-hij',
          titulo: 'Plantão de Matemática',
          descricao: 'Plantão de dúvidas sobre álgebra e geometria',
          data_criacao: new Date().toISOString(),
          professor_nome: 'Prof. João Silva',
          turma_nome: '3º Ano A',
        },
        {
          id: '2',
          link: 'https://meet.google.com/xyz-wvut-srq',
          titulo: 'Plantão de Português',
          descricao: 'Esclarecimento de dúvidas sobre redação',
          data_criacao: new Date(Date.now() - 86400000).toISOString(),
          professor_nome: 'Prof. Maria Santos',
          turma_nome: '3º Ano A',
        },
      ];

      setPlantoes(mockPlantoes);
    } catch (error) {
      console.error('Erro ao carregar plantões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os plantões online. Tente novamente.',
        variant: 'destructive',
      });
      setPlantoes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (link: string, titulo?: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link copiado',
        description: `Link do plantão ${titulo ? `"${titulo}"` : ''} copiado para a área de transferência!`,
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

  const handleOpenLink = (link: string) => {
    window.open(link, '_blank');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data não informada';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (user.role !== 'aluno') {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Headset className="w-8 h-8 text-blue-600" />
            Plantão Online
          </h1>
          <p className="text-muted-foreground">
            Acesse os links de plantão online compartilhados pelos seus professores
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadPlantoes}
          disabled={isLoading}
        >
          <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Lista de Plantões */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-muted-foreground">Carregando plantões...</span>
        </div>
      ) : plantoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum plantão disponível</h3>
            <p className="text-sm text-muted-foreground text-center">
              Não há plantões online disponíveis no momento. Seus professores compartilharão os links aqui quando criarem novos plantões.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plantoes.map((plantao) => (
            <Card key={plantao.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-blue-500" />
                      {plantao.titulo || 'Plantão Online'}
                    </CardTitle>
                    {plantao.descricao && (
                      <CardDescription className="mt-2">
                        {plantao.descricao}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informações do plantão */}
                <div className="space-y-2">
                  {plantao.professor_nome && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Professor:</span>
                      <Badge variant="secondary">{plantao.professor_nome}</Badge>
                    </div>
                  )}
                  {plantao.turma_nome && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Turma:</span>
                      <Badge variant="outline">{plantao.turma_nome}</Badge>
                    </div>
                  )}
                  {plantao.data_criacao && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Criado em: {formatDate(plantao.data_criacao)}</span>
                    </div>
                  )}
                </div>

                {/* Link do Google Meet */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Link do Google Meet:</p>
                  <p className="text-sm break-all font-mono">{plantao.link}</p>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => handleCopyLink(plantao.link, plantao.titulo)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button
                    onClick={() => handleOpenLink(plantao.link)}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Entrar no Plantão
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Informações adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Como usar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Quando seus professores criarem um plantão online, o link aparecerá aqui</p>
          <p>2. Clique em "Copiar Link" para copiar o link e compartilhar ou salvar</p>
          <p>3. Ou clique em "Entrar no Plantão" para abrir diretamente no Google Meet</p>
          <p>4. Certifique-se de ter permissão de acesso à câmera e microfone do seu dispositivo</p>
        </CardContent>
      </Card>
    </div>
  );
}

