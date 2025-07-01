import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  registration?: string;
}

interface ApiResponse {
  users: Student[];
}

export default function RecentStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentStudents = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<ApiResponse>("/users/list");
        const allUsers = response.data?.users || [];
        
        // Filtrar apenas alunos e pegar os 5 mais recentes
        const recentStudents = allUsers
          .filter((user: Student) => user.role === "aluno")
          .sort((a: Student, b: Student) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        
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
                {student.registration && (
                  <p className="text-xs text-muted-foreground">Mat: {student.registration}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {student.role}
              </Badge>
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
