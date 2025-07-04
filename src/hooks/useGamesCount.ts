import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/authContext';

export const useGamesCount = () => {
    const [gamesCount, setGamesCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    const fetchGamesCount = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/games');
            const allGames = response.data.jogos || [];
            // Filtrar apenas os jogos do usuário logado
            const userGames = allGames.filter(game => game.userId === user.id);
            setGamesCount(userGames.length);
        } catch (error) {
            console.error('Erro ao buscar contagem de jogos:', error);
            setGamesCount(0);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user.id) {
            fetchGamesCount();
        }
    }, [user.id]);

    return { gamesCount, isLoading, refetch: fetchGamesCount };
}; 