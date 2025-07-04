import React from 'react';
import WordwallGameForm from '@/components/games/WordwallGameForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AddGame = () => {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">Adicionar Novo Jogo</h2>
                    <p className="text-muted-foreground">Adicione um jogo do Wordwall à sua biblioteca</p>
                </div>
            </div>

            <WordwallGameForm />
        </div>
    );
};

export default AddGame; 