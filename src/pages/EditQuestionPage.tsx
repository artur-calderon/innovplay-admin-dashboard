import React from 'react';
import { useParams } from 'react-router-dom';
import QuestionForm from '@/components/evaluations/questions/QuestionForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3 } from 'lucide-react';

const EditQuestionPage = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.history.back()}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                            <div className="flex items-center gap-2">
                                <Edit3 className="h-5 w-5 text-blue-600" />
                                <h1 className="text-xl font-bold text-gray-800">Editar Questão</h1>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600">Faça as alterações necessárias na questão</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 py-6">
                {id ? (
                    <QuestionForm
                        questionId={id}
                        onClose={() => window.history.back()}
                        onQuestionAdded={() => { }} // Pode ser usado para atualizar a lista ou redirecionar
                    />
                ) : (
                    <div className="text-center py-12">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                            <p className="text-red-800 font-medium">ID da questão não encontrado.</p>
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