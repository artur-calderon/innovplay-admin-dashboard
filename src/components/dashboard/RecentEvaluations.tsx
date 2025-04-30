
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// Sample data
const recentEvaluations = [
  {
    id: "1",
    title: "Avaliação de Matemática",
    subject: "Matemática",
    grade: "9º ano",
    date: "15/09/2023",
  },
  {
    id: "2",
    title: "Avaliação de Português",
    subject: "Português",
    grade: "7º ano",
    date: "20/08/2023",
  },
  {
    id: "3",
    title: "Avaliação de Ciências",
    subject: "Ciências",
    grade: "5º ano",
    date: "05/10/2023",
  },
];

export default function RecentEvaluations() {
  const handleView = (id: string) => {
    toast({
      title: "Visualizando avaliação",
      description: `ID: ${id}`,
    });
  };

  const handleEdit = (id: string) => {
    toast({
      title: "Editando avaliação",
      description: `ID: ${id}`,
    });
  };

  const handleDelete = (id: string) => {
    toast({
      title: "Excluindo avaliação",
      description: `ID: ${id}`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Últimas Avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        {recentEvaluations.length > 0 ? (
          <div className="space-y-4">
            {recentEvaluations.map((evaluation) => (
              <div key={evaluation.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <h3 className="font-medium">{evaluation.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {evaluation.subject} • {evaluation.grade} • {evaluation.date}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleView(evaluation.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(evaluation.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(evaluation.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-8 text-gray-500">
            Nenhuma avaliação cadastrada ainda.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
