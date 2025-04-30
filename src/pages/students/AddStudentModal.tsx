
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Student } from "./StudentsPage";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  birthDate: z.date({
    required_error: "Data de nascimento é obrigatória",
  }),
  grade: z.string().min(1, "Série é obrigatória"),
  classroom: z.string().min(1, "Turma é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: any) => void;
  editingStudent: Student | null;
}

const AddStudentModal = ({
  open,
  onOpenChange,
  onSubmit,
  editingStudent,
}: AddStudentModalProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      grade: "",
      classroom: "",
    },
  });

  // Update form when editing student changes
  useEffect(() => {
    if (editingStudent) {
      form.reset({
        name: editingStudent.name,
        grade: editingStudent.grade,
        classroom: editingStudent.classroom,
        birthDate: editingStudent.birthDate ? new Date(editingStudent.birthDate) : undefined,
      });
    } else {
      form.reset({
        name: "",
        grade: "",
        classroom: "",
        birthDate: undefined,
      });
    }
  }, [editingStudent, form]);

  const handleSubmit = (values: FormValues) => {
    if (editingStudent) {
      onSubmit({
        ...editingStudent,
        ...values,
        birthDate: values.birthDate.toISOString(),
      });
    } else {
      onSubmit({
        ...values,
        birthDate: values.birthDate.toISOString(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingStudent ? "Editar Aluno" : "Adicionar Aluno"}
          </DialogTitle>
          <DialogDescription>
            {editingStudent
              ? "Atualize os dados do aluno"
              : "Preencha os dados para adicionar um novo aluno"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do aluno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de nascimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma série" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1º ano">1º ano</SelectItem>
                        <SelectItem value="2º ano">2º ano</SelectItem>
                        <SelectItem value="3º ano">3º ano</SelectItem>
                        <SelectItem value="4º ano">4º ano</SelectItem>
                        <SelectItem value="5º ano">5º ano</SelectItem>
                        <SelectItem value="6º ano">6º ano</SelectItem>
                        <SelectItem value="7º ano">7º ano</SelectItem>
                        <SelectItem value="8º ano">8º ano</SelectItem>
                        <SelectItem value="9º ano">9º ano</SelectItem>
                        <SelectItem value="1º EM">1º EM</SelectItem>
                        <SelectItem value="2º EM">2º EM</SelectItem>
                        <SelectItem value="3º EM">3º EM</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classroom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turma</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma turma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Turma A">Turma A</SelectItem>
                        <SelectItem value="Turma B">Turma B</SelectItem>
                        <SelectItem value="Turma C">Turma C</SelectItem>
                        <SelectItem value="Turma D">Turma D</SelectItem>
                        <SelectItem value="Turma E">Turma E</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingStudent ? "Atualizar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentModal;
