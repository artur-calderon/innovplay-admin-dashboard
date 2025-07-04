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
import SkillsSelector from "./SkillsSelector";

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
  title: z.string().min(1, "O conteúdo é obrigatório"),
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

interface SkillOption {
  id: string;
  name: string;
  code: string;
  description: string;
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

          const normalizeSkills = (skills: string[] | { id: string }[]): string[] => {
            if (!skills) return [];
            
            if (Array.isArray(skills)) {
              if (skills.length === 0) return [];
              
              // Se é array de strings
              if (typeof skills[0] === 'string') {
                return skills as string[];
              }
              
              // Se é array de objetos com id
              return skills.map((skill: { id: string }) => skill.id);
            }
            
            return [];
          };

          const formData = {
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
          };

          // Map API data to form values
          form.reset(formData);
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
          
          // Só reseta a série se não estivermos carregando uma questão existente
          // ou se o usuário mudou o curso manualmente
          const currentGradeValue = form.getValues("grade");
          const isEditingExistingQuestion = questionId && currentGradeValue;
          
          if (!isEditingExistingQuestion) {
            form.setValue("grade", ""); // Reseta a série apenas quando necessário
          }
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
  }, [selectedEducationStageId, form, toast, questionId]);

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
              description: skill.description,
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

    const payload = {
      title: data.title,
      text: htmlToText(data.text),
      formattedText: data.text,
      type: data.questionType,
      subjectId: data.subjectId,
      educationStageId: data.educationStageId,
      grade: data.grade,
      gradeId: data.grade, // Campo alternativo para compatibilidade
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
      if (onQuestionAdded) {
        onQuestionAdded(updatedOrNewQuestion);
      }
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

  // Encontrar a skill que corresponde ao select
  useEffect(() => {
    if (selectedEducationStageId && selectedSubjectId) {
      const matchingSkill = skills.find(skill => 
        skill.education_stage === selectedEducationStageId && 
        skill.subject === selectedSubjectId
      );
      
      if (matchingSkill) {
        // Resetar a seleção anterior
        form.setValue('skill', '');
        
        // Configurar nova skill
        form.setValue('skill', matchingSkill.id);
      }
    }
  }, [selectedEducationStageId, selectedSubjectId, skills, form]);

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
          {(() => {
            const formData = form.getValues();
            const previewQuestion: Question = {
              id: 'preview',
              title: formData.title,
              text: formData.text,
              formattedText: formData.text,
              type: formData.questionType,
              subjectId: formData.subjectId,
              subject: subjects.find(s => s.id === formData.subjectId) || { id: formData.subjectId, name: 'Carregando...' },
              grade: grades.find(g => g.id === formData.grade) || { id: formData.grade, name: 'Carregando...' },
              difficulty: formData.difficulty,
              value: formData.value,
              solution: formData.solution || '',
              formattedSolution: formData.solution || '',
              options: formData.questionType === 'multipleChoice' ? formData.options.map((o, i) => ({ 
                ...o, 
                id: `preview-${i}`, 
                text: o.text || '', 
                isCorrect: o.isCorrect || false 
              })) : [],
              skills: formData.skills || [],
              created_by: user?.id || '',
              secondStatement: formData.secondStatement,
              educationStage: null
            };
            return <QuestionPreview question={previewQuestion} />;
          })()}
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
                        <FormLabel className="text-sm font-semibold text-gray-700">Conteúdo da Questão *</FormLabel>
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
                  name="educationStageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Curso *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11">
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Série *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedEducationStageId || grades.length === 0}
                        >
                          <SelectTrigger className="h-11">
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
                        <SkillsSelector
                          skills={skills}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder={selectedSubjectId ? "Clique para abrir o seletor de habilidades" : "Selecione uma disciplina primeiro"}
                          disabled={!selectedSubjectId || skills.length === 0}
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
                  onClick={() => handleSetQuestionType('multipleChoice')}
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
                  variant={questionType === 'open' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleSetQuestionType('open')}
                  className={`w-full h-auto min-h-[4rem] p-4 ${questionType === 'open' 
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
                      onClick={() => append({ text: "", isCorrect: false })}
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
                        onClick={() => {
                          form.getValues("options").forEach((_, i) => {
                            form.setValue(`options.${i}.isCorrect`, i === index);
                          });
                        }}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          form.watch("options")[index].isCorrect 
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
                      
                      {fields.length > 2 && (
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
                disabled={isSubmitting}
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </div>
                ) : questionId ? (
                  <div className="flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    <span>Atualizar Questão</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Criar Questão</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default QuestionForm;
