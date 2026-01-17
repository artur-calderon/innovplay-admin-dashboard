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
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-blue-600" />
                        Adicionar Novo Jogo
                    </h2>
                    <p className="text-muted-foreground">Adicione um jogo do Wordwall à sua biblioteca</p>
                </div>
            </div>

            <WordwallGameForm />
        </div>
    );
};

export default AddGame; 