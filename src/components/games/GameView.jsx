import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { ArrowLeft, Play, Calendar, User, BookOpen } from 'lucide-react';

const GameView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchGame();
    }, [id]);

    const fetchGame = async () => {
        try {
            setIsLoading(true);
            const response = await api.get(`/games/${id}`);
            setGame(response.data);
        } catch (error) {
            setError('Erro ao carregar o jogo');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/aluno/jogos');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Carregando jogo...</span>
            </div>
        );
    }

    if (error || !game) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive mb-4">{error || 'Jogo não encontrado'}</p>
                <Button onClick={handleBack} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar aos Jogos
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button onClick={handleBack} variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{game.title}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {game.discipline && (
                                <div className="flex items-center gap-1">
                                    <BookOpen className="w-4 h-4" />
                                    {game.discipline}
                                </div>
                            )}
                            {game.author && (
                                <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {game.author}
                                </div>
                            )}
                            {game.createdAt && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(game.createdAt).toLocaleDateString('pt-BR')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Badge variant="secondary">
                    {game.provider === 'wordwall' ? 'Wordwall' : 'Jogo Educativo'}
                </Badge>
            </div>

            {/* Game Container */}
            <Card>
                <CardContent className="p-0">
                    <div className="w-full min-h-[600px] bg-muted rounded-lg overflow-hidden">
                        {game.iframeHtml ? (
                            <div
                                className="w-full h-full min-h-[600px]"
                                dangerouslySetInnerHTML={{ __html: game.iframeHtml }}
                            />
                        ) : game.url ? (
                            <iframe
                                src={game.url}
                                className="w-full h-full min-h-[600px] border-0"
                                allowFullScreen
                                title={game.title}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-[600px]">
                                <div className="text-center">
                                    <Play className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Jogo não disponível</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Game Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Informações do Jogo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-medium mb-2">Título</h4>
                            <p className="text-muted-foreground">{game.title}</p>
                        </div>

                        {game.discipline && (
                            <div>
                                <h4 className="font-medium mb-2">Disciplina</h4>
                                <p className="text-muted-foreground">{game.discipline}</p>
                            </div>
                        )}

                        {game.author && (
                            <div>
                                <h4 className="font-medium mb-2">Criado por</h4>
                                <p className="text-muted-foreground">{game.author}</p>
                            </div>
                        )}

                        {game.createdAt && (
                            <div>
                                <h4 className="font-medium mb-2">Data de Criação</h4>
                                <p className="text-muted-foreground">
                                    {new Date(game.createdAt).toLocaleDateString('pt-BR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Como Jogar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                                    1
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Leia atentamente as instruções do jogo
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                                    2
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Clique nos elementos interativos para jogar
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                                    3
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Complete as atividades propostas pelo jogo
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                                    4
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Divirta-se aprendendo!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default GameView; 