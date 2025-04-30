
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecentEvaluations() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Últimas Avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center items-center py-8 text-gray-500">
          Nenhuma avaliação cadastrada ainda.
        </div>
      </CardContent>
    </Card>
  );
}
