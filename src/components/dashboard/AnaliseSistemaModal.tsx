import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  School,
  List,
  Gamepad,
  User,
  BookOpen,
  LayoutGrid,
  GraduationCap,
  Award,
  Calendar,
  Server,
  MapPin,
  Building2,
  BarChart3,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DashboardApiService, type AnaliseSistemaResponse } from "@/services/dashboardApi";
import { Skeleton } from "@/components/ui/skeleton";

function formatMes(mes: string): string {
  if (!mes || mes.length < 7) return mes;
  const [y, m] = mes.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const mi = parseInt(m, 10) - 1;
  const shortYear = y.length >= 4 ? y.slice(2) : y;
  return `${months[mi]}/${shortYear}`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

interface AnaliseSistemaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnaliseSistemaModal({ open, onOpenChange }: AnaliseSistemaModalProps) {
  const [data, setData] = useState<AnaliseSistemaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    DashboardApiService.getAnaliseSistema()
      .then((res) => {
        setData(res ?? null);
        if (!res) setError("Não foi possível carregar a análise do sistema.");
      })
      .catch(() => {
        setData(null);
        setError("Erro ao carregar a análise do sistema.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const metricas = data?.metricas;
  const admin = data?.administracao;
  const porEstado = data?.por_escopo?.estado ?? [];
  const porMunicipio = (data?.por_escopo?.municipio ?? []).slice(0, 15);
  const porEscola = (data?.por_escopo?.escola ?? []).slice(0, 15);
  const evolucao = data?.graficos?.evolucao_ultimos_12_meses ?? [];
  const distEstado = data?.graficos?.distribuicao_por_estado ?? [];
  const distMunicipio = (data?.graficos?.distribuicao_por_municipio ?? []).slice(0, 15);
  const tecnicos = data?.dados_tecnicos;
  const conexao = data?.conexao;
  const avaliacoesPorTipo = data?.graficos?.avaliacoes_por_tipo ?? [];
  const participacao = data?.graficos?.participacao;

  const kpiCards = metricas
    ? [
        { label: "Alunos", value: metricas.students, icon: Users, color: "text-violet-600" },
        { label: "Escolas", value: metricas.schools, icon: School, color: "text-blue-600" },
        { label: "Avaliações", value: metricas.evaluations, icon: List, color: "text-emerald-600" },
        { label: "Jogos", value: metricas.games, icon: Gamepad, color: "text-amber-600" },
        { label: "Usuários", value: metricas.users, icon: User, color: "text-cyan-600" },
        { label: "Questões", value: metricas.questions, icon: BookOpen, color: "text-indigo-600" },
        { label: "Turmas", value: metricas.classes, icon: LayoutGrid, color: "text-sky-600" },
        { label: "Professores", value: metricas.teachers, icon: GraduationCap, color: "text-teal-600" },
        { label: "Certificados", value: metricas.certificates, icon: Award, color: "text-rose-600" },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6 text-violet-500" />
            Análise do Sistema
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6 pt-4">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">{error}</div>
          ) : data ? (
            <div className="space-y-6">
              {/* KPIs */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Métricas gerais
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {kpiCards.map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="border-border">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{label}</p>
                          <p className="text-lg font-bold tabular-nums">{value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {metricas?.last_sync && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Última sincronização: {formatDateTime(metricas.last_sync)}
                  </p>
                )}
              </section>

              {/* Conexão / Status do sistema */}
              {(conexao || tecnicos) && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Conexão / Status do sistema
                  </h3>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {conexao && (
                          <>
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  conexao.db_status === "ok"
                                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                    : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                                }`}
                              >
                                {conexao.db_status === "ok" ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <XCircle className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Status do banco</p>
                                <p className="font-semibold capitalize">{conexao.db_status}</p>
                                <p className="text-xs text-muted-foreground">
                                  {conexao.db_engine} · {conexao.db_origem}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Verificado em</p>
                              <p className="text-sm font-medium">
                                {formatDateTime(conexao.verificado_em)}
                              </p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Ambiente</p>
                          <p className="text-sm font-medium">
                            {conexao?.ambiente ?? tecnicos?.ambiente ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Última sincronização</p>
                          <p className="text-sm font-medium">
                            {tecnicos?.timestamp
                              ? formatDateTime(tecnicos.timestamp)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Administração */}
              {admin && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Administração
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    <Card className="border-border">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
                        <p className="text-xl font-bold text-violet-600">
                          {Number(admin.taxa_conclusao_geral).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Total de sessões</p>
                        <p className="text-xl font-bold tabular-nums">{admin.total_sessoes}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Sessões concluídas</p>
                        <p className="text-xl font-bold tabular-nums text-emerald-600">
                          {admin.sessoes_concluidas}
                        </p>
                      </CardContent>
                    </Card>
                    {admin.media_notas_geral != null && (
                      <Card className="border-border">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Média geral de notas</p>
                          <p className="text-xl font-bold tabular-nums">
                            {Number(admin.media_notas_geral).toFixed(1)}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {admin.total_respostas_questoes != null && (
                      <Card className="border-border">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Total de respostas (questões)</p>
                          <p className="text-xl font-bold tabular-nums">
                            {admin.total_respostas_questoes}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {admin.alunos_com_pelo_menos_uma_avaliacao != null && (
                      <Card className="border-border">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Alunos com ≥ 1 avaliação</p>
                          <p className="text-xl font-bold tabular-nums">
                            {admin.alunos_com_pelo_menos_uma_avaliacao}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {admin.percentual_participacao != null && (
                      <Card className="border-border">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Participação</p>
                          <p className="text-xl font-bold tabular-nums text-violet-600">
                            {Number(admin.percentual_participacao).toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {admin.escolas_ativas != null && (
                      <Card className="border-border">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Escolas ativas</p>
                          <p className="text-xl font-bold tabular-nums">{admin.escolas_ativas}</p>
                        </CardContent>
                      </Card>
                    )}
                    {admin.ultima_atividade && (
                      <Card className="border-border">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Última atividade</p>
                          <p className="text-sm font-medium">
                            {formatDateTime(admin.ultima_atividade)}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {admin.disciplinas_com_questoes != null && (
                      <Card className="border-border">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Disciplinas com questões</p>
                          <p className="text-xl font-bold tabular-nums">
                            {admin.disciplinas_com_questoes}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </section>
              )}

              {/* Participação (gauge/card + barra) */}
              {participacao && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Participação
                  </h3>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {participacao.alunos_com_pelo_menos_uma_avaliacao} de {participacao.total_alunos} alunos
                        fizeram ao menos 1 prova
                      </p>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.min(100, Number(participacao.percentual_participacao) || 0)}
                          className="flex-1 h-3"
                        />
                        <span className="text-lg font-bold tabular-nums text-violet-600 shrink-0">
                          {Number(participacao.percentual_participacao).toFixed(1)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Avaliações por tipo */}
              {avaliacoesPorTipo.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Avaliações por tipo
                  </h3>
                  <Card className="border-border">
                    <CardContent className="pt-4 pb-2">
                      <DonutChartComponent
                        data={avaliacoesPorTipo.map((d) => ({
                          name: d.tipo === "AVALIACAO" ? "Avaliação" : d.tipo === "SIMULADO" ? "Simulado" : d.tipo,
                          value: d.total,
                        }))}
                        title="Tipos de avaliação"
                        subtitle="Quantidade por tipo"
                        showValues={true}
                      />
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Evolução 12 meses - gráfico de círculo (alunos por mês) */}
              {evolucao.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Últimos 12 meses — Alunos por mês
                  </h3>
                  <Card className="border-border">
                    <CardContent className="pt-4 pb-2">
                      <DonutChartComponent
                        data={evolucao.map((d) => ({
                          name: formatMes(d.mes),
                          value: d.alunos,
                        }))}
                        title="Alunos por mês"
                        subtitle="Últimos 12 meses — cada fatia é um mês"
                        showValues={true}
                      />
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Distribuição por estado */}
              {distEstado.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Distribuição por estado
                  </h3>
                  <Card className="border-border">
                    <CardContent className="pt-4 pb-2">
                      <BarChartComponent
                        data={distEstado.map((d) => ({ name: d.estado, value: d.alunos }))}
                        title="Alunos por estado"
                        subtitle="Eixo vertical: quantidade de alunos"
                        yAxisLabel="Alunos"
                        color="#8b5cf6"
                        yAxisDomain={[0, Math.max(...distEstado.map((d) => d.alunos), 1) * 1.1]}
                      />
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Top municípios */}
              {distMunicipio.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Top 15 municípios (por alunos)
                  </h3>
                  <Card className="border-border">
                    <CardContent className="pt-4 pb-2">
                      <BarChartComponent
                        data={distMunicipio.map((d) => ({
                          name: d.municipio.length > 12 ? d.municipio.slice(0, 12) + "…" : d.municipio,
                          value: d.alunos,
                        }))}
                        title="Alunos por município"
                        subtitle="Top 15 — eixo vertical: quantidade de alunos"
                        yAxisLabel="Alunos"
                        color="#06b6d4"
                        yAxisDomain={[0, Math.max(...distMunicipio.map((d) => d.alunos), 1) * 1.1]}
                      />
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Tabela por estado */}
              {porEstado.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Por estado
                  </h3>
                  <Card className="border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Municípios</TableHead>
                          <TableHead className="text-right">Escolas</TableHead>
                          <TableHead className="text-right">Alunos</TableHead>
                          <TableHead className="text-right">Avaliações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {porEstado.map((row) => (
                          <TableRow key={row.estado}>
                            <TableCell className="font-medium">{row.estado}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.municipios}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.escolas}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.alunos}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.avaliacoes}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </section>
              )}

              {/* Tabela por município */}
              {porMunicipio.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Por município (até 15)
                  </h3>
                  <Card className="border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Município</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Escolas</TableHead>
                          <TableHead className="text-right">Alunos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {porMunicipio.map((row) => (
                          <TableRow key={row.municipio_id}>
                            <TableCell className="font-medium">{row.nome}</TableCell>
                            <TableCell>{row.estado}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.escolas}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.alunos}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </section>
              )}

              {/* Tabela por escola */}
              {porEscola.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                    <School className="h-4 w-4" />
                    Por escola (até 15)
                  </h3>
                  <Card className="border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Escola</TableHead>
                          <TableHead>Município</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Alunos</TableHead>
                          <TableHead className="text-right">Turmas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {porEscola.map((row) => (
                          <TableRow key={row.escola_id}>
                            <TableCell className="font-medium">{row.nome}</TableCell>
                            <TableCell>{row.municipio}</TableCell>
                            <TableCell>{row.estado}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.alunos}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.turmas}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </section>
              )}

              {/* Dados técnicos */}
              {tecnicos && (
                <section className="pt-2">
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Server className="h-3 w-3" />
                        Ambiente: {tecnicos.ambiente}
                      </span>
                      <span>Consulta: {formatDateTime(tecnicos.timestamp)}</span>
                      <span>Fuso: {tecnicos.timezone}</span>
                    </CardContent>
                  </Card>
                </section>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
