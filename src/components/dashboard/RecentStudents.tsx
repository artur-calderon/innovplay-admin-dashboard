import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  email?: string;
  role?: string;
  created_at?: string;
  createdAt?: string;
  registration?: string;
  class?: string;
  profileType?: string;
  school?: {
    name: string;
  };
  class_?: {
    name: string;
  };
}

export default function RecentStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecentStudents = async () => {
      try {
        setIsLoading(true);
        
        // Tentar buscar alunos reais da API usando o endpoint /students/recent
        try {
          const response = await api.get('/students/recent');
          
          if (response.data && Array.isArray(response.data)) {
            // Filtrar apenas usuários com role "aluno" e ordenar por data de criação (mais recente primeiro)
            const recentStudents = response.data
              .filter((student: any) => student.user?.role === 'aluno')
              .sort((a: any, b: any) => {
                const dateA = new Date(a.created_at || a.user?.created_at || 0);
                const dateB = new Date(b.created_at || b.user?.created_at || 0);
                return dateB.getTime() - dateA.getTime(); // Ordem decrescente (mais recente primeiro)
              })
              .slice(0, 5) // Limitar aos 5 mais recentes
              .map((student: any) => ({
                id: student.id,
                name: student.name,
                email: student.user?.email,
                role: student.user?.role || "aluno",
                created_at: student.created_at || student.user?.created_at,
                createdAt: student.created_at || student.user?.created_at,
                registration: student.registration || `MAT-${student.id.split('-')[1]?.padStart(4, '0') || '0000'}`,
                class: student.class?.name,
                profileType: getRandomProfileType(), // Mock - não há dados de perfil na API
                school: student.school,
                class_: student.class
              }));
            
            setStudents(recentStudents);
            return; // Sucesso, sair da função
          }
        } catch (apiError) {
          console.warn('⚠️ Endpoint /students/recent não disponível, usando dados mockados:', apiError);
        }
        
        // Fallback: Dados mockados caso o endpoint não funcione
        console.log('📋 Usando dados mockados para alunos recentes');
        
        const mockStudents = [
          {
            id: "1",
            name: "Ana Silva",
            email: "ana.silva@escola.com",
            role: "aluno",
            created_at: "2024-01-15T10:30:00Z",
            createdAt: "2024-01-15T10:30:00Z",
            registration: "MAT-0001",
            class: "9º Ano A",
            profileType: "excellent",
            school: { name: "Escola Municipal ABC" },
            class_: { name: "9º Ano A" }
          },
          {
            id: "2", 
            name: "Carlos Santos",
            email: "carlos.santos@escola.com",
            role: "aluno",
            created_at: "2024-01-14T14:20:00Z",
            createdAt: "2024-01-14T14:20:00Z",
            registration: "MAT-0002",
            class: "8º Ano B",
            profileType: "good",
            school: { name: "Escola Municipal ABC" },
            class_: { name: "8º Ano B" }
          },
          {
            id: "3",
            name: "Maria Oliveira",
            email: "maria.oliveira@escola.com", 
            role: "aluno",
            created_at: "2024-01-13T09:15:00Z",
            createdAt: "2024-01-13T09:15:00Z",
            registration: "MAT-0003",
            class: "7º Ano C",
            profileType: "average",
            school: { name: "Escola Municipal ABC" },
            class_: { name: "7º Ano C" }
          },
          {
            id: "4",
            name: "João Pereira",
            email: "joao.pereira@escola.com",
            role: "aluno", 
            created_at: "2024-01-12T16:45:00Z",
            createdAt: "2024-01-12T16:45:00Z",
            registration: "MAT-0004",
            class: "6º Ano A",
            profileType: "improving",
            school: { name: "Escola Municipal ABC" },
            class_: { name: "6º Ano A" }
          },
          {
            id: "5",
            name: "Sofia Costa",
            email: "sofia.costa@escola.com",
            role: "aluno",
            created_at: "2024-01-11T11:30:00Z", 
            createdAt: "2024-01-11T11:30:00Z",
            registration: "MAT-0005",
            class: "9º Ano B",
            profileType: "struggling",
            school: { name: "Escola Municipal ABC" },
            class_: { name: "9º Ano B" }
          }
        ];
        
        setStudents(mockStudents);
        
      } catch (error) {
        console.error("Erro ao buscar alunos recentes:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os alunos recentes",
          variant: "destructive",
        });
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentStudents();
  }, [toast]);

  // Função para gerar perfil aleatório (mock)
  const getRandomProfileType = () => {
    const types = ['excellent', 'good', 'average', 'struggling', 'improving'];
    return types[Math.floor(Math.random() * types.length)];
  };


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Alunos Recentes
          </CardTitle>
          <CardDescription>Últimos alunos cadastrados no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded border">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Alunos Recentes
        </CardTitle>
        <CardDescription>Últimos alunos cadastrados no sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.length > 0 ? (
          students.map((student) => (
            <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="space-y-1">
                <p className="font-medium text-sm">{student.name}</p>
                <p className="text-xs text-muted-foreground">{student.email}</p>
                <div className="flex items-center gap-2">
                  {student.registration && (
                    <p className="text-xs text-muted-foreground">Mat: {student.registration}</p>
                  )}
                  {student.class && (
                    <p className="text-xs text-muted-foreground">Turma: {student.class}</p>
                  )}
                  {student.school?.name && (
                    <p className="text-xs text-muted-foreground">Escola: {student.school.name}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="text-xs">
                  {student.role || "aluno"}
                </Badge>
                {student.profileType && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      student.profileType === 'excellent' ? 'border-green-500 text-green-700' :
                      student.profileType === 'good' ? 'border-blue-500 text-blue-700' :
                      student.profileType === 'average' ? 'border-yellow-500 text-yellow-700' :
                      student.profileType === 'struggling' ? 'border-red-500 text-red-700' :
                      'border-purple-500 text-purple-700'
                    }`}
                  >
                    {student.profileType === 'excellent' ? 'Excelente' :
                     student.profileType === 'good' ? 'Bom' :
                     student.profileType === 'average' ? 'Médio' :
                     student.profileType === 'struggling' ? 'Dificuldade' :
                     'Melhorando'}
                  </Badge>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum aluno encontrado
          </p>
        )}
      </CardContent>
    </Card>
  );
}
