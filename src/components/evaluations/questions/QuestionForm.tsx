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
import { MyEditor, ResizableImage } from './MyEditor';
import './MyEditor.css';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Question } from "../types";

// Import Tiptap components and extensions for preview
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

// Form schema
const questionSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres"),
  statement: z.string().min(10, "O enunciado precisa ter pelo menos 10 caracteres"),
  secondStatement: z.string().optional(),
  questionType: z.enum(["multipleChoice", "essay"]),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean().default(false)
  })).optional(),
  solution: z.string().optional(),
  educationLevel: z.string().min(1, "Selecione o nível de ensino"),
  grade: z.string().min(1, "Selecione a série"),
  subject: z.string().min(1, "Selecione a disciplina"),
  difficulty: z.string().min(1, "Selecione a dificuldade"),
  value: z.string().min(1, "Informe o valor da questão"),
  skills: z.string().min(1, "Informe as habilidades"),
  topics: z.array(z.string()).default([])
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  onSubmit?: (data: QuestionFormValues) => void;
  open: boolean;
  onClose: () => void;
  subjectId: string | null;
  onQuestionAdded: (question: Question) => void;
  questionNumber: number;
}

interface EditorContent {
  type: string;
  content?: EditorContent[];
  text?: string;
  attrs?: Record<string, unknown>;
}

const QuestionPreview = ({ data }: { data: QuestionFormValues }) => {
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
    content: data.statement,
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
          <Badge variant="outline">{data.educationLevel}</Badge>
          <Badge variant="outline">{data.grade}</Badge>
          <Badge variant="outline">{data.subject}</Badge>
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

      {data.questionType === "multipleChoice" && data.options && (
        <div className="space-y-3">
          <h4 className="font-medium">Alternativas:</h4>
          {data.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                option.isCorrect ? 'bg-primary text-primary-foreground' : 'bg-background'
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
  subjectId,
  onQuestionAdded,
  questionNumber 
}: QuestionFormProps) => {
  const navigate = useNavigate();
  const [editorContent, setEditorContent] = useState<string>('');
  const [options, setOptions] = useState([
    { id: "a", text: "", isCorrect: false },
    { id: "b", text: "", isCorrect: false },
    { id: "c", text: "", isCorrect: false },
    { id: "d", text: "", isCorrect: false },
    { id: "e", text: "", isCorrect: false },
  ]);

  const { manager, state } = useRemirror({
    extensions: () => [
      new DocExtension({}),
      new ParagraphExtension({}),
      new TextExtension({}),
      new HeadingExtension({}),
      new BulletListExtension({}),
      new ListItemExtension({}),
      new ImageExtension({
        uploadHandler: (files) => {
          const images = [];
          for (const file of files) {
            const reader = new FileReader();
            reader.onload = (event) => {
              images.push({ src: event.target?.result as string });
            };
            reader.readAsDataURL(file.file);
          }
          return images;
        }
      }),
      new CodeBlockExtension({}),
      new CodeExtension({}),
      new SupExtension(),
      new PlaceholderExtension({ placeholder: 'Digite o enunciado da questão aqui...' }),
    ],
    content: editorContent,
    selection: 'end',
    stringHandler: 'html',
  });

  const handleEditorChange = (params: { state: { doc: { toJSON: () => unknown } } }) => {
    const content = JSON.stringify(params.state.doc.toJSON());
    setEditorContent(content);
    form.setValue('statement', content);
  };

  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "Álgebra", "Geometria"
  ]);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: "",
      statement: "",
      secondStatement: "",
      questionType: "multipleChoice",
      solution: "",
      educationLevel: "",
      grade: "",
      subject: "",
      difficulty: "",
      value: "",
      skills: "",
      topics: selectedTopics
    }
  });

  // Mock data for skills - replace with actual API call
  const skillsByCourse: Record<string, string[]> = {
    "Fundamental": ["H1 - Compreensão", "H2 - Análise", "H3 - Aplicação"],
    "Médio": ["H4 - Síntese", "H5 - Avaliação", "H6 - Criação"],
    "Superior": ["H7 - Pesquisa", "H8 - Desenvolvimento", "H9 - Inovação"]
  };

  const [availableSkills, setAvailableSkills] = useState<string[]>([]);

  // Watch for education level changes to update available skills
  const selectedCourse = form.watch("educationLevel");
  
  useEffect(() => {
    if (selectedCourse) {
      setAvailableSkills(skillsByCourse[selectedCourse] || []);
      // Reset skills when course changes
      form.setValue("skills", "");
    }
  }, [selectedCourse, form]);

  // Define possible values for dropdown fields
  const educationLevels = ["Fundamental", "Médio", "Superior"];
  const grades = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
  const subjects = ["Matemática", "Português", "Ciências", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"];
  const difficultyLevels = ["Fácil", "Médio", "Difícil"];
  
  const questionType = form.watch("questionType");

  const addOption = () => {
    if (options.length < 5) {
      const nextId = String.fromCharCode(97 + options.length);
      setOptions([...options, { id: nextId, text: "", isCorrect: false }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 3) {
      setOptions(options.filter(option => option.id !== id));
    }
  };

  const setCorrectOption = (id: string) => {
    setOptions(options.map(option => ({
      ...option,
      isCorrect: option.id === id
    })));
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };

  const handleSubmit = (data: QuestionFormValues) => {
    if (questionType === "multipleChoice") {
      data.options = options.map(opt => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect
      }));
    }
    
    data.topics = selectedTopics;
    console.log("Question form submitted:", data);
    
    if (externalOnSubmit) {
      externalOnSubmit(data);
    }

    // Create a new question object
    const newQuestion: Question = {
      id: `question-${Math.random().toString(36).substr(2, 9)}`,
      number: questionNumber,
      text: data.statement,
      title: data.title,
      subjectId: subjectId || "main",
      type: data.questionType,
      subject: data.subject,
      grade: data.grade,
      difficulty: data.difficulty,
      value: parseFloat(data.value),
      skills: data.skills
    };

    onQuestionAdded(newQuestion);
    onClose();
  };

  const openTopicSelector = () => {
    if (!selectedTopics.includes("Funções")) {
      setSelectedTopics([...selectedTopics, "Funções"]);
    }
  };

  const removeTopic = (topic: string) => {
    setSelectedTopics(selectedTopics.filter(t => t !== topic));
  };

  const [previewData, setPreviewData] = useState<QuestionFormValues | null>(null);

  const handlePreview = () => {
    const formData = form.getValues();
    if (questionType === "multipleChoice") {
      formData.options = options.map(opt => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect
      }));
    }
    formData.topics = selectedTopics;
    setPreviewData(formData);
  };

  if (!open) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Criar Nova Questão</h1>
        <Button 
          variant="outline" 
          onClick={onClose}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>
      <Card className="w-full">
        <CardContent>
          <Form {...form}>
            {/* Classification section */}
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-4">Classificações</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Education level */}
                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Curso</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o nível de ensino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {educationLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Grade */}
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a série" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {grades.map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disciplina</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a disciplina" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Difficulty */}
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dificuldade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a dificuldade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {difficultyLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Value and Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor da Questão</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 1.0" 
                          step="0.1"
                          {...field} 
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
                      <FormLabel>Habilidades</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!selectedCourse}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedCourse ? "Selecione a habilidade" : "Selecione primeiro o curso"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSkills.map((skill) => (
                            <SelectItem key={skill} value={skill}>
                              {skill}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-7 mt-9">
              {/* Question Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Questão</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite o título da questão" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Question Statement */}
              <FormField
                control={form.control}
                name="statement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enunciado da questão</FormLabel>
                    <FormControl>
                      <div className="mb-12 relative">
                        <MyEditor
                          content={field.value}
                          onChange={(content) => {
                            field.onChange(content);
                            setEditorContent(content);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Question type selector */}
              <FormField
                control={form.control}
                name="questionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de questão</FormLabel>
                    <FormControl>
                      <RadioGroup
                        className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multipleChoice" id="multipleChoice" />
                          <Label htmlFor="multipleChoice">Múltipla Escolha</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="essay" id="essay" />
                          <Label htmlFor="essay">Discursiva</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Second Statement */}
              <FormField
                control={form.control}
                name="secondStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segundo Enunciado</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite o segundo enunciado da questão" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Multiple choice options */}
              {questionType === "multipleChoice" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-medium">Alternativas</h3>
                    <div className="flex space-x-2">
                      {options.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addOption}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Adicionar
                        </Button>
                      )}
                    </div>
                  </div>

                  {options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <Button
                        type="button"
                        variant={option.isCorrect ? "default" : "outline"}
                        size="icon"
                        onClick={() => setCorrectOption(option.id)}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      >
                        {option.isCorrect && <Check className="h-4 w-4" />}
                      </Button>
                      <Input
                        value={option.text}
                        onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                        placeholder={`Alternativa ${option.id}`}
                        className="flex-grow"
                      />
                      {options.length > 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeOption(option.id)}
                          className="flex-shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Solution */}
              <FormField
                control={form.control}
                name="solution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolução (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Digite a resolução da questão aqui..." 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form actions */}
              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handlePreview}
                        className="flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Prévia
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Prévia da Questão</DialogTitle>
                      </DialogHeader>
                      {previewData && <QuestionPreview data={previewData} />}
                    </DialogContent>
                  </Dialog>
                </div>
                <Button type="submit" className="flex items-center">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionForm;
