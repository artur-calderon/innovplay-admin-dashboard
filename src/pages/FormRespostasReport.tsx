import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Users,
  Filter,
  Loader2,
  School,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FormResultsFiltersApiService } from '@/services/formResultsFiltersApi';
import { FormMultiSelect } from '@/components/ui/form-multi-select';

interface State {
  id: string;
  name: string;
  uf: string;
}

interface Municipality {
  id: string;
  name: string;
  state: string;
}

interface School {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface FormOption {
  id: string;
  name: string;
}

interface Student {
  alunoId: string;
  alunoNome: string;
  userId: string;
  dataNascimento?: string | null;
  escolaId: string;
  escolaNome: string;
  gradeId: string;
  gradeName: string;
  classId?: string;
  className?: string;
  resposta?: string;
}

interface QuestaoResposta {
  questionId: string;
  subQuestionId?: string;
  textoPergunta: string;
  textoSubpergunta?: string;
  totalRespostasQuestao: number;
  porcentagemSobreTotal: number;
  contagem: Record<string, number>;
  alunos: {
    data: Student[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface RespostasReportData {
  formId: string;
  formTitle: string;
  totalRespostas: number;
  filtros?: Record<string, string>;
  questoes: QuestaoResposta[];
  geradoEm?: string;
}

const FormRespostasReport = () => {
  const { toast } = useToast();

  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [reportData, setReportData] = useState<RespostasReportData | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [filterDebounce, setFilterDebounce] = useState<NodeJS.Timeout | null>(null);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedQuestaoIndex, setSelectedQuestaoIndex] = useState<number | null>(null);
  const [selectedOpcao, setSelectedOpcao] = useState<string>('');
  const [currentStudentPage, setCurrentStudentPage] = useState(1);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingFilters(true);
        const options = await FormResultsFiltersApiService.getFilterOptions({});
        if (options.estados.length > 0) {
          setStates(options.estados.map((e) => ({ id: e.id, name: e.name, uf: e.uf ?? e.id })));
        }
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        toast({ title: 'Erro ao carregar filtros', description: 'Tente novamente.', variant: 'destructive' });
      } finally {
        setIsLoadingFilters(false);
      }
    };
    load();
  }, [toast]);

  useEffect(() => {
    if (selectedState !== 'all') {
      setIsLoadingFilters(true);
      setSelectedMunicipality('all');
      setSelectedForm('');
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
      FormResultsFiltersApiService.getFilterOptions({ estado: selectedState })
        .then((options) => {
          setMunicipalities(options.municipios.map((m) => ({ id: m.id, name: m.name, state: selectedState })));
          setForms([]);
          setSchools([]);
        })
        .catch(() => {
          setMunicipalities([]);
          setForms([]);
        })
        .finally(() => setIsLoadingFilters(false));
    } else {
      setMunicipalities([]);
      setForms([]);
      setSelectedMunicipality('all');
      setSelectedForm('');
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState !== 'all' && selectedMunicipality !== 'all') {
      setIsLoadingFilters(true);
      setSelectedForm('');
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
      FormResultsFiltersApiService.getFilterOptions({
        estado: selectedState,
        municipio: selectedMunicipality,
      })
        .then((options) => {
          setForms(options.formularios ?? []);
          setSchools([]);
        })
        .catch(() => {
          setForms([]);
          setSchools([]);
        })
        .finally(() => setIsLoadingFilters(false));
    } else {
      setForms([]);
      setSelectedForm('');
      setSchools([]);
    }
  }, [selectedState, selectedMunicipality]);

  useEffect(() => {
    if (
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm &&
      selectedForm !== 'all'
    ) {
      setIsLoadingFilters(true);
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
      FormResultsFiltersApiService.getFilterOptions({
        estado: selectedState,
        municipio: selectedMunicipality,
        formulario: selectedForm,
      })
        .then((options) => {
          const sorted = [...(options.escolas ?? [])].sort((a, b) => a.name.localeCompare(b.name));
          setSchools(sorted);
        })
        .catch(() => setSchools([]))
        .finally(() => setIsLoadingFilters(false));
    } else {
      setSchools([]);
      setSelectedSchools([]);
    }
  }, [selectedState, selectedMunicipality, selectedForm]);

  useEffect(() => {
    if (
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm &&
      selectedForm !== 'all' &&
      selectedSchools.length > 0
    ) {
      setIsLoadingFilters(true);
      const allGradesById = new Map<string, { id: string; name: string }>();
      const allGradesByName = new Map<string, string>();
      Promise.all(
        selectedSchools.map((schoolId) =>
          FormResultsFiltersApiService.getFilterOptions({
            estado: selectedState,
            municipio: selectedMunicipality,
            formulario: selectedForm,
            escola: schoolId,
          })
        )
      )
        .then((results) => {
          results.forEach((options) => {
            (options.series ?? []).forEach((grade: { id: string; name: string }) => {
              const name = (grade.name ?? '').trim().toLowerCase();
              if (!allGradesById.has(grade.id) && !allGradesByName.has(name)) {
                allGradesById.set(grade.id, { id: grade.id, name: grade.name?.trim() ?? '' });
                allGradesByName.set(name, grade.id);
              }
            });
          });
          setGrades(Array.from(allGradesById.values()).sort((a, b) => a.name.localeCompare(b.name)));
        })
        .catch(() => setGrades([]))
        .finally(() => setIsLoadingFilters(false));
    } else {
      setGrades([]);
    }
  }, [selectedState, selectedMunicipality, selectedForm, selectedSchools]);

  useEffect(() => {
    if (
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm &&
      selectedForm !== 'all' &&
      selectedSchools.length > 0 &&
      selectedGrades.length > 0
    ) {
      setIsLoadingFilters(true);
      const allClassesById = new Map<string, { id: string; name: string }>();
      const allClassesByName = new Map<string, string>();
      const promises: Promise<Awaited<ReturnType<typeof FormResultsFiltersApiService.getFilterOptions>>>[] = [];
      selectedSchools.forEach((schoolId) => {
        selectedGrades.forEach((gradeId) => {
          promises.push(
            FormResultsFiltersApiService.getFilterOptions({
              estado: selectedState,
              municipio: selectedMunicipality,
              formulario: selectedForm,
              escola: schoolId,
              serie: gradeId,
            })
          );
        });
      });
      Promise.all(promises)
        .then((results) => {
          results.forEach((options) => {
            (options.turmas ?? []).forEach((t: { id: string; name: string }) => {
              const name = (t.name ?? '').trim().toLowerCase();
              if (!allClassesById.has(t.id) && !allClassesByName.has(name)) {
                allClassesById.set(t.id, { id: t.id, name: t.name?.trim() ?? '' });
                allClassesByName.set(name, t.id);
              }
            });
          });
          setClasses(Array.from(allClassesById.values()).sort((a, b) => a.name.localeCompare(b.name)));
        })
        .catch(() => setClasses([]))
        .finally(() => setIsLoadingFilters(false));
    } else {
      setClasses([]);
    }
  }, [selectedState, selectedMunicipality, selectedForm, selectedSchools, selectedGrades]);

  const startPollingRespostas = useCallback(
    (basePath: string, requestConfig: { params: Record<string, string | number>; meta?: { cityId: string } }) => {
      const url = `${basePath}/respostas`;
      const interval = setInterval(async () => {
        try {
          const response = await api.get(url, requestConfig);
          if (response.status === 200) {
            clearInterval(interval);
            setIsPolling(false);
            setReportData(response.data);
            toast({ title: 'Relatório processado', description: 'Os resultados foram carregados.' });
          }
        } catch (err) {
          console.error('Erro no polling:', err);
          clearInterval(interval);
          setIsPolling(false);
        }
      }, 2500);
    },
    [toast]
  );

  const fetchReport = useCallback(async () => {
    if (
      selectedState === 'all' ||
      selectedMunicipality === 'all' ||
      !selectedForm ||
      selectedForm === 'all' ||
      selectedSchools.length === 0
    ) {
      return;
    }

    setIsLoadingReport(true);
    setReportData(null);

    const params: Record<string, string | number> = {
      state: selectedState,
      municipio: selectedMunicipality,
      page: 1,
      limit: 20,
    };
    if (selectedSchools.length > 0) params.escola = selectedSchools.join(',');
    if (selectedGrades.length > 0) params.serie = selectedGrades.join(',');
    if (selectedClasses.length > 0) params.turma = selectedClasses.join(',');

    const basePath = `/forms/${selectedForm}/results`;
    const requestConfig =
      selectedMunicipality !== 'all'
        ? { params, meta: { cityId: selectedMunicipality } }
        : { params };

    try {
      const response = await api.get(`${basePath}/respostas`, requestConfig);
      if (response.status === 200) {
        setReportData(response.data);
      } else if (response.status === 202) {
        setIsPolling(true);
        startPollingRespostas(basePath, requestConfig);
      }
    } catch (error: any) {
      if (error.response?.status === 202) {
        setIsPolling(true);
        startPollingRespostas(basePath, requestConfig);
      } else {
        toast({
          title: 'Erro ao carregar relatório',
          description: error.response?.data?.message ?? 'Não foi possível carregar os resultados.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoadingReport(false);
    }
  }, [
    selectedState,
    selectedMunicipality,
    selectedForm,
    selectedSchools,
    selectedGrades,
    selectedClasses,
    toast,
    startPollingRespostas,
  ]);

  useEffect(() => {
    if (filterDebounce) clearTimeout(filterDebounce);
    const hasMinimum =
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm !== '' &&
      selectedForm !== 'all' &&
      selectedSchools.length > 0;
    if (hasMinimum) {
      const t = setTimeout(() => fetchReport(), 500);
      setFilterDebounce(t);
    } else {
      setReportData(null);
    }
    return () => {
      if (filterDebounce) clearTimeout(filterDebounce);
    };
  }, [
    selectedState,
    selectedMunicipality,
    selectedForm,
    selectedSchools,
    selectedGrades,
    selectedClasses,
    fetchReport,
  ]);

  const openStudentModal = (questaoIndex: number, opcao: string) => {
    setSelectedQuestaoIndex(questaoIndex);
    setSelectedOpcao(opcao);
    setCurrentStudentPage(1);
    setStudentModalOpen(true);
  };

  const loadStudentsPage = useCallback(
    async (page: number) => {
      if (
        selectedQuestaoIndex == null ||
        !reportData?.questoes?.[selectedQuestaoIndex] ||
        !selectedForm
      ) {
        return;
      }
      setIsLoadingStudents(true);
      const params: Record<string, string | number> = {
        state: selectedState,
        municipio: selectedMunicipality,
        page,
        limit: 20,
      };
      if (selectedSchools.length > 0) params.escola = selectedSchools.join(',');
      if (selectedGrades.length > 0) params.serie = selectedGrades.join(',');
      if (selectedClasses.length > 0) params.turma = selectedClasses.join(',');
      const requestConfig =
        selectedMunicipality !== 'all'
          ? { params, meta: { cityId: selectedMunicipality } }
          : { params };
      try {
        const response = await api.get(`/forms/${selectedForm}/results/respostas`, requestConfig);
        if (response.status === 200 && response.data?.questoes?.[selectedQuestaoIndex]) {
          const updatedQuestoes = [...(reportData.questoes ?? [])];
          updatedQuestoes[selectedQuestaoIndex] = response.data.questoes[selectedQuestaoIndex];
          setReportData((prev) =>
            prev ? { ...prev, questoes: updatedQuestoes } : null
          );
          setCurrentStudentPage(page);
        }
      } catch (err) {
        toast({
          title: 'Erro ao carregar alunos',
          description: 'Não foi possível carregar a página.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingStudents(false);
      }
    },
    [
      selectedQuestaoIndex,
      reportData,
      selectedForm,
      selectedState,
      selectedMunicipality,
      selectedSchools,
      selectedGrades,
      selectedClasses,
      toast,
    ]
  );

  const questao = selectedQuestaoIndex != null && reportData?.questoes?.[selectedQuestaoIndex]
    ? reportData.questoes[selectedQuestaoIndex]
    : null;
  const studentsFiltered =
    questao?.alunos?.data?.filter((a) => a.resposta === selectedOpcao) ?? [];
  const pagination = questao?.alunos?.pagination;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Resultados Socioeconomicos
        </h1>
        <p className="text-muted-foreground mt-2">
          Respostas por pergunta do questionário socioeconômico
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Selecione os filtros para gerar o relatório de respostas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado *</label>
              <Select value={selectedState} onValueChange={setSelectedState} disabled={isLoadingFilters}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Município *</label>
              <Select
                value={selectedMunicipality}
                onValueChange={setSelectedMunicipality}
                disabled={isLoadingFilters || selectedState === 'all'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingFilters
                        ? 'Carregando...'
                        : municipalities.length === 0
                          ? 'Nenhum disponível'
                          : 'Selecione o município'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {municipalities.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Formulário *</label>
              <Select
                value={selectedForm}
                onValueChange={setSelectedForm}
                disabled={isLoadingFilters || selectedState === 'all' || selectedMunicipality === 'all'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingFilters
                        ? 'Carregando...'
                        : forms.length === 0 && selectedMunicipality !== 'all'
                          ? 'Nenhum formulário'
                          : 'Selecione o formulário'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola(s) *</label>
              <FormMultiSelect
                options={schools.map((s) => ({ id: s.id, name: s.name }))}
                selected={selectedSchools}
                onChange={setSelectedSchools}
                placeholder={
                  selectedSchools.length === 0 ? 'Selecione escolas' : `${selectedSchools.length} selecionada(s)`
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Série(s)</label>
              <FormMultiSelect
                options={grades.map((g) => ({ id: g.id, name: g.name }))}
                selected={selectedGrades}
                onChange={setSelectedGrades}
                placeholder={
                  selectedGrades.length === 0 ? 'Todas' : `${selectedGrades.length} selecionada(s)`
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma(s)</label>
              <FormMultiSelect
                options={classes.map((c) => ({ id: c.id, name: c.name }))}
                selected={selectedClasses}
                onChange={setSelectedClasses}
                placeholder={
                  selectedClasses.length === 0 ? 'Todas' : `${selectedClasses.length} selecionada(s)`
                }
              />
            </div>
          </div>
          {(isLoadingReport || isPolling) && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-primary">
                  {isPolling ? 'Processando relatório...' : 'Carregando dados...'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reportData && reportData.questoes && reportData.questoes.length > 0 && (
        <div className="space-y-6">
          {reportData.totalRespostas != null && (
            <p className="text-muted-foreground">
              Total de respostas: <strong>{reportData.totalRespostas}</strong>
              {reportData.formTitle && ` — ${reportData.formTitle}`}
            </p>
          )}
          <div className="space-y-6">
            {reportData.questoes.map((q, idx) => {
              const totalQuestao = q.totalRespostasQuestao ?? 0;
              const contagem = q.contagem && typeof q.contagem === 'object' ? q.contagem : {};
              const titulo = q.textoSubpergunta
                ? `${q.textoPergunta} — ${q.textoSubpergunta}`
                : q.textoPergunta;
              return (
                <Card key={q.questionId + (q.subQuestionId ?? '')}>
                  <CardHeader>
                    <CardTitle className="text-base">{titulo}</CardTitle>
                    <CardDescription>
                      Total de respostas na pergunta: {totalQuestao} ({q.porcentagemSobreTotal?.toFixed(1) ?? 0}% do total)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <TableHead className="text-primary-foreground font-medium">Opção</TableHead>
                          <TableHead className="text-primary-foreground font-medium">
                            Frequência Absoluta (N° de alunos)
                          </TableHead>
                          <TableHead className="text-primary-foreground font-medium">
                            Percentual Relativo (%)
                          </TableHead>
                          <TableHead className="text-primary-foreground font-medium w-[120px]">
                            Detalhes
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(contagem).map(([opcao, count]) => {
                          const pct =
                            totalQuestao > 0 ? ((Number(count) / totalQuestao) * 100).toFixed(1) : '0.0';
                          return (
                            <TableRow key={opcao}>
                              <TableCell className="font-medium">{opcao}</TableCell>
                              <TableCell>{count}</TableCell>
                              <TableCell>{pct}%</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  onClick={() => openStudentModal(idx, opcao)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Respostas
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {reportData && (!reportData.questoes || reportData.questoes.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma pergunta encontrada para os filtros selecionados.
          </CardContent>
        </Card>
      )}

      <Dialog open={studentModalOpen} onOpenChange={setStudentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Respostas: {selectedOpcao}
            </DialogTitle>
            <DialogDescription>
              Alunos que responderam &quot;{selectedOpcao}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : studentsFiltered.length > 0 ? (
              <div className="space-y-3">
                {studentsFiltered.map((student) => (
                  <Card key={student.alunoId} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{student.alunoNome}</h4>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4" />
                            <span>{student.escolaNome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            <span>
                              {student.gradeName}
                              {student.className ? ` — ${student.className}` : ''}
                            </span>
                          </div>
                          {student.resposta != null && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <strong>Resposta:</strong> {student.resposta}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum aluno encontrado para esta opção nesta página.
              </div>
            )}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} no total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadStudentsPage(currentStudentPage - 1)}
                  disabled={currentStudentPage <= 1 || isLoadingStudents}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadStudentsPage(currentStudentPage + 1)}
                  disabled={currentStudentPage >= pagination.totalPages || isLoadingStudents}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormRespostasReport;
