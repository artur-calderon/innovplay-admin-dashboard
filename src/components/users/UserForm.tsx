import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useDataContext } from "@/context/dataContext";
import { MultiSelect } from "@/components/ui/multi-select";

// Role mapping object
const roleMapping: { [key: string]: string } = {
  "Administrador": "admin",
  "Professor": "professor",
  "Coordenador": "coordenador",
  "Diretor": "diretor",
  "Técnico administrativo": "tecadmin",
  "Aluno": "aluno"
};

// Form validation schema
const userFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").optional(),
  role: z.string().min(1, "Selecione uma função"),
  registration: z.string().nullable(),
  city_id: z.string().nullable(),
});

type UserFormValues = z.infer<typeof userFormSchema> & {
  id?: number;
};

interface UserFormProps {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    registration?: string;
    city_id?: string;
  };
  onSubmit?: (data: UserFormValues) => void;
}

export default function UserForm({ user, onSubmit }: UserFormProps) {
  const isEditing = !!user;
  const [isLoading, setIsLoading] = useState(false);
  const { municipios, getMunicipios } = useDataContext();
  
  useEffect(() => {
    getMunicipios();
  }, [getMunicipios]);

  // Set up form with default values
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      role: user?.role || "",
      registration: user?.registration || null,
      city_id: user?.city_id || null,
    },
  });

  // Handle form submission
  const handleSubmit = async (data: UserFormValues) => {
    try {
      setIsLoading(true);
      
      // Convert role to the correct format
      const formattedData = {
        ...data,
        role: roleMapping[data.role] || data.role
      };
      
      // If editing, we don't require the password field and preserve the ID
      if (isEditing) {
        if (!formattedData.password || formattedData.password.trim() === "") {
          // If password field is empty during edit, remove it from the data
          const { password, ...dataWithoutPassword } = formattedData;
          if (onSubmit) {
            onSubmit({ ...dataWithoutPassword, id: user.id });
          }
        } else {
          // Password was provided during edit
          if (onSubmit) {
            onSubmit({ ...formattedData, id: user.id });
          }
        }
      } else {
        // New user - make API call
        const response = await api.post('/admin/criar-usuario', {
          name: formattedData.name,
          email: formattedData.email,
          password: formattedData.password,
          role: formattedData.role,
          registration: formattedData.registration,
          city_id: formattedData.city_id
        });

        if (response.status === 200 || response.status === 201) {
          toast.success('Usuário criado com sucesso!');
          form.reset();
        }
      }
    } catch (error) {
      toast.error('Erro ao criar usuário. Por favor, tente novamente.');
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform municipios data for MultiSelect
  const municipioOptions = Array.isArray(municipios) ? municipios.map(municipio => ({
    id: municipio.id.toString(),
    name: municipio.name
  })) : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="nome@escola.edu.br" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditing ? "Nova senha (opcional)" : "Senha"}</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder={isEditing ? "Deixe em branco para manter a senha atual" : "Digite uma senha"} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="registration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Matrícula (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Digite a matrícula" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Município</FormLabel>
              <FormControl>
                <MultiSelect
                  options={municipioOptions}
                  selected={field.value ? [field.value] : []}
                  onChange={(values) => field.onChange(values[0] || null)}
                  placeholder="Selecione um município"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Professor">Professor</SelectItem>
                  <SelectItem value="Coordenador">Coordenador</SelectItem>
                  <SelectItem value="Diretor">Diretor</SelectItem>
                  <SelectItem value="Técnico administrativo">Técnico administrativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Processando..." : isEditing ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}