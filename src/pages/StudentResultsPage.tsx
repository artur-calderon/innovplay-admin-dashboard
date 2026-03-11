import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/authContext"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Trophy, FileText, ExternalLink, BarChart2, Star, Target, Medal, RefreshCw, BookOpen, Calendar, Loader2, ArrowRight, Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentResultSummaryCharts } from "@/components/student/StudentResultSummaryCharts"
import { getConquistas, type Conquista } from "@/services/conquistasApi"
import { MedalIcon } from "@/components/conquistas/medalConfig"
import type { MedalhaTipo } from "@/services/conquistasApi"

function formatDataDisplay(value: string): string {
  if (!value || value === "—") return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

interface StudentCompletedResponse {
  student: { id: string; name: string; user_id: string }
  total_completed: number
  returned_count: number
  pagination: { limit: number; offset: number; has_more: boolean }
  evaluations: Array<{
    test_id: string
    title: string
    description?: string
    type: string
    subject: { id: string; name: string }
    grade: { id: string; name: string }
    subjects_info?: Array<{ id: string; name: string }>
    total_questions: number
    application_info: { application: string; expiration: string }
    student_results: {
      correct_answers: number
      total_questions: number
      score_percentage: number
      grade: number
      proficiency: number
      classification: string
      calculated_at: string
    }
  }>
}

/** Tipo do resultado para separar em abas: avaliação, competição ou olimpíada. */
export type ResultTypeTab = "avaliacao" | "competicao" | "olimpiada"

export interface StudentResultListItem {
  id: string
  resultType: ResultTypeTab
  titulo: string
  disciplina: string
  data_aplicacao: string
  total_questions: number
  nota: number
  acertos: number
  total_questions_result: number
  classificacao: string
}

type SortOption = "questions_desc" | "questions_asc" | "grade_desc" | "grade_asc" | "recent" | "oldest"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Mais recente" },
  { value: "oldest", label: "Mais antigo" },
  { value: "grade_desc", label: "Maior nota" },
  { value: "grade_asc", label: "Menor nota" },
  { value: "questions_desc", label: "Mais questões" },
  { value: "questions_asc", label: "Menos questões" },
]

const TAB_VALUES: ResultTypeTab[] = ["avaliacao", "competicao", "olimpiada"]
const TAB_LABELS: Record<ResultTypeTab, string> = {
  avaliacao: "Avaliações",
  competicao: "Competições",
  olimpiada: "Olimpíadas",
}

export default function StudentResultsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const tabFromUrl = (searchParams.get("tab") as ResultTypeTab) || "avaliacao"
  const activeTab = TAB_VALUES.includes(tabFromUrl) ? tabFromUrl : "avaliacao"

  const [items, setItems] = useState<StudentResultListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [conquistasReais, setConquistasReais] = useState<Conquista[]>([])
  const [loadingConquistas, setLoadingConquistas] = useState(true)
  const [filterDiscipline, setFilterDiscipline] = useState<string>("todas")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null)

  const setActiveTab = (tab: ResultTypeTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("tab", tab)
      return next
    })
  }

  function mapApiTypeToResultType(type: string | undefined): ResultTypeTab {
    const t = (type ?? "").toLowerCase()
    if (t.includes("olimpi")) return "olimpiada"
    if (t.includes("compet")) return "competicao"
    return "avaliacao"
  }

  const fetchCompleted = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const response = await api.get<StudentCompletedResponse>("/test/student/completed")
      const data = (response.data as StudentCompletedResponse) || ({} as StudentCompletedResponse)
      const evaluations = data.evaluations ?? []
      const mapped = evaluations.map((e) => {
        const type = e.type ?? ""
        return {
          id: e.test_id,
          resultType: mapApiTypeToResultType(type),
          titulo: e.title ?? "—",
          disciplina: e.subject?.name ?? "—",
          data_aplicacao: e.application_info?.application ?? "—",
          total_questions: e.total_questions ?? 0,
          nota: Number(e.student_results?.grade) ?? 0,
          acertos: Number(e.student_results?.correct_answers) ?? 0,
          total_questions_result: Number(e.student_results?.total_questions) ?? e.total_questions ?? 0,
          classificacao: e.student_results?.classification ?? "—",
        }
      })
      setItems(mapped)
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus resultados.",
        variant: "destructive",
      })
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, toast])

  useEffect(() => {
    fetchCompleted()
  }, [fetchCompleted])

  useEffect(() => {
    let cancelled = false
    setLoadingConquistas(true)
    getConquistas()
      .then((data) => {
        if (!cancelled) setConquistasReais(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setConquistasReais([])
      })
      .finally(() => {
        if (!cancelled) setLoadingConquistas(false)
      })
    return () => { cancelled = true }
  }, [])

  const itemsByTab = useMemo(() => {
    const byTab: Record<ResultTypeTab, StudentResultListItem[]> = {
      avaliacao: items.filter((i) => i.resultType === "avaliacao"),
      competicao: items.filter((i) => i.resultType === "competicao"),
      olimpiada: items.filter((i) => i.resultType === "olimpiada"),
    }
    return byTab
  }, [items])

  const disciplines = useMemo(() => {
    const list = itemsByTab[activeTab]
    const set = new Set<string>()
    list.forEach((i) => set.add(i.disciplina))
    return Array.from(set).sort()
  }, [itemsByTab, activeTab])

  // Estatísticas gamificadas (derivadas dos resultados da aba ativa)
  const stats = useMemo(() => {
    const list = itemsByTab[activeTab]
    if (list.length === 0) return null
    const grades = list.map((i) => i.nota ?? 0).filter((g) => g > 0)
    const sum = grades.reduce((a, b) => a + b, 0)
    const media = grades.length > 0 ? sum / grades.length : 0
    const melhorNota = grades.length > 0 ? Math.max(...grades) : 0
    const xpTotal = list.reduce((acc, i) => acc + 10 + (i.nota ?? 0) * 2, 0)
    const xpProximoNivel = 100
    const nivel = Math.floor(xpTotal / xpProximoNivel) + 1
    const xpNoNivel = xpTotal % xpProximoNivel
    const progressoNivel = (xpNoNivel / xpProximoNivel) * 100
    return { total: list.length, media, melhorNota, xpTotal, nivel, progressoNivel }
  }, [itemsByTab, activeTab])

  // Conquistas reais da API: considerar desbloqueada se tem estado desbloqueada, medalha atual ou algum nível desbloqueado
  const isConquistaUnlocked = useCallback((c: Conquista) => {
    if (c.estado === "desbloqueada" || c.medalha) return true
    if (c.niveis?.some((n) => n.desbloqueada)) return true
    return false
  }, [])
  const conquistasUnlockedCount = useMemo(
    () => conquistasReais.filter(isConquistaUnlocked).length,
    [conquistasReais, isConquistaUnlocked]
  )

  const filteredAndSorted = useMemo(() => {
    const listTab = itemsByTab[activeTab]
    let list = filterDiscipline === "todas" ? listTab : listTab.filter((i) => i.disciplina === filterDiscipline)
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "questions_desc":
          return b.total_questions - a.total_questions
        case "questions_asc":
          return a.total_questions - b.total_questions
        case "grade_desc":
          return b.nota - a.nota
        case "grade_asc":
          return a.nota - b.nota
        case "recent":
          return new Date(b.data_aplicacao).getTime() - new Date(a.data_aplicacao).getTime()
        case "oldest":
          return new Date(a.data_aplicacao).getTime() - new Date(b.data_aplicacao).getTime()
        default:
          return 0
      }
    })
    return sorted
  }, [itemsByTab, activeTab, filterDiscipline, sortBy])

  const handleVerResultadoCompleto = (id: string) => {
    navigate(`/aluno/avaliacao/${id}/resultado`)
  }

  const handleVerResumo = (id: string) => {
    setExpandedResultId(id)
  }

  const expandedItem = expandedResultId ? filteredAndSorted.find((i) => i.id === expandedResultId) : null

  // test_ids em ordem cronológica (mais antiga → mais recente) para POST /test/student/compare
  const testIdsForCompare = useMemo(() => {
    const listTab = itemsByTab[activeTab]
    if (!expandedResultId || !listTab.length) return []
    const byDate = [...listTab].sort(
      (a, b) => new Date(a.data_aplicacao).getTime() - new Date(b.data_aplicacao).getTime()
    )
    const idx = byDate.findIndex((i) => i.id === expandedResultId)
    if (idx < 0) return []
    const start = Math.max(0, idx - 3)
    return byDate.slice(start, idx + 1).map((i) => i.id)
  }, [itemsByTab, activeTab, expandedResultId])

  if (user?.role !== "aluno") {
    navigate("/aluno")
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 min-h-screen">
      {/* Header — colorido e animado (gamificado) */}
      <div className="space-y-2 animate-fade-in-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3" id="results-page-title">
              <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/30 transition-transform duration-300 hover:scale-110 shrink-0">
                <Trophy className="w-5 h-5 text-white drop-shadow" />
              </span>
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">
                Meus Resultados
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              Acompanhe suas notas e desempenho
            </p>
            <Link
              to="/aluno/avaliacoes"
              className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline inline-flex items-center gap-1 mt-1 font-medium transition-colors"
              aria-label="Ver minhas avaliações"
            >
              <BookOpen className="h-4 w-4" />
              Ver minhas avaliações
            </Link>
          </div>
          <div className="flex justify-center w-full sm:w-auto sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCompleted()}
              disabled={isLoading}
              className="rounded-full border-violet-300 dark:border-violet-500/50 hover:bg-violet-500/15 hover:border-violet-400 transition-all"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Estatísticas — cards coloridos, animados e gamificados */}
      {stats && items.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="rounded-2xl border-2 border-violet-200/60 dark:border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/20 overflow-hidden animate-fade-in-up">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Nível</p>
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.nivel}</p>
                  </div>
                  <Target className="h-8 w-8 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 border-blue-200/60 dark:border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/20 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Avaliações</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 border-fuchsia-200/60 dark:border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 to-transparent transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-fuchsia-500/20 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Média</p>
                    <p className="text-2xl font-bold text-fuchsia-600 dark:text-fuchsia-400">{stats.media.toFixed(1).replace(".", ",")}</p>
                  </div>
                  <BarChart2 className="h-8 w-8 text-fuchsia-500 dark:text-fuchsia-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 border-amber-200/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/20 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Melhor nota</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.melhorNota.toFixed(1).replace(".", ",")}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Conquistas</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {loadingConquistas ? "—" : `${conquistasUnlockedCount}/${conquistasReais.length}`}
                    </p>
                  </div>
                  <Medal className="h-8 w-8 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="border border-amber-200 dark:border-amber-500/30 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 animate-fade-in-up shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                  <span className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
                    <Medal className="h-4 w-4 text-white" />
                  </span>
                  Suas Conquistas
                </CardTitle>
                <Link to="/aluno/conquistas" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors">
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingConquistas ? (
                <div className="flex items-center py-4 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Carregando conquistas...</span>
                </div>
              ) : conquistasReais.length === 0 ? (
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">Nenhuma conquista disponível ainda.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {conquistasReais.slice(0, 12).map((c) => {
                    const unlocked = isConquistaUnlocked(c)
                    const label = c.estado === "oculta" && !c.nome ? "???" : (c.nome || "???")
                    const medalhaMaior = c.medalha ?? (c.niveis?.filter((n) => n.desbloqueada).slice(-1)[0]?.medalha)
                    return (
                      <Badge
                        key={c.achievement_id}
                        variant={unlocked ? "default" : "outline"}
                        className={`shrink-0 text-xs py-1 ${unlocked ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 dark:text-amber-950 border-0 gap-1.5 shadow-sm hover:scale-105 transition-transform cursor-default font-semibold" : "opacity-60 gap-1.5 bg-background font-medium hover:opacity-80 transition-opacity"}`}
                      >
                        {medalhaMaior ? (
                          <MedalIcon tipo={medalhaMaior as MedalhaTipo} size={14} />
                        ) : (
                          <Medal className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{label}</span>
                      </Badge>
                    )
                  })}
                  {conquistasReais.length > 12 && (
                    <Badge variant="outline" className="shrink-0 text-xs py-1 gap-1 border-dashed border-amber-300 dark:border-amber-600/50 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10">
                      +{conquistasReais.length - 12} mais
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Abas: Avaliações, Competições, Olimpíadas */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResultTypeTab)} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="avaliacao" className="gap-2 rounded-lg data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300">
            <FileText className="h-4 w-4" />
            {TAB_LABELS.avaliacao}
            {itemsByTab.avaliacao.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {itemsByTab.avaliacao.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="competicao" className="gap-2 rounded-lg data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300">
            <Award className="h-4 w-4" />
            {TAB_LABELS.competicao}
            {itemsByTab.competicao.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {itemsByTab.competicao.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="olimpiada" className="gap-2 rounded-lg data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300">
            <Trophy className="h-4 w-4" />
            {TAB_LABELS.olimpiada}
            {itemsByTab.olimpiada.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {itemsByTab.olimpiada.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={filterDiscipline} onValueChange={setFilterDiscipline} aria-label="Filtrar por disciplina">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as disciplinas</SelectItem>
                {disciplines.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)} aria-label="Ordenar por">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <Card className="border-dashed overflow-hidden">
          <CardContent className="py-10 sm:py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[#7B3FE4]/10 dark:bg-[#7B3FE4]/20 flex items-center justify-center mx-auto mb-4">
              {activeTab === "avaliacao" && <FileText className="h-7 w-7 text-[#7B3FE4]" aria-hidden />}
              {activeTab === "competicao" && <Award className="h-7 w-7 text-[#7B3FE4]" aria-hidden />}
              {activeTab === "olimpiada" && <Trophy className="h-7 w-7 text-[#7B3FE4]" aria-hidden />}
            </div>
            <p className="font-medium text-foreground">
              {activeTab === "avaliacao" && "Nenhuma avaliação com resultado"}
              {activeTab === "competicao" && "Nenhuma competição com resultado"}
              {activeTab === "olimpiada" && "Nenhuma olimpíada com resultado"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Quando você concluir e tiver resultado, ele aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((item) => {
            const nota = item.nota ?? 0
            const pctNota = Math.min(100, (nota / 10) * 100)
            const isTop = nota >= 9
            const isGood = nota >= 7 && nota < 9
            const barColor = isTop ? "bg-emerald-500" : isGood ? "bg-amber-500" : "bg-rose-500"
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base line-clamp-2">{item.titulo}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {item.classificacao}
                        </Badge>
                        {isTop && (
                          <div title="Nota destaque" className="flex-shrink-0">
                            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        )}
                        {isGood && !isTop && (
                          <div title="Bom desempenho" className="flex-shrink-0">
                            <Star className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="line-clamp-1">{item.disciplina}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDataDisplay(item.data_aplicacao)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{item.total_questions} {item.total_questions === 1 ? "questão" : "questões"}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold">{nota.toFixed(1).replace(".", ",")}</span>
                    <span className="text-xs text-muted-foreground">/ 10</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {item.acertos}/{item.total_questions_result} acertos
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pctNota} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pctNota}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleVerResultadoCompleto(item.id)}
                      aria-label={`Ver resultado completo de ${item.titulo}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver resultado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleVerResumo(item.id)}
                      aria-label={`Ver resumo de ${item.titulo}`}
                    >
                      <BarChart2 className="h-4 w-4 mr-2" />
                      Ver resumo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
        </div>
      </Tabs>

      <Sheet open={!!expandedResultId} onOpenChange={(open) => !open && setExpandedResultId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" aria-describedby="resumo-charts-desc">
          <SheetHeader>
            <SheetTitle>{expandedItem?.titulo ?? "Resumo"}</SheetTitle>
          </SheetHeader>
          <p id="resumo-charts-desc" className="sr-only">
            Resumo com gráficos da avaliação selecionada.
          </p>
          {expandedItem && (
            <div className="mt-6">
              <StudentResultSummaryCharts
                item={expandedItem}
                studentId={user?.id}
                testIdsForCompare={testIdsForCompare}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
