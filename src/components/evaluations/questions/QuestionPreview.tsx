import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { ResizableImage } from 'tiptap-extension-resizable-image';
import { Badge } from "@/components/ui/badge";
import { Question } from "../types";
import { useSkillsStore } from '@/stores/useSkillsStore';
import './QuestionPreview.css';

interface QuestionPreviewProps {
    question: Question;
}



const ReadOnlyEditor = ({ content }: { content: string | null | undefined }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            ResizableImage,
            Superscript,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
                alignments: ['left', 'center', 'right'],
                defaultAlignment: 'left',
            }),
            Placeholder.configure({ placeholder: '' }),
        ],
        content: content || '',
        editable: false,
    });

    if (!editor) {
        return null;
    }

    return <EditorContent editor={editor} />;
};


const QuestionPreview: React.FC<QuestionPreviewProps> = ({ question }) => {
    const { fetchSkills, getSkillsByIds, isLoading } = useSkillsStore();

    // Pré-carregar skills quando a questão for carregada
    useEffect(() => {
        if (question?.subject?.id && question?.skills?.length > 0) {
            fetchSkills(question.subject.id);
        }
    }, [question?.subject?.id, question?.skills?.length, fetchSkills]);

    // Buscar nomes das habilidades (apenas os 6 primeiros caracteres)
    const selectedSkills = (question?.skills && Array.isArray(question.skills))
        ? getSkillsByIds(question.skills, question.subject?.id).map(skill => skill.name.substring(0, 6))
        : [];

    const isLoadingSkills = question?.subject?.id ? isLoading[question.subject.id] : false;

    if (!question) {
        return <div className="p-4">Nenhuma questão para visualizar.</div>;
    }

    return (
        <div className="space-y-6 p-4 question-preview-content">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{question.title}</h3>
                <div className="flex flex-wrap gap-2">
                    {question.grade?.name && <Badge variant="outline">{question.grade.name}</Badge>}
                    {question.subject?.name && <Badge variant="outline">{question.subject.name}</Badge>}
                    {question.difficulty && <Badge variant="outline">{question.difficulty}</Badge>}
                    {question.value && <Badge variant="outline">Valor: {question.value}</Badge>}
                    {isLoadingSkills ? (
                        <Badge variant="outline" className="animate-pulse">Carregando...</Badge>
                    ) : selectedSkills.length > 0 ? (
                        <Badge variant="outline">{selectedSkills.join(", ")}</Badge>
                    ) : question?.skills?.length > 0 ? (
                        <Badge variant="outline">Skills não encontradas</Badge>
                    ) : (
                        <Badge variant="outline">Nenhuma skill</Badge>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="prose max-w-none">
                    <ReadOnlyEditor content={question.formattedText || question.text} />
                </div>
                {question.secondStatement && (
                    <div className="prose max-w-none">
                        <div className="font-medium mb-1">Segundo Enunciado:</div>
                        <ReadOnlyEditor content={question.secondStatement} />
                    </div>
                )}
            </div>

            {question.options && question.options.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium">Alternativas:</h4>
                    {question.options.map((option, index) => (
                        <div key={option.id || index} className="flex items-center space-x-2">
                            <div
                                className={`w-6 h-6 rounded-full border flex items-center justify-center ${option.isCorrect ? 'bg-primary text-primary-foreground' : 'bg-background'
                                    }`}
                            >
                                {String.fromCharCode(65 + index)}
                            </div>
                            <span>{option.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {question.solution && (
                <div className="space-y-2">
                    <h4 className="font-medium">Resolução:</h4>
                    <div className="prose max-w-none">
                        <ReadOnlyEditor content={question.formattedSolution || question.solution} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionPreview; 