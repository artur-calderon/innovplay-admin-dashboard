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
import { Eye, EyeOff } from "lucide-react";
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
const createUserFormSchema = (isEditing: boolean) => z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: isEditing 
    ? z.string().optional()
    : z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: isEditing 
    ? z.string().optional()
    : z.string().min(1, "Confirme sua senha"),
  role: z.string().min(1, "Selecione uma função"),
  registration: z.string().nullable(),
  city_id: z.string().nullable(),
}).refine((data) => {
  if (!isEditing) {
    return data.password === data.confirmPassword;
  }
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  role: string;
  registration?: string | null;
  city_id?: string | null;
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
  onSubmit?: (data: UserFormValues) => Promise<void> | void;
}

export default function UserForm({ user, onSubmit }: UserFormProps) {
  const isEditing = !!user;
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { municipios, getMunicipios } = useDataContext();
  
  useEffect(() => {
    getMunicipios();
  }, [getMunicipios]);

  // Set up form with default values
  const form = useForm<UserFormValues>({
    resolver: zodResolver(createUserFormSchema(isEditing)),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
      role: user?.role || "",
      registration: user?.registration || null,
      city_id: user?.city_id || null,
    },
  });

  // Função para gerar email automaticamente baseado no nome
  const generateEmailFromName = (name: string) => {
    if (!name.trim()) return "";
    
    const names = name.trim().split(" ");
    const initials = names
      .map(n => n.charAt(0).toLowerCase())
      .join("");
    
    return `${initials}@innovplay.com`;
  };

  // Watch para mudanças no campo nome (apenas para novos usuários)
  const watchedName = form.watch("name");
  
  useEffect(() => {
    if (!isEditing && watchedName) {
      const generatedEmail = generateEmailFromName(watchedName);
      form.setValue("email", generatedEmail);
    }
  }, [watchedName, isEditing, form]);

  // Handle form submission
  const handleSubmit = async (data: UserFormValues) => {
    try {
      setIsLoading(true);
      
      // Convert role to the correct format
      const formattedData = {
        ...data,
        role: roleMapping[data.role] || data.role
      };
      
      // Remove confirmPassword from the data before sending
      const { confirmPassword, ...dataToSend } = formattedData;
      
      // If editing, we don't require the password field and preserve the ID
      if (isEditing) {
        if (!dataToSend.password || dataToSend.password.trim() === "") {
          // If password field is empty during edit, remove it from the data
          const { password, ...dataWithoutPassword } = dataToSend;
          if (onSubmit) {
            onSubmit({ ...dataWithoutPassword, id: user.id });
          }
        } else {
          // Password was provided during edit
          if (onSubmit) {
            onSubmit({ ...dataToSend, id: user.id });
          }
        }
      } else {
        // New user - use callback to parent component
        if (onSubmit) {
          await onSubmit(dataToSend);
          // Reset form after successful submission
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
                <Input 
                  type="email" 
                  placeholder={isEditing ? "nome@escola.edu.br" : "Será gerado automaticamente"} 
                  {...field}
                  readOnly={!isEditing}
                />
              </FormControl>
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  O email é gerado automaticamente baseado nas iniciais do nome + @innovplay.com
                </p>
              )}
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
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={isEditing ? "Deixe em branco para manter a senha atual" : "Digite uma senha"} 
                    {...field} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirme sua senha" 
                      {...field} 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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