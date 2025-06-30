import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface Student {
  id: string;
  name: string;
  created_at: string;
  registration?: string;
}

export default function RecentStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentStudents = async () => {
      try {
        setIsLoading(true);
        
        // Tentar buscar dados de estudantes da API
        const response = await api.get("/users/list");
        if (response.data?.users) {
          // Filtrar apenas alunos e pegar os 5 mais recentes
          const studentUsers = response.data.users
            .filter((user: any) => user.role === "Aluno" || user.role === "aluno")
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map((user: any) => ({
              id: user.id,
              name: user.name,
              created_at: user.created_at,
              registration: user.registration
            }));
          
          setStudents(studentUsers);
        }
      } catch (error) {
        console.error("Erro ao buscar estudantes recentes:", error);
        // Em caso de erro, deixar lista vazia
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentStudents();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Data inválida";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Últimos Alunos Cadastrados</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : students.length > 0 ? (
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="flex justify-between items-center border-b pb-2">
                <div className="flex flex-col">
                  <span className="font-medium">{student.name}</span>
                  {student.registration && (
                    <span className="text-xs text-gray-500">Mat: {student.registration}</span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{formatDate(student.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Users className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm">Nenhum aluno cadastrado ainda</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
