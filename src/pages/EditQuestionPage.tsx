import React from 'react';
import { useParams } from 'react-router-dom';
import QuestionForm from '@/components/evaluations/questions/QuestionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EditQuestionPage = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <CardTitle>Editar Questão</CardTitle>
                </CardHeader>
                <CardContent>
                    {id ? (
                        <QuestionForm
                            questionId={id}
                            onClose={() => window.history.back()}
                            onQuestionAdded={() => { }} // Pode ser usado para atualizar a lista ou redirecionar
                        />
                    ) : (
                        <p>ID da questão não encontrado.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default EditQuestionPage; 