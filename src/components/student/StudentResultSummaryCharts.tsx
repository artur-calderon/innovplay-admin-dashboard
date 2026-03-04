import React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Sparkles } from "lucide-react"
import type { StudentResultListItem } from "@/pages/StudentResultsPage"

interface StudentResultSummaryChartsProps {
  item: StudentResultListItem
}

/**
 * Gráficos de resumo do resultado do aluno.
 * Dados mockados; substituir por chamadas à API quando os endpoints estiverem prontos.
 */
export function StudentResultSummaryCharts({ item }: StudentResultSummaryChartsProps) {
  const nota = item.nota ?? 0
  const acertos = item.acertos
  const total = item.total_questions_result || item.total_questions || 1
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0

  // Mock: acertos por disciplina (2-3 disciplinas fictícias)
  const mockAcertosPorDisciplina = [
    { name: item.disciplina || "Disciplina 1", acertos: acertos, fill: "#7B3FE4" },
    { name: "Outra área (mock)", acertos: Math.max(0, Math.floor(acertos * 0.85)), fill: "#a78bfa" },
    { name: "Geral (mock)", acertos: Math.max(0, Math.floor(acertos * 0.9)), fill: "#c4b5fd" },
  ]

  // Mock: evolução (últimas 4 avaliações fictícias)
  const mockEvolucao = [
    { label: "Aval. 1", nota: Math.max(0, nota - 1.5) },
    { label: "Aval. 2", nota: Math.max(0, nota - 0.8) },
    { label: "Aval. 3", nota: Math.max(0, nota - 0.2) },
    { label: "Esta", nota },
  ]

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
          <CardTitle className="text-sm">Acertos por disciplina (dados mockados)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mockAcertosPorDisciplina} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="acertos" name="Acertos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">
            Dados mockados; substituir por endpoint quando disponível.
          </p>
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
          <CardTitle className="text-sm">Evolução (dados mockados)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={mockEvolucao} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [value.toFixed(1).replace(".", ","), "Nota"]} />
              <Line type="monotone" dataKey="nota" name="Nota" stroke="#7B3FE4" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">
            Dados mockados; substituir por endpoint de evolução quando disponível.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
