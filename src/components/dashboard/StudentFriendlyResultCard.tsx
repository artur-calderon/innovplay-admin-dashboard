import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, BookOpen, Sparkles } from "lucide-react"

export interface StudentFriendlyResultCardProps {
  correctAnswers: number
  totalQuestions: number
  grade: number
  classification: string
  evaluationTitle?: string
}

const normalizeNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."))
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const getFriendlyLabel = (classification: string): { label: string; variant: "default" | "secondary" | "outline" } => {
  const c = (classification || "").toLowerCase()
  if (c.includes("avançado") || c.includes("excelente") || c.includes("superior")) return { label: "Muito bom", variant: "default" }
  if (c.includes("básico") && !c.includes("abaixo")) return { label: "Bom", variant: "secondary" }
  if (c.includes("abaixo")) return { label: "Pode melhorar", variant: "outline" }
  if (c.includes("adequado") || c.includes("proficiente")) return { label: "Bom", variant: "secondary" }
  return { label: classification || "—", variant: "outline" }
}

const StudentFriendlyResultCard: React.FC<StudentFriendlyResultCardProps> = ({
  correctAnswers,
  totalQuestions,
  grade,
  classification,
  evaluationTitle,
}) => {
  const correct = normalizeNumber(correctAnswers)
  const total = normalizeNumber(totalQuestions) || 1
  const gradeNum = normalizeNumber(grade)
  const { label, variant } = getFriendlyLabel(classification)

  return (
    <Card className="border-[#7B3FE4]/20 dark:border-[#a78bfa]/30 shadow-md" aria-labelledby="result-card-title">
      <CardHeader className="pb-2">
        <CardTitle id="result-card-title" className="text-base sm:text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#7B3FE4]" aria-hidden />
          {evaluationTitle ? `Seu resultado: ${evaluationTitle}` : "Seu resultado"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 min-h-[44px]">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Acertos</p>
              <p className="text-sm font-semibold truncate" aria-label={`${correct} de ${total} questões`}>
                {correct} de {total} questões
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 min-h-[44px]">
            <BookOpen className="h-5 w-5 text-[#7B3FE4] flex-shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Nota</p>
              <p className="text-sm font-semibold truncate" aria-label={`Nota ${gradeNum}`}>
                {(Math.round(gradeNum * 10) / 10).toString().replace(".", ",")}
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-1 p-3 rounded-lg bg-muted/50 min-h-[44px] col-span-2 sm:col-span-1">
            <span className="text-xs text-muted-foreground">Desempenho</span>
            <Badge variant={variant} className="text-xs w-fit">
              {label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StudentFriendlyResultCard
