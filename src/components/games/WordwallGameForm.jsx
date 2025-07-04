import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { ExternalLink, Plus, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useGamesCount } from '@/hooks/useGamesCount';

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

const WordwallGameForm = () => {
    const navigate = useNavigate();
    const { refetch: refetchGamesCount } = useGamesCount();
    const [url, setUrl] = useState('');
    const [subject, setSubject] = useState('Português');
    const [isLoading, setIsLoading] = useState(false);
    const [gameData, setGameData] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const validateWordwallUrl = (url) => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'wordwall.net';
        } catch {
            return false;
        }
    };

    const fetchGamePreview = async (gameUrl) => {
        try {
            const encodedUrl = encodeURIComponent(gameUrl);
            const response = await fetch(`https://wordwall.net/api/oembed?url=${encodedUrl}&format=json`);

            if (!response.ok) {
                throw new Error('Jogo não encontrado ou privado');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error('Erro ao buscar informações do jogo');
        }
    };

    const handleUrlChange = async (e) => {
        const newUrl = e.target.value;
        setUrl(newUrl);
        setError('');
        setSuccess('');
        setGameData(null);

        if (newUrl.trim()) {
            if (!validateWordwallUrl(newUrl)) {
                setError('Por favor, insira uma URL válida do Wordwall (wordwall.net)');
                return;
            }

            setIsLoading(true);
            try {
                const data = await fetchGamePreview(newUrl);
                setGameData(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSaveGame = async () => {
        if (!gameData) return;

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const gamePayload = {
                url: url,
                title: gameData.title || 'Jogo Wordwall',
                iframeHtml: gameData.html,
                thumbnail: gameData.thumbnail_url,
                author: gameData.author_name,
                provider: 'wordwall',
                subject: subject,
            };

            await api.post('/games', gamePayload);
            setSuccess('Jogo salvo com sucesso!');
            setUrl('');
            setGameData(null);
            setSubject('Português');

            // Atualizar contador no sidebar
            refetchGamesCount();

            // Redirecionar para a página de jogos após 2 segundos
            setTimeout(() => {
                navigate('/app/jogos');
            }, 2000);
        } catch (error) {
            setError('Erro ao salvar o jogo. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGame = () => {
        window.open('https://wordwall.net/pt-br/create', '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleCreateGame} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Jogo no Wordwall
                    <ExternalLink className="w-4 h-4" />
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Jogo Existente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="game-url" className="text-sm font-medium">
                            URL do Jogo Wordwall
                        </label>
                        <Input
                            id="game-url"
                            type="url"
                            placeholder="https://wordwall.net/pt/resource/94433702/roleta"
                            value={url}
                            onChange={handleUrlChange}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="game-subject" className="text-sm font-medium">
                            Disciplina
                        </label>
                        <select
                            id="game-subject"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            disabled={isLoading}
                        >
                            {DISCIPLINAS.map((disciplina) => (
                                <option key={disciplina} value={disciplina}>{disciplina}</option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Sucesso</AlertTitle>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2">Carregando...</span>
                        </div>
                    )}

                    {gameData && !isLoading && (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-muted/50">
                                <h4 className="font-medium mb-2">{gameData.title}</h4>
                                {gameData.author_name && (
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Criado por: {gameData.author_name}
                                    </p>
                                )}
                                <div
                                    className="w-full h-64 border rounded overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: gameData.html }}
                                />
                            </div>

                            <CardFooter className="px-0">
                                <Button
                                    onClick={handleSaveGame}
                                    disabled={isLoading}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar Jogo
                                </Button>
                            </CardFooter>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WordwallGameForm; 