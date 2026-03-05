import React, { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Sparkles, Loader2 } from "lucide-react"
import type { StudentResultListItem } from "@/pages/StudentResultsPage"
import { getStudentResultByTest, studentCompare, type StudentResultByTestResponse, type StudentCompareResponse } from "@/services/studentResultApi"

const COLORS = ["#7B3FE4", "#a78bfa", "#c4b5fd", "#8b5cf6", "#6366f1"]

interface StudentResultSummaryChartsProps {
  item: StudentResultListItem
  /** user_id do aluno logado (para POST /test/student/compare) */
  studentId?: string
  /** test_ids em ordem cronológica (mais antiga → mais recente), incluindo esta avaliação; mínimo 2 para evolução */
  testIdsForCompare?: string[]
}

/**
 * Gráficos de resumo do resultado do aluno.
 * - Acertos por disciplina: GET /test/student/result/<test_id>
 * - Evolução: POST /test/student/compare (body: student_id, test_ids)
 */
export function StudentResultSummaryCharts({ item, studentId, testIdsForCompare = [] }: StudentResultSummaryChartsProps) {
  const nota = item.nota ?? 0
  const acertos = item.acertos
  const total = item.total_questions_result || item.total_questions || 1

  const [acertosData, setAcertosData] = useState<StudentResultByTestResponse | null>(null)
  const [evolucaoData, setEvolucaoData] = useState<StudentCompareResponse | null>(null)
  const [loadingAcertos, setLoadingAcertos] = useState(true)
  const [loadingEvolucao, setLoadingEvolucao] = useState(true)
  const [errorAcertos, setErrorAcertos] = useState<string | null>(null)
  const [errorEvolucao, setErrorEvolucao] = useState<string | null>(null)

  // GET /test/student/result/<test_id> — acertos por disciplina
  useEffect(() => {
    if (!item.id) {
      setLoadingAcertos(false)
      return
    }
    let cancelled = false
    setLoadingAcertos(true)
    setErrorAcertos(null)
    getStudentResultByTest(item.id)
      .then((data) => {
        if (!cancelled) setAcertosData(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorAcertos(err instanceof Error ? err.message : "Erro ao carregar acertos por disciplina")
          setAcertosData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAcertos(false)
      })
    return () => { cancelled = true }
  }, [item.id])

  // POST /test/student/compare — evolução entre provas
  const shouldFetchEvolucao = Boolean(
    studentId &&
    testIdsForCompare.length >= 2 &&
    testIdsForCompare.includes(item.id)
  )
  useEffect(() => {
    if (!shouldFetchEvolucao) {
      setLoadingEvolucao(false)
      setEvolucaoData(null)
      setErrorEvolucao(null)
      return
    }
    let cancelled = false
    setLoadingEvolucao(true)
    setErrorEvolucao(null)
    studentCompare(studentId!, testIdsForCompare)
      .then((data) => {
        if (!cancelled) setEvolucaoData(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorEvolucao(err instanceof Error ? err.message : "Erro ao carregar evolução")
          setEvolucaoData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEvolucao(false)
      })
    return () => { cancelled = true }
  }, [shouldFetchEvolucao, studentId, testIdsForCompare.join(",")])

  // Dados para o gráfico de barras (acertos por disciplina + Geral)
  const barChartData = (() => {
    if (!acertosData) return []
    const rows = (acertosData.acertos_por_disciplina ?? []).map((d, i) => ({
      name: d.subject_name,
      acertos: d.correct_answers,
      fill: COLORS[i % COLORS.length],
    }))
    if (acertosData.geral != null) {
      rows.push({ name: "Geral", acertos: acertosData.geral.correct_answers, fill: COLORS[COLORS.length - 1] })
    }
    return rows
  })()

  // Dados para o gráfico de linha (evolução): uma nota por avaliação
  const evolucaoLineData = (() => {
    if (!evolucaoData?.evaluations?.length || !evolucaoData.comparisons?.length) return []
    const comps = evolucaoData.comparisons
    const grades: number[] = []
    const first = comps[0].general_comparison?.student_grade
    if (first != null) grades.push(first.evaluation_1)
    comps.forEach((c) => {
      const g = c.general_comparison?.student_grade?.evaluation_2
      if (g != null) grades.push(g)
    })
    return evolucaoData.evaluations.slice(0, grades.length).map((e, i) => ({
      label: e.title || `Aval. ${i + 1}`,
      nota: grades[i] ?? 0,
    }))
  })()

  const isDestaque = nota >= 9
  const isParabens = nota >= 8

  return (
    <div className="space-y-6">
      {isParabens && (
        <Card className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 dark:from-amber-500/25 dark:via-yellow-500/15 dark:to-amber-500/25 border-amber-400/40">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20">
              {isDestaque ? <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" /> : <Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {isDestaque ? "Desempenho destaque!" : "Parabéns!"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isDestaque ? "Você arrasou nesta avaliação. Continue assim!" : "Você foi muito bem nesta avaliação. Continue estudando!"}
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-amber-500/60 ml-auto flex-shrink-0" aria-hidden />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Sua nota</p>
            <p className="text-2xl font-bold" aria-label={`Nota ${nota.toFixed(1)}`}>
              {nota.toFixed(1).replace(".", ",")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Acertos</p>
            <p className="text-2xl font-bold" aria-label={`${acertos} de ${total} acertos`}>
              {acertos}/{total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Desempenho</p>
            <Badge variant="secondary" className="mt-1">
              {item.classificacao}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Acertos por disciplina</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAcertos ? (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            </div>
          ) : errorAcertos ? (
            <p className="text-sm text-muted-foreground py-4">{errorAcertos}</p>
          ) : barChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum dado por disciplina disponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="acertos" name="Acertos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sua nota nesta avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{nota.toFixed(1).replace(".", ",")}</span>
            <span className="text-muted-foreground text-sm">/ 10</span>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                nota >= 9 ? "bg-gradient-to-r from-amber-400 to-amber-600" : nota >= 7 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-[#7B3FE4] to-purple-600"
              }`}
              style={{ width: `${Math.min(100, (nota / 10) * 100)}%` }}
              role="progressbar"
              aria-valuenow={nota}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={`Nota ${nota.toFixed(1)} de 10`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução (entre provas)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvolucao ? (
            <div className="h-[160px] flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            </div>
          ) : errorEvolucao ? (
            <p className="text-sm text-muted-foreground py-4">{errorEvolucao}</p>
          ) : !shouldFetchEvolucao ? (
            <p className="text-sm text-muted-foreground py-4">Selecione pelo menos 2 avaliações completas para ver a evolução.</p>
          ) : evolucaoLineData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum dado de evolução disponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={evolucaoLineData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [value.toFixed(1).replace(".", ","), "Nota"]} />
                <Line type="monotone" dataKey="nota" name="Nota" stroke="#7B3FE4" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
