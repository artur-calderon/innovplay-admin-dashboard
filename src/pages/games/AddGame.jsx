import React from 'react';
import { useNavigate } from 'react-router-dom';
import WordwallGameForm from '@/components/games/WordwallGameForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gamepad2 } from 'lucide-react';

const AddGame = () => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/app/jogos')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </Button>
                <div className="space-y-1.5">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
                        <Gamepad2 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
                        Adicionar Novo Jogo
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base">Adicione um jogo do Wordwall à sua biblioteca</p>
                </div>
            </div>

            <WordwallGameForm />
        </div>
    );
};

export default AddGame; 