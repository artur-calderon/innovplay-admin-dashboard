import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School } from "lucide-react";
import { useAuth } from "@/context/authContext";

export default function RelatorioEscolar() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório Escolar</h1>
          <p className="text-gray-600 mt-2">
            Relatórios escolares detalhados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {user?.role === 'admin' ? 'Administrador' : 'Técnico Administrativo'}
          </Badge>
        </div>
      </div>

      {/* Conteúdo placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <School className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Página em Desenvolvimento
            </h3>
            <p className="text-gray-600">
              Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
