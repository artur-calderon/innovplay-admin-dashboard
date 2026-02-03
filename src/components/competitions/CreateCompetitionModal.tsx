import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Steps } from '@/components/ui/steps';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { createCompetition, getCompetition, updateCompetition } from '@/services/competitionsApi';
import type { CreateCompetitionFormData, CompetitionScope, CompetitionScopeFilter } from '@/types/competition-types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { parseISOToDatetimeLocal, convertDateTimeLocalToISONaive } from '@/utils/date';
import { CalendarDays, CalendarRange, Clock, Loader2 } from 'lucide-react';

const STEP_LABELS = [
  'Informações básicas',
  'Datas',
  'Questões',
  'Recompensas',
  'Avançado',
];

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Configure o nome, disciplina e nível da competição.',
  2: 'Defina o período de inscrições e a data de aplicação.',
  3: 'Configure o modo e as regras das questões (opcional).',
  4: 'Defina recompensas por participação e ranking (opcional).',
  5: 'Ajustes finais: critério de ranking, visibilidade e limite.',
};

const LEVEL_OPTIONS: { value: 1 | 2; label: string }[] = [
  { value: 1, label: 'Nível 1 — Ed. Infantil, Anos Iniciais, EJA, Ed. Especial' },
  { value: 2, label: 'Nível 2 — Anos Finais e Ensino Médio' },
];

const SCOPE_OPTIONS: { value: CompetitionScope; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'turma', label: 'Turma' },
  { value: 'escola', label: 'Escola' },
  { value: 'municipio', label: 'Município' },
];

const initialFormData: CreateCompetitionFormData = {
  name: '',
  subject_id: '',
  level: 1,
  scope: undefined,
  scope_filter: undefined,
  enrollment_start: '',
  enrollment_end: '',
  application: '',
  question_mode: '',
  question_rules: '',
  reward_participation: '',
  reward_ranking: '',
  ranking_criterion: '',
  visibility: 'public',
  limit: undefined,
};

function formatScopeFilterForInput(filter: CompetitionScopeFilter | null | undefined): string {
  if (!filter || (Object.keys(filter).length === 0)) return '';
  try {
    return JSON.stringify(filter, null, 2);
  } catch {
    return '';
  }
}

/** Campo de data/hora com botão para abrir o seletor nativo (mais fácil em mobile/desktop). */
function DateTimeField({
  id,
  value,
  onChange,
  label,
  description,
  'aria-label': ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  description?: string;
  'aria-label'?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      (el as HTMLInputElement & { showPicker: () => void }).showPicker();
    } else {
      el.focus();
      el.click();
    }
  };
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          type="datetime-local"
          step="60"
          aria-label={ariaLabel}
          className="flex-1 min-w-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openPicker}
          title="Abrir seletor de data e hora"
          className="shrink-0"
        >
          <CalendarRange className="h-4 w-4" />
        </Button>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

interface CreateCompetitionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Se definido, abre em modo edição (só permitido quando status === 'rascunho'). */
  editId?: string | null;
}

interface SubjectOption {
  id: string;
  name: string;
}

export function CreateCompetitionModal({
  open,
  onClose,
  onSuccess,
  editId,
}: CreateCompetitionModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CreateCompetitionFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const isEdit = Boolean(editId);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFormData(initialFormData);
    setErrors({});
    if (editId) setLoadingEdit(true);
  }, [open, editId]);

  useEffect(() => {
    if (!open) return;
    api.get<SubjectOption[]>('/subjects').then((res) => {
      if (Array.isArray(res.data)) setSubjects(res.data);
    }).catch(() => setSubjects([]));
  }, [open]);

  useEffect(() => {
    if (!open || !editId) return;
    setLoadingEdit(true);
    getCompetition(editId)
      .then((c) => {
        setFormData({
          name: c.name ?? '',
          subject_id: c.subject_id ?? '',
          level: (c.level === 1 || c.level === 2 ? c.level : 1) as 1 | 2,
          scope: (c.scope as CompetitionScope) ?? undefined,
          scope_filter: c.scope_filter ?? undefined,
          enrollment_start: parseISOToDatetimeLocal(c.enrollment_start),
          enrollment_end: parseISOToDatetimeLocal(c.enrollment_end),
          application: parseISOToDatetimeLocal(c.application),
          question_mode: c.question_mode ?? '',
          question_rules: c.question_rules ?? '',
          reward_participation: c.reward_participation ?? '',
          reward_ranking: c.reward_ranking ?? '',
          ranking_criterion: c.ranking_criterion ?? '',
          visibility: c.visibility ?? 'public',
          limit: c.limit,
        });
      })
      .catch(() => toast({ title: 'Erro ao carregar competição.', variant: 'destructive' }))
      .finally(() => setLoadingEdit(false));
  }, [open, editId, toast]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.subject_id) newErrors.subject_id = 'Disciplina é obrigatória';

    if (step >= 2) {
      if (formData.enrollment_end && formData.application) {
        if (new Date(formData.application) <= new Date(formData.enrollment_end)) {
          newErrors.application = 'Data de aplicação deve ser após o fim da inscrição';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayloadWithISODates = () => {
    const payload = { ...formData };
    if (payload.enrollment_start?.trim()) {
      payload.enrollment_start = convertDateTimeLocalToISONaive(payload.enrollment_start.trim()) || formData.enrollment_start;
    }
    if (payload.enrollment_end?.trim()) {
      payload.enrollment_end = convertDateTimeLocalToISONaive(payload.enrollment_end.trim()) || formData.enrollment_end;
    }
    if (payload.application?.trim()) {
      payload.application = convertDateTimeLocalToISONaive(payload.application.trim()) || formData.application;
    }
    return payload;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isEdit && !editId) return;

    setLoading(true);
    try {
      const payload = buildPayloadWithISODates();
      if (isEdit && editId) {
        await updateCompetition(editId, payload);
        toast({ title: 'Competição atualizada com sucesso.' });
      } else {
        await createCompetition(payload);
        toast({ title: 'Competição criada com sucesso.' });
      }
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (isEdit ? 'Erro ao atualizar competição.' : 'Erro ao criar competição.');
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const update = (partial: Partial<CreateCompetitionFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(partial).forEach((k) => delete next[k]);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 overflow-hidden m-0',
          // Mobile: tela cheia, safe areas
          'h-dvh w-full max-w-none rounded-2xl border-0 p-0 pt-[max(0.5rem,env(safe-area-inset-top))]',
          'left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0',
          // sm: modal centralizado, margem e altura alta
          'sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:h-[90vh] sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:pt-0',
          // md: mais largo
          'md:max-w-3xl md:w-[calc(100vw-3rem)]',
          // lg: ainda mais largo
          'lg:max-w-4xl lg:h-[92vh] lg:max-h-[92vh]',
          // xl e 2xl: máximo aproveitamento
          'xl:max-w-[min(1280px,94vw)] xl:h-[95vh] xl:max-h-[95vh]',
          '2xl:max-w-[min(1400px,96vw)] 2xl:h-[96vh] 2xl:max-h-[96vh]'
        )}
        aria-describedby={open ? 'create-competition-desc' : undefined}
      >
        <DialogHeader
          className={cn(
            'shrink-0 space-y-1 pr-8',
            'px-4 pt-4 xs:px-5 sm:px-6 sm:pt-6 md:px-6 lg:px-8'
          )}
        >
          <DialogTitle className="text-base xs:text-lg sm:text-xl lg:text-2xl">
            {isEdit ? 'Editar Competição' : 'Nova Competição'}
          </DialogTitle>
          <DialogDescription
            id="create-competition-desc"
            className="line-clamp-2 text-xs xs:text-sm sm:text-sm"
          >
            {STEP_DESCRIPTIONS[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Mobile: stepper compacto */}
        <div className="shrink-0 px-4 pt-2 xs:px-5 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Etapa {step} de 5
            </span>
            <div className="flex flex-1 min-w-0 gap-1">
              {STEP_LABELS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 min-w-0 rounded-full transition-colors',
                    i < step ? 'bg-primary' : 'bg-muted'
                  )}
                />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">
            {STEP_LABELS[step - 1]}
          </p>
        </div>

        {/* Tablet/Desktop: stepper completo */}
        <div className="hidden shrink-0 pt-4 md:block md:px-6 lg:px-8">
          <Steps steps={STEP_LABELS} currentStep={step - 1} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Etapa {step} de 5
          </p>
        </div>

        <Separator className="mt-3 sm:mt-4" />

        {loadingEdit ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <ScrollArea
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overflow-x-hidden',
            'px-4 py-3 xs:px-5 sm:min-h-[220px] sm:px-6 sm:py-4 md:px-6 md:py-4 lg:px-8 lg:py-5'
          )}
        >
          <div className="space-y-4 pb-4 xs:space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-6">
            {step === 1 && (
              <section className="space-y-3 xs:space-y-4 sm:space-y-4">
                <h3 className="text-sm font-semibold text-foreground xs:text-base">
                  Dados básicos
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da competição *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => update({ name: e.target.value })}
                      placeholder="Ex.: Olimpíada de Matemática 2025"
                      className="w-full min-w-0"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Disciplina *</Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) => update({ subject_id: value })}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder="Selecione a disciplina" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subject_id && (
                      <p className="text-sm text-destructive">{errors.subject_id}</p>
                    )}
                  </div>
                  <div className="grid gap-4 grid-cols-1 xs:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="level">Nível *</Label>
                      <Select
                        value={String(formData.level)}
                        onValueChange={(value) => update({ level: value === '1' ? 1 : 2 })}
                      >
                        <SelectTrigger id="level" className="w-full min-w-0">
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Define quais etapas de ensino podem receber a competição (uso na Etapa 3).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scope">Escopo (opcional)</Label>
                      <Select
                        value={formData.scope ?? '__none__'}
                        onValueChange={(value) => update({ scope: value === '__none__' ? undefined : (value as CompetitionScope) })}
                      >
                        <SelectTrigger id="scope" className="w-full min-w-0">
                          <SelectValue placeholder="Selecione o escopo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {SCOPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Quem pode ver/inscrever: individual, turma, escola ou município (uso na Etapa 3).
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground xs:text-base">
                  Período de inscrições e aplicação
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mesmo padrão de aplicar avaliação/olimpíada: datas em horário local, armazenadas em ISO 8601.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DateTimeField
                      id="enrollment_start"
                      value={formData.enrollment_start}
                      onChange={(v) => update({ enrollment_start: v })}
                      label={
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Data e Hora de Início das Inscrições *
                        </span>
                      }
                      description="Quando as inscrições serão abertas"
                      aria-label="Data e hora de início das inscrições"
                    />
                    <DateTimeField
                      id="enrollment_end"
                      value={formData.enrollment_end}
                      onChange={(v) => update({ enrollment_end: v })}
                      label={
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Data e Hora de Término das Inscrições *
                        </span>
                      }
                      description="Último momento para se inscrever"
                      aria-label="Data e hora de término das inscrições"
                    />
                  </div>

                  <div>
                    <DateTimeField
                      id="application"
                      value={formData.application}
                      onChange={(v) => update({ application: v })}
                      label={
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Data e Hora de Aplicação *
                        </span>
                      }
                      description="Quando a prova será aplicada (deve ser após o fim das inscrições)"
                      aria-label="Data e hora de aplicação"
                    />
                    {errors.application && (
                      <p className="text-sm text-destructive mt-1">{errors.application}</p>
                    )}
                  </div>

                  {/* Resumo do período — mesmo padrão visual de Olimpiadas (amarelo) / StartEvaluationModal (roxo) */}
                  {(formData.enrollment_start || formData.enrollment_end || formData.application) && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Período configurado
                        </span>
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                        {formData.enrollment_start && (
                          <p>• <strong>Início das inscrições:</strong> {new Date(formData.enrollment_start).toLocaleString('pt-BR')}</p>
                        )}
                        {formData.enrollment_end && (
                          <p>• <strong>Término das inscrições:</strong> {new Date(formData.enrollment_end).toLocaleString('pt-BR')}</p>
                        )}
                        {formData.application && (
                          <p>• <strong>Aplicação:</strong> {new Date(formData.application).toLocaleString('pt-BR')}</p>
                        )}
                        <p>• <strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground xs:text-base">
                  Questões (opcional)
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question_mode">Modo de questões</Label>
                    <Input
                      id="question_mode"
                      value={formData.question_mode ?? ''}
                      onChange={(e) => update({ question_mode: e.target.value })}
                      placeholder="Ex.: aleatório, fixo"
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="question_rules">Regras das questões</Label>
                    <Textarea
                      id="question_rules"
                      value={formData.question_rules ?? ''}
                      onChange={(e) => update({ question_rules: e.target.value })}
                      placeholder="Descreva as regras aplicáveis às questões..."
                      rows={3}
                      className="resize-none w-full min-w-0 max-w-full"
                    />
                  </div>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground xs:text-base">
                  Recompensas (opcional)
                </h3>
                <div className="grid gap-4 grid-cols-1 xs:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reward_participation">Por participação</Label>
                    <Input
                      id="reward_participation"
                      value={formData.reward_participation ?? ''}
                      onChange={(e) => update({ reward_participation: e.target.value })}
                      placeholder="Ex.: pontos, moedas"
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reward_ranking">Por ranking</Label>
                    <Input
                      id="reward_ranking"
                      value={formData.reward_ranking ?? ''}
                      onChange={(e) => update({ reward_ranking: e.target.value })}
                      placeholder="Ex.: pontos por posição"
                      className="w-full min-w-0"
                    />
                  </div>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground xs:text-base">
                  Opções avançadas
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ranking_criterion">Critério de ranking (opcional)</Label>
                    <Input
                      id="ranking_criterion"
                      value={formData.ranking_criterion ?? ''}
                      onChange={(e) => update({ ranking_criterion: e.target.value })}
                      placeholder="Ex.: maior pontuação"
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="grid gap-4 grid-cols-1 xs:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Visibilidade</Label>
                      <Select
                        value={formData.visibility ?? 'public'}
                        onValueChange={(value) => update({ visibility: value })}
                      >
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Pública</SelectItem>
                          <SelectItem value="private">Privada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="limit">Limite de participantes</Label>
                      <Input
                        id="limit"
                        type="number"
                        min={0}
                        value={formData.limit ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          update({ limit: v === '' ? undefined : Number(v) });
                        }}
                        placeholder="Ilimitado"
                        className="w-full min-w-0"
                      />
                    </div>
                  </div>
                  {(formData.scope === 'turma' || formData.scope === 'escola' || formData.scope === 'municipio') && (
                    <div className="space-y-2">
                      <Label htmlFor="scope_filter">Filtro de escopo (opcional)</Label>
                      <Textarea
                        id="scope_filter"
                        value={formatScopeFilterForInput(formData.scope_filter)}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (!raw) {
                            update({ scope_filter: undefined });
                            return;
                          }
                          try {
                            const parsed = JSON.parse(raw) as CompetitionScopeFilter;
                            if (typeof parsed === 'object' && parsed !== null) {
                              update({
                                scope_filter: {
                                  class_ids: Array.isArray(parsed.class_ids) ? parsed.class_ids : undefined,
                                  school_ids: Array.isArray(parsed.school_ids) ? parsed.school_ids : undefined,
                                  municipality_ids: Array.isArray(parsed.municipality_ids) ? parsed.municipality_ids : undefined,
                                },
                              });
                            }
                          } catch {
                            // mantém o anterior se JSON inválido
                          }
                        }}
                        placeholder='{"class_ids": [], "school_ids": [], "municipality_ids": []}'
                        rows={4}
                        className="font-mono text-xs resize-none w-full min-w-0 max-w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        JSON com class_ids, school_ids e/ou municipality_ids conforme o escopo. Hoje só é armazenado; a Etapa 3 usará para filtrar quem vê/inscreve.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
        )}

        <Separator className="shrink-0" />

        <DialogFooter
          className={cn(
            'shrink-0 flex flex-col-reverse gap-2',
            'px-4 py-3 xs:px-5 sm:flex-row sm:justify-end sm:px-6 sm:py-4 md:px-6 lg:px-8 lg:py-4',
            '[&>button]:w-full sm:[&>button]:w-auto [&>button]:min-h-10 xs:[&>button]:min-h-11',
            'pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4'
          )}
        >
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          {step < 5 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Próximo
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || loadingEdit}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar alterações' : 'Criar Competição'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
