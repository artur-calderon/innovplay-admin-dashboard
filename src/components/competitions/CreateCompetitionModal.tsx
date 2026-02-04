import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createCompetition, getCompetition, updateCompetition, addCompetitionQuestions, getCompetitionLevelOptions } from '@/services/competitionsApi';
import type { CreateCompetitionFormData, CompetitionScope, CompetitionScopeFilter, QuestionRulesPayload } from '@/types/competition-types';
import { api } from '@/lib/api';
import { parseISOToDatetimeLocal, convertDateTimeLocalToISONaive } from '@/utils/date';
import { CalendarDays, CalendarRange, Clock, Loader2, Shuffle, ListOrdered, Trophy, Book, Plus, Eye, Trash2 } from 'lucide-react';
import { QuestionBank } from '@/components/evaluations/QuestionBank';
import QuestionPreview from '@/components/evaluations/questions/QuestionPreview';
import type { Question } from '@/components/evaluations/types';

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Configure o nome, disciplina e nível da competição.',
  2: 'Defina o período de inscrições (início e encerramento).',
  3: 'Selecione as questões (manual ou aleatório).',
  4: 'Defina as recompensas.',
};

/** Fallback se a API de level-options falhar. */
const LEVEL_OPTIONS_FALLBACK: { value: 1 | 2; label: string }[] = [
  { value: 1, label: 'Educação Infantil, Anos Iniciais, Educação Especial, EJA' },
  { value: 2, label: 'Anos Finais e Ensino Médio' },
];

const SCOPE_OPTIONS: { value: CompetitionScope; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'turma', label: 'Turma' },
  { value: 'escola', label: 'Escola' },
  { value: 'municipio', label: 'Município' },
];

/** Dificuldades aceitas pelo backend (question_rules_validator / QuestionSelectionService). */
const QUESTION_DIFFICULTIES = ['Abaixo do Básico', 'Básico', 'Adequado', 'Avançado'] as const;

function parseQuestionRules(json: string | undefined): { num_questions: number; difficulty_filter: string[] } {
  if (!json?.trim()) return { num_questions: 10, difficulty_filter: [] };
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    const num = typeof raw.num_questions === 'number' ? raw.num_questions : 10;
    let difficulty_filter: string[] = [];
    if (raw.difficulty_filter != null) {
      if (Array.isArray(raw.difficulty_filter)) difficulty_filter = raw.difficulty_filter as string[];
      else if (typeof raw.difficulty_filter === 'object' && Array.isArray((raw.difficulty_filter as { levels?: unknown }).levels)) {
        difficulty_filter = (raw.difficulty_filter as { levels: string[] }).levels;
      }
    }
    return { num_questions: num, difficulty_filter };
  } catch {
    return { num_questions: 10, difficulty_filter: [] };
  }
}

/** Regras para modo aleatório: apenas quantidade e dificuldade (nível/disciplina vêm do passo 1). Backend exige difficulty_filter como objeto { levels: string[] }. */
function buildQuestionRulesJsonSimple(p: { num_questions: number; difficulty_filter: string[] }): string {
  const payload: QuestionRulesPayload = {
    num_questions: p.num_questions,
    strategy: 'uniform',
    allow_repeat: false,
  };
  if (p.difficulty_filter.length) payload.difficulty_filter = { levels: p.difficulty_filter };
  return JSON.stringify(payload);
}

const initialFormData: CreateCompetitionFormData = {
  name: '',
  subject_id: '',
  level: 1,
  scope: undefined,
  scope_filter: undefined,
  enrollment_start: '',
  enrollment_end: '',
  question_mode: 'manual',
  question_rules: '',
  reward_participation: '',
  reward_ranking: '',
};

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
  const [levelOptions, setLevelOptions] = useState<{ value: number; label: string }[]>(LEVEL_OPTIONS_FALLBACK);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const isEdit = Boolean(editId);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFormData(initialFormData);
    setErrors({});
    setSelectedQuestions([]);
    setShowQuestionBank(false);
    setPreviewQuestion(null);
    if (editId) setLoadingEdit(true);
  }, [open, editId]);

  useEffect(() => {
    if (!open) return;
    api.get<SubjectOption[]>('/subjects').then((res) => {
      if (Array.isArray(res.data)) setSubjects(res.data);
    }).catch(() => setSubjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    getCompetitionLevelOptions()
      .then((res) => {
        if (res?.levels?.length) setLevelOptions(res.levels);
      })
      .catch(() => setLevelOptions(LEVEL_OPTIONS_FALLBACK));
  }, [open]);

  useEffect(() => {
    if (!open || !editId) return;
    setLoadingEdit(true);
    getCompetition(editId)
      .then(async (c) => {
        const questionRulesStr =
          typeof c.question_rules === 'object' && c.question_rules != null
            ? JSON.stringify(c.question_rules)
            : (c.question_rules ?? '');
        const participation =
          c.reward_config?.participation_coins ?? c.reward_participation ?? '';
        const ranking =
          c.reward_config?.ranking_rewards?.[0] != null
            ? String(c.reward_config.ranking_rewards[0].coins)
            : (c.reward_ranking ?? '');
        setFormData({
          name: c.name ?? '',
          subject_id: c.subject_id ?? '',
          level: (c.level === 1 || c.level === 2 ? c.level : 1) as 1 | 2,
          scope: (c.scope as CompetitionScope) ?? undefined,
          scope_filter: c.scope_filter ?? undefined,
          enrollment_start: parseISOToDatetimeLocal(c.enrollment_start),
          enrollment_end: parseISOToDatetimeLocal(c.enrollment_end),
          question_mode: c.question_mode ?? 'manual',
          question_rules: questionRulesStr,
          reward_participation: participation,
          reward_ranking: ranking,
        });
        if (c.question_mode === 'manual' && c.question_ids?.length) {
          try {
            const list = await Promise.all(
              (c.question_ids as string[]).map((id) =>
                api.get(`/questions/${id}`).then((r) => r.data).catch(() => null)
              )
            );
            const mapped = list.filter(Boolean).map((q: Record<string, unknown>) => ({
              id: String(q.id),
              title: String(q.title ?? ''),
              text: String(q.text ?? q.formatted_text ?? ''),
              type: 'multipleChoice' as const,
              subjectId: String(q.subject_id ?? ''),
              difficulty: String(q.difficulty_level ?? q.difficulty ?? ''),
              value: Number(q.value ?? 1),
              options: Array.isArray(q.alternatives) ? (q.alternatives as { text: string; isCorrect?: boolean }[]).map((alt) => ({ id: '', text: alt.text, isCorrect: Boolean(alt.isCorrect) })) : [],
              created_by: String(q.created_by ?? ''),
            })) as Question[];
            setSelectedQuestions(mapped);
          } catch {
            // ignore
          }
        }
      })
      .catch(() => toast({ title: 'Erro ao carregar competição.', variant: 'destructive' }))
      .finally(() => setLoadingEdit(false));
  }, [open, editId, toast]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.subject_id) newErrors.subject_id = 'Disciplina é obrigatória';

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
    // Backend exige application e expiration; definimos depois pelo botão "Datas" no card. Enviamos padrões para o create/update aceitar.
    const toNaiveISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}:00`;
    };
    const enrollmentEndIso = payload.enrollment_end || (formData.enrollment_end?.trim() ? convertDateTimeLocalToISONaive(formData.enrollment_end.trim()) : null);
    if (enrollmentEndIso) {
      const endDate = new Date(enrollmentEndIso);
      if (!payload.application?.trim()) {
        const appDate = new Date(endDate.getTime() + 60 * 60 * 1000); // 1h após encerramento das inscrições
        payload.application = toNaiveISO(appDate);
      }
      if (!payload.expiration?.trim()) {
        const appDate = payload.application ? new Date(payload.application) : new Date(endDate.getTime() + 60 * 60 * 1000);
        const expDate = new Date(appDate.getTime() + 24 * 60 * 60 * 1000); // 24h após aplicação
        payload.expiration = toNaiveISO(expDate);
      }
    }
    delete (payload as Record<string, unknown>).ranking_criterion;
    delete (payload as Record<string, unknown>).visibility;
    delete (payload as Record<string, unknown>).limit;
    // API exige reward_config: { participation_coins, ranking_rewards: [{ position, coins }] }
    const participationCoins = Number(formData.reward_participation) || 0;
    const rankingCoins = Number(formData.reward_ranking) || 0;
    (payload as Record<string, unknown>).reward_config = {
      participation_coins: participationCoins,
      ranking_rewards: [{ position: 1, coins: rankingCoins }],
    };
    delete (payload as Record<string, unknown>).reward_participation;
    delete (payload as Record<string, unknown>).reward_ranking;
    // Backend exige question_rules como objeto JSON, não string.
    if (payload.question_rules?.trim()) {
      try {
        (payload as Record<string, unknown>).question_rules = JSON.parse(payload.question_rules) as unknown;
      } catch {
        // mantém string se parse falhar (evita quebrar)
      }
    }
    return payload;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isEdit && !editId) return;

    setLoading(true);
    try {
      const payload = buildPayloadWithISODates();
      let competitionId: string;
      if (isEdit && editId) {
        await updateCompetition(editId, payload);
        competitionId = editId;
        toast({ title: 'Competição atualizada com sucesso.' });
      } else {
        const created = await createCompetition(payload);
        competitionId = created.id;
        toast({ title: 'Competição criada com sucesso.' });
      }
      if (formData.question_mode === 'manual' && selectedQuestions.length > 0) {
        await addCompetitionQuestions(competitionId, selectedQuestions.map((q) => q.id));
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
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col"
        aria-describedby={open ? 'create-competition-desc' : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {isEdit ? 'Editar Competição' : 'Nova Competição'}
          </DialogTitle>
          <DialogDescription id="create-competition-desc">
            {STEP_DESCRIPTIONS[step]}
          </DialogDescription>
        </DialogHeader>

        {loadingEdit ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            {step === 1 && (
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
                          {levelOptions.map((opt) => (
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
                      Quem pode ver/inscrever: individual, turma, escola ou município.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Datas em horário local (armazenadas em ISO 8601). Aplicação e expiração podem ser definidas depois pelo botão &quot;Datas&quot; no card da competição.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateTimeField
                    id="enrollment_start"
                    value={formData.enrollment_start}
                    onChange={(v) => update({ enrollment_start: v })}
                    label={
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Início das inscrições *
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
                        Encerramento das inscrições *
                      </span>
                    }
                    description="Último momento para se inscrever"
                    aria-label="Data e hora de término das inscrições"
                  />
                </div>
                {(formData.enrollment_start || formData.enrollment_end) && (
                  <div className="bg-muted/50 border rounded-lg p-4">
                    <div className="text-sm space-y-1">
                      {formData.enrollment_start && (
                        <p><strong>Início:</strong> {new Date(formData.enrollment_start).toLocaleString('pt-BR')}</p>
                      )}
                      {formData.enrollment_end && (
                        <p><strong>Encerramento:</strong> {new Date(formData.enrollment_end).toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <RadioGroup
                  value={formData.question_mode === 'auto_random' ? 'auto_random' : 'manual'}
                  onValueChange={(v) => {
                    if (v === 'auto_random') {
                      const rules = parseQuestionRules(formData.question_rules);
                      update({
                        question_mode: 'auto_random',
                        question_rules: buildQuestionRulesJsonSimple({
                          num_questions: rules.num_questions,
                          difficulty_filter: rules.difficulty_filter,
                        }),
                      });
                    } else {
                      update({ question_mode: 'manual', question_rules: '' });
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted/50">
                    <RadioGroupItem value="manual" id="mode-manual" />
                    <Label htmlFor="mode-manual" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ListOrdered className="h-4 w-4" />
                      Manual — selecionar questões no banco
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted/50">
                    <RadioGroupItem value="auto_random" id="mode-auto" />
                    <Label htmlFor="mode-auto" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Shuffle className="h-4 w-4" />
                      Aleatório — sortear por quantidade e dificuldade (usa disciplina e nível já definidos)
                    </Label>
                  </div>
                </RadioGroup>

                {formData.question_mode === 'manual' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Questões da competição</h3>
                      <span className="text-sm text-muted-foreground">
                        Total: {selectedQuestions.length} questão(ões)
                      </span>
                    </div>
                    {!formData.subject_id ? (
                      <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/20">
                        Selecione a disciplina no passo 1 para abrir o banco de questões.
                      </p>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQuestionBank(true)}
                          className="border-primary text-primary hover:bg-primary/10"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Banco de Questões
                        </Button>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {selectedQuestions.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                              <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Nenhuma questão selecionada</p>
                              <p className="text-xs">Use o botão acima para adicionar questões</p>
                            </div>
                          ) : (
                            selectedQuestions.map((q, index) => (
                              <Card key={q.id}>
                                <CardContent className="p-3 flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary">#{index + 1}</Badge>
                                      <span className="text-sm font-medium truncate">
                                        {q.title || `Questão ${index + 1}`}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                      {q.text || 'Sem texto'}
                                    </p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setPreviewQuestion(q)}
                                      title="Ver"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedQuestions((prev) => prev.filter((x) => x.id !== q.id));
                                        toast({ title: 'Questão removida' });
                                      }}
                                      title="Remover"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {formData.question_mode === 'auto_random' && (() => {
                  const rules = parseQuestionRules(formData.question_rules);
                  const numQuestions = rules.num_questions;
                  const difficultyFilter = rules.difficulty_filter;

                  const setRules = (partial: { num_questions?: number; difficulty_filter?: string[] }) => {
                    const next = {
                      num_questions: partial.num_questions ?? numQuestions,
                      difficulty_filter: partial.difficulty_filter ?? difficultyFilter,
                    };
                    update({ question_rules: buildQuestionRulesJsonSimple(next) });
                  };
                  const toggleDifficulty = (d: string) => {
                    const next = difficultyFilter.includes(d)
                      ? difficultyFilter.filter((x) => x !== d)
                      : [...difficultyFilter, d];
                    setRules({ difficulty_filter: next });
                  };

                  return (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between rounded-md bg-primary/10 border border-primary/20 px-3 py-2">
                        <span className="text-sm font-medium">Configuração selecionada (modo aleatório)</span>
                        <span className="text-sm text-muted-foreground">
                          {numQuestions} questão(ões)
                          {difficultyFilter.length > 0 ? ` · ${difficultyFilter.join(', ')}` : ' · Todas as dificuldades'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="num_questions">Quantidade de questões</Label>
                        <Input
                          id="num_questions"
                          type="number"
                          min={1}
                          value={numQuestions}
                          onChange={(e) => setRules({ num_questions: Number(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dificuldade (opcional)</Label>
                        <div className="flex flex-wrap gap-2">
                          {QUESTION_DIFFICULTIES.map((d) => (
                            <label key={d} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={difficultyFilter.includes(d)}
                                onCheckedChange={() => toggleDifficulty(d)}
                              />
                              <span className="text-sm">{d}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          O sorteio usa a disciplina e o nível já definidos no passo 1.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
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
              </div>
            )}
          </div>
        )}

        {!loadingEdit && (
          <div className="flex justify-between pt-4 mt-4 border-t shrink-0">
            <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
              {step > 1 ? 'Voltar' : 'Cancelar'}
            </Button>
            <div className="flex gap-2">
              {step < 4 ? (
                <Button onClick={() => setStep(step + 1)}>Próximo</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? 'Salvar alterações' : 'Criar Competição'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={showQuestionBank} onOpenChange={setShowQuestionBank}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Banco de Questões</DialogTitle>
            <DialogDescription>
              Selecione questões para adicionar à competição
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <QuestionBank
              embedded
              open={showQuestionBank}
              subjectId={formData.subject_id || null}
              onQuestionSelected={(question) => {
                if (selectedQuestions.some((q) => q.id === question.id)) {
                  toast({ title: 'Questão já adicionada', variant: 'destructive' });
                  return;
                }
                const withSubject = { ...question, subjectId: formData.subject_id || question.subjectId };
                setSelectedQuestions((prev) => [...prev, withSubject]);
                toast({ title: 'Questão adicionada' });
              }}
              onClose={() => setShowQuestionBank(false)}
            />
          </div>
        </DialogContent>
    </Dialog>

    <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
            <DialogDescription>Prévia em modo somente leitura.</DialogDescription>
          </DialogHeader>
          {previewQuestion && (
            <QuestionPreview
              question={previewQuestion}
              onClose={() => setPreviewQuestion(null)}
            />
          )}
        </DialogContent>
    </Dialog>
    </>
  );
}
