import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Book, Check, List as ListIcon, Minus, Plus, Save, Eye, Heading1, Heading2, Heading3, List, Code, Type, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Question, Subject } from "../types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import './QuestionForm.css';
import MyEditor from './MyEditor';
import './MyEditor.css';

// Form schema
const questionSchema = z.object({
    title: z.string().min(1, "O título é obrigatório"),
    text: z.string().min(1, "O enunciado é obrigatório"),
    subjectId: z.string().min(1, "A disciplina é obrigatória"),
    grade: z.string().min(1, "A série é obrigatória"),
    difficulty: z.string().min(1, "A dificuldade é obrigatória"),
    value: z.string().min(1, "O valor é obrigatório"),
    solution: z.string().optional(),
    options: z.array(
        z.object({
            text: z.string().min(1, "O texto da opção é obrigatório"),
            isCorrect: z.boolean(),
        })
    ),
    secondStatement: z.string().optional(),
    skills: z.string().optional(),
    topics: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormReadOnlyProps {
    onSubmit?: (data: QuestionFormValues) => void;
    open: boolean;
    onClose: () => void;
    onQuestionAdded: (question: Question) => void;
    questionNumber: number;
    evaluationData: {
        course: string;
        grade: string;
        subject: string;
    };
}

const QuestionPreview: React.FC<{ data: QuestionFormValues }> = ({ data }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const response = await api.get("/subjects");
                setSubjects(response.data);
            } catch (error) {
                console.error("Erro ao buscar disciplinas:", error);
            }
        };

        fetchSubjects();
    }, []);

    const selectedSubject = subjects.find(s => s.id === data.subjectId);

    // Initialize read-only Tiptap editor for the preview statement
    const statementEditor = useEditor({
        extensions: [
            StarterKit,
            Superscript,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
                alignments: ['left', 'center', 'right'],
                defaultAlignment: 'left',
            }),
            Placeholder.configure({
                placeholder: '' // No placeholder in preview
            }),
        ],
        content: data.text,
        editable: false, // Make the preview editor read-only
    });

    // Initialize read-only Tiptap editor for the preview second statement
    const secondStatementEditor = useEditor({
        extensions: [
            StarterKit,
            Superscript,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
                alignments: ['left', 'center', 'right'],
                defaultAlignment: 'left',
            }),
            Placeholder.configure({
                placeholder: '' // No placeholder in preview
            }),
        ],
        content: data.secondStatement || '',
        editable: false, // Make the preview editor read-only
    });

    return (
        <div className="space-y-6 p-4">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{data.title}</h3>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{data.grade}</Badge>
                    <Badge variant="outline">{selectedSubject?.name || data.subjectId}</Badge>
                    <Badge variant="outline">{data.difficulty}</Badge>
                    <Badge variant="outline">Valor: {data.value}</Badge>
                    {data.skills && <Badge variant="outline">{data.skills}</Badge>}
                </div>
            </div>

            <div className="space-y-4">
                {/* Render statement using Tiptap EditorContent */}
                {statementEditor && (
                    <div className="prose max-w-none">
                        <EditorContent editor={statementEditor} />
                    </div>
                )}
                {data.secondStatement && (
                    // Render second statement using Tiptap EditorContent
                    secondStatementEditor && (
                        <div className="prose max-w-none">
                            <EditorContent editor={secondStatementEditor} />
                        </div>
                    )
                )}
            </div>

            {data.options.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium">Alternativas:</h4>
                    {data.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${option.isCorrect ? 'bg-primary text-primary-foreground' : 'bg-background'
                                }`}>
                                {String.fromCharCode(65 + index)}
                            </div>
                            <span>{option.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {data.solution && (
                <div className="space-y-2">
                    <h4 className="font-medium">Resolução:</h4>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.solution }} />
                </div>
            )}
        </div>
    );
};

const QuestionFormReadOnly = ({
    onSubmit: externalOnSubmit,
    open,
    onClose,
    onQuestionAdded,
    questionNumber,
    evaluationData,
}: QuestionFormReadOnlyProps) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const form = useForm<QuestionFormValues>({
        resolver: zodResolver(questionSchema),
        defaultValues: {
            title: "",
            text: "",
            subjectId: evaluationData.subject,
            grade: evaluationData.grade,
            difficulty: "",
            value: "",
            solution: "",
            options: [
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
            ],
            secondStatement: "",
            skills: "",
            topics: "",
        },
    });

    // useFieldArray para opções
    const { fields, append, update, remove } = useFieldArray({
        control: form.control,
        name: "options"
    });

    // Função para adicionar alternativa
    const addOption = () => {
        if (fields.length < 5) {
            append({ text: "", isCorrect: false });
        }
    };

    // Função para marcar uma alternativa como correta
    const handleRadioChange = (index: number) => {
        fields.forEach((_, i) => {
            update(i, { ...fields[i], isCorrect: i === index });
        });
    };

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const response = await api.get("/subjects");
                setSubjects(response.data);
            } catch (error) {
                console.error("Erro ao buscar disciplinas:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar as disciplinas",
                    variant: "destructive",
                });
            }
        };
        const fetchGrades = async () => {
            try {
                const response = await api.get("/grades/");
                setGrades(response.data);
            } catch (error) {
                console.error("Erro ao buscar séries:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar as séries",
                    variant: "destructive",
                });
            }
        };
        fetchSubjects();
        fetchGrades();
    }, [toast]);

    const handleFormSubmit = async (data: QuestionFormValues) => {
        try {
            // Monta as opções sem id
            const options = (data.options || []).map(opt => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
            }));
            // skills e topics como string
            const skills = typeof data.skills === 'string' ? data.skills : (data.skills || []).join(', ');
            const topics = typeof data.topics === 'string' ? data.topics : (data.topics || []).join(', ');
            const question = {
                title: data.title,
                text: data.text,
                secondStatement: data.secondStatement || '',
                subjectId: data.subjectId,
                grade: data.grade,
                difficulty: data.difficulty,
                value: data.value,
                solution: data.solution || '',
                options,
                skills,
                topics,
            };
            await onQuestionAdded(question);
            form.reset();
            navigate('/app/avaliacoes');
            onClose();
            toast({
                title: "Sucesso",
                description: "Avaliação salva com sucesso!",
                variant: "default",
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível salvar a avaliação",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Questão {questionNumber}</h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowPreview(!showPreview)}
                        type="button"
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        {showPreview ? "Editar" : "Visualizar"}
                    </Button>
                </div>
            </div>

            {showPreview ? (
                <div className="border rounded-lg p-4">
                    <QuestionPreview data={form.getValues()} />
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        {form.formState.errors.title && (
                                            <FormMessage />
                                        )}
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="grade"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Série</FormLabel>
                                        <FormControl>
                                            <Input value={grades.find(g => g.id === evaluationData.grade)?.name || ""} readOnly />
                                        </FormControl>
                                        {form.formState.errors.grade && (
                                            <FormMessage />
                                        )}
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="subjectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Disciplina</FormLabel>
                                        <FormControl>
                                            <Input value={subjects.find(s => s.id === evaluationData.subject)?.name || ""} readOnly />
                                        </FormControl>
                                        {form.formState.errors.subjectId && (
                                            <FormMessage />
                                        )}
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dificuldade</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a dificuldade" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Fácil">Fácil</SelectItem>
                                                <SelectItem value="Médio">Médio</SelectItem>
                                                <SelectItem value="Difícil">Difícil</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {form.formState.errors.difficulty && (
                                            <FormMessage />
                                        )}
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="number" step="0.1" />
                                        </FormControl>
                                        {form.formState.errors.value && (
                                            <FormMessage />
                                        )}
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="skills"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Habilidades (separadas por vírgula)</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        {form.formState.errors.skills && (
                                            <FormMessage />
                                        )}
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Enunciado</FormLabel>
                                    <FormControl>
                                        <MyEditor
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    {form.formState.errors.text && (
                                        <FormMessage />
                                    )}
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="secondStatement"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Segundo Enunciado (opcional)</FormLabel>
                                    <FormControl>
                                        <MyEditor
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    {form.formState.errors.secondStatement && (
                                        <FormMessage />
                                    )}
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Alternativas</Label>
                                {fields.length < 5 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addOption}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar Alternativa
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleRadioChange(index)}
                                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${form.watch(`options.${index}.isCorrect`) ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}
                                            aria-label={`Marcar alternativa ${String.fromCharCode(65 + index)} como correta`}
                                        >
                                            {form.watch(`options.${index}.isCorrect`) ? <Check className="w-4 h-4" /> : null}
                                        </button>
                                        <Label className="text-sm text-muted-foreground">
                                            {String.fromCharCode(65 + index)}
                                        </Label>
                                        <FormField
                                            control={form.control}
                                            name={`options.${index}.text`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    {form.formState.errors.options?.[index]?.text && (
                                                        <FormMessage />
                                                    )}
                                                </FormItem>
                                            )}
                                        />
                                        {fields.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="ml-2 text-destructive hover:bg-destructive/10 rounded p-1"
                                                aria-label="Remover alternativa"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="solution"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Solução</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    {form.formState.errors.solution && (
                                        <FormMessage />
                                    )}
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">
                                Salvar
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
};

export default QuestionFormReadOnly; 