import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Filter, Loader2, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { DashboardApiService } from '@/services/dashboardApi';
import { FormFiltersApiService } from '@/services/formFiltersApi';
import {
  getListaFrequencia,
  getListaFrequenciaPorAvaliacao,
} from '@/services/listaFrequenciaApi';
import type {
  ListaFrequenciaResponse,
  Cabecalho,
  Estudante,
} from '@/types/lista-frequencia';

const STATUS_ORDER = ['P', 'A', 'T', 'NE', 'SE', 'SS', 'I'];

function formatLegenda(legenda: Cabecalho['legenda']): string {
  return Object.entries(legenda)
    .map(([cod, desc]) => `${cod} = ${desc}`)
    .join('; ');
}

/**
 * SÉRIE e TURMA para exibição.
 * Backend envia serie (Grade.name) e turma (removendo série do nome da turma, ou última palavra quando fizer sentido).
 * Fallback no frontend replica a mesma lógica quando turma não vier preenchida.
 */
function getSerieTurmaDisplay(cab: Cabecalho): { serie: string; turma: string } {
  const s = cab.serie?.trim() ?? '';
  const t = cab.turma?.trim() ?? '';
  const st = cab.serie_turma?.trim() ?? '';

  /** Turma removendo a série do início do nome (mesmo nº de caracteres da série em maiúsculas). */
  const turmaRemovendoSerie = (): string => {
    if (!s || !st) return '';
    const serieLen = s.toUpperCase().length;
    let rest = st.slice(serieLen);
    rest = rest.replace(/^[\s\-–—]+/, '').trim();
    return rest;
  };

  /** Última palavra como turma só quando fizer sentido: >2 palavras ou 2 palavras com última de 1 caractere. */
  const turmaUltimaPalavra = (): string => {
    if (!st) return '';
    const parts = st.split(/\s+/).filter(Boolean);
    if (parts.length > 2) return parts[parts.length - 1] ?? '';
    if (parts.length === 2 && parts[1]?.length === 1) return parts[1];
    return '';
  };

  if (s && t) return { serie: s, turma: t };
  if (t) return { serie: st || s || '—', turma: t };

  if (s) {
    const derived = turmaRemovendoSerie() || turmaUltimaPalavra();
    return { serie: s, turma: derived || '—' };
  }

  if (st) {
    const dashSplit = st.split(/\s*-\s*/);
    if (dashSplit.length >= 2) return { serie: dashSplit[0].trim(), turma: dashSplit[1].trim() };
    const derived = turmaUltimaPalavra();
    if (derived) {
      const parts = st.split(/\s+/).filter(Boolean);
      const serieFromSt = parts.length > 1 ? parts.slice(0, -1).join(' ') : st;
      return { serie: serieFromSt || st, turma: derived };
    }
    return { serie: st, turma: '—' };
  }

  return { serie: '—', turma: '—' };
}

export default function ListaFrequencia() {
  const { toast } = useToast();
  const [estados, setEstados] = useState<{ id: string; name: string }[]>([]);
  const [municipios, setMunicipios] = useState<{ id: string; name: string }[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [series, setSeries] = useState<{ id: string; name: string }[]>([]);
  const [turmas, setTurmas] = useState<{ id: string; name: string }[]>([]);

  const [selectedEstado, setSelectedEstado] = useState('all');
  const [selectedMunicipio, setSelectedMunicipio] = useState('all');
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [selectedSerie, setSelectedSerie] = useState('all');
  const [selectedTurma, setSelectedTurma] = useState('all');

  const [isLoadingEstados, setIsLoadingEstados] = useState(false);
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isLoadingLista, setIsLoadingLista] = useState(false);

  const [data, setData] = useState<ListaFrequenciaResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [modoLista, setModoLista] = useState<'turma' | 'avaliacao'>('turma');
  const [avaliacoes, setAvaliacoes] = useState<{ id: string; titulo: string }[]>([]);
  const [selectedAvaliacaoId, setSelectedAvaliacaoId] = useState('all');
  const [isLoadingAvaliacoes, setIsLoadingAvaliacoes] = useState(false);
  /** Só exibir ausência (A) quando a prova já tiver expirado. Por turma = null (não aplicável). */
  const [provaExpirada, setProvaExpirada] = useState<boolean | null>(null);

  // Carregar estados
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingEstados(true);
      try {
        const list = await FormFiltersApiService.getFormFilterStates();
        if (!cancelled) {
          setEstados(list.map((e) => ({ id: e.id, name: e.nome })));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          toast({ title: 'Erro', description: 'Não foi possível carregar os estados.', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setIsLoadingEstados(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Limpar dependentes ao mudar estado
  useEffect(() => {
    if (!selectedEstado || selectedEstado === 'all') {
      setMunicipios([]);
      setSelectedMunicipio('all');
      setSchools([]);
      setSelectedSchool('all');
      setSeries([]);
      setSelectedSerie('all');
      setTurmas([]);
      setSelectedTurma('all');
      return;
    }
    let cancelled = false;
    setIsLoadingMunicipios(true);
    FormFiltersApiService.getFormFilterMunicipalities(selectedEstado)
      .then((list) => {
        if (!cancelled) {
          setMunicipios(list.map((m) => ({ id: m.id, name: m.nome })));
          setSelectedMunicipio('all');
          setSchools([]);
          setSelectedSchool('all');
          setSeries([]);
          setSelectedSerie('all');
          setTurmas([]);
          setSelectedTurma('all');
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setMunicipios([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMunicipios(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEstado]);

  // Carregar escolas ao mudar município
  useEffect(() => {
    if (!selectedMunicipio || selectedMunicipio === 'all' || !selectedEstado || selectedEstado === 'all') {
      setSchools([]);
      setSelectedSchool('all');
      setSeries([]);
      setSelectedSerie('all');
      setTurmas([]);
      setSelectedTurma('all');
      return;
    }
    let cancelled = false;
    setIsLoadingSchools(true);
    FormFiltersApiService.getFormFilterSchools({
      estado: selectedEstado,
      municipio: selectedMunicipio,
    })
      .then((list) => {
        if (!cancelled) {
          setSchools(list.map((s) => ({ id: s.id, name: s.nome })));
          setSelectedSchool('all');
          setSeries([]);
          setSelectedSerie('all');
          setTurmas([]);
          setSelectedTurma('all');
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setSchools([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSchools(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMunicipio, selectedEstado]);

  // Carregar séries ao mudar escola
  useEffect(() => {
    if (!selectedSchool || selectedSchool === 'all' || !selectedMunicipio || selectedMunicipio === 'all' || !selectedEstado || selectedEstado === 'all') {
      setSeries([]);
      setSelectedSerie('all');
      setTurmas([]);
      setSelectedTurma('all');
      return;
    }
    let cancelled = false;
    setIsLoadingSeries(true);
    FormFiltersApiService.getFormFilterGrades({
      estado: selectedEstado,
      municipio: selectedMunicipio,
      escola: selectedSchool,
    })
      .then((list) => {
        if (!cancelled) {
          setSeries(list.map((s) => ({ id: s.id, name: s.nome })));
          setSelectedSerie('all');
          setTurmas([]);
          setSelectedTurma('all');
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setSeries([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSeries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSchool, selectedMunicipio, selectedEstado]);

  // Carregar turmas ao mudar série
  useEffect(() => {
    if (!selectedSerie || selectedSerie === 'all' || !selectedSchool || selectedSchool === 'all' || !selectedMunicipio || selectedMunicipio === 'all' || !selectedEstado || selectedEstado === 'all') {
      setTurmas([]);
      setSelectedTurma('all');
      return;
    }
    let cancelled = false;
    setIsLoadingTurmas(true);
    FormFiltersApiService.getFormFilterClasses({
      estado: selectedEstado,
      municipio: selectedMunicipio,
      escola: selectedSchool,
      serie: selectedSerie,
    })
      .then((list) => {
        if (!cancelled) {
          setTurmas(list.map((t) => ({ id: t.id, name: t.nome })));
          const stillExists = selectedTurma === 'all' || list.some((t) => t.id === selectedTurma);
          if (!stillExists) setSelectedTurma('all');
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setTurmas([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTurmas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSerie, selectedSchool, selectedMunicipio, selectedEstado]);

  useEffect(() => {
    if (modoLista !== 'avaliacao') return;
    // Só carrega avaliações após selecionar escola e série
    if (!selectedSchool || selectedSchool === 'all' || !selectedSerie || selectedSerie === 'all') {
      setAvaliacoes([]);
      setSelectedAvaliacaoId('all');
      return;
    }
    let cancelled = false;
    setIsLoadingAvaliacoes(true);
    DashboardApiService.getAvaliacoesRecentes(50)
      .then((data) => {
        if (cancelled || !data?.avaliacoes) return;
        // Filtra avaliações por escola/série se possível (aqui carregamos todas; idealmente o backend filtraria)
        setAvaliacoes(
          data.avaliacoes.map((a) => ({ id: a.avaliacao_id, titulo: a.titulo || a.avaliacao_id }))
        );
      })
      .catch(() => {
        if (!cancelled) setAvaliacoes([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAvaliacoes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modoLista, selectedSchool, selectedSerie]);

  // Quando a lista é por avaliação, verificar se a prova já expirou (para exibir ou não ausência)
  useEffect(() => {
    if (modoLista !== 'avaliacao') {
      setProvaExpirada(null);
      return;
    }
    if (!data?.length || !selectedAvaliacaoId || selectedAvaliacaoId === 'all') {
      setProvaExpirada(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ application_info?: { expiration?: string }; prova_expirada?: boolean }>(`/test/${selectedAvaliacaoId}`);
        if (cancelled) return;
        const exp = res.data?.application_info?.expiration;
        if (typeof res.data?.prova_expirada === 'boolean') {
          setProvaExpirada(res.data.prova_expirada);
          return;
        }
        if (exp) {
          setProvaExpirada(new Date(exp).getTime() < Date.now());
          return;
        }
        setProvaExpirada(true); // sem informação: considerar expirada para manter comportamento atual
      } catch {
        if (!cancelled) setProvaExpirada(true);
      }
    })();
    return () => { cancelled = true; };
  }, [modoLista, data, selectedAvaliacaoId]);

  const handleGerarLista = async () => {
    setError(null);
    setIsLoadingLista(true);
    try {
      if (modoLista === 'avaliacao') {
        if (!selectedAvaliacaoId || selectedAvaliacaoId === 'all') {
          setError('Selecione a avaliação.');
          toast({ title: 'Aviso', description: 'Selecione a avaliação.', variant: 'destructive' });
          return;
        }
        const classId =
          selectedTurma && selectedTurma !== 'all' ? selectedTurma : undefined;
        const res = await getListaFrequenciaPorAvaliacao(selectedAvaliacaoId, classId);
        const list = (res.estudantes?.length ?? 0) > 0 ? [res] : [];
        setData(list.length ? list : null);
        if (list.length === 0) {
          toast({ title: 'Aviso', description: 'Esta turma/avaliação não possui alunos na lista.', variant: 'destructive' });
        }
      } else {
        if (!selectedSchool || selectedSchool === 'all') {
          setError('Selecione a escola.');
          return;
        }
        let classIds: { id: string }[] = [];
        if (selectedTurma && selectedTurma !== 'all') {
          classIds = [{ id: selectedTurma }];
        } else if (selectedSerie && selectedSerie !== 'all' && turmas.length > 0) {
          classIds = turmas.map((t) => ({ id: t.id }));
        } else {
          const res = await api.get<{ id: string; name?: string }[]>(`/classes/school/${selectedSchool}`);
          const list = Array.isArray(res.data) ? res.data : [];
          classIds = list.map((c) => ({ id: c.id }));
        }
        if (classIds.length === 0) {
          setError('Nenhuma turma encontrada.');
          setData(null);
          toast({ title: 'Aviso', description: 'Nenhuma turma encontrada para os filtros selecionados.', variant: 'destructive' });
          return;
        }
        const results = await Promise.all(
          classIds.map((c) => getListaFrequencia(c.id, 'avaliacao'))
        );
        const comAlunos = results.filter((item) => (item.estudantes?.length ?? 0) > 0);
        const omitidas = results.length - comAlunos.length;
        setData(comAlunos.length > 0 ? comAlunos : null);
        if (omitidas > 0) {
          toast({
            title: 'Turmas sem alunos omitidas',
            description: `${omitidas} ${omitidas === 1 ? 'turma não tem' : 'turmas não têm'} alunos e ${omitidas === 1 ? 'foi omitida' : 'foram omitidas'} da lista.`,
          });
        }
        if (comAlunos.length === 0 && results.length > 0) {
          setError('Nenhuma das turmas selecionadas possui alunos.');
          toast({ title: 'Aviso', description: 'Nenhuma das turmas possui alunos na lista.', variant: 'destructive' });
        }
      }
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { erro?: string } } };
      const msg =
        ax.response?.data?.erro ||
        (ax.response?.status === 404 ? (modoLista === 'avaliacao' ? 'Avaliação ou turma não encontrada.' : 'Turma não encontrada') : 'Não foi possível carregar a lista de frequência.') ||
        (ax.response?.status === 400 ? 'Informe a turma (class_id) quando a avaliação tiver várias turmas.' : 'Não foi possível carregar a lista de frequência.');
      setError(msg);
      setData(null);
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setIsLoadingLista(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!data || data.length === 0) return;
    setIsGeneratingPDF(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const textBlack: [number, number, number] = [0, 0, 0];
      const textGray: [number, number, number] = [80, 80, 80];
      const pink: [number, number, number] = [236, 72, 153];
      const pinkLight: [number, number, number] = [251, 207, 232];
      const contentWidth = pageWidth - 2 * margin;

      data.forEach((item, sectionIndex) => {
        if (sectionIndex > 0) doc.addPage();
        let y = margin;

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setTextColor(...textBlack);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...pink);
        doc.text(item.cabecalho.nome_prova_ano, pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textBlack);
        doc.text(item.cabecalho.lista_presenca_curso, pageWidth / 2, y, { align: 'center' });
        y += 8;

        const cab = item.cabecalho;
        const { serie: serieDisplay, turma: turmaDisplay } = getSerieTurmaDisplay(cab);
        doc.setFontSize(9);
        const escolaLines = doc.splitTextToSize(`NOME DA ESCOLA*: ${cab.nome_escola}`, contentWidth - 8);
        const boxHeight = 8 + 5 + 5 + escolaLines.length * 4.5 + 5 + 5 + 5 + 6 + 4;
        doc.setDrawColor(...pink);
        doc.setLineWidth(0.4);
        doc.rect(margin, y, contentWidth, boxHeight, 'S');
        doc.setDrawColor(180, 180, 180);
        let boxY = y + 6;
        doc.text(`MUNICÍPIO/UF: ${cab.municipio_uf}`, pageWidth / 2, boxY, { align: 'center' });
        boxY += 5;
        doc.text(escolaLines, pageWidth / 2, boxY, { align: 'center' });
        boxY += escolaLines.length * 4.5;
        doc.text(`SÉRIE: ${serieDisplay}`, pageWidth / 2, boxY, { align: 'center' });
        boxY += 5;
        doc.text(`TURMA: ${turmaDisplay}`, pageWidth / 2, boxY, { align: 'center' });
        boxY += 5;
        const disciplinaVal = cab.disciplina?.trim() ?? '';
        doc.text(disciplinaVal ? `DISCIPLINA: ${disciplinaVal}` : 'DISCIPLINA: ', pageWidth / 2, boxY, { align: 'center' });
        if (!disciplinaVal) {
          const lineX0 = pageWidth / 2 - 25;
          doc.setDrawColor(120, 120, 120);
          doc.line(lineX0, boxY + 1.5, lineX0 + 50, boxY + 1.5);
        }
        y = boxY + 8;

        doc.setFontSize(8);
        doc.setTextColor(...textGray);
        const legendaStr = `Legenda: ${formatLegenda(cab.legenda)}`;
        const legendaLines = doc.splitTextToSize(legendaStr, contentWidth);
        legendaLines.forEach((line: string) => {
          doc.text(line, pageWidth / 2, y, { align: 'center' });
          y += 4;
        });
        y += 4;
        doc.setFont('helvetica', 'italic');
        const instLines = doc.splitTextToSize(cab.instrucoes_aplicador, contentWidth);
        instLines.forEach((line: string) => {
          doc.text(line, pageWidth / 2, y, { align: 'center' });
          y += 4;
        });
        y += 6;

        const codigos = STATUS_ORDER.filter((c) => c in (cab.legenda || {}));
        const tableHead = [['N°', 'NOME DO ESTUDANTE', ...codigos, 'ASSINATURA']];
        const tableBody = item.estudantes.map((est) => {
          const statusPlaceholders = codigos.map(() => '');
          return [`${est.numero}.`, est.nome_estudante, ...statusPlaceholders, ''];
        });

        const statusColStart = 2;
        const statusColEnd = 2 + codigos.length;
        autoTable(doc, {
          startY: y,
          head: tableHead,
          body: tableBody,
          theme: 'grid',
          margin: { left: margin, right: margin },
          tableWidth: 'auto',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            textColor: textBlack,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: pinkLight,
            textColor: pink,
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 10 },
            1: {
              cellWidth: Math.max(40, contentWidth - 10 - 8 * codigos.length - 35 - 4),
              overflow: 'linebreak',
            },
            ...Object.fromEntries(codigos.map((_, i) => [i + statusColStart, { cellWidth: 8, halign: 'center' }])),
            [statusColEnd]: { cellWidth: 35 },
          },
          didDrawCell: (data) => {
            if (data.section !== 'body' || data.column.index < statusColStart || data.column.index >= statusColEnd)
              return;
            const colIdx = data.column.index - statusColStart;
            const cod = codigos[colIdx];
            const est = item.estudantes[data.row.index];
            const isAusente = cod === 'A';
            const mostrarPreenchido =
              est &&
              est.status === cod &&
              (!isAusente || provaExpirada === true);
            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            const r = 2;
            if (mostrarPreenchido) {
              data.doc.setFillColor(...pink);
              data.doc.circle(cx, cy, r, 'F');
              data.doc.setDrawColor(...pink);
              data.doc.circle(cx, cy, r, 'S');
            } else {
              data.doc.setDrawColor(180, 180, 180);
              data.doc.circle(cx, cy, r, 'S');
            }
          },
        });
        y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...textBlack);
        doc.text('CPF DO(A) APLICADOR(A)', margin, y);
        const boxW = 4;
        const boxH = 5;
        const cpfBoxY = y + 2;
        for (let i = 0; i < 11; i++) {
          doc.rect(margin + i * (boxW + 1), cpfBoxY, boxW, boxH, 'S');
        }
        doc.text('DATA: ___/___/_______', pageWidth - margin - 45, y);
        y = cpfBoxY + boxH + 10;
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(margin, y, pageWidth - margin, y);
        doc.setLineDashPattern([], 0);
        y += 5;
        doc.text('ASSINATURA DO(A) APLICADOR(A)', pageWidth / 2, y, { align: 'center' });
      });

      const fileName = `lista-frequencia-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF gerado', description: `Arquivo ${fileName} salvo.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar PDF', description: 'Não foi possível gerar o arquivo.', variant: 'destructive' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const codigosStatus =
    data && data.length > 0
      ? STATUS_ORDER.filter((c) => c in (data[0].cabecalho.legenda || {}))
      : STATUS_ORDER;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Lista de Frequência
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere listas por turma (status vazios) ou por avaliação já aplicada (P/A conforme sessões).
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Modo</label>
              <Select value={modoLista} onValueChange={(v) => setModoLista(v as 'turma' | 'avaliacao')}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="turma">Por turma (Estado → Escola → Série → Turma)</SelectItem>
                  <SelectItem value="avaliacao">Por avaliação aplicada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modoLista === 'avaliacao' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Avaliação</label>
                <Select
                  value={selectedAvaliacaoId}
                  onValueChange={setSelectedAvaliacaoId}
                  disabled={
                    isLoadingAvaliacoes ||
                    !selectedSchool ||
                    selectedSchool === 'all' ||
                    !selectedSerie ||
                    selectedSerie === 'all'
                  }
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue
                      placeholder={
                        !selectedSchool || selectedSchool === 'all'
                          ? 'Selecione a escola primeiro'
                          : !selectedSerie || selectedSerie === 'all'
                          ? 'Selecione a série primeiro'
                          : 'Selecione a avaliação'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Selecione a avaliação</SelectItem>
                    {avaliacoes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estado</label>
              <Select
                value={selectedEstado}
                onValueChange={setSelectedEstado}
                disabled={isLoadingEstados}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Município</label>
              <Select
                value={selectedMunicipio}
                onValueChange={setSelectedMunicipio}
                disabled={!selectedEstado || selectedEstado === 'all' || isLoadingMunicipios}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o município" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Escola</label>
              <Select
                value={selectedSchool}
                onValueChange={setSelectedSchool}
                disabled={!selectedMunicipio || selectedMunicipio === 'all' || isLoadingSchools}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Série</label>
              <Select
                value={selectedSerie}
                onValueChange={setSelectedSerie}
                disabled={!selectedSchool || selectedSchool === 'all' || isLoadingSeries}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {series.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Turma</label>
              <Select
                value={selectedTurma}
                onValueChange={setSelectedTurma}
                disabled={!selectedSerie || selectedSerie === 'all' || isLoadingTurmas}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button
              onClick={handleGerarLista}
              disabled={
                isLoadingLista ||
                (modoLista === 'avaliacao'
                  ? !selectedAvaliacaoId || selectedAvaliacaoId === 'all'
                  : !selectedSchool || selectedSchool === 'all')
              }
            >
              {isLoadingLista ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                'Gerar lista'
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {modoLista === 'turma'
              ? 'Hierarquia: Estado → Município → Escola → Série → Turma. Selecione a escola para gerar por turma, por série ou pela escola inteira.'
              : 'Selecione Escola e Série primeiro, depois escolha a Avaliação. Se houver várias turmas, escolha a turma específica.'}
          </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="no-print">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

{data && data.length > 0 && (
        <div className="space-y-3">
          <div className="no-print flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="gap-2"
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {isGeneratingPDF ? 'Gerando PDF...' : 'Imprimir / Gerar PDF'}
            </Button>
          </div>
          <div id="lista-frequencia-print" className="rounded-lg overflow-hidden bg-card text-card-foreground border border-border shadow-lg">
          <div className="p-6">
            {data.map((item, sectionIndex) => (
              <div
                key={sectionIndex}
                className={`lista-frequencia-turma-section ${sectionIndex > 0 ? 'mt-8' : ''}`}
              >
                {/* Cabeçalho */}
                <header className="mb-6 text-center">
                  <h2 className="text-lg font-semibold text-foreground">{item.cabecalho.nome_prova_ano}</h2>
                  <p className="text-sm mt-1 text-muted-foreground">{item.cabecalho.lista_presenca_curso}</p>
                  <div className="mx-auto mt-4 max-w-4xl rounded border-2 border-pink-500/70 dark:border-pink-500/70 bg-muted/80 dark:bg-muted/50 p-4 text-center">
                    <div className="space-y-1 text-sm text-foreground">
                      <p>MUNICÍPIO/UF: {item.cabecalho.municipio_uf}</p>
                      <p>NOME DA ESCOLA*: {item.cabecalho.nome_escola}</p>
                      <p>SÉRIE: {getSerieTurmaDisplay(item.cabecalho).serie}</p>
                      <p>TURMA: {getSerieTurmaDisplay(item.cabecalho).turma}</p>
                      <p className="flex items-baseline justify-center gap-1">
                        DISCIPLINA:{' '}
                        {item.cabecalho.disciplina?.trim() ? (
                          item.cabecalho.disciplina
                        ) : (
                          <span className="inline-block min-w-[200px] border-b border-border" aria-hidden />
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Legenda: {formatLegenda(item.cabecalho.legenda)}
                  </p>
                  <p className="mt-2 text-center text-xs italic text-muted-foreground">
                    {item.cabecalho.instrucoes_aplicador}
                  </p>
                </header>

                {/* Tabela */}
                <div className="lista-frequencia-table-wrap overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-pink-600 dark:bg-pink-600/90 text-white">
                        <th className="border border-pink-500/70 dark:border-pink-500/70 px-2 py-2 text-left font-medium">
                          N°
                        </th>
                        <th className="border border-pink-500/70 dark:border-pink-500/70 px-2 py-2 text-left font-medium">
                          NOME DO ESTUDANTE
                        </th>
                        {codigosStatus.map((cod) => (
                          <th
                            key={cod}
                            className="w-10 border border-pink-500/70 dark:border-pink-500/70 px-1 py-2 text-center font-medium"
                          >
                            {cod}
                          </th>
                        ))}
                        <th className="min-w-[120px] border border-pink-500/70 dark:border-pink-500/70 px-2 py-2 text-left font-medium">
                          ASSINATURA DO ESTUDANTE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.estudantes.map((est: Estudante, idx: number) => (
                        <tr
                          key={`${sectionIndex}-${est.numero}-${idx}`}
                          className={idx % 2 === 0 ? 'bg-muted/50 dark:bg-muted/40' : 'bg-background dark:bg-muted/20'}
                        >
                          <td className="border border-border px-2 py-1.5 text-foreground">
                            {est.numero}.
                          </td>
                          <td className="border border-border px-2 py-1.5 text-foreground">
                            {est.nome_estudante}
                          </td>
                          {codigosStatus.map((cod) => {
                            const isAusente = cod === 'A';
                            const mostrarPreenchido =
                              est.status === cod &&
                              (!isAusente || provaExpirada === true);
                            return (
                              <td
                                key={cod}
                                className="border border-border px-1 py-1.5 text-center"
                              >
                                <span
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-pink-500/80 dark:border-pink-400/80 bg-transparent"
                                  style={{
                                    backgroundColor: mostrarPreenchido
                                      ? 'rgba(236,72,153,0.6)'
                                      : 'transparent',
                                  }}
                                />
                              </td>
                            );
                          })}
                          <td className="border border-border px-2 py-1.5" />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé por turma */}
                <footer className="mt-8 border-t border-border pt-6 text-center">
                  <div className="flex flex-wrap items-start justify-center gap-6">
                    <div>
                      <p className="mb-2 text-xs font-medium text-foreground">CPF DO(A) APLICADOR(A)</p>
                      <div className="flex gap-1 justify-center">
                        {Array.from({ length: 11 }).map((_, i) => (
                          <span
                            key={i}
                            className="h-8 w-6 border border-border bg-transparent"
                            aria-hidden
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">DATA: ___/___/_______</p>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="border-b border-dashed border-border pb-1 mx-auto max-w-xs" />
                    <p className="mt-1 text-xs text-muted-foreground">ASSINATURA DO(A) APLICADOR(A)</p>
                  </div>
                </footer>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
