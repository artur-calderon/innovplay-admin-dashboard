import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Plus, 
  Loader2, 
  Eye, 
  BookOpen, 
  GraduationCap, 
  School,
  Check,
  AlertCircle,
  Sparkles,
  Copy,
  Trash2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

// Schema de validação
const classSchema = z.object({
  nameType: z.enum(['letter', 'number', 'custom'], {
    required_error: "Selecione um tipo de nomenclatura",
  }),
  customName: z.string().optional(),
  selectedLetters: z.array(z.string()).optional(),
  selectedNumbers: z.array(z.string()).optional(),
  educationStageId: z.string().min(1, "Selecione um curso"),
  gradeId: z.string().min(1, "Selecione uma série"),
  description: z.string().optional(),
  capacity: z.string().optional(),
  shift: z.enum(['morning', 'afternoon', 'evening', 'full'], {
    required_error: "Selecione um turno",
  }),
  room: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface EducationStage {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
  education_stage_id: string;
}

interface CreateClassFormProps {
  schoolId: string;
  schoolName?: string;
  onSuccess?: () => void;
}

interface ClassPreview {
  name: string;
  grade: string;
  shift: string;
  capacity?: string;
  room?: string;
}

export function CreateClassForm({ schoolId, schoolName, onSuccess }: CreateClassFormProps) {
  const [open, setOpen] = useState(false);
  const [educationStages, setEducationStages] = useState<EducationStage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [classesToCreate, setClassesToCreate] = useState<ClassPreview[]>([]);
  const { toast } = useToast();

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      nameType: 'letter',
      selectedLetters: [],
      selectedNumbers: [],
      customName: "",
      educationStageId: "",
      gradeId: "",
      description: "",
      capacity: "",
      shift: 'morning',
      room: "",
    },
  });

  const nameType = form.watch("nameType");
  const selectedStage = form.watch("educationStageId");
  const selectedGrade = form.watch("gradeId");
  const selectedLetters = form.watch("selectedLetters") || [];
  const selectedNumbers = form.watch("selectedNumbers") || [];
  const customName = form.watch("customName");
  const shift = form.watch("shift");
  const capacity = form.watch("capacity");
  const room = form.watch("room");

  // Opções de letras e números
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  const numbers = Array.from({ length: 20 }, (_, i) => (i + 1).toString());

  // Opções de turnos
  const shifts = [
    { value: 'morning', label: 'Matutino', icon: '🌅' },
    { value: 'afternoon', label: 'Vespertino', icon: '☀️' },
    { value: 'evening', label: 'Noturno', icon: '🌙' },
    { value: 'full', label: 'Integral', icon: '⏰' },
  ];

  useEffect(() => {
    const fetchEducationStages = async () => {
      try {
        const response = await api.get("/education_stages/");
        setEducationStages(response.data);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar cursos",
          variant: "destructive",
        });
      }
    };

    if (open) {
      fetchEducationStages();
    }
  }, [open, toast]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedStage) {
        setGrades([]);
        return;
      }

      try {
        const response = await api.get(`/grades/education-stage/${selectedStage}`);
        setGrades(response.data);
      } catch (error) {
        console.error("Error fetching grades:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar séries",
          variant: "destructive",
        });
      }
    };

    fetchGrades();
  }, [selectedStage, toast]);

  // Gerar preview das turmas
  useEffect(() => {
    const generatePreview = () => {
      const selectedGradeObj = grades.find(g => g.id === selectedGrade);
      if (!selectedGradeObj) return;

      const shiftObj = shifts.find(s => s.value === shift);
      const shiftLabel = shiftObj?.label || '';

      let classNames: string[] = [];

      if (nameType === 'letter') {
        classNames = selectedLetters;
      } else if (nameType === 'number') {
        classNames = selectedNumbers;
      } else if (nameType === 'custom' && customName) {
        classNames = [customName];
      }

      const previews: ClassPreview[] = classNames.map(name => ({
        name: `${selectedGradeObj.name} ${name}`,
        grade: selectedGradeObj.name,
        shift: shiftLabel,
        capacity: capacity || undefined,
        room: room || undefined,
      }));

      setClassesToCreate(previews);
    };

    generatePreview();
  }, [selectedGrade, selectedLetters, selectedNumbers, customName, nameType, grades, shift, capacity, room]);

  const handleLetterToggle = (letter: string) => {
    const current = selectedLetters;
    if (current.includes(letter)) {
      form.setValue("selectedLetters", current.filter(l => l !== letter));
    } else {
      form.setValue("selectedLetters", [...current, letter]);
    }
  };

  const handleNumberToggle = (number: string) => {
    const current = selectedNumbers;
    if (current.includes(number)) {
      form.setValue("selectedNumbers", current.filter(n => n !== number));
    } else {
      form.setValue("selectedNumbers", [...current, number]);
    }
  };

  const handleSelectAllLetters = () => {
    const commonLetters = ['A', 'B', 'C', 'D', 'E'];
    form.setValue("selectedLetters", commonLetters);
  };

  const handleSelectAllNumbers = () => {
    const commonNumbers = ['1', '2', '3', '4', '5'];
    form.setValue("selectedNumbers", commonNumbers);
  };

  const handleSubmit = async (data: ClassFormValues) => {
    if (classesToCreate.length === 0) {
      toast({
        title: "Erro",
        description: "Configure pelo menos uma turma para criar",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const promises = classesToCreate.map(async (classPreview) => {
        const classData = {
          name: nameType === 'custom' ? data.customName : 
                nameType === 'letter' ? classPreview.name.split(' ').pop() :
                classPreview.name.split(' ').pop(),
          school_id: schoolId,
          grade_id: data.gradeId,
          description: data.description || undefined,
          capacity: data.capacity ? parseInt(data.capacity) : undefined,
          shift: data.shift,
          room: data.room || undefined,
        };

        return api.post("/classes", classData);
      });

      await Promise.all(promises);

      toast({
        title: "Sucesso! 🎉",
        description: `${classesToCreate.length} turma(s) criada(s) com sucesso`,
      });

      // Reset form
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating classes:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao criar turma(s)",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShiftIcon = (shiftValue: string) => {
    return shifts.find(s => s.value === shiftValue)?.icon || '📚';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Users className="mr-2 h-4 w-4" />
          Criar Turma
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Criar Nova(s) Turma(s)
          </DialogTitle>
          <DialogDescription>
            Configure e crie uma ou múltiplas turmas para {schoolName || 'a escola selecionada'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Básico
                </TabsTrigger>
                <TabsTrigger value="naming" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Nomenclatura
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview ({classesToCreate.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <School className="h-5 w-5" />
                      Informações Acadêmicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="educationStageId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Curso *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o curso" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {educationStages.filter(stage => stage.id && stage.name).map((stage) => (
                                  <SelectItem key={stage.id} value={stage.id}>
                                    {stage.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gradeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Série *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!selectedStage}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={!selectedStage ? "Selecione um curso primeiro" : "Selecione a série"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {grades.filter(grade => grade.id && grade.name).map((grade) => (
                                  <SelectItem key={grade.id} value={grade.id}>
                                    {grade.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="shift"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Turno *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 md:grid-cols-4 gap-4"
                            >
                              {shifts.map((shiftOption) => (
                                <div key={shiftOption.value} className="flex items-center space-x-2">
                                  <RadioGroupItem value={shiftOption.value} id={shiftOption.value} />
                                  <Label htmlFor={shiftOption.value} className="flex items-center gap-2 cursor-pointer">
                                    <span>{shiftOption.icon}</span>
                                    {shiftOption.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Informações Complementares</CardTitle>
                    <CardDescription>Dados opcionais para melhor organização</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacidade (alunos)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder="Ex: 30" 
                                min="1"
                                max="50"
                              />
                            </FormControl>
                            <FormDescription>Número máximo de alunos</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="room"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sala</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Sala 101, Lab A" />
                            </FormControl>
                            <FormDescription>Localização da sala</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Observações ou características especiais da turma..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="naming" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tipo de Nomenclatura</CardTitle>
                    <CardDescription>Escolha como nomear as turmas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="nameType"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="space-y-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="letter" id="letter" />
                                <Label htmlFor="letter" className="font-medium">
                                  Por Letras (A, B, C...)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="number" id="number" />
                                <Label htmlFor="number" className="font-medium">
                                  Por Números (1, 2, 3...)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="custom" id="custom" />
                                <Label htmlFor="custom" className="font-medium">
                                  Nome Personalizado
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {nameType === 'letter' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Selecionar Letras
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleSelectAllLetters}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            A-E
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => form.setValue("selectedLetters", [])}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpar
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Clique nas letras para selecionar as turmas que deseja criar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-6 md:grid-cols-13 gap-2">
                        {letters.map((letter) => (
                          <Button
                            key={letter}
                            type="button"
                            variant={selectedLetters.includes(letter) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleLetterToggle(letter)}
                            className={`h-10 w-10 ${selectedLetters.includes(letter) ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                          >
                            {letter}
                          </Button>
                        ))}
                      </div>
                      {selectedLetters.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-2">
                            Letras selecionadas ({selectedLetters.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedLetters.map((letter) => (
                              <Badge key={letter} variant="secondary">
                                {letter}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {nameType === 'number' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Selecionar Números
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleSelectAllNumbers}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            1-5
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => form.setValue("selectedNumbers", [])}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpar
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Clique nos números para selecionar as turmas que deseja criar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                        {numbers.map((number) => (
                          <Button
                            key={number}
                            type="button"
                            variant={selectedNumbers.includes(number) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleNumberToggle(number)}
                            className={`h-10 w-10 ${selectedNumbers.includes(number) ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                          >
                            {number}
                          </Button>
                        ))}
                      </div>
                      {selectedNumbers.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-2">
                            Números selecionados ({selectedNumbers.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedNumbers.map((number) => (
                              <Badge key={number} variant="secondary">
                                {number}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {nameType === 'custom' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Nome Personalizado</CardTitle>
                      <CardDescription>
                        Digite um nome único para a turma
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="customName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Turma</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Ex: Turma Especial, Aceleração, Reforço..." 
                              />
                            </FormControl>
                            <FormDescription>
                              Este nome será usado como identificador da turma
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="preview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Preview das Turmas
                      <Badge variant="secondary">{classesToCreate.length} turma(s)</Badge>
                    </CardTitle>
                    <CardDescription>
                      Visualize como as turmas serão criadas antes de confirmar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {classesToCreate.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">
                          Configure as informações básicas e a nomenclatura para ver o preview
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {classesToCreate.map((classPreview, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                                {classPreview.name.split(' ').pop()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {classPreview.name}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    {getShiftIcon(shift)} {classPreview.shift}
                                  </span>
                                  {classPreview.capacity && (
                                    <span className="flex items-center gap-1">
                                      <Users className="h-4 w-4" />
                                      {classPreview.capacity} alunos
                                    </span>
                                  )}
                                  {classPreview.room && (
                                    <span className="flex items-center gap-1">
                                      <School className="h-4 w-4" />
                                      {classPreview.room}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Check className="h-5 w-5 text-green-600" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setOpen(false);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              
              <div className="flex items-center gap-3">
                {classesToCreate.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {classesToCreate.length} turma(s) será(ão) criada(s)
                  </span>
                )}
                <Button 
                  type="submit" 
                  disabled={isSubmitting || classesToCreate.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar {classesToCreate.length > 1 ? 'Turmas' : 'Turma'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 