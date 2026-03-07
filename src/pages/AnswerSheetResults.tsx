import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  BarChart3,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Users,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ResultsCharts } from '@/components/evaluations/ResultsCharts';
import { StudentRanking } from '@/components/evaluations/StudentRanking';
import { cn } from '@/lib/utils';

// Opções dos filtros (resposta de GET /answer-sheets/opcoes-filtros-results)
interface FilterOption {
  id: string;
  nome?: string;
  name?: string;
  titulo?: string;
}

interface OpcoesFiltrosResponse {
  estados?: FilterOption[];
  municipios?: FilterOption[];
  gabaritos?: FilterOption[];
  escolas?: FilterOption[];
  series?: FilterOption[];
  turmas?: FilterOption[];
}

// Resposta de GET /answer-sheets/resultados-agregados
interface EstatisticasGerais {
  tipo: string;
  nome?: string;
  estado?: string;
  municipio?: string;
  escola?: string;
  serie?: string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes?: number;
  alunos_ausentes?: number;
  media_nota_geral: number;
  media_proficiencia_geral: number;
  distribuicao_classificacao_geral?: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

interface GabaritoAgregado {
  id: string;
  titulo: string;
  serie?: string;
  turma?: string;
  escola?: string;
  municipio?: string;
  estado?: string;
  total_alunos: number;
  alunos_participantes: number;
  media_nota: number;
  media_proficiencia: number;
  distribuicao_classificacao?: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

interface AlunoTabela {
  student_id: string;
  nome: string;
  turma?: string;
  serie?: string;
  grade: number;
  proficiency: number;
  classification: string;
  score_percentage: number;
  correct_answers: number;
  total_questions: number;
}

interface RankingItem {
  posicao: number;
  student_id: string;
  nome: string;
  grade: number;
  proficiency: number;
  classification: string;
  score_percentage: number;
}

interface ResultadosAgregadosResponse {
  nivel_granularidade?: string;
  filtros_aplicados?: Record<string, string>;
  estatisticas_gerais: EstatisticasGerais;
  resultados_detalhados?: {
    gabaritos: GabaritoAgregado[];
    paginacao?: { page: number; per_page: number; total: number; total_pages: number };
  };
  tabela_detalhada?: {
    alunos: AlunoTabela[];
  };
  ranking?: RankingItem[];
}

const norm = (o: FilterOption) => o.nome ?? o.name ?? o.titulo ?? o.id;

export default function AnswerSheetResults() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filtros (cascata: estado -> municipio -> gabarito -> escola -> serie -> turma)
  const [estado, setEstado] = useState<string>('all');
  const [municipio, setMunicipio] = useState<string>('all');
  const [gabarito, setGabarito] = useState<string>('all');
  const [escola, setEscola] = useState<string>('all');
  const [serie, setSerie] = useState<string>('all');
  const [turma, setTurma] = useState<string>('all');

  // Opções dos filtros (carregadas em cascata)
  const [opcoes, setOpcoes] = useState<OpcoesFiltrosResponse>({});
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Dados agregados
  const [apiData, setApiData] = useState<ResultadosAgregadosResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar opções de filtros (cascata)
  const fetchOpcoesFiltros = useCallback(async () => {
    const params = new URLSearchParams();
    if (estado && estado !== 'all') params.set('estado', estado);
    if (municipio && municipio !== 'all') params.set('municipio', municipio);
    if (gabarito && gabarito !== 'all') params.set('gabarito', gabarito);
    if (escola && escola !== 'all') params.set('escola', escola);
    if (serie && serie !== 'all') params.set('serie', serie);
    if (turma && turma !== 'all') params.set('turma', turma);
    const query = params.toString();
    try {
      setIsLoadingFilters(true);
      const url = `/answer-sheets/opcoes-filtros-results${query ? `?${query}` : ''}`;
      const res = await api.get<OpcoesFiltrosResponse>(url);
      setOpcoes(res.data || {});
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Não foi possível carregar os filtros.',
        variant: 'destructive',
      });
      setOpcoes({});
    } finally {
      setIsLoadingFilters(false);
    }
  }, [estado, municipio, gabarito, escola, serie, turma, toast]);

  useEffect(() => {
    fetchOpcoesFiltros();
  }, [fetchOpcoesFiltros]);

  // Reset em cascata ao mudar filtro superior
  const setEstadoAndReset = (v: string) => {
    setEstado(v);
    setMunicipio('all');
    setGabarito('all');
    setEscola('all');
    setSerie('all');
    setTurma('all');
  };
  const setMunicipioAndReset = (v: string) => {
    setMunicipio(v);
    setGabarito('all');
    setEscola('all');
    setSerie('all');
    setTurma('all');
  };
  const setGabaritoAndReset = (v: string) => {
    setGabarito(v);
    setEscola('all');
    setSerie('all');
    setTurma('all');
  };
  const setEscolaAndReset = (v: string) => {
    setEscola(v);
    setSerie('all');
    setTurma('all');
  };
  const setSerieAndReset = (v: string) => {
    setSerie(v);
    setTurma('all');
  };

  // Carregar resultados agregados (estado, município e cartão resposta obrigatórios)
  const loadResultadosAgregados = useCallback(async () => {
    if (!estado || estado === 'all' || !municipio || municipio === 'all' || !gabarito || gabarito === 'all') {
      setApiData(null);
      return;
    }
    const params = new URLSearchParams();
    params.set('estado', estado);
    params.set('municipio', municipio);
    params.set('gabarito', gabarito);
    if (escola && escola !== 'all') params.set('escola', escola);
    if (serie && serie !== 'all') params.set('serie', serie);
    if (turma && turma !== 'all') params.set('turma', turma);
    try {
      setIsLoadingData(true);
      setError(null);
      const res = await api.get<ResultadosAgregadosResponse>(
        `/answer-sheets/resultados-agregados?${params.toString()}`
      );
      setApiData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível carregar os resultados.');
      setApiData(null);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Não foi possível carregar os resultados.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [estado, municipio, gabarito, escola, serie, turma, toast]);

  useEffect(() => {
    loadResultadosAgregados();
  }, [loadResultadosAgregados]);

  const handleBack = () => navigate('/app/cartao-resposta');

  // Mapear resposta agregada para o formato esperado por ResultsCharts
  const chartsApiData = useMemo(() => {
    if (!apiData?.estatisticas_gerais) return null;
    const gabaritos = apiData.resultados_detalhados?.gabaritos ?? [];
    return {
      estatisticas_gerais: {
        media_nota_geral: apiData.estatisticas_gerais.media_nota_geral ?? 0,
        media_proficiencia_geral: apiData.estatisticas_gerais.media_proficiencia_geral ?? 0,
        distribuicao_classificacao_geral: apiData.estatisticas_gerais.distribuicao_classificacao_geral,
      },
      resultados_por_disciplina: gabaritos.map((g) => ({
        disciplina: g.titulo || g.serie || g.id,
        media_nota: g.media_nota ?? 0,
        media_proficiencia: g.media_proficiencia ?? 0,
        distribuicao_classificacao: g.distribuicao_classificacao,
      })),
    };
  }, [apiData]);

  const evaluationInfo = useMemo(() => {
    if (!apiData?.estatisticas_gerais) return null;
    const e = apiData.estatisticas_gerais;
    return {
      id: '',
      titulo: e.nome ?? 'Resultados',
      disciplina: '',
      serie: e.serie ?? '',
      escola: e.escola ?? '',
      municipio: e.municipio ?? '',
      estado: e.estado ?? '',
      data_aplicacao: '',
      total_alunos: e.total_alunos ?? 0,
      alunos_participantes: e.alunos_participantes ?? 0,
      alunos_ausentes: e.alunos_ausentes ?? 0,
      media_nota: e.media_nota_geral ?? 0,
      media_proficiencia: e.media_proficiencia_geral ?? 0,
    };
  }, [apiData]);

  const inferStageGroup = useCallback((): 'group1' | 'group2' => 'group2', []);
  const getMaxForDiscipline = useCallback(() => 400, []);

  const estados = opcoes.estados ?? [];
  const municipios = opcoes.municipios ?? [];
  const gabaritos = opcoes.gabaritos ?? [];
  const escolas = opcoes.escolas ?? [];
  const series = opcoes.series ?? [];
  const turmas = opcoes.turmas ?? [];

  const alunos = apiData?.tabela_detalhada?.alunos ?? [];
  const ranking = apiData?.ranking ?? [];
  const hasMinimumFilters =
    estado && estado !== 'all' &&
    municipio && municipio !== 'all' &&
    gabarito && gabarito !== 'all';

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Resultados dos Cartões Resposta
          </h1>
          <p className="text-muted-foreground">
            Filtre por estado, município e cartão resposta para ver resultados agregados
          </p>
          {apiData && apiData.estatisticas_gerais && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Nível: {(apiData.nivel_granularidade || apiData.estatisticas_gerais.tipo || 'município').charAt(0).toUpperCase() + (apiData.nivel_granularidade || apiData.estatisticas_gerais.tipo || 'município').slice(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {apiData.estatisticas_gerais.nome || apiData.estatisticas_gerais.escola || 'Dados gerais'}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {hasMinimumFilters && (
            <Button variant="outline" onClick={loadResultadosAgregados} disabled={isLoadingData}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoadingData && 'animate-spin')} />
              Atualizar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Estado, município e cartão resposta são obrigatórios. Refine com escola, série e turma.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 w-full min-w-0">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={estado} onValueChange={setEstadoAndReset} disabled={isLoadingFilters}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estados.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {norm(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Município</label>
              <Select value={municipio} onValueChange={setMunicipioAndReset} disabled={isLoadingFilters || estado === 'all'}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Selecione o município" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {norm(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cartão resposta</label>
              <Select value={gabarito} onValueChange={setGabaritoAndReset} disabled={isLoadingFilters || municipio === 'all'}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Selecione o cartão resposta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {gabaritos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {norm(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola</label>
              <Select value={escola} onValueChange={setEscolaAndReset} disabled={isLoadingFilters || gabarito === 'all'}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {escolas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {norm(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Série</label>
              <Select value={serie} onValueChange={setSerieAndReset} disabled={isLoadingFilters || escola === 'all'}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {series.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {norm(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma</label>
              <Select value={turma} onValueChange={setTurma} disabled={isLoadingFilters || serie === 'all'}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {norm(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!hasMinimumFilters && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Selecione Estado, Município e Cartão resposta</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Escolha o estado, o município e o cartão resposta nos filtros acima para carregar os resultados agregados.
            </p>
          </CardContent>
        </Card>
      )}

{hasMinimumFilters && isLoadingData && (
  <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[200px]">
    <div className="flex items-center mb-2">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
      <span className="text-muted-foreground text-lg font-semibold">Carregando resultados...</span>
    </div>
    <p className="text-muted-foreground text-sm">
      Aguarde enquanto os dados dos resultados são carregados.
    </p>
  </div>
)}
{hasMinimumFilters && !isLoadingData && (
  <div className="container mx-auto px-4 py-6 space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Resultados de Correção</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {apiData?.resultados_detalhados?.gabaritos?.[0]?.titulo ??
            (gabarito !== 'all' ? norm(opcoes.gabaritos?.find((g) => g.id === gabarito) ?? { id: gabarito }) : null) ??
            'Visualize os resultados das correções realizadas'}
        </p>
      </div>
      <div className="flex justify-center w-full sm:w-auto sm:justify-end">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Cartões Gerados
        </Button>
      </div>
    </div>
  </div>
)}

      {hasMinimumFilters && !isLoadingData && apiData && (
        <>
          {/* Cards de resumo (estatísticas gerais) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participantes</p>
                    <p className="text-2xl font-bold">
                      {apiData.estatisticas_gerais.alunos_participantes ?? 0}
                      <span className="text-sm font-normal text-muted-foreground">
                        {' '}/ {apiData.estatisticas_gerais.total_alunos ?? 0}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Média da nota</p>
                    <p className="text-2xl font-bold">
                      {(apiData.estatisticas_gerais.media_nota_geral ?? 0).toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/50">
                    <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Média da proficiência</p>
                    <p className="text-2xl font-bold">
                      {(apiData.estatisticas_gerais.media_proficiencia_geral ?? 0).toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/50">
                    <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Distribuição</p>
                    <p className="text-xs font-medium">
                      Abaixo: {apiData.estatisticas_gerais.distribuicao_classificacao_geral?.abaixo_do_basico ?? 0} · Básico: {apiData.estatisticas_gerais.distribuicao_classificacao_geral?.basico ?? 0} · Adequado: {apiData.estatisticas_gerais.distribuicao_classificacao_geral?.adequado ?? 0} · Avançado: {apiData.estatisticas_gerais.distribuicao_classificacao_geral?.avancado ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          {chartsApiData && (
            <ResultsCharts
              apiData={chartsApiData}
              evaluationInfo={evaluationInfo}
              inferStageGroup={inferStageGroup}
              getMaxForDiscipline={getMaxForDiscipline}
            />
          )}

          {/* Ranking */}
          {ranking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ranking</CardTitle>
                <CardDescription>Alunos ordenados por nota e proficiência</CardDescription>
              </CardHeader>
              <CardContent>
                <StudentRanking
                  students={ranking.map((r) => {
                    const aluno = alunos.find((a) => a.student_id === r.student_id);
                    return {
                      id: r.student_id,
                      nome: r.nome ?? '',
                      turma: aluno?.turma ?? '',
                      escola: '',
                      serie: aluno?.serie ?? '',
                      nota: r.grade ?? 0,
                      proficiencia: r.proficiency ?? 0,
                      classificacao: (r.classification || 'Básico') as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
                      status: 'concluida' as const,
                      posicao: r.posicao,
                    };
                  })}
                  maxStudents={50}
                />
              </CardContent>
            </Card>
          )}

          {/* Tabela de alunos */}
          {alunos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados dos Alunos</CardTitle>
                <CardDescription>
                  {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'} no escopo selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Nome</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Turma</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Série</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Nota</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Proficiência</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Classificação</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Acertos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.map((a) => (
                        <tr key={a.student_id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-3 font-medium">{a.nome}</td>
                          <td className="py-3 px-3 text-muted-foreground">{a.turma ?? '—'}</td>
                          <td className="py-3 px-3 text-muted-foreground">{a.serie ?? '—'}</td>
                          <td className="py-3 px-3">{(a.grade ?? 0).toFixed(1)}</td>
                          <td className="py-3 px-3">{(a.proficiency ?? 0).toFixed(1)}</td>
                          <td className="py-3 px-3">
                            <Badge variant="outline">{a.classification ?? '—'}</Badge>
                          </td>
                          <td className="py-3 px-3">
                            {a.correct_answers ?? 0} / {a.total_questions ?? 0} ({(a.score_percentage ?? 0).toFixed(0)}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {alunos.length === 0 && ranking.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum resultado encontrado para os filtros selecionados.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
