import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSubjectColors } from '@/utils/competition/competitionSubjectColors';
import { REPORT_TAG_BASE } from '@/utils/report/reportTagStyles';

export type DisciplineTagProps = Omit<BadgeProps, 'variant'> & {
  /** ID estável da disciplina (melhor consistência quando o nome varia). */
  subjectId?: string;
  /** Nome exibido e usado para cor semântica. */
  name: string;
};

/**
 * Tag de disciplina com cores consistentes em todo o app (ver `competitionSubjectColors`).
 */
export function DisciplineTag({
  subjectId,
  name,
  className,
  ...props
}: DisciplineTagProps) {
  const { badge, border } = getSubjectColors(subjectId ?? '', name);
  return (
    <Badge
      // `outline` evita o hover padrão cinza do `secondary` e deixa a paleta controlar totalmente.
      variant="outline"
      className={cn(
        REPORT_TAG_BASE,
        // Mantém o stripe lateral de disciplina (padrão atual do app).
        "border-transparent font-medium border-l-4",
        border,
        badge,
        className
      )}
      {...props}
    >
      {name}
    </Badge>
  );
}

export type DisciplineTagWithChildrenProps = Omit<BadgeProps, 'variant'> & {
  subjectId?: string;
  /** Usado só para calcular a cor quando há ícones/botões no conteúdo. */
  subjectName: string;
  children: React.ReactNode;
};

/** Mesmas cores de disciplina, com filhos customizados (ex.: ícone + remover). */
export function DisciplineTagWithChildren({
  subjectId,
  subjectName,
  children,
  className,
  ...props
}: DisciplineTagWithChildrenProps) {
  const { badge, border } = getSubjectColors(subjectId ?? '', subjectName);
  return (
    <Badge
      // `outline` evita o hover padrão cinza do `secondary` e deixa a paleta controlar totalmente.
      variant="outline"
      className={cn(
        REPORT_TAG_BASE,
        "border-transparent font-medium border-l-4",
        border,
        badge,
        className
      )}
      {...props}
    >
      {children}
    </Badge>
  );
}
