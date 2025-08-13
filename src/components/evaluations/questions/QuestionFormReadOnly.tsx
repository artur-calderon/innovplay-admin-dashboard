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
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { useAuth } from "@/context/authContext";

// Form schema
const questionSchema = z.object({
    title: z.string().min(1, "O conteúdo é obrigatório"),
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
    ).optional(),
    secondStatement: z.string().optional(),
    skills: z.array(z.string()).optional(),
    topics: z.string().optional(),
    questionType: z.enum(['multipleChoice', 'dissertativa']),
}).refine((data) => {
    // Se for múltipla escolha, as opções são obrigatórias
    if (data.questionType === 'multipleChoice') {
        return data.options && data.options.length >= 3 && data.options.some(opt => opt.isCorrect);
    }
    return true;
}, {
    message: "Para questões de múltipla escolha, é necessário pelo menos 3 alternativas e uma correta",
    path: ["options"]
});

type QuestionFormValues = z.infer<typeof questionSchema>;

// Tipagem para resposta de habilidades na API
interface ApiSkill {
    id: string;
    code: string;
    description: string;
}

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
    const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
    const [skillsOptions, setSkillsOptions] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const response = await api.get("/subjects");
                setSubjects(response.data);
            } catch (error) {
                console.error("Erro ao buscar disciplinas:", error);
            }
        };
        const fetchGrades = async () => {
            try {
                const response = await api.get("/grades/");
                setGrades(response.data);
            } catch (error) {
                console.error("Erro ao buscar séries:", error);
            }
        };
        const fetchSkills = async () => {
            if (data.subjectId) {
                try {
                    const response = await api.get<ApiSkill[]>(`/skills/subject/${data.subjectId}`);
                    if (Array.isArray(response.data)) {
                        setSkillsOptions(response.data.map((skill) => ({ id: skill.id, name: `${skill.code} - ${skill.description}` })));
                    } else {
                        setSkillsOptions([]);
                    }
                } catch (error) {
                    setSkillsOptions([]);
                }
            }
        };
        fetchSubjects();
        fetchGrades();
        fetchSkills();
    }, [data.subjectId]);

    const selectedSubject = subjects.find(s => s.id === data.subjectId);
    const selectedGrade = grades.find(g => g.id === data.grade);
    // Buscar nomes das habilidades (apenas os 7 primeiros caracteres)
    const selectedSkills = (data.skills && Array.isArray(data.skills))
        ? data.skills.map(skillId => {
            const name = skillsOptions.find(opt => opt.id === skillId)?.name || skillId;
            return name.substring(0, 6);
        })
        : [];

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
                    <Badge variant="outline">{selectedGrade?.name || data.grade}</Badge>
                    <Badge variant="outline">{selectedSubject?.name || data.subjectId}</Badge>
                    <Badge variant="outline">{data.difficulty}</Badge>
                    <Badge variant="outline">Valor: {data.value}</Badge>
                    {selectedSkills.length > 0 && (
                        <Badge variant="outline">{selectedSkills.join(", ")}</Badge>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {/* Render statement using Tiptap EditorContent */}
                <div>
                    <h4 className="font-medium mb-2">Enunciado:</h4>
                    {statementEditor && (
                        <div className="prose max-w-none">
                            <EditorContent editor={statementEditor} />
                        </div>
                    )}
                </div>
                {data.secondStatement && (
                    <div>
                        <h4 className="font-medium mb-2">Segundo Enunciado:</h4>
                        {/* Render second statement using Tiptap EditorContent */}
                        {secondStatementEditor && (
                            <div className="prose max-w-none">
                                <EditorContent editor={secondStatementEditor} />
                            </div>
                        )}
                    </div>
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
    const [skills, setSkills] = useState<Option[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [questionType, setQuestionType] = useState<'multipleChoice' | 'dissertativa'>('multipleChoice');
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
            skills: [],
            topics: "",
            questionType: 'multipleChoice',
        },
    });

    // useFieldArray para opções
    const { fields, append, update, remove } = useFieldArray({
        control: form.control,
        name: "options"
    });

    useEffect(() => {
        form.setValue('questionType', questionType);

        // Limpar opções quando mudar para dissertativa
        if (questionType === 'dissertativa') {
            form.setValue('options', []);
            form.clearErrors('options');
        } else {
            // Adicionar opções padrão quando mudar para múltipla escolha
            form.setValue('options', [
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
            ]);
        }
    }, [questionType, form]);

    // Função para adicionar alternativa
    const addOption = () => {
        if (fields.length < 5) {
            append({ text: "", isCorrect: false });
        }
    };

    // Função para marcar uma alternativa como correta
    const handleRadioChange = (index: number) => {
        const currentOptions = form.getValues("options");
        currentOptions.forEach((option, i) => {
            update(i, { ...option, isCorrect: i === index });
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

    useEffect(() => {
        const fetchSkills = async () => {
            if (evaluationData.subject && evaluationData.grade) {
                try {
                    const [bySubjectRes, byGradeRes] = await Promise.all([
                        api.get<ApiSkill[]>(`/skills/subject/${evaluationData.subject}`),
                        api.get<ApiSkill[]>(`/skills/grade/${evaluationData.grade}`),
                    ]);

                    const bySubject: ApiSkill[] = Array.isArray(bySubjectRes.data) ? bySubjectRes.data : [];
                    const byGrade: ApiSkill[] = Array.isArray(byGradeRes.data) ? byGradeRes.data : [];

                    const byGradeIds = new Set(byGrade.map((s) => s.id));
                    const intersected = bySubject.filter((s) => byGradeIds.has(s.id));

                    const formattedSkills: Option[] = intersected.map((skill) => ({
                        id: skill.id,
                        name: `${skill.code} - ${skill.description}`,
                        code: skill.code,
                    }));
                    setSkills(formattedSkills);
                } catch (error) {
                    console.error("Erro ao buscar habilidades:", error);
                    setSkills([]);
                    toast({
                        title: "Aviso",
                        description: "Nenhuma habilidade encontrada para esta disciplina/série.",
                        variant: "default",
                    });
                }
            }
        };
        fetchSkills();
    }, [evaluationData.subject, evaluationData.grade, toast]);

    useEffect(() => {
        form.setValue('subjectId', evaluationData.subject);
    }, [evaluationData.subject, form]);

    const handleFormSubmit = async (data: QuestionFormValues) => {
        try {
            // LOG: Mostrar todos os dados do formulário antes do envio
            console.log('=== DADOS DO FORMULÁRIO ANTES DO ENVIO ===');
            console.log('Dados completos do formulário:', data);
            console.log('Campo secondStatement:', data.secondStatement);
            console.log('Tipo do secondStatement:', typeof data.secondStatement);
            console.log('Tamanho do secondStatement:', data.secondStatement?.length);
            console.log('==========================================');

            // Mapear o tipo da questão para o formato esperado pela API
            const questionTypeForAPI = data.questionType === 'multipleChoice' ? 'multipleChoice' : 'dissertativa';
            
            // Monta as opções com id baseado na letra (apenas para múltipla escolha)
            const options = data.questionType === 'multipleChoice' ? (data.options || []).map((opt, index) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
            })) : [];

            // skills como array de strings
            const skills = Array.isArray(data.skills) ? data.skills : [];

            // Encontrar o subject e grade para criar o objeto Question completo
            const selectedSubject = subjects.find(s => s.id === data.subjectId);
            const selectedGrade = grades.find(g => g.id === data.grade);

            const question: Question = {
                id: '', // Será gerado pelo backend
                title: data.title,
                text: data.text,
                secondStatement: data.secondStatement || '',
                type: questionTypeForAPI,
                subjectId: data.subjectId,
                subject: selectedSubject || { id: data.subjectId, name: '' },
                grade: selectedGrade || { id: data.grade, name: '' },
                difficulty: data.difficulty,
                value: Number(data.value),
                solution: data.solution || '',
                options,
                skills,
                created_by: '', // Será preenchido pelo backend
            };

            // LOG: Mostrar o objeto Question que será enviado
            console.log('=== OBJETO QUESTION QUE SERÁ ENVIADO ===');
            console.log('Objeto Question completo:', question);
            console.log('Campo secondStatement no objeto:', question.secondStatement);
            console.log('==========================================');
            await onQuestionAdded(question);
            form.reset();
            toast({
                title: "Sucesso",
                description: "Questão salva com sucesso!",
                variant: "default",
            });
        } catch (error) {
            console.error("QuestionFormReadOnly - error in handleFormSubmit:", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar a avaliação",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Botão de preview */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    type="button"
                    className="flex items-center gap-2"
                >
                    <Eye className="h-4 w-4" />
                    {showPreview ? "Voltar à Edição" : "Visualizar"}
                </Button>
            </div>

            {showPreview ? (
                <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Eye className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-800">Preview da Questão</h3>
                    </div>
                    <QuestionPreview data={{ ...form.getValues(), questionType }} />
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">

                        {/* Seção: Informações Básicas */}
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                            <div className="flex items-center gap-2 mb-4">
                                <Book className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-800">Informações Básicas</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="sm:col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-semibold text-gray-700">Titulo da Questão *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Ex: Propriedades dos números naturais"
                                                        className="h-11 text-base"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="grade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-gray-700">Série *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    value={grades.find(g => g.id === evaluationData.grade)?.name || ""}
                                                    readOnly
                                                    className="h-11 bg-gray-50"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="subjectId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-gray-700">Disciplina *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    value={subjects.find(s => s.id === evaluationData.subject)?.name || ""}
                                                    readOnly
                                                    className="h-11 bg-gray-50"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="difficulty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-gray-700">Dificuldade *</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-11">
                                                        <SelectValue placeholder="Selecione a dificuldade" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Abaixo do Básico">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                                Abaixo do Básico
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="Básico">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                                Básico
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="Adequado">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                                                Adequado
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="Avançado">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full bg-green-700"></div>
                                                                Avançado
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-gray-700">Valor da Questão *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.1"
                                                    placeholder="Ex: 2.5"
                                                    className="h-11"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="skills"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-gray-700">
                                                Habilidades (BNCC)
                                                <span className="text-gray-500 font-normal ml-1">
                                                    {skills.length > 0 ? `(${skills.length} disponíveis)` : ''}
                                                </span>
                                            </FormLabel>
                                            <FormControl>
                                                <MultiSelect
                                                    options={skills}
                                                    selected={field.value || []}
                                                    onChange={field.onChange}
                                                    placeholder="Selecione as habilidades"
                                                    className="w-full"
                                                    label=""
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            {(field.value || []).length > 0 && (
                                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <div className="text-sm font-medium text-blue-800 mb-2">
                                                        Habilidades Selecionadas ({(field.value || []).length}):
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(field.value || []).map((skillId: string) => {
                                                            const skill = skills.find(opt => opt.id === skillId);
                                                            return skill ? (
                                                                <Badge key={skillId} variant="outline" className="text-xs bg-white border-blue-300">
                                                                    {skill.code}
                                                                </Badge>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Seção: Tipo de Questão */}
                        <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                            <div className="flex items-center gap-2 mb-4">
                                <ListIcon className="h-5 w-5 text-purple-600" />
                                <h3 className="text-lg font-semibold text-gray-800">Tipo de Questão</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <Button
                                    type="button"
                                    variant={questionType === 'multipleChoice' ? 'default' : 'outline'}
                                    size="lg"
                                    onClick={() => setQuestionType('multipleChoice')}
                                    className={`w-full h-auto min-h-[4rem] p-4 ${questionType === 'multipleChoice'
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                                        : 'hover:bg-purple-50 hover:border-purple-300'
                                        }`}
                                >
                                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                                        <Check className="h-5 w-5 flex-shrink-0" />
                                        <div className="text-center sm:text-left">
                                            <div className="font-semibold text-sm sm:text-base">Múltipla Escolha</div>
                                            <div className="text-xs opacity-80 hidden sm:block">Questão com alternativas A, B, C, D...</div>
                                        </div>
                                    </div>
                                </Button>

                                <Button
                                    type="button"
                                    variant={questionType === 'dissertativa' ? 'default' : 'outline'}
                                    size="lg"
                                    onClick={() => setQuestionType('dissertativa')}
                                    className={`w-full h-auto min-h-[4rem] p-4 ${questionType === 'dissertativa'
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                                        : 'hover:bg-purple-50 hover:border-purple-300'
                                        }`}
                                >
                                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                                        <Type className="h-5 w-5 flex-shrink-0" />
                                        <div className="text-center sm:text-left">
                                            <div className="font-semibold text-sm sm:text-base">Dissertativa</div>
                                            <div className="text-xs opacity-80 hidden sm:block">Questão com resposta livre do aluno</div>
                                        </div>
                                    </div>
                                </Button>
                            </div>
                        </div>

                        {/* Seção: Enunciados */}
                        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                            <div className="flex items-center gap-2 mb-4">
                                <Type className="h-5 w-5 text-green-600" />
                                <h3 className="text-lg font-semibold text-gray-800">Enunciados</h3>
                            </div>

                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="text"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-gray-700">Enunciado Principal *</FormLabel>
                                            <FormControl>
                                                <MyEditor
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="secondStatement"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-gray-700">
                                                Segundo Enunciado
                                                <span className="text-gray-500 font-normal ml-1">(opcional)</span>
                                            </FormLabel>
                                            <FormControl>
                                                <MyEditor
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Seção: Alternativas (apenas para múltipla escolha) */}
                        {questionType === 'multipleChoice' && (
                            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-orange-600" />
                                        <h3 className="text-lg font-semibold text-gray-800">Alternativas</h3>
                                    </div>
                                    {fields.length < 5 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addOption}
                                            className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Adicionar Alternativa
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => handleRadioChange(index)}
                                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${form.watch("options")[index].isCorrect
                                                    ? 'bg-green-500 border-green-500 text-white shadow-lg'
                                                    : 'bg-white border-gray-300 hover:border-gray-400'
                                                    }`}
                                                aria-label={`Marcar alternativa ${String.fromCharCode(65 + index)} como correta`}
                                            >
                                                {form.watch("options")[index].isCorrect ? <Check className="w-4 h-4" /> : null}
                                            </button>

                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                                                {String.fromCharCode(65 + index)}
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name={`options.${index}.text`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder={`Digite a alternativa ${String.fromCharCode(65 + index)}`}
                                                                className="h-11 text-base"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {fields.length > 3 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => remove(index)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    aria-label="Remover alternativa"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {form.formState.errors.options && (
                                    <p className="text-red-600 text-sm mt-2">
                                        {form.formState.errors.options.message}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Seção: Resolução */}
                        <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-200">
                            <div className="flex items-center gap-2 mb-4">
                                <Save className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-lg font-semibold text-gray-800">
                                    Resolução
                                    <span className="text-gray-500 font-normal ml-1">(opcional)</span>
                                </h3>
                            </div>

                            <FormField
                                control={form.control}
                                name="solution"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-semibold text-gray-700">
                                            Explicação detalhada da resolução
                                        </FormLabel>
                                        <FormControl>
                                            <MyEditor
                                                value={field.value || ""}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Botões de ação */}
                        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                size="lg"
                                className="w-full sm:w-auto px-6 sm:px-8 order-2 sm:order-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full sm:w-auto px-6 sm:px-8 bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    <span>Criar Questão</span>
                                </div>
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
};

export default QuestionFormReadOnly; 