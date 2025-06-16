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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Book, Check, List as ListIcon, Minus, Plus, Save, Eye, Heading1, Heading2, Heading3, List, Code, Type } from "lucide-react";
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

// Import Tiptap components and extensions for preview
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

// Form schema
const questionSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  text: z.string().min(1, "O enunciado é obrigatório"),
  subjectId: z.string().min(1, "A disciplina é obrigatória"),
  grade: z.string().min(1, "A série é obrigatória"),
  difficulty: z.string().min(1, "A dificuldade é obrigatória"),
  value: z.string().min(1, "O valor é obrigatório"),
  solution: z.string().min(1, "A solução é obrigatória"),
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

interface QuestionFormProps {
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

interface EditorContent {
  type: string;
  content?: EditorContent[];
  text?: string;
  attrs?: Record<string, unknown>;
}

const QuestionPreview = ({ data }: { data: QuestionFormValues }) => {
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
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
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
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
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
  questionNumber,
  evaluationData,
}: QuestionFormProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      secondStatement: "",
      skills: "",
      topics: "",
    },
  });

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

    fetchSubjects();
  }, [toast]);

  const handleFormSubmit = async (data: QuestionFormValues) => {
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
    // Aqui, se for cadastro avulso, pode chamar a API diretamente
    try {
      setIsSubmitting(true);
      await api.post("/question", question);
      toast({
        title: "Sucesso",
        description: "Questão criada com sucesso!",
      });
      if (externalOnSubmit) {
        externalOnSubmit(question);
      }
      onQuestionAdded && onQuestionAdded(question);
      onClose();
    } catch (error) {
      console.error("Erro ao criar questão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a questão",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
                      <Input {...field} />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              </div>
              {form.getValues("options").map((_, index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`options.${index}.text`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <RadioGroup
                            value={form.getValues(`options.${index}.isCorrect`) ? "true" : "false"}
                            onValueChange={(value) => {
                              form.setValue(`options.${index}.isCorrect`, value === "true");
                            }}
                            className="flex items-center"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id={`correct-${index}`} />
                              <Label htmlFor={`correct-${index}`}>Correta</Label>
                            </div>
                          </RadioGroup>
                          <Input {...field} className="flex-1" />
                        </div>
                      </FormControl>
                      {form.formState.errors.options?.[index]?.text && (
                        <FormMessage />
                      )}
                    </FormItem>
                  )}
                />
              ))}
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

            <FormField
              control={form.control}
              name="topics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tópicos (separados por vírgula)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  {form.formState.errors.topics && (
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
