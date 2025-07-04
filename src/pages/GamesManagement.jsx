import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
    ExternalLink,
    Plus,
    Edit,
    Trash2,
    AlertCircle,
    CheckCircle,
    Loader2,
    Gamepad2,
    Link
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/authContext';
import { useGamesCount } from '@/hooks/useGamesCount';
import { useNavigate } from 'react-router-dom';

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

const GamesManagement = () => {
    const { user } = useAuth();
    const { refetch: refetchGamesCount } = useGamesCount();
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingGame, setEditingGame] = useState(null);
    const [editUrl, setEditUrl] = useState('');
    const [editSubject, setEditSubject] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [gameToDelete, setGameToDelete] = useState(null);

    // Buscar jogos do usuário
    const fetchGames = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/games');
            // Buscar jogos da estrutura correta da API
            const allGames = response.data.jogos || [];

            // Filtrar apenas os jogos do usuário logado
            const userGames = allGames.filter(game => game.userId === user.id);

            setGames(userGames);
        } catch (error) {
            console.error('Erro ao buscar jogos:', error);
            toast.error('Erro ao carregar os jogos');
            setGames([]); // Definir como array vazio em caso de erro
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, []);

    // Atualizar jogo
    const handleUpdateGame = async () => {
        if (!editingGame || !editUrl.trim()) return;

        try {
            setIsEditing(true);
            await api.put(`/games/${editingGame.id}`, {
                url: editUrl,
                subject: editSubject
            });

            toast.success('Jogo atualizado com sucesso!');
            setEditingGame(null);
            setEditUrl('');
            setEditSubject('');
            fetchGames(); // Recarregar lista
            refetchGamesCount(); // Atualizar contador no sidebar
        } catch (error) {
            console.error('Erro ao atualizar jogo:', error);
            toast.error('Erro ao atualizar o jogo');
        } finally {
            setIsEditing(false);
        }
    };

    // Excluir jogo
    const handleDeleteGame = async () => {
        if (!gameToDelete) return;

        try {
            await api.delete(`/games/${gameToDelete.id}`);
            toast.success('Jogo excluído com sucesso!');
            setIsDeleteDialogOpen(false);
            setGameToDelete(null);
            fetchGames(); // Recarregar lista
            refetchGamesCount(); // Atualizar contador no sidebar
        } catch (error) {
            console.error('Erro ao excluir jogo:', error);
            toast.error('Erro ao excluir o jogo');
        }
    };

    // Abrir modal de edição
    const openEditModal = (game) => {
        setEditingGame(game);
        setEditUrl(game.url);
        setEditSubject(game.subject || 'Português');
    };

    // Abrir modal de exclusão
    const openDeleteModal = (game) => {
        setGameToDelete(game);
        setIsDeleteDialogOpen(true);
    };

    // Abrir jogo na página GameView
    const openGame = (gameId) => {
        navigate(`/app/jogos/${gameId}`);
    };



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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Meus Jogos</h2>
                    <p className="text-muted-foreground">Gerencie os jogos que você criou</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = '/app/jogos/adicionar'}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Jogo
                    </Button>
                    <Button onClick={() => window.open('https://wordwall.net/pt-br/create', '_blank')} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Criar Novo Jogo
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {!games || games.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Nenhum jogo encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                            Você ainda não criou nenhum jogo. Clique no botão acima para criar seu primeiro jogo no Wordwall.
                        </p>
                        <Button onClick={() => window.open('https://wordwall.net/pt-br/create', '_blank')}>
                            Criar Primeiro Jogo
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {games.map((game) => (
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
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openGame(game.id)}
                                        className="flex-1"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-1" />
                                        Jogar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditModal(game)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openDeleteModal(game)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal de Edição */}
            <Dialog open={!!editingGame} onOpenChange={() => setEditingGame(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Jogo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL do Jogo</label>
                            <Input
                                type="url"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                placeholder="https://wordwall.net/pt/resource/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Disciplina</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                            >
                                {DISCIPLINAS.map((disciplina) => (
                                    <option key={disciplina} value={disciplina}>{disciplina}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setEditingGame(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleUpdateGame}
                                disabled={isEditing || !editUrl.trim()}
                            >
                                {isEditing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar Alterações'
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Exclusão</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>
                            Tem certeza que deseja excluir o jogo "{gameToDelete?.title}"?
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteGame}
                            >
                                Excluir Jogo
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GamesManagement; 