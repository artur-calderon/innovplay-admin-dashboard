import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Question } from "../types";
import { useSkillsStore } from '@/stores/useSkillsStore';
import { api } from "@/lib/api";
import './QuestionPreview.css';

interface QuestionPreviewProps {
    question: Question;
    onClose?: () => void;
}

// Componente simples para renderizar HTML sem TipTap
const SimpleHtmlRenderer = ({ content }: { content: string | null | undefined }) => {
    if (!content || content.trim() === '') {
        return null;
    }

    // Limpar e processar HTML
    const cleanHtml = content
        .replace(/<img([^>]*?)class="([^"]*)"([^>]*)>/g, '<img$1class="$2 max-w-full h-auto"$3>')
        .replace(/<img(?![^>]*class=)([^>]*)>/g, '<img$1 class="max-w-full h-auto">')
        .replace(/<img([^>]*?)(data:image\/[^;]+;base64,[A-Za-z0-9+/=]{50,500})([^>]*?)>/g, (match, before, dataUrl, after) => {
            if (dataUrl.length < 800) {
                return `<img${before}${dataUrl}${after} style="vertical-align: middle; display: inline-block; max-width: 4em; max-height: 2.5em; object-fit: contain;">`;
            }
            return match;
        })
        .replace(/<img([^>]*?)style="([^"]*?)"([^>]*?)>/g, (match, before, style, after) => {
            if (!style.includes('object-fit')) {
                const newStyle = `${style}; object-fit: contain;`;
                return `<img${before}style="${newStyle}"${after}>`;
            }
            return match;
        })
        .replace(/<img(?![^>]*style=)([^>]*?)>/g, '<img$1 style="object-fit: contain;">');
    
    return (
        <div 
            className="prose prose-sm max-w-none question-content-html dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
    );
};

const QuestionPreview: React.FC<QuestionPreviewProps> = ({ question: initialQuestion, onClose }) => {
    const { fetchSkills, getSkillsByIds, isLoading } = useSkillsStore();
    const [question, setQuestion] = useState<Question>(initialQuestion);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [detailsLoaded, setDetailsLoaded] = useState(false);

    // Buscar detalhes completos da questão se necessário
    useEffect(() => {
        const needsDetails = (
            (question.type === 'multipleChoice' && (!question.options || question.options.length === 0)) ||
            (!question.formattedText && question.id && question.id !== 'preview')
        );

        if (needsDetails && !detailsLoaded && !isLoadingDetails) {
            setIsLoadingDetails(true);
            
            api.get<Question>(`/questions/${question.id}`)
                .then((response) => {
                    const fullQuestion = response.data;
                    
                    const normalizeSkills = (skills: any): string[] => {
                        if (Array.isArray(skills)) return skills;
                        if (typeof skills === 'string' && skills.length > 0) return skills.split(',').map(s => s.trim());
                        return [];
                    };

                    const normalizedQuestion: Question = {
                        ...fullQuestion,
                        skills: normalizeSkills(fullQuestion.skills),
                        // Verificar múltiplos campos possíveis para alternativas
                        options: fullQuestion.options || 
                                (fullQuestion as any).alternatives || 
                                (fullQuestion as any).opcoes || 
                                (fullQuestion as any).alternativas || 
                                [],
                        secondStatement: fullQuestion.secondStatement || '',
                        solution: fullQuestion.solution || '',
                    };

                    setQuestion(normalizedQuestion);
                    setDetailsLoaded(true);
                })
                .catch(() => {
                    setDetailsLoaded(true);
                })
                .finally(() => {
                    setIsLoadingDetails(false);
                });
        } else if (!needsDetails) {
            setDetailsLoaded(true);
        }
    }, [question.id, question.type, question.options, question.formattedText, detailsLoaded, isLoadingDetails]);

    // Pré-carregar skills quando a questão for carregada
    useEffect(() => {
        if (question?.subject?.id && question?.skills?.length > 0) {
            fetchSkills(question.subject.id);
        }
    }, [question?.subject?.id, question?.skills?.length, fetchSkills]);

    // Buscar skills completas para tooltips
    const selectedSkills = (question?.skills && Array.isArray(question.skills))
        ? getSkillsByIds(question.skills, question.subject?.id)
        : [];

    const isLoadingSkills = question?.subject?.id ? isLoading[question.subject.id] : false;

    if (!question) {
        return <div className="p-4 text-center text-muted-foreground">Nenhuma questão para visualizar.</div>;
    }

    // Verificar múltiplos campos possíveis para alternativas
    const questionOptions = question.options || 
                           (question as any).alternatives || 
                           (question as any).opcoes || 
                           (question as any).alternativas || 
                           [];

    return (
        <div className="question-preview-content">
            {/* Loading indicator para detalhes */}
            {isLoadingDetails && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Skeleton className="h-4 w-4 rounded-full animate-spin" />
                    Carregando detalhes completos...
                </div>
            )}

            {/* Header com conteúdo e badges */}
            <div className="space-y-4 mb-8 pb-6 border-b border-border">
                <h3 className="text-xl font-bold leading-tight text-foreground">{question.title}</h3>
                <div className="flex flex-wrap gap-2">
                    {question.grade?.name && <Badge variant="outline">{question.grade.name}</Badge>}
                    {question.subject?.name && <Badge variant="outline">{question.subject.name}</Badge>}
                    {question.difficulty && <Badge variant="outline">{question.difficulty}</Badge>}
                    {question.value && <Badge variant="outline">Valor: {question.value}</Badge>}
                    {question.type && (
                        <Badge variant="secondary">
                            {question.type === 'multipleChoice' ? 'Múltipla Escolha' : 'Dissertativa'}
                        </Badge>
                    )}
                    
                    {/* Skills */}
                    {isLoadingSkills ? (
                        <Badge variant="outline" className="animate-pulse">Carregando skills...</Badge>
                    ) : selectedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {selectedSkills.map((skill) => (
                                <Tooltip key={skill.id}>
                                    <TooltipTrigger asChild>
                                        <Badge 
                                            variant="outline" 
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            title={`${skill.code} - ${skill.description}`}
                                        >
                                            {skill.name.substring(0, 6)}
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent 
                                        side="top" 
                                        className="z-50 max-w-sm p-3 bg-popover text-popover-foreground border border-border rounded-md shadow-lg"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-semibold text-sm">{skill.code}</div>
                                            <div className="text-xs leading-relaxed">
                                                {skill.description}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    ) : question?.skills?.length > 0 ? (
                        <Badge variant="outline">Skills não encontradas</Badge>
                    ) : null}
                </div>
            </div>

            {/* Enunciado Principal */}
            <div className="space-y-4 mb-8">
                {isLoadingDetails ? (
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : (
                    <div className="question-statement">
                        <SimpleHtmlRenderer content={question.formattedText || question.text} />
                        
                        {/* Segundo Enunciado - integrado naturalmente */}
                        {question.secondStatement && question.secondStatement.trim() !== '' && (
                            <div className="question-continuation">
                                <SimpleHtmlRenderer content={question.secondStatement} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Alternativas para questões de múltipla escolha */}
            {(question.type === 'multipleChoice' || question.type === 'multiple_choice') && (
                <div className="space-y-4 mb-8">
                    <h4 className="font-semibold text-lg text-foreground mb-4">Alternativas</h4>
                    {isLoadingDetails ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/20">
                                    <Skeleton className="w-7 h-7 rounded-full" />
                                    <Skeleton className="h-5 flex-1" />
                                </div>
                            ))}
                        </div>
                    ) : questionOptions && questionOptions.length > 0 ? (
                        <div className="space-y-3">
                            {questionOptions.map((option, index) => (
                                <div key={option.id || index} className="alternative-item flex items-start space-x-4 p-5 rounded-xl border bg-card hover:shadow-md transition-all duration-200">
                                    <div
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold shrink-0 transition-all duration-200 ${
                                            option.isCorrect 
                                                ? 'bg-green-500 text-white border-green-500 shadow-lg' 
                                                : 'bg-muted border-border text-muted-foreground hover:border-border/80'
                                        }`}
                                    >
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`leading-relaxed text-base ${option.isCorrect ? 'font-medium text-green-800 dark:text-green-400' : 'text-foreground'}`}>
                                            {option.text}
                                        </div>
                                        {option.isCorrect && (
                                            <Badge variant="outline" className="mt-2 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50">
                                                ✓ Resposta Correta
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-yellow-300 dark:border-yellow-700 rounded-xl bg-yellow-50 dark:bg-yellow-950/20">
                            <div className="text-yellow-800 dark:text-yellow-400 font-semibold text-lg mb-2">⚠️ Alternativas não disponíveis</div>
                            <p className="text-yellow-700 dark:text-yellow-500 text-sm leading-relaxed">
                                Esta questão está marcada como múltipla escolha mas não possui alternativas cadastradas.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Área de resposta para questões dissertativas */}
            {(question.type === 'dissertativa' || question.type === 'open') && (
                <div className="space-y-4 mb-8">
                    <h4 className="font-semibold text-lg text-foreground mb-4">Área de Resposta</h4>
                    <div className="answer-area rounded-xl p-6 bg-muted border-2 border-dashed border-border">
                        <Label htmlFor="answer-area" className="text-sm font-medium text-muted-foreground block mb-3">
                            Espaço destinado para a resposta do estudante
                        </Label>
                        <Textarea
                            id="answer-area"
                            placeholder="O estudante deve desenvolver sua resposta aqui, demonstrando conhecimento e raciocínio sobre o tema abordado na questão..."
                            className="min-h-[140px] resize-none bg-card border-border focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950/30 text-foreground placeholder:text-muted-foreground"
                            disabled
                        />
                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                            📝 Esta área será preenchida pelo estudante durante a avaliação e será corrigida pelo professor.
                        </p>
                    </div>
                </div>
            )}

            {/* Resolução/Gabarito */}
            {!isLoadingDetails && question.solution && question.solution.trim() !== '' && (
                <div className="resolution-section space-y-4 border-t border-border pt-8">
                    <h4 className="font-semibold text-lg text-foreground flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">💡</span>
                        Resolução
                    </h4>
                    <div className="resolution-content bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                        <div className="text-base leading-relaxed text-foreground">
                            <SimpleHtmlRenderer content={question.formattedSolution || question.solution} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionPreview;