import React from 'react';
import { useParams } from 'react-router-dom';
import QuestionForm from '@/components/evaluations/questions/QuestionForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3, HelpCircle } from 'lucide-react';

const EditQuestionPage = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:bg-background">
            {/* Header */}
            <div className="bg-white dark:bg-card border-b border-border shadow-sm">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.history.back()}
                                className="flex items-center gap-2 text-foreground border-border"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                            <div className="flex flex-wrap items-center gap-2">
                                <Edit3 className="h-5 w-5 text-primary shrink-0" />
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex flex-wrap items-center gap-2 sm:gap-3">
                                  <HelpCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
                                  Editar Questão
                                </h1>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Faça as alterações necessárias na questão</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 py-6">
                {id ? (
                    <div className="bg-card dark:bg-card/95 rounded-xl border border-border shadow-sm p-6">
                        <QuestionForm
                            questionId={id}
                            onClose={() => window.history.back()}
                            onQuestionAdded={() => { }} // Pode ser usado para atualizar a lista ou redirecionar
                        />
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
                            <p className="text-red-800 dark:text-red-300 font-medium">ID da questão não encontrado.</p>
                            <Button 
                                onClick={() => window.history.back()}
                                className="mt-4"
                                variant="outline"
                            >
                                Voltar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditQuestionPage; 