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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Book, Check, List, Minus, Plus, Save, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import Quill from 'quill'
import ImageResize from 'quill-image-resize-module-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Question } from "../types";

// Form schema
const questionSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres"),
  statement: z.string().min(10, "O enunciado precisa ter pelo menos 10 caracteres"),
  secondStatement: z.string().optional(),
  questionType: z.enum(["multipleChoice", "essay"]),
  options: z.array(z.object({
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

const QuestionPreview = ({ data }: { data: QuestionFormValues }) => {
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
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.statement }} />
        {data.secondStatement && (
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.secondStatement }} />
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

const QuestionForm = ({ 
  onSubmit: externalOnSubmit, 
  open, 
  onClose, 
  subjectId,
  onQuestionAdded,
  questionNumber 
}: QuestionFormProps) => {
  const navigate = useNavigate();
  const [options, setOptions] = useState([
    { id: 1, text: "", isCorrect: false },
    { id: 2, text: "", isCorrect: false },
    { id: 3, text: "", isCorrect: false }
  ]);

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

  // Register Quill modules
  useEffect(() => {
    Quill.register('modules/imageResize', ImageResize);
  }, []);

  const modules = React.useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      [{ 'script': 'sub'}, { 'script': 'super' }, 'formula'],
      ['clean']
    ],
    imageResize: {
      modules: [ 'Resize', 'DisplaySize', 'Toolbar' ]
    }
  }), []);

  const formats = React.useMemo(() => [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'link', 'image',
    'script', 'formula'
  ], []);

  // Define possible values for dropdown fields
  const educationLevels = ["Fundamental", "Médio", "Superior"];
  const grades = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
  const subjects = ["Matemática", "Português", "Ciências", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"];
  const difficultyLevels = ["Fácil", "Médio", "Difícil"];
  
  const questionType = form.watch("questionType");

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, { id: options.length + 1, text: "", isCorrect: false }]);
    }
  };

  const removeOption = (idToRemove: number) => {
    if (options.length > 3) {
      setOptions(options.filter(option => option.id !== idToRemove));
    }
  };

  const setCorrectOption = (id: number) => {
    setOptions(options.map(option => ({
      ...option,
      isCorrect: option.id === id
    })));
  };

  const handleOptionTextChange = (id: number, text: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };

  const handleSubmit = (data: QuestionFormValues) => {
    if (questionType === "multipleChoice") {
      data.options = options.map(opt => ({
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
      subjectId: subjectId || "main"
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
        text: opt.text,
        isCorrect: opt.isCorrect
      }));
    }
    formData.topics = selectedTopics;
    setPreviewData(formData);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Questão</DialogTitle>
        </DialogHeader>
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
                        <div className="h-[350px] mb-12 relative">
                          <style>
                            {`
                              .ql-formula {
                                position: absolute !important;
                                z-index: 9999 !important;
                              }
                              .ql-tooltip {
                                z-index: 9999 !important;
                              }
                            `}
                          </style>
                          <ReactQuill 
                            {...field}
                            modules={modules}
                            formats={formats}
                            className="h-[300px]"
                            theme="snow"
                            value={field.value}
                            onChange={field.onChange}
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
      </DialogContent>
    </Dialog>
  );
};

export default QuestionForm;
