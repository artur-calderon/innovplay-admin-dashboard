import { useEffect, useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getResultsPeriodYearMax,
  normalizeResultsPeriodYm,
  RESULTS_MONTH_NAMES_PT,
  RESULTS_PERIOD_YEAR_MIN,
} from '@/utils/resultsPeriod';

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function ResultsPeriodMonthYearPicker({
  value,
  onChange,
  disabled,
  className,
  label = 'Período (mês/ano)',
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const normalized = useMemo(
    () => (value === 'all' ? 'all' : normalizeResultsPeriodYm(value)),
    [value]
  );

  useEffect(() => {
    if (value === 'all') return;
    const n = normalizeResultsPeriodYm(value);
    if (n === 'all') onChange('all');
    else if (n !== value) onChange(n);
  }, [value, onChange]);

  const calendarSelected = useMemo(() => {
    if (normalized === 'all') return undefined;
    return parse(`${normalized}-01`, 'yyyy-MM-dd', new Date());
  }, [normalized]);

  useEffect(() => {
    if (!open) return;
    if (normalized !== 'all') {
      const [yy, mm] = normalized.split('-').map(Number);
      setDraft({ y: yy, m: mm - 1 });
      return;
    }
    const n = new Date();
    setDraft({ y: n.getFullYear(), m: n.getMonth() });
  }, [open, normalized]);

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full min-w-0 justify-start text-left font-normal',
              value === 'all' && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {calendarSelected
                ? format(calendarSelected, "MMMM 'de' yyyy", { locale: ptBR })
                : 'Selecionar mês e ano'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto max-w-[min(100vw-1rem,20rem)] overflow-hidden border-border bg-popover p-0 text-popover-foreground shadow-lg"
          align="start"
        >
          <div className="grid grid-cols-2 gap-2 border-b border-border px-3 pt-3 pb-2">
            <div className="min-w-0 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Mês</span>
              <Select
                value={String(draft.m)}
                onValueChange={(v) => {
                  const mi = parseInt(v, 10);
                  const y = draft.y;
                  setDraft({ y, m: mi });
                  const p = normalizeResultsPeriodYm(`${y}-${String(mi + 1).padStart(2, '0')}`);
                  if (p !== 'all') onChange(p);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-0">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {RESULTS_MONTH_NAMES_PT.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Ano</span>
              <Select
                value={String(draft.y)}
                onValueChange={(v) => {
                  const y = parseInt(v, 10);
                  const mi = draft.m;
                  setDraft({ y, m: mi });
                  const p = normalizeResultsPeriodYm(`${y}-${String(mi + 1).padStart(2, '0')}`);
                  if (p !== 'all') onChange(p);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-0">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from(
                    { length: getResultsPeriodYearMax() - RESULTS_PERIOD_YEAR_MIN + 1 },
                    (_, i) => RESULTS_PERIOD_YEAR_MIN + i
                  ).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Calendar
            mode="single"
            locale={ptBR}
            month={new Date(draft.y, draft.m, 1)}
            onMonthChange={(d) => {
              const y = d.getFullYear();
              const m = d.getMonth();
              setDraft({ y, m });
              const p = normalizeResultsPeriodYm(`${y}-${String(m + 1).padStart(2, '0')}`);
              if (p !== 'all') onChange(p);
            }}
            selected={calendarSelected}
            captionLayout="buttons"
            fromYear={RESULTS_PERIOD_YEAR_MIN}
            toYear={getResultsPeriodYearMax()}
            className="rounded-none border-0 bg-transparent p-0 text-popover-foreground shadow-none"
            onSelect={(date) => {
              if (date) {
                const y = date.getFullYear();
                const m = date.getMonth();
                setDraft({ y, m });
                const p = normalizeResultsPeriodYm(format(date, 'yyyy-MM'));
                if (p !== 'all') {
                  onChange(p);
                  setOpen(false);
                }
              }
            }}
            initialFocus
          />
          <div className="space-y-2 border-t border-border bg-muted/15 px-3 py-2.5 dark:bg-muted/25">
            <p className="text-center text-xs leading-snug text-muted-foreground">
              Altere mês ou ano nos seletores, use as setas do calendário ou toque em um dia para aplicar e
              fechar.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full text-muted-foreground hover:text-foreground"
              disabled={value === 'all'}
              onClick={() => {
                onChange('all');
                setOpen(false);
              }}
            >
              Limpar período
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
