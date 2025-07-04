import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { allMockStudents } from "@/lib/extendedMockData";

interface Student {
  id: string;
  name: string;
  email: string;
  role?: string;
  created_at?: string;
  createdAt?: string;
  registration?: string;
  class?: string;
  profileType?: string;
}

export default function RecentStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentStudents = async () => {
      try {
        setIsLoading(true);
        
        // Simular delay de carregamento
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Usar dados mockados dos 30 alunos implementados
        const recentStudents = allMockStudents
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(student => ({
            id: student.id,
            name: student.name,
            email: student.email,
            role: "aluno",
            created_at: student.createdAt,
            createdAt: student.createdAt,
            registration: `MAT-${student.id.split('-')[1].padStart(4, '0')}`,
            class: student.class,
            profileType: student.profileType
          }));
        
        setStudents(recentStudents);
      } catch (error) {
        console.error("Erro ao buscar alunos recentes:", error);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentStudents();
  }, []);

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
