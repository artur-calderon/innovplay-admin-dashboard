import React, { useState, useEffect, useRef } from "react";
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
import {
  Remirror,
  useRemirror,
  EditorComponent,
  RemirrorProps,
  useActive,
  useCommands,
} from '@remirror/react';
import { DocExtension } from '@remirror/extension-doc';
import { ParagraphExtension } from '@remirror/extension-paragraph';
import { TextExtension } from '@remirror/extension-text';
import { HeadingExtension } from '@remirror/extension-heading';
import { BulletListExtension, ListItemExtension } from '@remirror/extension-list';
import { ImageExtension } from '@remirror/extension-image';
import { CodeBlockExtension } from '@remirror/extension-code-block';
import { CodeExtension } from '@remirror/extension-code';
import { PlaceholderExtension } from '@remirror/extension-placeholder';
import { SupExtension } from '@remirror/extension-sup';
import 'remirror/styles/all.css';

import './QuestionForm.css';
import MyEditor from './MyEditor';
import './MyEditor.css';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Question, Subject } from "../types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { useAuth } from "@/context/authContext";
import QuestionPreview from "./QuestionPreview";

// Import Tiptap components and extensions for preview
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { ResizableImage } from 'tiptap-extension-resizable-image';

// Form schema
const baseSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  text: z.string().min(1, "O enunciado é obrigatório"),
  educationStageId: z.string().min(1, "O curso é obrigatório"),
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
  questionType: z.enum(['multipleChoice', 'open']),
});

const questionSchema = baseSchema.superRefine((data, ctx) => {
  if (data.questionType === 'multipleChoice') {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adicione pelo menos duas alternativas.',
        path: ['options'],
      });
    } else {
      data.options.forEach((opt, idx) => {
        if (!opt.text || opt.text.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'O texto da alternativa é obrigatório.',
            path: ['options', idx, 'text'],
          });
        }
      });
      if (!data.options.some(opt => opt.isCorrect)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Marque uma alternativa como correta.',
          path: ['options'],
        });
      }
    }
  }
  // Se for dissertativa, não validar nem exigir alternativas
  if (data.questionType === 'open') {
    // options pode ser undefined ou array vazio
    if (data.options && data.options.length > 0) {
      // Não precisa validar nada, mas pode limpar se quiser
    }
  }
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  onSubmit?: (data: QuestionFormValues) => void;
  open?: boolean;
  onClose: () => void;
  onQuestionAdded: (question: Question) => void;
  questionId?: string;
}

interface SkillOption extends Option {
  code: string;
}

interface EditorContent {
  type: string;
  content?: EditorContent[];
  text?: string;
  attrs?: Record<string, unknown>;
}

const EditorToolbar = () => {
  const { toggleHeading, toggleBulletList, toggleCode, toggleCodeBlock, insertImage, toggleSup } = useCommands();
  const active = useActive();

  const isHeadingActive = (level: number) => {
    try {
      return active.heading({ level });
    } catch {
      return false;
    }
  };

  const isBulletListActive = () => {
    try {
      return active.bulletList();
    } catch {
      return false;
    }
  };

  const isCodeActive = () => {
    try {
      return active.code();
    } catch {
      return false;
    }
  };

  const isCodeBlockActive = () => {
    try {
      return active.codeBlock();
    } catch {
      return false;
    }
  };

  const isSupActive = () => {
    try {
      return active.sup();
    } catch {
      return false;
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          if (url) {
            insertImage({ src: url, alt: file.name });
          }
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  };

  return (
    <div className="border-b p-2 flex flex-wrap gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleHeading({ level: 1 })}
        className={isHeadingActive(1) ? 'bg-muted' : ''}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleHeading({ level: 2 })}
        className={isHeadingActive(2) ? 'bg-muted' : ''}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleHeading({ level: 3 })}
        className={isHeadingActive(3) ? 'bg-muted' : ''}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleBulletList()}
        className={isBulletListActive() ? 'bg-muted' : ''}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleCode()}
        className={isCodeActive() ? 'bg-muted' : ''}
        title="Inline Code"
      >
        <Type className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleCodeBlock()}
        className={isCodeBlockActive() ? 'bg-muted' : ''}
        title="Code Block"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleSup()}
        className={isSupActive() ? 'bg-muted' : ''}
        title="Superscript"
      >
        <span className="text-xs font-bold">x²</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleImageUpload}
        title="Insert Image"
      >
        🖼️
      </Button>
    </div>
  );
};

const QuestionForm = ({
  onSubmit: externalOnSubmit,
  open,
  onClose,
  onQuestionAdded,
  questionId,
}: QuestionFormProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [educationStages, setEducationStages] = useState<Option[]>([]);
  const [grades, setGrades] = useState<Option[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionType, setQuestionType] = useState<'multipleChoice' | 'open'>('multipleChoice');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: "",
      text: "",
      educationStageId: "",
      subjectId: "",
      grade: "",
      difficulty: "",
      value: "",
      solution: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      secondStatement: "",
      skills: [],
      questionType: 'multipleChoice',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const selectedEducationStageId = form.watch("educationStageId");
  const selectedSubjectId = form.watch("subjectId");

  useEffect(() => {
    const fetchQuestionData = async () => {
      if (questionId) {
        try {
          const response = await api.get<Question>(`/questions/${questionId}`);
          const questionData = response.data;

          const normalizeSkills = (skills: any): string[] => {
            if (Array.isArray(skills)) return skills;
            if (typeof skills === 'string' && skills.length > 0) return skills.split(',').map(s => s.trim());
            return [];
          };

          // Map API data to form values
          form.reset({
            title: questionData.title || "",
            text: questionData.formattedText || questionData.text || "",
            educationStageId: questionData.educationStage?.id || "",
            subjectId: questionData.subject?.id || "",
            grade: questionData.grade?.id || "",
            difficulty: questionData.difficulty || "",
            value: questionData.value?.toString() || "",
            solution: questionData.formattedSolution || questionData.solution || "",
            options: questionData.options || [],
            secondStatement: questionData.secondStatement || "",
            skills: normalizeSkills(questionData.skills),
            questionType: questionData.type === 'open' ? 'open' : 'multipleChoice',
          });
          setQuestionType(questionData.type === 'open' ? 'open' : 'multipleChoice');
        } catch (error) {
          console.error("Erro ao buscar dados da questão:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados da questão para edição.",
            variant: "destructive",
          });
        }
      }
    };
    fetchQuestionData();
  }, [questionId, form, toast]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [subjectsResponse, stagesResponse] = await Promise.all([
          api.get("/subjects"),
          api.get("/education_stages"),
        ]);
        setSubjects(subjectsResponse.data);
        setEducationStages(stagesResponse.data);
      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados iniciais do formulário.",
          variant: "destructive",
        });
      }
    };
    fetchInitialData();
  }, [toast]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (selectedEducationStageId) {
        try {
          const response = await api.get(`/grades/education-stage/${selectedEducationStageId}`);
          setGrades(response.data);
          form.setValue("grade", ""); // Reseta a série ao mudar de curso
        } catch (error) {
          console.error("Erro ao buscar séries:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as séries para este curso.",
            variant: "destructive",
          });
        }
      } else {
        setGrades([]);
      }
    };
    fetchGrades();
  }, [selectedEducationStageId, form, toast]);

  useEffect(() => {
    const fetchSkills = async () => {
      if (selectedSubjectId) {
        form.setValue("skills", []); // Reseta as habilidades ao mudar de disciplina
        try {
          const response = await api.get(`/skills/subject/${selectedSubjectId}`);
          if (Array.isArray(response.data)) {
            const formattedSkills: SkillOption[] = response.data.map(skill => ({
              id: skill.id,
              name: `${skill.code} - ${skill.description}`,
              code: skill.code,
            }));
            setSkills(formattedSkills);
          } else {
            setSkills([]);
          }
        } catch (error) {
          console.error("Erro ao buscar habilidades:", error);
          setSkills([]); // Garante que a lista esteja vazia em caso de erro
          toast({
            title: "Aviso",
            description: "Nenhuma habilidade encontrada para esta disciplina.",
            variant: "default",
          });
        }
      } else {
        setSkills([]);
      }
    };
    fetchSkills();
  }, [selectedSubjectId, form, toast]);

  useEffect(() => {
    form.setValue('questionType', questionType);
  }, [questionType]);

  const htmlToText = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  const handleFormSubmit = async (data: QuestionFormValues) => {
    if (!user) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar logado para criar uma questão.",
        variant: "destructive",
      });
      return;
    }

    const selectedGrade = grades.find(g => g.id === data.grade);

    const payload = {
      title: data.title,
      text: htmlToText(data.text),
      formattedText: data.text,
      type: data.questionType,
      subjectId: data.subjectId,
      educationStageId: data.educationStageId,
      grade: data.grade,
      difficulty: data.difficulty,
      value: data.value ? parseFloat(data.value) : 0,
      solution: data.solution ? htmlToText(data.solution) : "",
      formattedSolution: data.solution || "",
      options: data.questionType === 'multipleChoice' ? data.options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect })) : [],
      skills: data.skills || [],
      secondStatement: data.secondStatement || '',
      lastModifiedBy: user.id,
      createdBy: user.id,
    };

    try {
      setIsSubmitting(true);
      let response;
      if (questionId) {
        // Update existing question
        response = await api.put(`/questions/${questionId}`, { ...payload, last_modified_by: user.id });
      } else {
        // Create new question
        response = await api.post("/questions", { ...payload, created_by: user.id });
      }

      const updatedOrNewQuestion: Question = response.data;
      toast({
        title: "Sucesso",
        description: `Questão ${questionId ? 'atualizada' : 'criada'} com sucesso!`,
      });
      if (externalOnSubmit) {
        externalOnSubmit(data);
      }
      onQuestionAdded && onQuestionAdded(updatedOrNewQuestion);
      onClose();
    } catch (error) {
      console.error(`Erro ao ${questionId ? 'atualizar' : 'criar'} questão:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível ${questionId ? 'atualizar' : 'criar'} a questão`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetQuestionType = (type: 'multipleChoice' | 'open') => {
    setQuestionType(type);
    if (type === 'multipleChoice') {
      form.setValue('options', [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
      form.clearErrors('options');
    } else if (type === 'open') {
      form.setValue('options', []);
      form.clearErrors('options');
    }
  };

  const selectedSkills = (form.watch('skills') && Array.isArray(form.watch('skills')))
    ? form.watch('skills').map((skillId: string) => {
      const skill = skills.find(opt => opt.id === skillId);
      return skill ? skill.name.substring(0, 6) : skillId;
    })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
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
          {(() => {
            const formData = form.getValues();
            const previewQuestion: Question = {
              id: 'preview',
              title: formData.title,
              text: formData.text,
              type: formData.questionType,
              subjectId: formData.subjectId,
              subject: subjects.find(s => s.id === formData.subjectId) || { id: formData.subjectId, name: 'Carregando...' },
              grade: grades.find(g => g.id === formData.grade) || { id: formData.grade, name: 'Carregando...' },
              difficulty: formData.difficulty,
              value: formData.value,
              solution: formData.solution || '',
              options: formData.questionType === 'multipleChoice' ? formData.options.map((o, i) => ({ ...o, id: `preview-${i}`, text: o.text || '', isCorrect: o.isCorrect || false })) : [],
              skills: formData.skills || [],
              created_by: user.id || '',
              secondStatement: formData.secondStatement
            };
            return <QuestionPreview question={previewQuestion} />;
          })()}
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
                    {form.formState.errors.title && <FormMessage />}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="educationStageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o curso" />
                        </SelectTrigger>
                        <SelectContent>
                          {educationStages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {form.formState.errors.educationStageId && <FormMessage />}
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {form.formState.errors.subjectId && <FormMessage />}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dificuldade</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a dificuldade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fácil">Fácil</SelectItem>
                          <SelectItem value="Médio">Médio</SelectItem>
                          <SelectItem value="Difícil">Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {form.formState.errors.difficulty && <FormMessage />}
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
                    {form.formState.errors.value && <FormMessage />}
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedEducationStageId || grades.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedEducationStageId ? "Selecione a série" : "Selecione um curso primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {grades.map((grade) => (
                            <SelectItem key={grade.id} value={grade.id}>
                              {grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {form.formState.errors.grade && <FormMessage />}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Habilidades</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={skills}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder={selectedSubjectId ? "Selecione as habilidades" : "Selecione uma disciplina primeiro"}
                        className="w-full"
                        label=""
                      />
                    </FormControl>
                    {form.formState.errors.skills && <FormMessage />}
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
                  {form.formState.errors.text && <FormMessage />}
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
                  {form.formState.errors.secondStatement && <FormMessage />}
                </FormItem>
              )}
            />
            <div className="flex items-center gap-4 mb-2">
              <span className="font-medium">Tipo de Questão:</span>
              <Button
                type="button"
                variant={questionType === 'multipleChoice' ? 'default' : 'outline'}
                onClick={() => handleSetQuestionType('multipleChoice')}
                className={questionType === 'multipleChoice' ? 'bg-primary text-white' : ''}
              >
                Múltipla Escolha
              </Button>
              <Button
                type="button"
                variant={questionType === 'open' ? 'default' : 'outline'}
                onClick={() => handleSetQuestionType('open')}
                className={questionType === 'open' ? 'bg-primary text-white' : ''}
              >
                Dissertativa
              </Button>
            </div>
            {questionType === 'multipleChoice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="mb-0">Alternativas</Label>
                  {fields.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ text: "", isCorrect: false })}
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
                        onClick={() => {
                          form.getValues("options").forEach((_, i) => {
                            form.setValue(`options.${i}.isCorrect`, i === index);
                          });
                        }}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${form.watch("options")[index].isCorrect ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}
                        aria-label={`Marcar alternativa ${String.fromCharCode(65 + index)} como correta`}
                      >
                        {form.watch("options")[index].isCorrect ? <Check className="w-4 h-4" /> : null}
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
                      {fields.length > 1 && (
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
            )}
            <FormField
              control={form.control}
              name="solution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solução</FormLabel>
                  <FormControl>
                    <MyEditor
                      value={field.value}
                      onChange={field.onChange}
                    />
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default QuestionForm;
