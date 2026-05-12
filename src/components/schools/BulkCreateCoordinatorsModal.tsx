import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { generateEmailFromName, generatePasswordFromName } from "@/hooks/useEmailCheck";
import { Building, CheckCircle2, AlertCircle, Loader2, Users } from "lucide-react";

interface BulkCreateCoordinatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  schoolCityId?: string;
  onSuccess: () => void;
}

interface CoordinatorResult {
  nome: string;
  email: string;
  senha: string;
  success: boolean;
  error?: string;
}

const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getApiMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
    if (data) {
      const message = data.erro ?? data.error ?? data.message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function BulkCreateCoordinatorsModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  schoolCityId,
  onSuccess,
}: BulkCreateCoordinatorsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<CoordinatorResult[]>([]);

  const parsedNames = useMemo(
    () =>
      input
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    [input]
  );

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
      setResults([]);
    }
  }, [isOpen]);

  const resolveEmail = async (name: string): Promise<string> => {
    const baseEmail = generateEmailFromName(name);
    if (!baseEmail) throw new Error("Não foi possível gerar email para o nome informado.");
    const { data } = await api.post("/users/check-email", { email: baseEmail });
    if (data?.disponivel) return baseEmail;
    return data?.email_sugerido || baseEmail;
  };

  const handleCreateBatch = async () => {
    if (parsedNames.length === 0) {
      toast({
        title: "Lista vazia",
        description: "Informe pelo menos um coordenador, um por linha.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: parsedNames.length });
    const today = getTodayDate();
    const output: CoordinatorResult[] = [];

    for (const nome of parsedNames) {
      try {
        const email = await resolveEmail(nome);
        const senha = generatePasswordFromName(nome);

        const payload: Record<string, unknown> = {
          name: nome,
          email,
          password: senha,
          role: "coordenador",
          birth_date: today,
        };

        if (String(user?.role).toLowerCase() === "admin" && schoolCityId) {
          payload.city_id = schoolCityId;
        }

        const createResp = await api.post("/managers", payload);
        const userId = String(createResp.data?.user?.id || "").trim();
        if (!userId) {
          throw new Error("Coordenador criado, mas não foi possível obter o ID do usuário.");
        }

        await api.post("/managers/link-to-school", {
          user_id: userId,
          school_id: schoolId,
        });

        output.push({ nome, email, senha, success: true });
      } catch (error: unknown) {
        output.push({
          nome,
          email: generateEmailFromName(nome),
          senha: generatePasswordFromName(nome),
          success: false,
          error: getApiMessage(error, "Erro ao criar/vincular coordenador."),
        });
      }

      setProgress((prev) => ({ ...prev, current: Math.min(prev.current + 1, prev.total) }));
    }

    setResults(output);
    setIsProcessing(false);

    const successCount = output.filter((item) => item.success).length;
    if (successCount > 0) onSuccess();

    toast({
      title: "Processo finalizado",
      description: `${successCount} de ${output.length} coordenador(es) criado(s) e vinculado(s).`,
      variant: successCount > 0 ? "default" : "destructive",
    });
  };

  const successCount = results.filter((item) => item.success).length;
  const errorCount = results.filter((item) => !item.success).length;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) return;
        if (isProcessing) {
          toast({
            title: "Processamento em andamento",
            description: "Aguarde finalizar para evitar inconsistências.",
            variant: "destructive",
          });
          return;
        }
        onClose();
      }}
    >
      <DialogContent className="w-[95vw] max-w-4xl max-h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            Coordenadores em lote
          </DialogTitle>
          <DialogDescription>
            Escola: {schoolName}. Um nome por linha para criar e vincular coordenadores automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lista de coordenadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="coordinators-bulk-list">Um nome por linha</Label>
              <Textarea
                id="coordinators-bulk-list"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={"Maria Silva\nJoao Pereira\nAna Souza"}
                className="min-h-[180px]"
              />
              <p className="text-sm text-muted-foreground">{parsedNames.length} nome(s) válido(s).</p>

              {isProcessing && (
                <div className="space-y-2 border rounded-md p-3 bg-orange-50/70 dark:bg-orange-950/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Adicionando coordenadores...</span>
                    <span>
                      {progress.current}/{progress.total}
                    </span>
                  </div>
                  <Progress value={progressPercent} />
                  <p className="text-xs text-muted-foreground">
                    Não feche a aba até a conclusão do processamento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4 text-orange-600" />
                  Resultado do lote
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                    {successCount} sucesso
                  </Badge>
                  {errorCount > 0 && <Badge variant="destructive">{errorCount} com erro</Badge>}
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {results.map((item, index) => (
                    <div
                      key={`${item.nome}-${index}`}
                      className="border rounded-md p-3 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-sm">{item.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.email}</p>
                        {item.success ? (
                          <p className="text-xs text-muted-foreground">Senha: {item.senha}</p>
                        ) : (
                          <p className="text-xs text-red-600">{item.error}</p>
                        )}
                      </div>
                      {item.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateBatch}
            disabled={isProcessing || parsedNames.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar coordenadores
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
