import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Users,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  Activity,
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { InseSaebFiltersApiService } from '@/services/inseSaebFiltersApi';
import { FormMultiSelect } from '@/components/ui/form-multi-select';

// --- Tipos da API de resultados ---
interface DisciplinaAluno {
  id: string;
  nome: string;
  proficiencia: number;
  nota: number;
  nivel_proficiencia: string;
}

interface AlunoInseSaeb {
  nome_completo: string;
  disciplinas: DisciplinaAluno[];
  proficiencia_media: number;
  nota: number;
  nivel_proficiencia: string;
  inse_pontos: number;
  inse_nivel: number;
  inse_nivel_label: string;
}

interface DistribuicaoInseItem {
  nivel: number;
  label: string;
  quantidade: number;
  porcentagem: number;
}

interface InseSaebResultsResponse {
  formId: string;
  formTitle: string;
  avaliacaoId: string;
  avaliacaoTitulo: string;
  filtros?: Record<string, string>;
  resumo: {
    total_alunos_questionario: number;
    media_proficiencia_escopo: number;
    inse_medio: number;
  };
  distribuicao_inse: Record<string, DistribuicaoInseItem>;
  distribuicao_proficiencia: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
    abaixo_do_basico_porcentagem: number;
    basico_porcentagem: number;
    adequado_porcentagem: number;
    avancado_porcentagem: number;
  };
  disciplinas_avaliacao: Array<{ id: string; nome: string }>;
  alunos: {
    data: AlunoInseSaeb[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const INSE_NIVEIS_ORDEM = ['6', '5', '4', '3', '2', '1'];
const INSE_CORES: Record<string, string> = {
  '6': 'bg-violet-800 text-white',
  '5': 'bg-violet-600 text-white',
  '4': 'bg-violet-500 text-white',
  '3': 'bg-violet-400 text-violet-900',
  '2': 'bg-violet-300 text-violet-900',
  '1': 'bg-violet-200 text-violet-900',
};

const NIVEL_PROFICIENCIA_CORES: Record<string, string> = {
  'Abaixo do Básico': 'bg-red-500 text-white',
  'Básico': 'bg-yellow-500 text-yellow-900',
  'Adequado': 'bg-green-600 text-white',
  'Avançado': 'bg-green-800 text-white',
};

function getProficienciaBadgeClass(nivel: string): string {
  return NIVEL_PROFICIENCIA_CORES[nivel] ?? 'bg-muted text-muted-foreground';
}

const InseSaebReport = () => {
  const { toast } = useToast();

  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<string>('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [states, setStates] = useState<Array<{ id: string; name: string }>>([]);
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([]);
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [avaliacoes, setAvaliacoes] = useState<Array<{ id: string; name: string }>>([]);
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);

  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [reportData, setReportData] = useState<InseSaebResultsResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingAluno, setDownloadingAluno] = useState<string | null>(null);

  const limit = 50;

  // Carregar estados iniciais
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingFilters(true);
        const options = await InseSaebFiltersApiService.getFilterOptions({});
        setStates(options.estados);
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        toast({ title: 'Erro ao carregar filtros', description: 'Tente novamente.', variant: 'destructive' });
      } finally {
        setIsLoadingFilters(false);
      }
    };
    load();
  }, [toast]);

  // Estado → municípios, limpar resto
  useEffect(() => {
    if (selectedState !== 'all') {
      setIsLoadingFilters(true);
      setSelectedMunicipality('all');
      setSelectedForm('');
      setSelectedAvaliacao('');
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
      InseSaebFiltersApiService.getFilterOptions({ estado: selectedState })
        .then((options) => {
          setMunicipalities(options.municipios);
          setForms([]);
          setAvaliacoes([]);
          setSchools([]);
          setGrades([]);
          setClasses([]);
        })
        .catch(() => {
          setMunicipalities([]);
          setForms([]);
          setAvaliacoes([]);
        })
        .finally(() => setIsLoadingFilters(false));
    } else {
      setMunicipalities([]);
      setForms([]);
      setAvaliacoes([]);
      setSelectedMunicipality('all');
      setSelectedForm('');
      setSelectedAvaliacao('');
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
    }
  }, [selectedState]);

  // Estado + Município → formulários e avaliações
  useEffect(() => {
    if (selectedState !== 'all' && selectedMunicipality !== 'all') {
      setIsLoadingFilters(true);
      setSelectedForm('');
      setSelectedAvaliacao('');
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
      InseSaebFiltersApiService.getFilterOptions({
        estado: selectedState,
        municipio: selectedMunicipality,
      })
        .then((options) => {
          setForms(options.formularios);
          setAvaliacoes(options.avaliacoes);
          setSchools([]);
          setGrades([]);
          setClasses([]);
        })
        .catch(() => {
          setForms([]);
          setAvaliacoes([]);
          setSchools([]);
        })
        .finally(() => setIsLoadingFilters(false));
    } else {
      setForms([]);
      setAvaliacoes([]);
      setSelectedForm('');
      setSelectedAvaliacao('');
      setSchools([]);
    }
  }, [selectedState, selectedMunicipality]);

  // Formulário + Avaliação → escolas
  useEffect(() => {
    if (
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm &&
      selectedForm !== 'all' &&
      selectedAvaliacao &&
      selectedAvaliacao !== 'all'
    ) {
      setIsLoadingFilters(true);
      setSelectedSchools([]);
      setSelectedGrades([]);
      setSelectedClasses([]);
      InseSaebFiltersApiService.getFilterOptions({
        estado: selectedState,
        municipio: selectedMunicipality,
        formulario: selectedForm,
        avaliacao: selectedAvaliacao,
      })
        .then((options) => {
          const sorted = [...(options.escolas ?? [])].sort((a, b) => a.name.localeCompare(b.name));
          setSchools(sorted);
          setGrades([]);
          setClasses([]);
        })
        .catch(() => setSchools([]))
        .finally(() => setIsLoadingFilters(false));
    } else {
      setSchools([]);
      setSelectedSchools([]);
      setGrades([]);
      setClasses([]);
    }
  }, [selectedState, selectedMunicipality, selectedForm, selectedAvaliacao]);

  // Escola(s) → séries
  useEffect(() => {
    if (
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm &&
      selectedForm !== 'all' &&
      selectedAvaliacao &&
      selectedAvaliacao !== 'all' &&
      selectedSchools.length > 0
    ) {
      setIsLoadingFilters(true);
      const allGradesById = new Map<string, { id: string; name: string }>();
      const allGradesByName = new Map<string, string>();
      Promise.all(
        selectedSchools.map((schoolId) =>
          InseSaebFiltersApiService.getFilterOptions({
            estado: selectedState,
            municipio: selectedMunicipality,
            formulario: selectedForm,
            avaliacao: selectedAvaliacao,
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
          setClasses([]);
        })
        .catch(() => setGrades([]))
        .finally(() => setIsLoadingFilters(false));
    } else {
      setGrades([]);
    }
  }, [selectedState, selectedMunicipality, selectedForm, selectedAvaliacao, selectedSchools]);

  // Série(s) → turmas
  useEffect(() => {
    if (
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm &&
      selectedForm !== 'all' &&
      selectedAvaliacao &&
      selectedAvaliacao !== 'all' &&
      selectedSchools.length > 0 &&
      selectedGrades.length > 0
    ) {
      setIsLoadingFilters(true);
      const allClassesById = new Map<string, { id: string; name: string }>();
      const allClassesByName = new Map<string, string>();
      const promises: Promise<ReturnType<typeof InseSaebFiltersApiService.getFilterOptions>>[] = [];
      selectedSchools.forEach((schoolId) => {
        selectedGrades.forEach((gradeId) => {
          promises.push(
            InseSaebFiltersApiService.getFilterOptions({
              estado: selectedState,
              municipio: selectedMunicipality,
              formulario: selectedForm,
              avaliacao: selectedAvaliacao,
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
  }, [selectedState, selectedMunicipality, selectedForm, selectedAvaliacao, selectedSchools, selectedGrades]);

  const fetchReport = useCallback(async (page: number = 1) => {
    if (
      selectedState === 'all' ||
      selectedMunicipality === 'all' ||
      !selectedForm ||
      selectedForm === 'all' ||
      !selectedAvaliacao ||
      selectedAvaliacao === 'all' ||
      selectedSchools.length === 0
    ) {
      return;
    }

    setIsLoadingReport(true);
    if (page === 1) setReportData(null);

    const params: Record<string, string | number> = {
      state: selectedState,
      municipio: selectedMunicipality,
      avaliacao: selectedAvaliacao,
      page,
      limit,
    };
    if (selectedSchools.length > 0) params.escola = selectedSchools.join(',');
    if (selectedGrades.length > 0) params.serie = selectedGrades.join(',');
    if (selectedClasses.length > 0) params.turma = selectedClasses.join(',');

    const requestConfig =
      selectedMunicipality !== 'all'
        ? { params, meta: { cityId: selectedMunicipality } }
        : { params };

    try {
      const response = await api.get<InseSaebResultsResponse>(
        `/forms/${selectedForm}/results/inse-saeb`,
        requestConfig
      );
      if (response.status === 200) {
        setReportData(response.data);
        setCurrentPage(page);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Erro ao carregar relatório',
        description: err.response?.data?.message ?? 'Não foi possível carregar os resultados.',
        variant: 'destructive',
      });
      setReportData(null);
    } finally {
      setIsLoadingReport(false);
    }
  }, [
    selectedState,
    selectedMunicipality,
    selectedForm,
    selectedAvaliacao,
    selectedSchools,
    selectedGrades,
    selectedClasses,
    toast,
  ]);

  useEffect(() => {
    const hasMinimum =
      selectedState !== 'all' &&
      selectedMunicipality !== 'all' &&
      selectedForm !== '' &&
      selectedForm !== 'all' &&
      selectedAvaliacao !== '' &&
      selectedAvaliacao !== 'all' &&
      selectedSchools.length > 0;
    if (hasMinimum) {
      fetchReport(1);
    } else {
      setReportData(null);
    }
  }, [
    selectedState,
    selectedMunicipality,
    selectedForm,
    selectedAvaliacao,
    selectedSchools,
    selectedGrades,
    selectedClasses,
    fetchReport,
  ]);

  const handlePageChange = (newPage: number) => {
    if (!reportData?.alunos?.pagination || newPage < 1 || newPage > reportData.alunos.pagination.totalPages) return;
    fetchReport(newPage);
  };

  const handleExportAlunoPdf = useCallback(
    async (aluno: AlunoInseSaeb, indexOnPage: number) => {
      if (!reportData) return;
      const key = `${aluno.nome_completo}-${indexOnPage}`;
      try {
        setDownloadingAluno(key);
        const jsPDFModule = await import('jspdf');
        const jsPDF = (jsPDFModule as { default?: unknown }).default || jsPDFModule;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = margin;
        const primaryRgb: [number, number, number] = [124, 58, 237];
        const textDark: [number, number, number] = [31, 41, 55];

        try {
          const logoPath = '/LOGO-1-menor.png';
          const logoResponse = await fetch(logoPath);
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoDataUrl, 'PNG', (pageWidth - 50) / 2, y, 50, 22);
          y += 32;
        } catch {
          // segue sem logo
        }

        const centerX = pageWidth / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...primaryRgb);
        doc.text('Relatório INSE x SAEB — Aluno', centerX, y, { align: 'center' });
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...textDark);
        doc.text(`Formulário: ${reportData.formTitle}`, margin, y);
        y += 6;
        doc.text(`Avaliação: ${reportData.avaliacaoTitulo}`, margin, y);
        y += 6;
        doc.text(`Aluno: ${aluno.nome_completo}`, margin, y);
        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Proficiência Média:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(aluno.proficiencia_media), margin + 50, y);
        y += 6;
        doc.text('Nota:', margin, y);
        doc.text(String(aluno.nota), margin + 50, y);
        y += 6;
        doc.text('Nível Proficiência:', margin, y);
        doc.text(aluno.nivel_proficiencia, margin + 50, y);
        y += 6;
        doc.text('INSE (pontos):', margin, y);
        doc.text(String(aluno.inse_pontos), margin + 50, y);
        y += 6;
        doc.text('Nível INSE:', margin, y);
        doc.text(aluno.inse_nivel_label, margin + 50, y);
        y += 10;
        if (aluno.disciplinas?.length) {
          doc.setFont('helvetica', 'bold');
          doc.text('Por disciplina:', margin, y);
          y += 6;
          doc.setFont('helvetica', 'normal');
          aluno.disciplinas.forEach((d) => {
            doc.text(`${d.nome}: ${d.proficiencia} (${d.nivel_proficiencia}) — Nota ${d.nota}`, margin + 5, y);
            y += 5;
          });
        }
        const safeName = aluno.nome_completo.replace(/[\\/:*?"<>|]/g, '_');
        doc.save(`INSE_SAEB_${safeName}.pdf`);
        toast({ title: 'PDF gerado', description: 'Relatório do aluno exportado com sucesso.' });
      } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        toast({
          title: 'Erro ao gerar PDF',
          description: 'Não foi possível exportar o relatório do aluno.',
          variant: 'destructive',
        });
      } finally {
        setDownloadingAluno(null);
      }
    },
    [reportData, toast]
  );

  const hasMinimumFilters =
    selectedState !== 'all' &&
    selectedMunicipality !== 'all' &&
    selectedForm &&
    selectedForm !== 'all' &&
    selectedAvaliacao &&
    selectedAvaliacao !== 'all' &&
    selectedSchools.length > 0;

  const resumo = reportData?.resumo;
  const distInse = reportData?.distribuicao_inse ?? {};
  const distProf = reportData?.distribuicao_proficiencia;
  const disciplinasAvaliacao = reportData?.disciplinas_avaliacao ?? [];
  const alunosData = reportData?.alunos?.data ?? [];
  const pagination = reportData?.alunos?.pagination;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          INSE x SAEB
        </h1>
        <p className="text-muted-foreground mt-2">
          Relatório socioeconômico (INSE) cruzado com resultados SAEB
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Selecione estado, município, formulário, avaliação e ao menos uma escola para gerar o relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
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
              <label className="text-sm font-medium">Avaliação *</label>
              <Select
                value={selectedAvaliacao}
                onValueChange={setSelectedAvaliacao}
                disabled={isLoadingFilters || selectedState === 'all' || selectedMunicipality === 'all'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingFilters
                        ? 'Carregando...'
                        : avaliacoes.length === 0 && selectedMunicipality !== 'all'
                          ? 'Nenhuma avaliação'
                          : 'Selecione a avaliação'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {avaliacoes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
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
          {isLoadingReport && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-primary">Carregando dados...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reportData && hasMinimumFilters && (
        <>
          {/* Sessão geral: 3 cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Sessão geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Alunos</p>
                      <p className="text-2xl font-bold mt-1">{resumo?.total_alunos_questionario ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-2">Responderam o questionário</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Proficiência Média</p>
                      <p className="text-2xl font-bold mt-1">
                        {resumo?.media_proficiencia_escopo != null
                          ? Number(resumo.media_proficiencia_escopo).toFixed(0)
                          : '—'}
                      </p>
                      {distProf && (() => {
                        const niveis = [
                          { key: 'avancado', label: 'Avançado' },
                          { key: 'adequado', label: 'Adequado' },
                          { key: 'basico', label: 'Básico' },
                          { key: 'abaixo_do_basico', label: 'Abaixo do Básico' },
                        ];
                        const withQtd = niveis.map((n) => ({ ...n, qtd: (distProf as Record<string, number>)[n.key] ?? 0 }));
                        const maior = withQtd.reduce((a, b) => (a.qtd >= b.qtd ? a : b));
                        return (
                          <Badge className="mt-2 bg-yellow-500 text-yellow-900 hover:bg-yellow-500/90">
                            {maior.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">INSE Médio</p>
                      <p className="text-2xl font-bold mt-1">
                        {resumo?.inse_medio != null ? Number(resumo.inse_medio).toFixed(1) : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {Object.values(distInse).reduce<DistribuicaoInseItem | null>(
                          (best, cur) => (!best || (cur.quantidade ?? 0) > (best.quantidade ?? 0) ? cur : best),
                          null
                        )?.label ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Distribuição: 2 cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Distribuição</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição dos Níveis INSE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {INSE_NIVEIS_ORDEM.map((key) => {
                      const item = distInse[key];
                      const qtd = item?.quantidade ?? 0;
                      const pct = item?.porcentagem ?? 0;
                      const label = item?.label ?? `Nível ${key}`;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className={`w-3 h-3 rounded-full flex-shrink-0 ${INSE_CORES[key]?.split(' ')[0] ?? 'bg-muted'}`}
                            />
                            <span className="text-sm font-medium">{`Nível ${key} - ${label}`}</span>
                          </div>
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <span>{qtd}</span>
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição dos Níveis de Proficiência</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { key: 'avancado', label: 'Avançado', qtd: distProf?.avancado ?? 0, pct: distProf?.avancado_porcentagem ?? 0, cor: 'bg-green-800' },
                      { key: 'adequado', label: 'Adequado', qtd: distProf?.adequado ?? 0, pct: distProf?.adequado_porcentagem ?? 0, cor: 'bg-green-600' },
                      { key: 'basico', label: 'Básico', qtd: distProf?.basico ?? 0, pct: distProf?.basico_porcentagem ?? 0, cor: 'bg-yellow-500' },
                      { key: 'abaixo', label: 'Abaixo do Básico', qtd: distProf?.abaixo_do_basico ?? 0, pct: distProf?.abaixo_do_basico_porcentagem ?? 0, cor: 'bg-red-500' },
                    ].map(({ key, label, qtd, pct, cor }) => (
                      <div key={key} className="flex items-center justify-between rounded-lg border p-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cor}`} />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>{qtd}</span>
                          <span>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabela INSE x SAEB */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                INSE x SAEB
              </CardTitle>
              <CardDescription>
                Alunos no escopo dos filtros — {reportData.formTitle} × {reportData.avaliacaoTitulo}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <TableHead className="text-primary-foreground font-medium w-12">#</TableHead>
                      <TableHead className="text-primary-foreground font-medium">Aluno</TableHead>
                      {disciplinasAvaliacao.map((d) => (
                        <TableHead key={d.id} className="text-primary-foreground font-medium">
                          Proficiência {d.nome}
                        </TableHead>
                      ))}
                      <TableHead className="text-primary-foreground font-medium">Proficiência Média</TableHead>
                      <TableHead className="text-primary-foreground font-medium">Nota</TableHead>
                      <TableHead className="text-primary-foreground font-medium">Nível Proficiência</TableHead>
                      <TableHead className="text-primary-foreground font-medium">INSE</TableHead>
                      <TableHead className="text-primary-foreground font-medium">Nível INSE</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-[100px]">Relatório</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunosData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9 + disciplinasAvaliacao.length} className="text-center py-8 text-muted-foreground">
                          Nenhum aluno no escopo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      alunosData.map((aluno, idx) => {
                        const rowNum = pagination ? (pagination.page - 1) * pagination.limit + idx + 1 : idx + 1;
                        const key = `${aluno.nome_completo}-${rowNum}`;
                        const isDownloading = downloadingAluno === key;
                        return (
                          <TableRow key={key}>
                            <TableCell className="font-medium">{rowNum}</TableCell>
                            <TableCell>{aluno.nome_completo}</TableCell>
                            {disciplinasAvaliacao.map((d) => {
                              const disc = aluno.disciplinas?.find((x) => x.id === d.id);
                              return (
                                <TableCell key={d.id}>
                                  {disc != null ? disc.proficiencia : '—'}
                                </TableCell>
                              );
                            })}
                            <TableCell>{aluno.proficiencia_media}</TableCell>
                            <TableCell>{aluno.nota}</TableCell>
                            <TableCell>
                              <Badge className={getProficienciaBadgeClass(aluno.nivel_proficiencia)}>
                                {aluno.nivel_proficiencia}
                              </Badge>
                            </TableCell>
                            <TableCell>{aluno.inse_pontos}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-violet-100 text-violet-900 hover:bg-violet-100">
                                {aluno.inse_nivel_label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => handleExportAlunoPdf(aluno, idx)}
                                disabled={isDownloading}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages} ({pagination.total} no total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || isLoadingReport}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= pagination.totalPages || isLoadingReport}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!hasMinimumFilters && !reportData && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione estado, município, formulário, avaliação e ao menos uma escola para visualizar o relatório.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InseSaebReport;
