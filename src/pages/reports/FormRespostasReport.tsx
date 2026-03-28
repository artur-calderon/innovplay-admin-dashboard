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
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FormResultsFiltersApiService } from '@/services/formResultsFiltersApi';
import { FormMultiSelect } from '@/components/ui/form-multi-select';
import { getCityBranding } from '@/services/cityBrandingApi';

type PdfImageAsset = { dataUrl: string; iw: number; ih: number };

async function urlToPngAsset(url: string): Promise<PdfImageAsset | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bmp.close();
      return null;
    }
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    return { dataUrl: canvas.toDataURL('image/png'), iw: canvas.width, ih: canvas.height };
  } catch {
    return null;
  }
}

/** Logo e timbrado do município (GET /city/:id/branding). */
async function loadFormReportBrandingAssets(cityId: string | null | undefined): Promise<{
  letterhead: PdfImageAsset | null;
  logo: PdfImageAsset | null;
}> {
  if (!cityId || cityId === 'all') return { letterhead: null, logo: null };
  try {
    const branding = await getCityBranding(cityId);
    const lhUrl = branding.presigned?.letterhead_image_url ?? null;
    const logoUrl = branding.presigned?.logo_url ?? null;
    const [letterhead, logo] = await Promise.all([
      lhUrl ? urlToPngAsset(lhUrl) : Promise.resolve(null),
      logoUrl ? urlToPngAsset(logoUrl) : Promise.resolve(null),
    ]);
    return { letterhead, logo };
  } catch {
    return { letterhead: null, logo: null };
  }
}

/** Timbrado como fundo da página (preenche A4, estilo cover). */
function paintLetterheadBackground(
  doc: { addImage: (src: string, fmt: string, x: number, y: number, w: number, h: number) => void },
  letterhead: PdfImageAsset,
  pageWidthMm: number,
  pageHeightMm: number
) {
  const imgRatio = letterhead.iw / letterhead.ih;
  const pageRatio = pageWidthMm / pageHeightMm;
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;
  if (imgRatio > pageRatio) {
    drawH = pageHeightMm;
    drawW = pageHeightMm * imgRatio;
    drawX = (pageWidthMm - drawW) / 2;
    drawY = 0;
  } else {
    drawW = pageWidthMm;
    drawH = pageWidthMm / imgRatio;
    drawX = 0;
    drawY = (pageHeightMm - drawH) / 2;
  }
  doc.addImage(letterhead.dataUrl, 'PNG', drawX, drawY, drawW, drawH);
}

/** Logo centralizado no topo; prefere logo municipal, senão /LOGO-1-menor.png. Retorna o novo Y abaixo do logo. */
async function drawReportHeaderLogo(
  doc: { addImage: (src: string, fmt: string, x: number, y: number, w: number, h: number) => void },
  pageWidthMm: number,
  y: number,
  municipalLogo: PdfImageAsset | null
): Promise<number> {
  const maxW = 50;
  const maxH = 26;
  if (municipalLogo) {
    let lw = maxW;
    let lh = (municipalLogo.ih / municipalLogo.iw) * lw;
    if (lh > maxH) {
      lh = maxH;
      lw = (municipalLogo.iw / municipalLogo.ih) * lh;
    }
    doc.addImage(municipalLogo.dataUrl, 'PNG', (pageWidthMm - lw) / 2, y, lw, lh);
    return y + lh + 10;
  }
  try {
    const logoResponse = await fetch('/LOGO-1-menor.png');
    const logoBlob = await logoResponse.blob();
    const logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(logoBlob);
    });
    const logoWidth = 50;
    const logoHeight = 22;
    doc.addImage(logoDataUrl, 'PNG', (pageWidthMm - logoWidth) / 2, y, logoWidth, logoHeight);
    return y + logoHeight + 10;
  } catch {
    return y;
  }
}

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

interface UserFormSubResponse {
  subQuestionId: string;
  textoSubpergunta: string;
  resposta: string | null;
}

interface UserFormQuestionResponse {
  questionId: string;
  textoPergunta: string;
  tipo: string;
  options?: string[];
  resposta?: string | null;
  subRespostas?: UserFormSubResponse[];
}

interface UserFormResponse {
  formId: string;
  formTitle: string;
  userId: string;
  userName: string;
  serie?: string | null;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  questions: UserFormQuestionResponse[];
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
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(null);
  const [isGeneratingResultsPdf, setIsGeneratingResultsPdf] = useState(false);

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

  const handleDownloadStudentPdf = useCallback(
    async (student: Student) => {
      if (!student.userId) {
        toast({
          title: 'Usuário não identificado',
          description: 'Não foi possível localizar o usuário deste aluno.',
          variant: 'destructive',
        });
        return;
      }

      const formId = reportData?.formId || selectedForm;
      if (!formId) {
        toast({
          title: 'Formulário não identificado',
          description: 'Não foi possível identificar o questionário desta resposta.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setDownloadingUserId(student.userId);

        const requestConfig =
          selectedMunicipality !== 'all'
            ? { meta: { cityId: selectedMunicipality } }
            : {};

        const response = await api.get<UserFormResponse>(
          `/forms/${formId}/responses/user/${student.userId}`,
          requestConfig
        );
        const data = response.data;

        const jsPDFModule = await import('jspdf');
        const jsPDF = (jsPDFModule as any).default || jsPDFModule;
        const autoTableModule = await import('jspdf-autotable');
        const autoTable = (autoTableModule as any).default || autoTableModule;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const branding =
          selectedMunicipality !== 'all'
            ? await loadFormReportBrandingAssets(selectedMunicipality)
            : { letterhead: null, logo: null };

        const paintPageBackground = () => {
          if (branding.letterhead) {
            paintLetterheadBackground(doc, branding.letterhead, pageWidth, pageHeight);
          }
        };

        paintPageBackground();
        let y = margin;
        y = await drawReportHeaderLogo(doc, pageWidth, y, branding.logo);

        // Cores do sistema (primary: 267 84% 65% ≈ #7c3aed)
        const primaryRgb: [number, number, number] = [124, 58, 237];
        const textDark: [number, number, number] = [31, 41, 55];
        const textMuted: [number, number, number] = [107, 114, 128];

        const municipioName =
          municipalities.find((m) => m.id === selectedMunicipality)?.name ||
          selectedMunicipality ||
          '';
        const escolaName = student.escolaNome;
        const serieName = data.serie ?? student.gradeName ?? '';
        const turmaName = student.className || '';
        const formTitle = data.formTitle || reportData?.formTitle || '';
        const alunoName = data.userName || student.alunoNome;

        const centerX = pageWidth / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...textDark);

        if (municipioName) {
          doc.text(`Município: ${municipioName}`, centerX, y, { align: 'center' });
          y += 6;
        }
        doc.text(`Escola: ${escolaName}`, centerX, y, { align: 'center' });
        y += 5;
        doc.text(`Série: ${serieName}`, centerX, y, { align: 'center' });
        y += 5;
        if (formTitle) {
          doc.text(`Formulário: ${formTitle}`, centerX, y, { align: 'center' });
          y += 5;
        }
        if (turmaName) {
          doc.text(`Turma: ${turmaName}`, centerX, y, { align: 'center' });
          y += 5;
        }
        doc.text(`Aluno: ${alunoName}`, centerX, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryRgb);
        doc.text('Respostas do Questionário Socioeconômico', centerX, y, { align: 'center' });
        doc.setTextColor(...textDark);
        y += 8;

        const ensureSpace = (heightNeeded: number) => {
          if (y + heightNeeded > pageHeight - margin) {
            doc.addPage();
            paintPageBackground();
            y = margin;
          }
        };

        data.questions.forEach((question, index) => {
          ensureSpace(25);

          const perguntaTexto = `${index + 1}. ${question.textoPergunta}`;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(perguntaTexto, margin, y);
          y += 6;

          const hasSub = question.subRespostas && question.subRespostas.length > 0;

          if (hasSub) {
            const options = question.options ?? [];
            const subRespostas = question.subRespostas ?? [];
            const head = [['Item', ...options]];
            const body = subRespostas.map((sub) => {
              const row: string[] = [sub.textoSubpergunta];
              options.forEach(() => row.push(''));
              return row;
            });

            const startY = y;
            autoTable(doc as any, {
              startY,
              head,
              body,
              theme: 'grid',
              margin: { left: margin, right: margin },
              styles: {
                fontSize: 9,
                cellPadding: 2,
                halign: 'center',
                valign: 'middle',
              },
              headStyles: {
                fillColor: primaryRgb,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
              },
              columnStyles: {
                0: { halign: 'left' },
              },
              didDrawCell: (cellData: any) => {
                if (cellData.section !== 'body') return;
                const colIndex = cellData.column?.index ?? 0;
                const rowIndex = cellData.row?.index ?? 0;
                if (colIndex < 1 || rowIndex >= subRespostas.length) return;
                const option = options[colIndex - 1];
                const selected = subRespostas[rowIndex]?.resposta === option;
                const cx = cellData.cell.x + cellData.cell.width / 2;
                const cy = cellData.cell.y + cellData.cell.height / 2;
                const r = 2;
                if (selected) {
                  doc.setFillColor(...primaryRgb);
                  doc.circle(cx, cy, r, 'F');
                } else {
                  doc.setDrawColor(...textMuted);
                  doc.setLineWidth(0.3);
                  doc.circle(cx, cy, r, 'S');
                }
              },
            } as any);

            const finalY =
              (doc as any).lastAutoTable?.finalY ??
              (doc as any).previousAutoTable?.finalY ??
              startY + 20;
            y = finalY + 8;
          } else {
            const respostaTexto = question.resposta ?? 'Não respondeu';
            const boxHeight = 12;
            ensureSpace(boxHeight + 6);

            doc.setDrawColor(...primaryRgb);
            doc.setFillColor(243, 232, 255);

            const boxWidth = pageWidth - margin * 2;
            if ((doc as any).roundedRect) {
              (doc as any).roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'FD');
            } else {
              doc.rect(margin, y, boxWidth, boxHeight, 'FD');
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...textDark);
            doc.text(respostaTexto || 'Não respondeu', margin + 4, y + 7);

            y += boxHeight + 8;
          }
        });

        const safeAluno = alunoName.replace(/[\\/:*?"<>|]/g, '_');
        const safeForm = (formTitle || 'questionario').replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `Questionario_socioeconomico_${safeAluno}_${safeForm}.pdf`;

        doc.save(fileName);

        toast({
          title: 'PDF gerado',
          description: 'O PDF com as respostas do aluno foi criado com sucesso.',
        });
      } catch (error) {
        console.error('Erro ao gerar PDF do aluno:', error);
        toast({
          title: 'Erro ao gerar PDF',
          description: 'Não foi possível gerar o PDF das respostas do aluno.',
          variant: 'destructive',
        });
      } finally {
        setDownloadingUserId(null);
      }
    },
    [
      municipalities,
      reportData,
      selectedForm,
      selectedMunicipality,
      toast,
    ]
  );

  const handleDownloadResultsPdf = useCallback(async () => {
    if (!reportData?.questoes?.length) return;

    try {
      setIsGeneratingResultsPdf(true);

      const jsPDFModule = await import('jspdf');
      const jsPDF = (jsPDFModule as any).default || jsPDFModule;
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = (autoTableModule as any).default || autoTableModule;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      const branding =
        selectedMunicipality !== 'all'
          ? await loadFormReportBrandingAssets(selectedMunicipality)
          : { letterhead: null, logo: null };

      const paintPageBackground = () => {
        if (branding.letterhead) {
          paintLetterheadBackground(doc, branding.letterhead, pageWidth, pageHeight);
        }
      };

      paintPageBackground();
      let y = margin;
      y = await drawReportHeaderLogo(doc, pageWidth, y, branding.logo);

      const primaryRgb: [number, number, number] = [124, 58, 237];
      const textDark: [number, number, number] = [31, 41, 55];

      const municipioName =
        municipalities.find((m) => m.id === selectedMunicipality)?.name || selectedMunicipality || '';
      const escolaNames =
        selectedSchools.length === 0
          ? '—'
          : selectedSchools
              .map((id) => schools.find((s) => s.id === id)?.name)
              .filter(Boolean)
              .join(', ') || '—';
      const formTitle = reportData.formTitle || '';
      const serieNames =
        selectedGrades.length === 0
          ? '—'
          : selectedGrades
              .map((id) => grades.find((g) => g.id === id)?.name)
              .filter(Boolean)
              .join(', ') || '—';
      const turmaNames =
        selectedClasses.length === 0
          ? '—'
          : selectedClasses
              .map((id) => classes.find((c) => c.id === id)?.name)
              .filter(Boolean)
              .join(', ') || '—';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textDark);
      if (municipioName) {
        doc.text(`Município: ${municipioName}`, centerX, y, { align: 'center' });
        y += 6;
      }
      doc.text(`Escola(s): ${escolaNames}`, centerX, y, { align: 'center' });
      y += 5;
      doc.text(`Formulário: ${formTitle}`, centerX, y, { align: 'center' });
      y += 5;
      doc.text(`Série(s): ${serieNames}`, centerX, y, { align: 'center' });
      y += 5;
      doc.text(`Turma(s): ${turmaNames}`, centerX, y, { align: 'center' });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(...primaryRgb);
      doc.text('Resultados do Questionário Socioeconômico', centerX, y, { align: 'center' });
      doc.setTextColor(...textDark);
      y += 8;

      if (reportData.totalRespostas != null) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(
          `Total de respostas: ${reportData.totalRespostas}`,
          centerX,
          y,
          { align: 'center' }
        );
        y += 6;
      }

      // Páginas seguintes: uma seção por questão (mesmo estilo da tela)
      const ensureSpace = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - margin) {
          doc.addPage();
          paintPageBackground();
          y = margin;
        }
      };

      reportData.questoes.forEach((q) => {
        ensureSpace(30);

        const titulo = q.textoSubpergunta
          ? `${q.textoPergunta} — ${q.textoSubpergunta}`
          : q.textoPergunta;
        const totalQuestao = q.totalRespostasQuestao ?? 0;
        const pctTotal = (q.porcentagemSobreTotal ?? 0).toFixed(1);
        const contagem = q.contagem && typeof q.contagem === 'object' ? q.contagem : {};

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(titulo, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...textDark);
        doc.text(
          `Total de respostas na pergunta: ${totalQuestao} (${pctTotal}% do total)`,
          margin,
          y
        );
        y += 6;

        const head = [['Opção', 'Frequência Absoluta (N° de alunos)', 'Percentual Relativo (%)']];
        const body = Object.entries(contagem).map(([opcao, count]) => {
          const pct =
            totalQuestao > 0 ? ((Number(count) / totalQuestao) * 100).toFixed(1) : '0.0';
          return [opcao, String(count), `${pct}%`];
        });

        const startY = y;
        autoTable(doc as any, {
          startY,
          head,
          body,
          theme: 'grid',
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 2,
            valign: 'middle',
          },
          headStyles: {
            fillColor: primaryRgb,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center' },
            2: { halign: 'center' },
          },
        } as any);

        const finalY =
          (doc as any).lastAutoTable?.finalY ??
          (doc as any).previousAutoTable?.finalY ??
          startY + 15;
        y = finalY + 10;
      });

      const safeTitle = (formTitle || 'resultados').replace(/[\\/:*?"<>|]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`Resultados_questionario_${safeTitle}_${dateStr}.pdf`);

      toast({
        title: 'PDF gerado',
        description: 'O relatório de resultados foi exportado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF dos resultados:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível exportar o relatório em PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingResultsPdf(false);
    }
  }, [
    reportData,
    municipalities,
    schools,
    grades,
    classes,
    selectedMunicipality,
    selectedSchools,
    selectedGrades,
    selectedClasses,
    toast,
  ]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
          <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
          Resultados Socioeconomicos
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {reportData.totalRespostas != null && (
                <p className="text-muted-foreground">
                  Total de respostas: <strong>{reportData.totalRespostas}</strong>
                  {reportData.formTitle && ` — ${reportData.formTitle}`}
                </p>
              )}
            </div>
            <Button
              onClick={handleDownloadResultsPdf}
              disabled={isGeneratingResultsPdf}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isGeneratingResultsPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar resultados em PDF
                </>
              )}
            </Button>
          </div>
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
                      <div className="ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadStudentPdf(student)}
                          disabled={downloadingUserId === student.userId}
                        >
                          {downloadingUserId === student.userId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Gerando PDF...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              Baixar PDF
                            </>
                          )}
                        </Button>
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
