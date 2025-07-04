import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import {
    ExternalLink,
    Gamepad2,
    Loader2,
    BookOpen
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/authContext';

const DISCIPLINAS = [
    'Português',
    'Matemática',
    'História',
    'Geografia',
    'Ciências',
    'Artes',
    'Educação Física',
    'Inglês',
];

const StudentGames = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState('Todas');

    // Buscar jogos
    const fetchGames = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/games');
            const allGames = response.data.jogos || [];
            // Para alunos, mostrar todos os jogos disponíveis (não apenas os próprios)
            const userGames = allGames;
            setGames(userGames);
        } catch (error) {
            console.error('Erro ao buscar jogos:', error);
            toast.error('Erro ao carregar os jogos');
            setGames([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, [user.id]);

    // Abrir jogo na página GameView
    const openGame = (gameId) => {
        navigate(`/aluno/jogos/${gameId}`);
    };

    // Agrupar jogos por disciplina
    const groupGamesBySubject = () => {
        const grouped = {};

        games.forEach(game => {
            const subject = game.subject || 'Sem Disciplina';
            if (!grouped[subject]) {
                grouped[subject] = [];
            }
            grouped[subject].push(game);
        });

        return grouped;
    };

    // Filtrar jogos por disciplina selecionada
    const getFilteredGames = () => {
        if (selectedSubject === 'Todas') {
            return groupGamesBySubject();
        }

        const filtered = games.filter(game => game.subject === selectedSubject);
        return { [selectedSubject]: filtered };
    };

    const groupedGames = getFilteredGames();

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mr-2" />
                    <span>Carregando jogos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Meus Jogos</h2>
                <p className="text-muted-foreground">Jogue e aprenda com seus jogos educativos</p>
            </div>

            {/* Filtro por Disciplina */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={selectedSubject === 'Todas' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSubject('Todas')}
                >
                    Todas as Disciplinas
                </Button>
                {DISCIPLINAS.map((disciplina) => (
                    <Button
                        key={disciplina}
                        variant={selectedSubject === disciplina ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSubject(disciplina)}
                    >
                        {disciplina}
                    </Button>
                ))}
            </div>

            {games.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Nenhum jogo encontrado</h3>
                        <p className="text-muted-foreground">
                            Nenhum jogo disponível no momento. Aguarde seu professor adicionar jogos.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedGames).map(([subject, subjectGames]) => (
                        subjectGames.length > 0 && (
                            <div key={subject} className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    <h3 className="text-xl font-semibold">{subject}</h3>
                                    <Badge variant="secondary">{subjectGames.length} jogo{subjectGames.length !== 1 ? 's' : ''}</Badge>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {subjectGames.map((game) => (
                                        <Card key={game.id} className="hover:shadow-md transition-shadow">
                                            <CardHeader>
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                                                    <Badge variant="secondary">{game.subject}</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                                    {game.thumbnail ? (
                                                        <img
                                                            src={game.thumbnail}
                                                            alt={game.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Gamepad2 className="w-8 h-8 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => openGame(game.id)}
                                                        className="flex-1"
                                                    >
                                                        <ExternalLink className="w-4 h-4 mr-1" />
                                                        Jogar
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentGames; 