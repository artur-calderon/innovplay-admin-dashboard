import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Coins, Lock, ArrowLeft, Info } from "lucide-react";
import {
  getConquistas,
  resgatarConquista,
  type Conquista,
  type ConquistaNivel,
  type MedalhaTipo,
} from "@/services/conquistasApi";
import { useToast } from "@/hooks/use-toast";
import {
  MEDALHA_LABEL,
  MEDALHA_STYLES,
  MEDALHA_CARD_STYLES,
  MEDALHA_CARD_BLOQUEADO,
  MedalIcon,
} from "@/components/conquistas/medalConfig";

export const ConquistasPage: React.FC = () => {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [loading, setLoading] = useState(true);
  const [resgatandoId, setResgatandoId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConquistas();
      setConquistas(data ?? []);
    } catch {
      setConquistas([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas conquistas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResgatar = async (achievementId: string, medalha: MedalhaTipo) => {
    const key = `${achievementId}-${medalha}`;
    setResgatandoId(key);
    try {
      const result = await resgatarConquista({ achievement_id: achievementId, medalha });
      toast({
        title: "Resgate realizado",
        description: `+${result.moedas_creditadas} moedas creditadas. Novo saldo: ${result.novo_saldo}`,
        variant: "default",
      });
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Não foi possível resgatar.";
      toast({
        title: "Erro ao resgatar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setResgatandoId(null);
    }
  };

  const renderNivelGrande = (c: Conquista, nivel: ConquistaNivel) => {
    const key = `${c.achievement_id}-${nivel.medalha}`;
    const podeResgatar =
      nivel.desbloqueada && !nivel.resgatado && nivel.moedas_valor > 0;
    const estaResgatando = resgatandoId === key;
    const cardStyle = nivel.desbloqueada
      ? `rounded-xl border-2 p-4 relative overflow-hidden ${MEDALHA_CARD_STYLES[nivel.medalha].card}`
      : `rounded-xl p-4 relative overflow-hidden ${MEDALHA_CARD_BLOQUEADO[nivel.medalha]}`;

    return (
      <div key={key} className={cardStyle}>
        {/* Ícone de medalha na área vazia (fundo) */}
        <div
          className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${
            nivel.desbloqueada ? "opacity-20 text-white" : "opacity-15 text-muted-foreground"
          }`}
          aria-hidden
        >
          <MedalIcon tipo={nivel.medalha} size={56} />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          {nivel.desbloqueada ? (
            <MedalIcon tipo={nivel.medalha} size={32} withBg />
          ) : (
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-muted border-2 border-border flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span
              className={`text-base font-bold ${
                nivel.desbloqueada ? "text-current" : "text-muted-foreground"
              }`}
            >
              {MEDALHA_LABEL[nivel.medalha]}
            </span>
            {nivel.desbloqueada && (
              <p className="text-sm mt-0.5 opacity-90">
                {nivel.resgatado ? "Já resgatado" : `${nivel.moedas_valor} moedas para resgatar`}
              </p>
            )}
          </div>
          {podeResgatar && (
            <Button
              size="default"
              className="flex-shrink-0"
              onClick={() => handleResgatar(c.achievement_id, nivel.medalha)}
              disabled={estaResgatando}
            >
              {estaResgatando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Coins className="w-4 h-4 mr-2" />
                  Resgatar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderCardUnico = (c: Conquista) => {
    const podeResgatar =
      c.medalha &&
      c.moedas_valor != null &&
      c.moedas_valor > 0 &&
      !c.resgatado;
    const key = `${c.achievement_id}-${c.medalha}`;
    const estaResgatando = resgatandoId === key;
    const medalha = c.medalha as MedalhaTipo;
    const cardClass = c.medalha
      ? `rounded-2xl border-2 p-6 relative overflow-hidden ${MEDALHA_CARD_STYLES[medalha].card}`
      : "rounded-2xl border border-border bg-card p-6";

    return (
      <Card key={c.achievement_id} className={cardClass}>
        <CardContent className="p-6">
          {c.medalha && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 text-current pointer-events-none" aria-hidden>
              <MedalIcon tipo={medalha} size={80} />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
            {c.medalha && (
              <MedalIcon tipo={medalha} size={48} withBg />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold truncate">{c.nome}</h3>
              {c.medalha && (
                <span
                  className={`inline-block mt-1 text-sm px-3 py-1 rounded-full border bg-white/20 border-white/40 ${MEDALHA_STYLES[medalha].text}`}
                >
                  {MEDALHA_LABEL[medalha]}
                </span>
              )}
              {c.descricao && (
                <p className="text-sm opacity-90 mt-2 line-clamp-3">{c.descricao}</p>
              )}
              {c.progresso != null && (
                <div className="mt-3">
                  <Progress value={Math.min(100, c.progresso)} className="h-2" />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {c.moedas_valor != null && c.moedas_valor > 0 && (
                  <span className="text-sm opacity-90 flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    {c.resgatado ? "Resgatado" : `${c.moedas_valor} moedas`}
                  </span>
                )}
                {podeResgatar && (
                  <Button
                    onClick={() => handleResgatar(c.achievement_id, medalha)}
                    disabled={estaResgatando}
                  >
                    {estaResgatando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Coins className="w-4 h-4 mr-2" />
                        Resgatar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/aluno" aria-label="Voltar ao painel">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 dark:from-amber-500 dark:via-yellow-400 dark:to-amber-500 bg-clip-text text-transparent">
            Todas as conquistas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Desbloqueie níveis e resgate moedas por cada medalha.
          </p>
        </div>
      </div>

      <Card className="border-2 border-amber-200/60 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 dark:from-amber-950/30 dark:to-yellow-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 space-y-3">
              <h2 className="font-semibold text-foreground">O que são as conquistas?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As conquistas são metas que você desbloqueia ao estudar e participar do sistema. Cada uma tem até quatro níveis — <span className="font-medium text-amber-700 dark:text-amber-400">Bronze</span>, <span className="font-medium text-slate-600 dark:text-slate-400">Prata</span>, <span className="font-medium text-yellow-600 dark:text-yellow-400">Ouro</span> e <span className="font-medium text-violet-600 dark:text-violet-400">Platina</span> — e, ao atingir um nível, você pode <strong>resgatar</strong> essa medalha por moedas (Afirme Coins). As moedas entram no seu saldo e podem ser usadas depois; quanto maior o nível, mais moedas você ganha ao resgatar.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você desbloqueia conquistas ao: concluir avaliações, melhorar sua média e proficiência, participar de competições, subir ao pódio (1º, 2º ou 3º lugar) e, em uma conquista especial, ao atingir platina em todas as outras. Algumas conquistas podem aparecer ocultas (como &quot;???&quot;) até você desbloquear o primeiro nível.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
        </div>
      ) : conquistas.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-16 text-center">
            <MedalIcon tipo="ouro" size={56} withBg />
            <p className="text-lg font-semibold mt-4">Nenhuma conquista ainda</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Complete avaliações e competições para desbloquear conquistas e resgatar moedas.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/aluno">Voltar ao painel</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {conquistas.map((c, index) => {
            const nome = c.estado === "oculta" && !c.nome ? "???" : (c.nome || "???");
            const descricao =
              c.estado === "oculta" && !c.descricao ? "???" : (c.descricao || "");
            const listKey = `conquista-${c.achievement_id}-${index}`;

            if (c.niveis && c.niveis.length > 0) {
              return (
                <Card key={listKey} className="overflow-hidden border-2">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold truncate mb-1">{nome}</h2>
                    {descricao && descricao !== "???" && (
                      <p className="text-muted-foreground text-sm mb-6">{descricao}</p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-1">
                      {c.niveis.map((nivel) =>
                        renderNivelGrande({ ...c, nome, descricao }, nivel)
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <React.Fragment key={listKey}>
                {renderCardUnico({ ...c, nome, descricao })}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="pt-4">
        <Button variant="ghost" asChild>
          <Link to="/aluno" className="inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ConquistasPage;
