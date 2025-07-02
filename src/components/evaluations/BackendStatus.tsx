import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Server, Wifi, WifiOff, CheckCircle } from "lucide-react";

interface BackendStatusProps {
  isConnected: boolean;
  onRetry?: () => void;
}

export function BackendStatus({ isConnected, onRetry }: BackendStatusProps) {
  if (isConnected) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">✅ Backend Conectado</AlertTitle>
        <AlertDescription className="text-green-700">
          Sistema funcionando corretamente! Dados sendo puxados do backend em <code>localhost:5000</code>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <WifiOff className="h-5 w-5" />
          Backend Não Disponível
        </CardTitle>
        <CardDescription className="text-yellow-700">
          O sistema está funcionando com dados de demonstração
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-yellow-100 border-yellow-300">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Modo Demonstração</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Como o backend não está rodando em <code className="bg-yellow-200 px-1 rounded">localhost:5000</code>, 
            o sistema está exibindo dados de exemplo para demonstrar as funcionalidades.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="text-sm font-medium text-yellow-800">
            Funcionalidades disponíveis no modo demonstração:
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between p-2 bg-yellow-100 rounded">
              <span className="text-sm text-yellow-800">✅ Visualização de Resultados</span>
              <Badge variant="secondary">Mock Data</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-100 rounded">
              <span className="text-sm text-yellow-800">✅ Relatório Detalhado</span>
              <Badge variant="secondary">Mock Data</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-100 rounded">
              <span className="text-sm text-yellow-800">✅ Filtros e Classificações</span>
              <Badge variant="secondary">Mock Data</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-100 rounded">
              <span className="text-sm text-red-800">❌ Dados Reais</span>
              <Badge variant="destructive">Requer Backend</Badge>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">
            Para usar dados reais:
          </div>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Certifique-se de que o backend está rodando em <code>localhost:5000</code></li>
            <li>Configure o CORS para aceitar requisições de <code>localhost:8080</code></li>
            <li>Implemente os endpoints necessários: <code>/evaluation-results/*</code></li>
          </ol>
        </div>

        {onRetry && (
          <div className="flex justify-center">
            <Button onClick={onRetry} variant="outline" className="text-yellow-800 border-yellow-300">
              <Wifi className="h-4 w-4 mr-2" />
              Tentar Conectar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 