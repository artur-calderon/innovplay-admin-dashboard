import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Steps } from '@/components/ui/steps';
import {
  FileText,
  ListOrdered,
  Layers,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  AlertCircle,
  X,
  Target,
} from 'lucide-react';
import { api } from '@/lib/api';
import SkillsSelector from '@/components/evaluations/questions/SkillsSelector';
import { useSkillsStore } from '@/stores/useSkillsStore';

const STEPS = ['Informações', 'Questões', 'Blocos', 'Habilidades', 'Revisar'];

type BlockByDiscipline = {
  block_id: number;
  subject_name: string;
  subject_id: string;
  questions_count: number;
  start_question: number;
  end_question: number;
};

export default function AnswerSheetCreateGabarito() {
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  // Step 0: básico
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');

  // Step 1: questões e gabarito
  const [numQuestions, setNumQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [useGlobalAlternatives, setUseGlobalAlternatives] = useState(true);
  const [globalAlternatives, setGlobalAlternatives] = useState<('A' | 'B' | 'C' | 'D')[]>(['A', 'B', 'C', 'D']);
  const [questionsOptions, setQuestionsOptions] = useState<Record<number, ('A' | 'B' | 'C' | 'D')[]>>({});
  const [editingQuestionAlternatives, setEditingQuestionAlternatives] = useState<number | null>(null);

  // Step 2: blocos
  const [useBlocks, setUseBlocks] = useState(false);
  const [numBlocks, setNumBlocks] = useState(2);
  const [questionsPerBlock, setQuestionsPerBlock] = useState(5);
  const [separateBySubject, setSeparateBySubject] = useState(false);
  const [disciplines, setDisciplines] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [blocksByDiscipline, setBlocksByDiscipline] = useState<BlockByDiscipline[]>([]);

  // Step 3: habilidades
  const [skillSubjectId, setSkillSubjectId] = useState('');
  const [skillGradeId, setSkillGradeId] = useState('');
  const [subjectsForSkills, setSubjectsForSkills] = useState<{ id: string; name: string }[]>([]);
  const [gradesForSkills, setGradesForSkills] = useState<{ id: string; name: string }[]>([]);
  const [gabaritoSkills, setGabaritoSkills] = useState<{ id: string; code: string; description: string; name: string }[]>([]);
  const [isLoadingGabaritoSkills, setIsLoadingGabaritoSkills] = useState(false);
  const [questionSkills, setQuestionSkills] = useState<Record<number, string[]>>({});
  const [editingQuestionSkills, setEditingQuestionSkills] = useState<number | null>(null);
  /** Cache id → code para não perder códigos ao trocar de disciplina */
  const [skillCodeCache, setSkillCodeCache] = useState<Record<string, string>>({});

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdGabarito, setCreatedGabarito] = useState<{ gabarito_id: string; title: string; num_questions: number } | null>(null);

  // Carregar disciplinas (para blocos)
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        setIsLoadingDisciplines(true);
        const response = await api.get('/subjects');
        setDisciplines(Array.isArray(response.data) ? response.data : []);
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível carregar as disciplinas.', variant: 'destructive' });
      } finally {
        setIsLoadingDisciplines(false);
      }
    };
    fetchDisciplines();
  }, [toast]);

  // Subjects e grades para habilidades
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get<{ id: string; name: string }[]>('/subjects');
        setSubjectsForSkills(Array.isArray(response.data) ? response.data : []);
      } catch {
        setSubjectsForSkills([]);
      }
    };
    fetchSubjects();
  }, []);
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await api.get<{ id: string; name: string }[]>('/grades/');
        setGradesForSkills(Array.isArray(response.data) ? response.data : []);
      } catch {
        setGradesForSkills([]);
      }
    };
    fetchGrades();
  }, []);

  useEffect(() => {
    if (!skillSubjectId || !skillGradeId) {
      setGabaritoSkills([]);
      return;
    }
    const fetchSkills = async () => {
      try {
        setIsLoadingGabaritoSkills(true);
        const fetchSkillsBySubjectAndGrade = useSkillsStore.getState().fetchSkills;
        const list = await fetchSkillsBySubjectAndGrade(skillSubjectId, skillGradeId);
        const next = Array.isArray(list)
          ? list.map((s) => ({ id: s.id, code: s.code, description: s.description, name: s.name || `${s.code} - ${s.description}` }))
          : [];
        setGabaritoSkills(next);
        setSkillCodeCache((prev) => {
          const merged = { ...prev };
          next.forEach((s) => { merged[s.id] = s.code; });
          return merged;
        });
      } catch {
        setGabaritoSkills([]);
        toast({ title: 'Aviso', description: 'Não foi possível carregar as habilidades.', variant: 'default' });
      } finally {
        setIsLoadingGabaritoSkills(false);
      }
    };
    fetchSkills();
  }, [skillSubjectId, skillGradeId, toast]);

  useEffect(() => {
    if (!separateBySubject) setBlocksByDiscipline([]);
  }, [separateBySubject]);

  const handleAddDisciplineBlock = (disciplineId: string, disciplineName: string) => {
    if (blocksByDiscipline.length >= 4) {
      toast({ title: 'Limite', description: 'Máximo de 4 blocos.', variant: 'destructive' });
      return;
    }
    const currentTotal = blocksByDiscipline.reduce((s, b) => s + b.questions_count, 0);
    if (currentTotal >= numQuestions) {
      toast({ title: 'Limite', description: 'Todas as questões já estão nos blocos.', variant: 'destructive' });
      return;
    }
    const startQuestion = currentTotal + 1;
    const remaining = numQuestions - currentTotal;
    const defaultCount = Math.min(26, remaining);
    setBlocksByDiscipline([
      ...blocksByDiscipline,
      {
        block_id: blocksByDiscipline.length + 1,
        subject_name: disciplineName,
        subject_id: disciplineId,
        questions_count: defaultCount,
        start_question: startQuestion,
        end_question: startQuestion + defaultCount - 1,
      },
    ]);
  };

  const handleRemoveDisciplineBlock = (blockId: number) => {
    const filtered = blocksByDiscipline.filter((b) => b.block_id !== blockId);
    const updated = filtered.map((block, index) => {
      const prevTotal = filtered.slice(0, index).reduce((s, b) => s + b.questions_count, 0);
      return {
        ...block,
        block_id: index + 1,
        start_question: prevTotal + 1,
        end_question: prevTotal + block.questions_count,
      };
    });
    setBlocksByDiscipline(updated);
  };

  const handleUpdateBlockQuestions = (blockId: number, newCount: number) => {
    const validCount = Math.min(Math.max(1, newCount), 26);
    const blockIndex = blocksByDiscipline.findIndex((b) => b.block_id === blockId);
    if (blockIndex === -1) return;
    const otherTotal = blocksByDiscipline.filter((b) => b.block_id !== blockId).reduce((s, b) => s + b.questions_count, 0);
    if (otherTotal + validCount > numQuestions) {
      toast({ title: 'Limite', description: `Total de questões: ${numQuestions}.`, variant: 'destructive' });
      return;
    }
    let runningStart = 1;
    const updated = blocksByDiscipline.map((block) => {
      const count = block.block_id === blockId ? validCount : block.questions_count;
      const start = runningStart;
      const end = runningStart + count - 1;
      runningStart += count;
      return { ...block, questions_count: count, start_question: start, end_question: end };
    });
    setBlocksByDiscipline(updated);
  };

  const validateDisciplineBlocks = (): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    if (blocksByDiscipline.length === 0) {
      warnings.push('Adicione pelo menos uma disciplina.');
      return { isValid: false, warnings };
    }
    if (blocksByDiscipline.length > 4) {
      warnings.push('Máximo 4 blocos.');
      return { isValid: false, warnings };
    }
    const total = blocksByDiscipline.reduce((s, b) => s + b.questions_count, 0);
    if (total !== numQuestions) {
      warnings.push(`Soma dos blocos (${total}) deve ser igual ao total de questões (${numQuestions}).`);
      return { isValid: false, warnings };
    }
    if (blocksByDiscipline.some((b) => b.questions_count > 26)) {
      warnings.push('Máximo 26 questões por bloco.');
      return { isValid: false, warnings };
    }
    return { isValid: true, warnings };
  };

  const getAvailableAlternatives = (q: number): ('A' | 'B' | 'C' | 'D')[] =>
    useGlobalAlternatives ? globalAlternatives : (questionsOptions[q] || ['A', 'B', 'C', 'D']);

  const handleToggleGlobalAlternative = (alternative: 'A' | 'B' | 'C' | 'D', checked: boolean) => {
    if (checked) {
      if (globalAlternatives.length >= 4) {
        toast({ title: 'Máximo 4 alternativas', description: 'Selecione no máximo 4 alternativas (A, B, C, D).', variant: 'destructive' });
        return;
      }
      setGlobalAlternatives([...globalAlternatives, alternative].sort() as ('A' | 'B' | 'C' | 'D')[]);
    } else {
      if (globalAlternatives.length <= 2) {
        toast({ title: 'Mínimo 2 alternativas', description: 'Cada questão deve ter pelo menos 2 alternativas.', variant: 'destructive' });
        return;
      }
      const next = globalAlternatives.filter((a) => a !== alternative);
      setGlobalAlternatives(next);
      setCorrectAnswers((prev) => {
        const updated = { ...prev };
        let cleared = 0;
        for (let i = 1; i <= numQuestions; i++) if (updated[i] === alternative) { delete updated[i]; cleared++; }
        if (cleared > 0) toast({ title: 'Respostas removidas', description: `${cleared} questão(ões) tiveram a resposta limpa.`, variant: 'default' });
        return updated;
      });
    }
  };

  const handleToggleQuestionAlternative = (questionNumber: number, alternative: 'A' | 'B' | 'C' | 'D', checked: boolean) => {
    const current = questionsOptions[questionNumber] || ['A', 'B', 'C', 'D'];
    if (checked) {
      if (current.length >= 4) {
        toast({ title: 'Máximo 4 alternativas', variant: 'destructive' });
        return;
      }
      setQuestionsOptions((prev) => ({ ...prev, [questionNumber]: [...current, alternative].sort() as ('A' | 'B' | 'C' | 'D')[] }));
    } else {
      if (current.length <= 2) {
        toast({ title: 'Mínimo 2 alternativas', variant: 'destructive' });
        return;
      }
      const next = current.filter((a) => a !== alternative);
      setQuestionsOptions((prev) => ({ ...prev, [questionNumber]: next }));
      if (correctAnswers[questionNumber] === alternative) {
        setCorrectAnswers((prev) => { const u = { ...prev }; delete u[questionNumber]; return u; });
        toast({ title: 'Resposta removida', description: `Questão ${questionNumber}: alternativa removida.`, variant: 'default' });
      }
    }
  };

  const handleApplyGlobalToAll = () => {
    if (globalAlternatives.length < 2) {
      toast({ title: 'Selecione pelo menos 2 alternativas', variant: 'destructive' });
      return;
    }
    const newOptions: Record<number, ('A' | 'B' | 'C' | 'D')[]> = {};
    for (let i = 1; i <= numQuestions; i++) newOptions[i] = [...globalAlternatives];
    setQuestionsOptions(newOptions);
    setUseGlobalAlternatives(false);
    setCorrectAnswers((prev) => {
      const updated = { ...prev };
      let cleared = 0;
      for (let i = 1; i <= numQuestions; i++) {
        if (updated[i] && !globalAlternatives.includes(updated[i])) { delete updated[i]; cleared++; }
      }
      if (cleared > 0) toast({ title: 'Respostas removidas', description: `${cleared} questão(ões) com resposta fora das alternativas.`, variant: 'default' });
      return updated;
    });
    toast({ title: 'Aplicado', description: `Alternativas aplicadas às ${numQuestions} questões.` });
  };

  const getSkillCodesForQuestion = (questionNum: number): string[] => {
    const ids = questionSkills[questionNum] ?? [];
    return ids.map((id) => skillCodeCache[id] ?? gabaritoSkills.find((s) => s.id === id)?.code).filter(Boolean) as string[];
  };

  const buildQuestionsOptions = (): Record<string, string[]> | undefined => {
    const sorted = [...globalAlternatives].sort();
    if (useGlobalAlternatives && JSON.stringify(sorted) === JSON.stringify(['A', 'B', 'C', 'D'])) return undefined;
    if (!useGlobalAlternatives) {
      const allDefault = Array.from({ length: numQuestions }, (_, i) => {
        const opts = questionsOptions[i + 1] || ['A', 'B', 'C', 'D'];
        return JSON.stringify([...opts].sort()) === JSON.stringify(['A', 'B', 'C', 'D']);
      }).every(Boolean);
      if (allDefault) return undefined;
    }
    const result: Record<string, string[]> = {};
    for (let i = 1; i <= numQuestions; i++)
      result[i.toString()] = useGlobalAlternatives ? [...globalAlternatives] : (questionsOptions[i] || ['A', 'B', 'C', 'D']);
    return result;
  };

  const canProceedStep0 = title.trim() !== '' && institution.trim() !== '';
  const canProceedStep1 =
    numQuestions >= 1 &&
    numQuestions <= 200 &&
    Array.from({ length: numQuestions }, (_, i) => i + 1).every((n) => {
      const ans = correctAnswers[n];
      const opts = getAvailableAlternatives(n);
      return ans && opts.includes(ans);
    });
  const canProceedStep2 = !useBlocks || (separateBySubject ? validateDisciplineBlocks().isValid : numBlocks >= 1 && questionsPerBlock >= 1);

  const handleSubmit = async () => {
    const question_skills: Record<string, string[]> = {};
    for (let n = 1; n <= numQuestions; n++) question_skills[String(n)] = questionSkills[n] ?? [];

    const payload: Record<string, unknown> = {
      title: title.trim(),
      num_questions: numQuestions,
      correct_answers: correctAnswers,
      question_skills,
      use_blocks: separateBySubject,
      questions_options: buildQuestionsOptions() || {},
      test_data: { institution: institution.trim(), title: title.trim() },
    };
    if (useBlocks && !separateBySubject) {
      payload.blocks_config = { num_blocks: numBlocks, questions_per_block: questionsPerBlock };
    }
    if (separateBySubject) {
      payload.blocks_config = {
        blocks: blocksByDiscipline.map((b) => ({
          block_id: b.block_id,
          subject_name: b.subject_name,
          questions_count: b.questions_count,
          start_question: b.start_question,
          end_question: b.end_question,
        })),
      };
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/answer-sheets/create-gabaritos', payload, { headers: { 'Content-Type': 'application/json' } });
      if (response.status === 201 && response.data?.gabarito_id) {
        setCreatedGabarito({
          gabarito_id: response.data.gabarito_id,
          title: response.data.title ?? title,
          num_questions: response.data.num_questions ?? numQuestions,
        });
        toast({ title: 'Gabarito criado!', description: 'Cartão resposta cadastrado com sucesso.' });
      } else {
        toast({ title: 'Resposta inesperada', description: 'Tente novamente.', variant: 'destructive' });
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Não foi possível criar o gabarito.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdGabarito) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-background shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl">Gabarito criado com sucesso</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 justify-center">
            <Button asChild variant="default">
              <Link to="/app/cartao-resposta/gerar">Gerar cartões</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/cartao-resposta/cadastrar">Cadastrar outro</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 md:p-8">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Cadastrar cartão resposta</h1>
          <p className="mt-1 text-muted-foreground">Preencha as etapas abaixo para criar um novo gabarito. Depois você poderá gerar os cartões a partir dele.</p>
          <div className="mt-8">
            <Steps steps={STEPS} currentStep={step} />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {step === 0 && (
            <Card className="border-2 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Informações básicas</CardTitle>
                    <CardDescription>Título da avaliação e instituição.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da avaliação</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Avaliação de Matemática - 5º ano"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Instituição</Label>
                  <div className="relative max-w-md">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="institution"
                      placeholder="Ex: Escola Municipal"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card className="border-2 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ListOrdered className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Questões e gabarito</CardTitle>
                    <CardDescription>Quantidade de questões e resposta correta de cada uma.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="numQuestions">Número de questões</Label>
                  <Input
                    id="numQuestions"
                    type="number"
                    min={1}
                    max={200}
                    value={numQuestions || ''}
                    onChange={(e) => setNumQuestions(Math.min(200, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    className="max-w-[120px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="global-alt"
                    checked={useGlobalAlternatives}
                    onCheckedChange={(c) => setUseGlobalAlternatives(c === true)}
                  />
                  <Label htmlFor="global-alt">Usar as mesmas alternativas em todas as questões</Label>
                </div>
                {useGlobalAlternatives && (
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <Label>Alternativas disponíveis (mín. 2, máx. 4)</Label>
                    <div className="flex flex-wrap gap-4">
                      {(['A', 'B', 'C', 'D'] as const).map((alt) => (
                        <div key={alt} className="flex items-center space-x-2">
                          <Checkbox
                            id={`global-alt-${alt}`}
                            checked={globalAlternatives.includes(alt)}
                            onCheckedChange={(c) => handleToggleGlobalAlternative(alt, c === true)}
                            disabled={!globalAlternatives.includes(alt) && globalAlternatives.length >= 4}
                          />
                          <Label htmlFor={`global-alt-${alt}`} className="text-sm font-medium cursor-pointer">{alt}</Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {globalAlternatives.length} alternativa(s): {globalAlternatives.join(', ')}
                      {globalAlternatives.length < 2 && ' — Selecione pelo menos 2.'}
                    </p>
                    {numQuestions >= 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={handleApplyGlobalToAll} disabled={globalAlternatives.length < 2}>
                        Usar estas alternativas e configurar por questão
                      </Button>
                    )}
                  </div>
                )}
                {!useGlobalAlternatives && numQuestions >= 1 && (
                  <p className="text-xs text-muted-foreground">Configure 2 a 4 alternativas por questão usando o botão &quot;Configurar&quot; em cada linha abaixo.</p>
                )}
                {numQuestions >= 1 && (
                  <>
                    <div className="space-y-2">
                      <Label>Gabarito (resposta correta por questão)</Label>
                      <p className="text-xs text-muted-foreground">Clique na letra para definir a resposta correta. Use &quot;Configurar&quot; para definir as alternativas da questão (mín. 2, máx. 4).</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: numQuestions }, (_, i) => i + 1).map((n) => {
                          const opts = getAvailableAlternatives(n);
                          return (
                            <div key={n} className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
                              <span className="w-6 text-center text-xs font-medium text-muted-foreground">{n}</span>
                              {opts.map((letter) => (
                                <button
                                  key={letter}
                                  type="button"
                                  onClick={() => setCorrectAnswers((prev) => ({ ...prev, [n]: letter }))}
                                  className={`h-7 w-7 rounded text-xs font-semibold transition ${
                                    correctAnswers[n] === letter ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                                  }`}
                                >
                                  {letter}
                                </button>
                              ))}
                              {!useGlobalAlternatives && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-1.5 text-xs"
                                  onClick={() => setEditingQuestionAlternatives(editingQuestionAlternatives === n ? null : n)}
                                >
                                  Configurar
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Dialog open={editingQuestionAlternatives !== null} onOpenChange={(open) => !open && setEditingQuestionAlternatives(null)}>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Alternativas — Questão {editingQuestionAlternatives ?? ''}</DialogTitle>
                          <DialogDescription>Selecione de 2 a 4 alternativas para esta questão.</DialogDescription>
                        </DialogHeader>
                        {editingQuestionAlternatives !== null && (
                          <div className="flex flex-wrap gap-4 py-2">
                            {(['A', 'B', 'C', 'D'] as const).map((alt) => {
                              const cur = questionsOptions[editingQuestionAlternatives] || ['A', 'B', 'C', 'D'];
                              const isChecked = cur.includes(alt);
                              return (
                                <div key={alt} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`q${editingQuestionAlternatives}-${alt}`}
                                    checked={isChecked}
                                    onCheckedChange={(c) => handleToggleQuestionAlternative(editingQuestionAlternatives, alt, c === true)}
                                    disabled={!isChecked && cur.length >= 4}
                                  />
                                  <Label htmlFor={`q${editingQuestionAlternatives}-${alt}`} className="cursor-pointer">{alt}</Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {editingQuestionAlternatives !== null && (
                          <p className="text-xs text-muted-foreground">
                            {(questionsOptions[editingQuestionAlternatives] || ['A', 'B', 'C', 'D']).length} alternativa(s) selecionada(s)
                          </p>
                        )}
                      </DialogContent>
                    </Dialog>
                    {!canProceedStep1 && numQuestions >= 1 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Defina a resposta correta para todas as questões.</AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-2 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Blocos</CardTitle>
                    <CardDescription>Opcional. Organize por blocos ou por disciplina.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="use-blocks" checked={useBlocks} onCheckedChange={(c) => setUseBlocks(c === true)} />
                  <Label htmlFor="use-blocks">Separar em blocos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="by-subject"
                    checked={separateBySubject}
                    onCheckedChange={(c) => {
                      setSeparateBySubject(c === true);
                      if (c === true) setUseBlocks(false);
                    }}
                  />
                  <Label htmlFor="by-subject">Separar por disciplina (1 bloco por disciplina)</Label>
                </div>

                {separateBySubject && numQuestions > 0 && (
                  <div className="space-y-3 rounded-lg border-l-4 border-primary/50 pl-4">
                    <Label>Disciplinas e quantidade de questões</Label>
                    {blocksByDiscipline.map((block) => (
                      <div key={block.block_id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
                        <Badge variant="outline">Bloco {block.block_id}</Badge>
                        <span className="text-sm font-medium">{block.subject_name}</span>
                        <Input
                          type="number"
                          min={1}
                          max={26}
                          value={block.questions_count}
                          onChange={(e) => handleUpdateBlockQuestions(block.block_id, parseInt(e.target.value, 10) || 1)}
                          className="w-20 h-8"
                        />
                        <span className="text-xs text-muted-foreground">Q{block.start_question}–{block.end_question}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDisciplineBlock(block.block_id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {blocksByDiscipline.length < 4 && (
                      <Select
                        onValueChange={(value) => {
                          const d = disciplines.find((x) => x.id === value);
                          if (d) handleAddDisciplineBlock(d.id, d.name);
                        }}
                        value=""
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder={isLoadingDisciplines ? 'Carregando...' : '+ Adicionar disciplina'} />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplines.filter((d) => !blocksByDiscipline.some((b) => b.subject_id === d.id)).map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Total: {blocksByDiscipline.reduce((s, b) => s + b.questions_count, 0)} / {numQuestions} questões · {blocksByDiscipline.length} / 4 blocos
                    </p>
                    {validateDisciplineBlocks().warnings.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{validateDisciplineBlocks().warnings.join(' ')}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {useBlocks && !separateBySubject && (
                  <div className="flex gap-4 flex-wrap">
                    <div className="space-y-2">
                      <Label>Quantidade de blocos</Label>
                      <Input type="number" min={1} value={numBlocks} onChange={(e) => setNumBlocks(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-24" />
                    </div>
                    <div className="space-y-2">
                      <Label>Questões por bloco</Label>
                      <Input type="number" min={1} value={questionsPerBlock} onChange={(e) => setQuestionsPerBlock(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-24" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-2 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Habilidades (opcional)</CardTitle>
                    <CardDescription>Associe habilidades às questões para relatórios.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Disciplina</Label>
                    <Select value={skillSubjectId} onValueChange={setSkillSubjectId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {subjectsForSkills.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Série</Label>
                    <Select value={skillGradeId} onValueChange={setSkillGradeId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {gradesForSkills.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(gabaritoSkills.length > 0 || Object.keys(skillCodeCache).length > 0) && numQuestions >= 1 && (
                  <div className="space-y-2">
                    <Label>Habilidades por questão</Label>
                    <p className="text-xs text-muted-foreground">Clique no número da questão para associar habilidades. Troque de disciplina/série para adicionar de outras — as já adicionadas são mantidas.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {Array.from({ length: numQuestions }, (_, i) => i + 1).map((n) => {
                        const codes = getSkillCodesForQuestion(n);
                        return (
                          <div key={n} className="flex flex-col gap-1 rounded-md border bg-muted/20 p-2">
                            <Button
                              type="button"
                              variant={editingQuestionSkills === n ? 'default' : 'outline'}
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => setEditingQuestionSkills(editingQuestionSkills === n ? null : n)}
                            >
                              <Target className="h-3 w-3 mr-1.5 shrink-0" />
                              <span className="font-medium">Q{n}</span>
                              {codes.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{codes.length}</Badge>}
                            </Button>
                            {codes.length > 0 && (
                              <span className="text-[11px] text-muted-foreground font-mono leading-tight break-words">
                                {codes.join(', ')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <Dialog open={editingQuestionSkills !== null} onOpenChange={(open) => !open && setEditingQuestionSkills(null)}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Questão {editingQuestionSkills ?? ''}</DialogTitle>
                          <DialogDescription>Selecione as habilidades associadas a esta questão. Habilidades de outras disciplinas já escolhidas permanecem selecionadas.</DialogDescription>
                        </DialogHeader>
                        {editingQuestionSkills !== null && (() => {
                          const selectedIds = questionSkills[editingQuestionSkills] ?? [];
                          const currentIds = new Set(gabaritoSkills.map((s) => s.id));
                          const cachedSkills = selectedIds
                            .filter((id) => !currentIds.has(id))
                            .map((id) => ({
                              id,
                              code: skillCodeCache[id] ?? id,
                              description: '',
                              name: skillCodeCache[id] ?? id,
                            }));
                          const skillsForSelector = [...gabaritoSkills, ...cachedSkills];
                          return (
                            <SkillsSelector
                              skills={skillsForSelector}
                              selected={selectedIds}
                              onChange={(ids) => setQuestionSkills((prev) => ({ ...prev, [editingQuestionSkills]: ids }))}
                              placeholder="Habilidades"
                              allGrades={gradesForSkills}
                              subjectId={skillSubjectId}
                              subjectName={subjectsForSkills.find((s) => s.id === skillSubjectId)?.name}
                              gradeId={skillGradeId}
                              gradeName={gradesForSkills.find((g) => g.id === skillGradeId)?.name}
                            />
                          );
                        })()}
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                {(!skillSubjectId || !skillGradeId) && (
                  <p className="text-sm text-muted-foreground">Selecione disciplina e série para carregar habilidades.</p>
                )}
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-2 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Revisar e criar</CardTitle>
                    <CardDescription>Confira todos os dados antes de cadastrar o gabarito.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <dl className="grid gap-2 text-sm">
                  <div><dt className="text-muted-foreground">Título</dt><dd className="font-medium">{title || '—'}</dd></div>
                  <div><dt className="text-muted-foreground">Instituição</dt><dd className="font-medium">{institution || '—'}</dd></div>
                  <div><dt className="text-muted-foreground">Questões</dt><dd className="font-medium">{numQuestions}</dd></div>
                  {separateBySubject && blocksByDiscipline.length > 0 && (
                    <div>
                      <dt className="text-muted-foreground">Blocos por disciplina</dt>
                      <dd className="font-medium">{blocksByDiscipline.map((b) => `${b.subject_name} (${b.questions_count})`).join(' · ')}</dd>
                    </div>
                  )}
                  {useBlocks && !separateBySubject && (
                    <div><dt className="text-muted-foreground">Blocos</dt><dd className="font-medium">{numBlocks} blocos, {questionsPerBlock} questões/bloco</dd></div>
                  )}
                </dl>

                <div className="space-y-2">
                  <dt className="text-sm font-medium text-muted-foreground">Alternativas por questão</dt>
                  <dd className="text-sm">
                    {useGlobalAlternatives ? (
                      <p><span className="font-medium">Todas:</span> {globalAlternatives.join(', ')}</p>
                    ) : (
                      <ul className="list-none space-y-1 flex flex-wrap gap-x-4 gap-y-1">
                        {Array.from({ length: numQuestions }, (_, i) => i + 1).map((n) => {
                          const opts = questionsOptions[n] || ['A', 'B', 'C', 'D'];
                          return (
                            <li key={n} className="text-muted-foreground">
                              <span className="font-medium text-foreground">Q{n}:</span> {opts.join(', ')}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </dd>
                </div>

                <div className="space-y-2">
                  <dt className="text-sm font-medium text-muted-foreground">Habilidades por questão</dt>
                  <dd className="text-sm">
                    <ul className="list-none space-y-1 flex flex-wrap gap-x-4 gap-y-1">
                      {Array.from({ length: numQuestions }, (_, i) => i + 1).map((n) => {
                        const codes = getSkillCodesForQuestion(n);
                        return (
                          <li key={n} className="text-muted-foreground">
                            <span className="font-medium text-foreground">Q{n}:</span> {codes.length > 0 ? codes.join(', ') : '—'}
                          </li>
                        );
                      })}
                    </ul>
                  </dd>
                </div>

                <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : <>Cadastrar gabarito</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="hidden lg:block">
          <Card className="sticky top-4 border bg-card/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              {title && <p><span className="text-foreground font-medium">Título:</span> {title}</p>}
              {institution && <p><span className="text-foreground font-medium">Instituição:</span> {institution}</p>}
              {numQuestions > 0 && <p><span className="text-foreground font-medium">Questões:</span> {numQuestions}</p>}
              {step >= 1 && numQuestions > 0 && (
                <p>
                  <span className="text-foreground font-medium">Gabarito:</span>{' '}
                  {Object.keys(correctAnswers).length === numQuestions ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Completo</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">{Object.keys(correctAnswers).length}/{numQuestions}</span>
                  )}
                </p>
              )}
              {step >= 2 && (useBlocks || separateBySubject) && (
                <p>
                  <span className="text-foreground font-medium">Blocos:</span>{' '}
                  {separateBySubject ? `${blocksByDiscipline.length} disciplinas` : `${numBlocks} blocos`}
                </p>
              )}
              {!title && !institution && numQuestions === 0 && <p>Preencha as etapas para ver o resumo.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && !canProceedStep0) ||
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2)
            }
          >
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
