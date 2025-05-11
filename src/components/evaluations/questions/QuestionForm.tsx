import React, { useState } from "react";
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
import { ArrowLeft, Book, Check, List, Minus, Plus, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Form schema
const questionSchema = z.object({
  statement: z.string().min(10, "O enunciado precisa ter pelo menos 10 caracteres"),
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
  topics: z.array(z.string()).default([])
});

type QuestionFormValues = z.infer<typeof questionSchema>;

// Add prop type for external onSubmit function
interface QuestionFormProps {
  onSubmit?: (data: QuestionFormValues) => void;
}

const QuestionForm = ({ onSubmit: externalOnSubmit }: QuestionFormProps) => {
  const navigate = useNavigate();
  const [options, setOptions] = useState([
    { id: 1, text: "", isCorrect: false },
    { id: 2, text: "", isCorrect: false },
    { id: 3, text: "", isCorrect: false }
  ]);

  // Define possible values for dropdown fields
  const educationLevels = ["Fundamental", "Médio", "Superior"];
  const grades = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
  const subjects = ["Matemática", "Português", "Ciências", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"];
  const difficultyLevels = ["Fácil", "Médio", "Difícil", "Desafiadora"];
  
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "Álgebra", "Geometria"
  ]);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      statement: "",
      questionType: "multipleChoice",
      solution: "",
      educationLevel: "",
      grade: "",
      subject: "",
      difficulty: "",
      topics: selectedTopics
    }
  });

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
    // Transform options data for submission
    if (questionType === "multipleChoice") {
      data.options = options.map(opt => ({
        text: opt.text,
        isCorrect: opt.isCorrect
      }));
    }
    
    data.topics = selectedTopics;
    console.log("Question form submitted:", data);
    
    // Call external onSubmit if provided
    if (externalOnSubmit) {
      externalOnSubmit(data);
    } else {
      // Default behavior when used standalone
      // In a real app, you would save this data to your backend
      // and then navigate away or show a success message
    }
  };

  const openTopicSelector = () => {
    // This would open a modal or dialog with topic selection
    // For now, we'll just add a sample topic
    if (!selectedTopics.includes("Funções")) {
      setSelectedTopics([...selectedTopics, "Funções"]);
    }
  };

  const removeTopic = (topic: string) => {
    setSelectedTopics(selectedTopics.filter(t => t !== topic));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Criar Nova Questão</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Question statement */}
            <FormField
              control={form.control}
              name="statement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enunciado da questão</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Digite o enunciado da questão aqui..." 
                      className="min-h-[120px]" 
                      {...field} 
                    />
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

            {/* Classification section */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Classificações</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Education level */}
                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível de ensino</FormLabel>
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

              {/* Topics */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>Assuntos</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={openTopicSelector}
                    className="flex items-center"
                  >
                    <Book className="h-4 w-4 mr-1" />
                    Selecionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTopics.length > 0 ? (
                    selectedTopics.map((topic) => (
                      <Badge 
                        key={topic} 
                        variant="secondary"
                        className="cursor-pointer px-3 py-1"
                        onClick={() => removeTopic(topic)}
                      >
                        {topic} ✕
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum assunto selecionado</span>
                  )}
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button type="submit" className="flex items-center">
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default QuestionForm;
