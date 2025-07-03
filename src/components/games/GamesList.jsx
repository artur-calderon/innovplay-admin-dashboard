import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Play, BookOpen, Calendar } from 'lucide-react';

const GamesList = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/games');
            const gamesData = response.data.jogos || response.data;
            console.log(gamesData);
            setGames(gamesData);

            // Extrair disciplinas únicas dos jogos
            const uniqueDisciplines = [...new Set(gamesData.map(game => game.subject).filter(Boolean))];
            setDisciplines(uniqueDisciplines);
        } catch (error) {
            console.error('Erro ao carregar jogos:', error);
            setError('Erro ao carregar os jogos');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredGames = selectedDiscipline === 'all'
        ? games
        : games.filter(game => game.subject === selectedDiscipline);

    const handleGameClick = (game) => {
        // Navegar para a página do jogo
        navigate(`/aluno/jogos/${game.id}`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Carregando jogos...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Jogos Educativos</h2>
                <div className="flex gap-2">
                    <Button
                        variant={selectedDiscipline === 'all' ? 'default' : 'outline'}
                        onClick={() => setSelectedDiscipline('all')}
                    >
                        Todas as Disciplinas
                    </Button>
                    {disciplines.map(discipline => (
                        <Button
                            key={discipline}
                            variant={selectedDiscipline === discipline ? 'default' : 'outline'}
                            onClick={() => setSelectedDiscipline(discipline)}
                        >
                            {discipline}
                        </Button>
                    ))}
                </div>
            </div>

            {filteredGames.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhum jogo encontrado</h3>
                        <p className="text-muted-foreground">
                            {selectedDiscipline === 'all'
                                ? 'Não há jogos disponíveis no momento.'
                                : `Não há jogos disponíveis para ${selectedDiscipline}.`
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGames.map((game) => (
                        <Card
                            key={game.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleGameClick(game)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                                    <Badge variant="secondary" className="ml-2">
                                        {game.subject || 'Geral'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {game.thumbnail && (
                                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                                        <img
                                            src={game.thumbnail}
                                            alt={game.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="hidden absolute inset-0 items-center justify-center bg-muted">
                                            <Play className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    </div>
                                )}

                                {!game.thumbnail && (
                                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                        <Play className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {game.author && (
                                        <p className="text-sm text-muted-foreground">
                                            Criado por: {game.author}
                                        </p>
                                    )}

                                    {game.createdAt && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            {new Date(game.createdAt).toLocaleDateString('pt-BR')}
                                        </div>
                                    )}
                                </div>

                                <Button className="w-full" variant="outline">
                                    <Play className="w-4 h-4 mr-2" />
                                    Jogar
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GamesList; 