import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { School } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SchoolData {
  id: string;
  name: string;
  domain?: string;
  address?: string;
  created_at?: string;
  students_count: number;
  classes_count: number;
  city?: {
    id: string;
    name: string;
    state: string;
  };
}

export default function RecentSchools() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecentSchools = async () => {
      try {
        setIsLoading(true);
        
        // Buscar escolas reais da API
        const response = await api.get('/schools/recent');
        
        if (response.data && Array.isArray(response.data)) {
          setSchools(response.data);
        } else {
          setSchools([]);
        }
      } catch (error) {
        console.error("Erro ao buscar escolas recentes:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as escolas recentes",
          variant: "destructive",
        });
        setSchools([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentSchools();
  }, [toast]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Escolas Recentes
          </CardTitle>
          <CardDescription>Últimas escolas cadastradas no sistema</CardDescription>
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
          <School className="h-5 w-5" />
          Escolas Recentes
        </CardTitle>
        <CardDescription>Últimas escolas cadastradas no sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {schools.length > 0 ? (
          schools.map((school) => (
            <div key={school.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="space-y-1">
                <p className="font-medium text-sm">{school.name}</p>
                <p className="text-xs text-muted-foreground">{school.address || "Endereço não informado"}</p>
                <div className="flex items-center gap-2">
                  {school.city && (
                    <p className="text-xs text-muted-foreground">
                      {school.city.name}, {school.city.state}
                    </p>
                  )}
                  {school.domain && (
                    <p className="text-xs text-muted-foreground">Domínio: {school.domain}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {school.students_count} alunos
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {school.classes_count} turmas
                  </Badge>
                </div>
                {school.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(school.created_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma escola encontrada
          </p>
        )}
      </CardContent>
    </Card>
  );
} 