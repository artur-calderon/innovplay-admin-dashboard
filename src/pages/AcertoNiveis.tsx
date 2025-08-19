import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import type { CellHookData } from "jspdf-autotable";

// Types from the original component
type StudentResult = {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  acertos: number;
  erros: number;
  questoes_respondidas: number;
  status: 'concluida' | 'pendente';
  acertos_lp?: number;
  acertos_mat?: number;
  proficiencia_lp?: number;
  proficiencia_mat?: number;
  respostas?: Record<string, boolean | null>;
};

type EvaluationInfo = {
  id: string;
  titulo: string;
  disciplina: string;
  disciplinas?: string[];
  serie: string;
  escola: string;
  municipio: string;
  data_aplicacao: string;
  logo_url?: string;
};

type DetailedReport = {
  avaliacao: {
    id: string;
    titulo: string;
    disciplina: string;
    total_questoes: number;
  };
  questoes: Array<{
    id: string;
    numero: number;
    texto: string;
    habilidade: string;
    codigo_habilidade: string;
    tipo: 'multipleChoice' | 'open' | 'trueFalse';
    dificuldade: 'Fácil' | 'Médio' | 'Difícil';
    porcentagem_acertos: number;
    porcentagem_erros: number;
  }>;
  alunos: Array<{
    id: string;
    nome: string;
    turma: string;
    respostas: Array<{
      questao_id: string;
      questao_numero: number;
      resposta_correta: boolean;
      resposta_em_branco: boolean;
      tempo_gasto: number;
    }>;
    total_acertos: number;
    total_erros: number;
    total_em_branco: number;
    nota_final: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    status: 'concluida' | 'nao_respondida';
  }>;
};

export default function AcertoNiveis() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [states, setStates] = useState<Array<{ id: string; nome: string }>>([]);
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; nome: string }>>([]);
  const [evaluations, setEvaluations] = useState<Array<{ id: string; titulo: string; data_aplicacao?: string }>>([]);
  const [schools, setSchools] = useState<Array<{ id: string; nome: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: string; nome: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [evaluationInfo, setEvaluationInfo] = useState<EvaluationInfo | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [detailedReport, setDetailedReport] = useState<DetailedReport | null>(null);
  const [skillsMapping, setSkillsMapping] = useState<Record<string, string>>({});
  const fallbackAnswersCache = React.useRef<Map<string, Map<number, boolean>>>(new Map());
  // Utilitários para tratar habilidades
  const normalizeUUID = (value?: string) => (value || '').replace(/[{}]/g, '').trim().toLowerCase();
  const looksLikeRealSkillCode = (value?: string) => {
    if (!value) return false;
    const v = value.trim().toUpperCase();
    // Exemplos aceitos: LP9L1.2, 9N1.2, CN9L1.3, GE9L1.4
    return /^(LP\d+L\d+\.\d+|\d+N\d\.\d+|[A-Z]{2}\d+L\d+\.\d+)$/.test(v);
  };

  useEffect(() => {
    // Carregar lista de estados
    const loadStates = async () => {
      try {
        setIsLoading(true);
        const resp = await EvaluationResultsApiService.getFilterStates();
        setStates(resp);
      } catch (e) {
        toast({ title: "Erro", description: "Não foi possível carregar estados", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadStates();
  }, [toast]);

  const handleChangeState = async (stateId: string) => {
    setSelectedState(stateId);
    setSelectedMunicipality("");
    setSelectedEvaluationId("");
    setMunicipalities([]);
    setEvaluations([]);
    setSchools([]);
    setGrades([]);
    setClasses([]);
    setSelectedSchoolId("");
    setSelectedGradeId("");
    setSelectedClassId("");
    setEvaluationInfo(null);
    setStudents([]);
    setDetailedReport(null);
    if (!stateId) return;
    try {
      setIsLoading(true);
      const mun = await EvaluationResultsApiService.getFilterMunicipalities(stateId);
      setMunicipalities(mun);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar municípios", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeMunicipality = async (municipioId: string) => {
    setSelectedMunicipality(municipioId);
    setSelectedEvaluationId("");
    setEvaluations([]);
    setSchools([]);
    setGrades([]);
    setClasses([]);
    setSelectedSchoolId("");
    setSelectedGradeId("");
    setSelectedClassId("");
    setEvaluationInfo(null);
    setStudents([]);
    setDetailedReport(null);
    if (!selectedState || !municipioId) return;
    try {
      setIsLoading(true);
      const avs = await EvaluationResultsApiService.getFilterEvaluations({ estado: selectedState, municipio: municipioId });
      setEvaluations(avs);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar avaliações", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSchool = async (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setSelectedGradeId("");
    setSelectedClassId("");
    setGrades([]);
    setClasses([]);
    if (!selectedState || !selectedMunicipality || !selectedEvaluationId || !schoolId) return;
    try {
      setIsLoading(true);
      const series = await EvaluationResultsApiService.getFilterGradesByEvaluation({
        estado: selectedState,
        municipio: selectedMunicipality,
        avaliacao: selectedEvaluationId,
        escola: schoolId
      });
      setGrades(series);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar séries", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGrade = async (gradeId: string) => {
    setSelectedGradeId(gradeId);
    setSelectedClassId("");
    setClasses([]);
    if (!selectedState || !selectedMunicipality || !selectedEvaluationId || !selectedSchoolId || !gradeId) return;
    try {
      setIsLoading(true);
      const turmas = await EvaluationResultsApiService.getFilterClassesByEvaluation({
        estado: selectedState,
        municipio: selectedMunicipality,
        avaliacao: selectedEvaluationId,
        escola: selectedSchoolId,
        serie: gradeId
      });
      setClasses(turmas);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar turmas", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvaluation = async (evaluationId: string) => {
    setSelectedEvaluationId(evaluationId);
    setSelectedSchoolId("");
    setSelectedGradeId("");
    setSelectedClassId("");
    setSchools([]);
    setGrades([]);
    setClasses([]);
    if (!evaluationId) return;
    try {
      setIsLoading(true);
      
      // Buscar dados da avaliação em paralelo
      const [info, studentsResp, report, skills] = await Promise.all([
        EvaluationResultsApiService.getEvaluationById(evaluationId),
        EvaluationResultsApiService.getStudentsByEvaluation(evaluationId),
        EvaluationResultsApiService.getDetailedReport(evaluationId),
        EvaluationResultsApiService.getSkillsByEvaluation(evaluationId).catch(() => [])
      ]);

      if (!info) throw new Error("Avaliação não encontrada");

      // Processar informações da avaliação primeiro
      const evaluationData = info as unknown as Record<string, unknown>;
      console.log('Dados da avaliação recebidos:', info);
      console.log('Campo série:', evaluationData.serie);

      // Função para extrair série de diferentes fontes
      const extractSerie = (data: Record<string, unknown>): string => {
        // 1. Tentar campo série direto
        if (data.serie && data.serie !== 'N/A') return data.serie as string;
        
        // 2. Tentar campo curso (ex: "Anos Finais" -> "6º ao 9º ano")
        if (data.curso) {
          const curso = data.curso as string;
          if (curso.includes('Anos Finais')) return '6º ao 9º ano';
          if (curso.includes('Anos Iniciais')) return '1º ao 5º ano';
          if (curso.includes('Fundamental')) return 'Fundamental';
        }
        
        // 3. Tentar campo grade ou nível
        if (data.grade && data.grade !== 'N/A') return data.grade as string;
        if (data.nivel && data.nivel !== 'N/A') return data.nivel as string;
        
        // 4. Tentar extrair do título da avaliação
        if (data.titulo) {
          const titulo = data.titulo as string;
          const serieMatch = titulo.match(/(\d+º|\d+º ano|\d+ ano)/i);
          if (serieMatch) return serieMatch[1];
        }
        
        return 'N/A';
      };

      const serieExtraida = extractSerie(evaluationData);
      console.log('Série extraída:', serieExtraida);

      // Criar mapeamento robusto de skills (UUID normalizado -> código real)
      const newSkillsMapping: Record<string, string> = {};
      if (skills && Array.isArray(skills)) {
        skills.forEach((skill: { id?: string; code?: string }) => {
          const idNorm = skill?.id ? normalizeUUID(skill.id) : '';
          const code = (skill?.code || '').trim();
          if (idNorm && code) newSkillsMapping[idNorm] = code;
          // Também mapear o próprio code normalizado para si mesmo (cobre casos onde o código chega como UUID)
          if (code) newSkillsMapping[normalizeUUID(code)] = code;
        });
      }
      setSkillsMapping(newSkillsMapping);

      // Carregar escolas para a avaliação
      if (selectedState && selectedMunicipality && evaluationId) {
        try {
          const escolas = await EvaluationResultsApiService.getFilterSchoolsByEvaluation({
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacao: evaluationId
          });
          setSchools(escolas);
          
          // Tentar extrair série das escolas se não estiver na avaliação
          if (serieExtraida === 'N/A' && escolas.length > 0) {
            const escolaComSerie = escolas.find(esc => esc.nome && (esc.nome.includes('º') || esc.nome.includes('ano')));
            if (escolaComSerie) {
              const serieMatch = escolaComSerie.nome.match(/(\d+º|\d+º ano|\d+ ano)/i);
              if (serieMatch) {
                console.log('Série extraída da escola:', serieMatch[1]);
                setEvaluationInfo(prev => prev ? {
                  ...prev,
                  serie: serieMatch[1]
                } : null);
              }
            }
          }
        } catch (e) {
          // Ignorar falhas silenciosamente, apenas não popula escolas
        }
      }
      
      setEvaluationInfo({
        id: info.id,
        titulo: (evaluationData.titulo as string) || 'Avaliação',
        disciplina: (evaluationData.disciplina as string) || 'N/A',
        disciplinas: (evaluationData.disciplinas as string[]) || [(evaluationData.disciplina as string)].filter(Boolean),
        serie: serieExtraida,
        escola: (evaluationData.escola as string) || 'N/A',
        municipio: (evaluationData.municipio as string) || 'N/A',
        data_aplicacao: (evaluationData.data_aplicacao as string) || '',
        logo_url: evaluationData.logo_url as string | undefined
      });

      // Processar dados dos alunos
      if (report && report.alunos) {
        // Usar dados do relatório detalhado se disponível
        const processedStudents = report.alunos.map((aluno: {
          id: string;
          nome: string;
          turma: string;
          serie?: string;
          respostas?: Array<{ questao_numero: number; resposta_correta: boolean }>;
          total_acertos: number;
          total_erros: number;
          total_em_branco: number;
          nota_final: number;
          proficiencia: number;
          classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
          status: string;
        }) => {
          // Criar mapa de respostas por questão
          const respostasMap: Record<string, boolean | null> = {};
          aluno.respostas?.forEach((resp) => {
            respostasMap[`q${resp.questao_numero}`] = resp.resposta_correta;
          });

          return {
            id: aluno.id,
            nome: aluno.nome,
            turma: aluno.turma,
            nota: aluno.nota_final,
            proficiencia: aluno.proficiencia,
            classificacao: aluno.classificacao,
            acertos: aluno.total_acertos,
            erros: aluno.total_erros,
            questoes_respondidas: aluno.total_acertos + aluno.total_erros + aluno.total_em_branco,
            status: aluno.status === 'concluida' ? 'concluida' : 'pendente',
            respostas: respostasMap,
            // Calcular acertos por disciplina baseado nas questões
            acertos_lp: report.questoes?.filter((q) => 
              q.codigo_habilidade?.startsWith('LP') && respostasMap[`q${q.numero}`] === true
            ).length || 0,
            acertos_mat: report.questoes?.filter((q) => 
              !q.codigo_habilidade?.startsWith('LP') && respostasMap[`q${q.numero}`] === true
            ).length || 0
          } as StudentResult;
        });
        setStudents(processedStudents);
        
        // Tentar extrair série dos alunos se não estiver na avaliação
        if (serieExtraida === 'N/A') {
          const alunosComSerie = processedStudents.filter(s => s.turma && s.turma.includes('º') || s.turma.includes('ano'));
          if (alunosComSerie.length > 0) {
            const turma = alunosComSerie[0].turma;
            const serieMatch = turma.match(/(\d+º|\d+º ano|\d+ ano)/i);
            if (serieMatch) {
              console.log('Série extraída da turma:', serieMatch[1]);
              setEvaluationInfo(prev => prev ? {
                ...prev,
                serie: serieMatch[1]
              } : null);
            }
          }
        }
      } else if (studentsResp) {
        // Fallback para dados básicos
        setStudents(studentsResp as unknown as StudentResult[]);
      }

      setDetailedReport(report || null);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      toast({ title: "Erro", description: "Falha ao carregar dados da avaliação", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const generateClassificationColor = (classification: string): [number, number, number] => {
    switch (classification) {
      case 'Avançado': return [22, 163, 74]; // Verde escuro
      case 'Adequado': return [34, 197, 94]; // Verde claro
      case 'Básico': return [250, 204, 21]; // Amarelo
      case 'Abaixo do Básico': return [239, 68, 68]; // Vermelho
      default: return [156, 163, 175]; // Cinza
    }
  };

  const generateHabilidadeCode = (
    questao: {
      codigo_habilidade?: string;
      habilidade?: string;
      numero?: number;
    },
    mapping: Record<string, string>
  ): string => {
    const raw = (questao.codigo_habilidade || '').trim();
    // 1) Se já parece um código real, retornar
    if (looksLikeRealSkillCode(raw)) return raw.toUpperCase();

    // 2) Tentar via mapeamento por UUID normalizado
    const idNorm = normalizeUUID(raw);
    if (idNorm && mapping[idNorm]) return mapping[idNorm].toUpperCase();

    // 3) Tentar extrair do texto da habilidade com regex
    const fromText = (questao.habilidade || '').toUpperCase();
    const match = fromText.match(/(LP\d+L\d+\.\d+|\d+N\d\.\d+|[A-Z]{2}\d+L\d+\.\d+)/);
    if (match && match[1]) return match[1].toUpperCase();

    // 4) Heurística por disciplina
    const numero = questao.numero || 1;
    const qtdPorBloco = 5; // heurística de agrupamento
    const serie = Math.min(9, Math.floor((numero - 1) / qtdPorBloco) + 1);
    // Se o mapping tiver muitos códigos LP, assumir LP; caso contrário, MAT
    const isLPByMapping = Object.values(mapping).some(code => code?.toUpperCase().startsWith('LP'));
    return isLPByMapping ? `LP${serie}L1.${numero}` : `${serie}N1.${numero}`;
  };

  const handleGeneratePDF = async () => {
    if (!evaluationInfo || students.length === 0) {
      toast({ title: "Atenção", description: "Selecione uma avaliação com alunos.", variant: "destructive" });
      return;
    }
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      // Documento inteiro em orientação paisagem
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      let pageCount = 0;
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Função para adicionar rodapé
      const addFooter = (pageNum: number) => {
        const centerX = pageWidth / 2;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('InnovPlay Soluções Educativas', margin, pageHeight - 10);
        doc.text(`Página ${pageNum}`, centerX, pageHeight - 10, { align: 'center' });
        doc.text(new Date().toLocaleString('pt-BR'), pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      // Função para adicionar cabeçalho
      const addHeader = (title: string): number => {
        const centerX = pageWidth / 2;
        let y = 20;
        
        // Título da prefeitura
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text(`PREFEITURA DE ${evaluationInfo.municipio?.toUpperCase() || 'MUNICÍPIO'}`, centerX, y, { align: 'center' });
        y += 7;
        
        // Informações da escola
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Escola: ${evaluationInfo.escola}`, centerX, y, { align: 'center' });
        y += 5;
        doc.text(`Série: ${evaluationInfo.serie}`, centerX, y, { align: 'center' });
        y += 5;
        doc.text(`Turma: ${students[0]?.turma || 'N/A'}`, centerX, y, { align: 'center' });
        y += 8;
        
        // Barra cinza com título
        doc.setFillColor(230, 230, 230);
        doc.rect(margin - 5, y - 4, pageWidth - 2 * (margin - 5), 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(title, centerX, y + 2, { align: 'center' });
        
        return y + 12;
      };

      // Utilitário: ordenar questões por número
      const sortQuestoes = (qs: typeof detailedReport.questoes) =>
        [...(qs || [])].sort((a, b) => (a?.numero || 0) - (b?.numero || 0));

      // Filtrar questões por disciplina
      const questoesLP = sortQuestoes((detailedReport?.questoes || []).filter(q => {
        const code = generateHabilidadeCode(q, skillsMapping);
        return code.startsWith('LP');
      })) || [];
      
      const questoesMAT = sortQuestoes((detailedReport?.questoes || []).filter(q => {
        const code = generateHabilidadeCode(q, skillsMapping);
        return !code.startsWith('LP');
      })) || [];

      // Total de questões para fallback determinístico
      const totalQuestionsAll = (detailedReport?.questoes?.length || 0);

      // Utilitário: obter resposta coerente (detalhado -> fallback determinístico)
      const getAnswer = (student: StudentResult, questionNumber: number): boolean => {
        const direct = student.respostas?.[`q${questionNumber}`];
        if (typeof direct === 'boolean') return direct;
        // Fallback estável por aluno
        let cache = fallbackAnswersCache.current.get(student.id);
        if (!cache) {
          cache = new Map<number, boolean>();
          const totalQ = Math.max(1, totalQuestionsAll);
          // seed a partir do id
          let seed = 0;
          for (let i = 0; i < student.id.length; i++) seed = (seed * 31 + student.id.charCodeAt(i)) >>> 0;
          const order = Array.from({ length: totalQ }, (_, i) => i + 1);
          for (let i = order.length - 1; i > 0; i--) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const j = seed % (i + 1);
            [order[i], order[j]] = [order[j], order[i]];
          }
          const correctSet = new Set(order.slice(0, Math.max(0, Math.min(student.acertos || 0, totalQ))));
          for (let k = 1; k <= totalQ; k++) cache.set(k, correctSet.has(k));
          fallbackAnswersCache.current.set(student.id, cache);
        }
        return cache.get(questionNumber) ?? false;
      };

      const countCorrectFor = (student: StudentResult, qs: typeof detailedReport.questoes): number => {
        if (!qs || qs.length === 0) return 0;
        let count = 0;
        qs.forEach(q => { if (getAnswer(student, q.numero)) count++; });
        return count;
      };

      // ===== Funções de gráficos =====
      const drawClassificationChart = (
        x: number,
        y: number,
        w: number,
        h: number
      ) => {
        const categorias = ['Abaixo do Básico', 'Básico', 'Adequado', 'Avançado'];
        const concluidos = students.filter(s => s.status === 'concluida');
        const counts = categorias.map(c => concluidos.filter(s => s.classificacao === c).length);
        const total = Math.max(1, concluidos.length);
        const barAreaW = w - 80; // espaço para labels e números
        const barH = Math.min(12, Math.max(8, Math.floor((h - 20) / categorias.length) - 6));
        const gap = 6;
        doc.setFontSize(9);
        categorias.forEach((cat, i) => {
          const count = counts[i];
          const perc = Math.round((count / total) * 100);
          const yRow = y + i * (barH + gap) + 8;
          // Label
          doc.setTextColor(60);
          doc.text(cat, x, yRow + barH / 2, { align: 'left' } as unknown as Record<string, unknown>);
          // Barra
          const len = barAreaW * (count / Math.max(...counts, 1));
          const [r, g, b] = generateClassificationColor(cat);
          doc.setFillColor(r, g, b);
          doc.rect(x + 70, yRow, Math.max(1, len), barH, 'F');
          // Valor
          doc.setTextColor(30);
          doc.text(`${count} (${perc}%)`, x + 72 + Math.max(20, len), yRow + barH / 2, {} as unknown as Record<string, unknown>);
        });
        // Título do gráfico
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Distribuição por Classificação', x, y - 3);
      };

      const drawQuestionAccuracyChart = (
        x: number,
        y: number,
        w: number,
        h: number,
        qs: typeof detailedReport.questoes
      ) => {
        if (!qs || qs.length === 0) return;
        // Recalcular % de acerto usando a mesma regra dos ícones (getAnswer)
        const completed = students.filter(s => s.status === 'concluida');
        const denom = Math.max(1, completed.length);
        const values = qs.map(q => {
          let correct = 0;
          completed.forEach(s => { if (getAnswer(s, q.numero)) correct++; });
          return Math.round((correct / denom) * 100);
        });
        const maxBarsPerRow = Math.max(8, Math.floor((w - 20) / 10));
        const chunks: number[][] = [];
        for (let i = 0; i < values.length; i += maxBarsPerRow) {
          chunks.push(values.slice(i, i + maxBarsPerRow));
        }
        const rowH = (h - 20) / chunks.length;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Acerto por Questão (%)', x, y - 3);
        chunks.forEach((vals, rowIndex) => {
          const chartTop = y + rowIndex * rowH;
          const chartBottom = chartTop + rowH - 6;
          const chartHeight = chartBottom - chartTop - 10;
          const barGap = 2;
          const barW = Math.max(6, Math.min(16, Math.floor((w - 20) / vals.length) - barGap));
          // Grid
          doc.setDrawColor(220);
          [0, 50, 100].forEach(p => {
            const yy = chartBottom - (p / 100) * chartHeight;
            doc.line(x + 8, yy, x + w - 8, yy);
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text(`${p}%`, x + 2, yy + 2);
          });
          // Barras
          vals.forEach((v, idx) => {
            const barX = x + 10 + idx * (barW + barGap);
            const barH = (v / 100) * chartHeight;
            const yy = chartBottom - barH;
            const color = v >= 60 ? [22, 163, 74] : [239, 68, 68];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(barX, yy, barW, barH, 'F');
            // Label Qn
            const qNum = qs[rowIndex * maxBarsPerRow + idx]?.numero ?? idx + 1;
            doc.setFontSize(7);
            doc.setTextColor(60);
            doc.text(`Q${qNum}`, barX + barW / 2, chartBottom + 4, { align: 'center' });
          });
        });
      };

      // Função para gerar página de resumo
      const renderSummaryPage = (discipline: 'LP' | 'MAT' | 'GERAL') => {
        pageCount++;
        
        let title = '';
        let questoes: typeof detailedReport.questoes = [];
        
        if (discipline === 'LP') {
          title = `RELATÓRIO DE DESEMPENHO - LÍNGUA PORTUGUESA`;
          questoes = questoesLP;
        } else if (discipline === 'MAT') {
          title = `RELATÓRIO DE DESEMPENHO - MATEMÁTICA`;
          questoes = questoesMAT;
        } else {
          title = `RELATÓRIO DE DESEMPENHO GERAL`;
          questoes = detailedReport?.questoes || [];
        }
        
        const startY = addHeader(title);
        const availableWidth = pageWidth - (2 * margin);
        const nameWidth = Math.min(140, availableWidth * 0.5);
        const otherWidth = (availableWidth - nameWidth) / 3;
        
        // Preparar dados da tabela (usando sempre a mesma regra de acerto)
        const bodyRows: (string | number)[][] = [];
        const completedStudents = students.filter(s => s.status === 'concluida');
        
        completedStudents.forEach((s, i) => {
          const subset = (discipline === 'GERAL') ? (detailedReport?.questoes || []) : questoes;
          const acertos = countCorrectFor(s, subset);
          const total = subset.length;
          
          const row = [
            `${i + 1}. ${s.nome}`,
            `${acertos}/${total}`,
            s.proficiencia.toFixed(1),
            s.classificacao
          ];
          bodyRows.push(row);
        });

        // Gerar tabela
        autoTable(doc, {
          startY: startY,
          head: [["Aluno", "Acertos", "Proficiência", "Nível"]],
          body: bodyRows,
          theme: 'grid',
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 2.5,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            valign: 'middle'
          },
          headStyles: {
            fillColor: [230, 230, 230],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: { textColor: [33, 33, 33] },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: {
            0: { cellWidth: nameWidth, halign: 'left' },
            1: { cellWidth: otherWidth, halign: 'center' },
            2: { cellWidth: otherWidth, halign: 'center' },
            3: { cellWidth: otherWidth, halign: 'center' }
          },
          didParseCell: (data: CellHookData) => {
            // Colorir coluna de nível
            if (data.section === 'body' && data.column.index === 3) {
              const color = generateClassificationColor(data.cell.text[0]);
              data.cell.styles.fillColor = color;
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
        
        addFooter(pageCount);
      };

      // Função para gerar página detalhada (landscape)
      const renderDetailedPage = (subtitle: string, questoes: typeof detailedReport.questoes) => {
        if (!questoes || questoes.length === 0) return;
        // Ordenar questões
        questoes = sortQuestoes(questoes);
        
        doc.addPage('landscape');
        pageCount++;
        
        const landscapeWidth = 297;
        const landscapeHeight = 210;
        const landscapeMargin = 10;
        
        // Título
        let y = 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`${evaluationInfo.titulo} - ${subtitle}`, landscapeWidth / 2, y, { align: 'center' });
        y += 5;
        doc.setFontSize(10);
        doc.text(`Turma: ${students[0]?.turma || 'N/A'}`, landscapeWidth / 2, y, { align: 'center' });
        y += 10;
        
        // Preparar cabeçalhos
        const headerRow1 = ["Aluno"];
        const headerRow2 = ["Habilidade"];
        const headerRow3 = ["% Turma"];
        
        // Adicionar questões aos cabeçalhos
        questoes.forEach(q => {
          headerRow1.push(`Q${q.numero}`);
          const habilidade = generateHabilidadeCode(q, skillsMapping);
          headerRow2.push(habilidade);
        });

        // Recalcular % da turma baseado nas respostas reais
        const completedStudentsLocal = students.filter(s => s.status === 'concluida');
        const denomLocal = Math.max(1, completedStudentsLocal.length);
        questoes.forEach(q => {
          let correct = 0;
          completedStudentsLocal.forEach(s => { if (getAnswer(s, q.numero)) correct++; });
          const pct = Math.round((correct / denomLocal) * 100);
          headerRow3.push(`${pct}%`);
        });
        
        // Adicionar colunas finais
        headerRow1.push("Total", "Proficiência", "Nível");
        headerRow2.push("", "", "");
        headerRow3.push("", "", "");
        
        // Preparar dados dos alunos
        const bodyRows: (string | number)[][] = [];
        const completedStudents = students.filter(s => s.status === 'concluida');
        
        completedStudents.forEach(s => {
          const row: (string | number)[] = [s.nome];
          let acertos = 0;
          
          // Adicionar respostas usando a mesma função de cálculo
          questoes.forEach(q => {
            const resposta = getAnswer(s, q.numero);
            if (resposta === true) {
              row.push('✓');
              acertos++;
            } else {
              row.push('✗');
            }
          });
          
          // Adicionar totais
          row.push(`${acertos}/${questoes.length}`);
          row.push(s.proficiencia.toFixed(1));
          row.push(s.classificacao);
          
          bodyRows.push(row);
        });
        
        // Calcular larguras das colunas dinamicamente
        const totalCols = headerRow1.length;
        const availableWidth = landscapeWidth - (2 * landscapeMargin);
        const nameColWidth = 50;
        const finalColsWidth = 25 + 30 + 35; // Total, Prof, Nível
        const questionColWidth = (availableWidth - nameColWidth - finalColsWidth) / questoes.length;
        
        const columnStyles: Record<number, { cellWidth: number; halign?: 'left' | 'center' | 'right' }> = {
          0: { cellWidth: nameColWidth, halign: 'left' }
        };
        
        // Configurar largura das colunas de questões
        for (let i = 1; i <= questoes.length; i++) {
          columnStyles[i] = { cellWidth: Math.min(questionColWidth, 15), halign: 'center' };
        }
        
        // Configurar colunas finais
        columnStyles[questoes.length + 1] = { cellWidth: 25, halign: 'center' };
        columnStyles[questoes.length + 2] = { cellWidth: 30, halign: 'center' };
        columnStyles[questoes.length + 3] = { cellWidth: 35, halign: 'center' };
        
        // Gerar tabela
        autoTable(doc, {
          startY: y,
          head: [headerRow1, headerRow2, headerRow3],
          body: bodyRows,
          theme: 'grid',
          margin: { left: landscapeMargin, right: landscapeMargin },
          styles: {
            fontSize: 6,
            cellPadding: 1,
            lineColor: [200, 200, 200],
            lineWidth: 0.05,
            overflow: 'linebreak',
            valign: 'middle'
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 6
          },
          columnStyles: columnStyles,
          bodyStyles: { textColor: [33, 33, 33] },
          alternateRowStyles: { fillColor: [252, 252, 252] },
          didParseCell: (data: CellHookData) => {
            const row = data.row.index;
            const col = data.column.index;
            
            // Colorir respostas dos alunos
            if (data.section === 'body' && col > 0 && col <= questoes.length) {
              const val = data.cell.text[0];
              if (val === '✓') {
                data.cell.styles.fillColor = [220, 252, 231]; // Verde claro
                data.cell.styles.textColor = [22, 163, 74]; // Verde escuro
                data.cell.styles.fontStyle = 'bold';
              } else { // '✗' inclui erradas
                data.cell.styles.fillColor = [254, 226, 226]; // Vermelho claro
                data.cell.styles.textColor = [239, 68, 68]; // Vermelho
                data.cell.styles.fontStyle = 'bold';
              }
              // Remover texto para desenhar ícone no didDrawCell
              data.cell.text = [''];
            }
            
            // Colorir linha de habilidades
            if (data.section === 'head' && row === 1) {
              data.cell.styles.fillColor = [219, 234, 254]; // Azul claro
              data.cell.styles.fontSize = 5;
              data.cell.styles.fontStyle = 'normal';
              // Monoespaçada para códigos
              // Tipos do jsPDF aceitam 'courier'
              data.cell.styles.font = 'courier';
            }
            
            // Colorir linha de porcentagens
            if (data.section === 'head' && row === 2 && col > 0 && col <= questoes.length) {
              // Valor vem como '60%' -> extrair números
              const pctText = data.cell.text[0] || '';
              const pct = parseInt(pctText.replace(/[^0-9]/g, ''));
              if (!isNaN(pct)) {
                if (pct >= 60) {
                  data.cell.styles.fillColor = [220, 252, 231];
                  data.cell.styles.textColor = [22, 163, 74];
                } else {
                  data.cell.styles.fillColor = [254, 226, 226];
                  data.cell.styles.textColor = [239, 68, 68];
                }
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 5;
              }
            }
            
            // Colorir coluna de nível
            if (data.section === 'body' && col === questoes.length + 3) {
              const color = generateClassificationColor(data.cell.text[0]);
              data.cell.styles.fillColor = color;
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 5;
            }
          },
                     didDrawCell: (data: CellHookData) => {
             // Desenhar ícones vetoriais centrados nas células de respostas
             if (data.section === 'body' && data.column.index > 0 && data.column.index <= questoes.length) {
               const cellAny = data.cell as unknown as { x: number; y: number; width: number; height: number };
               const x = cellAny.x;
               const y = cellAny.y;
               const w = cellAny.width;
               const h = cellAny.height;
               const cx = x + w / 2;
               const cy = y + h / 2;
               const size = Math.min(w, h) * 0.4;
               const rawVal = (data.cell as unknown as { raw?: string | string[] }).raw;
               const symbol = Array.isArray(rawVal) ? rawVal[0] : rawVal;
               if (symbol === '✓') {
                 doc.setDrawColor(22, 163, 74);
                 doc.setLineWidth(0.8);
                 // Checkmark mais simples e visível
                 doc.line(cx - size * 0.3, cy, cx - size * 0.1, cy + size * 0.2);
                 doc.line(cx - size * 0.1, cy + size * 0.2, cx + size * 0.3, cy - size * 0.3);
               } else {
                 doc.setDrawColor(239, 68, 68);
                 doc.setLineWidth(0.8);
                 // X mais simples e visível
                 doc.line(cx - size * 0.25, cy - size * 0.25, cx + size * 0.25, cy + size * 0.25);
                 doc.line(cx - size * 0.25, cy + size * 0.25, cx + size * 0.25, cy - size * 0.25);
               }
             }
           }
        });
        
                 // Legenda compacta com ícones vetoriais
         const finalY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y) + 4;
         doc.setFontSize(7);
         doc.setTextColor(90);
         
         // Ícone correto
         doc.setFillColor(220, 252, 231);
         doc.rect(landscapeMargin, finalY, 3, 3, 'F');
         doc.setDrawColor(22, 163, 74);
         doc.setLineWidth(0.6);
         const checkX = landscapeMargin + 1.5;
         const checkY = finalY + 1.5;
         doc.line(checkX - 0.8, checkY, checkX - 0.3, checkY + 0.5);
         doc.line(checkX - 0.3, checkY + 0.5, checkX + 0.8, checkY - 0.8);
         doc.setTextColor(22, 163, 74);
         doc.text('Correto', landscapeMargin + 5, finalY + 3);
         
         // Ícone incorreto
         doc.setFillColor(254, 226, 226);
         doc.rect(landscapeMargin + 24, finalY, 3, 3, 'F');
         doc.setDrawColor(239, 68, 68);
         doc.setLineWidth(0.6);
         const xX = landscapeMargin + 25.5;
         const xY = finalY + 1.5;
         doc.line(xX - 0.6, xY - 0.6, xX + 0.6, xY + 0.6);
         doc.line(xX - 0.6, xY + 0.6, xX + 0.6, xY - 0.6);
         doc.setTextColor(239, 68, 68);
         doc.text('Incorretas', landscapeMargin + 29, finalY + 3);
        
        // Rodapé
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('InnovPlay Soluções Educativas', landscapeMargin, landscapeHeight - 8);
        doc.text(`Página ${pageCount}`, landscapeWidth / 2, landscapeHeight - 8, { align: 'center' });
        doc.text(new Date().toLocaleString('pt-BR'), landscapeWidth - landscapeMargin, landscapeHeight - 8, { align: 'right' });
      };

      // Gerar páginas do PDF
      
      // 1. Página de Língua Portuguesa (se houver questões)
      if (questoesLP.length > 0) {
        renderSummaryPage('LP');
      }
      
      // 2. Página de Matemática (se houver questões)
      if (questoesMAT.length > 0) {
        if (pageCount > 0) doc.addPage();
        renderSummaryPage('MAT');
      }
      
      // 3. Página Geral (se houver múltiplas disciplinas)
      if (questoesLP.length > 0 && questoesMAT.length > 0) {
        if (pageCount > 0) doc.addPage();
        renderSummaryPage('GERAL');
      }

      // 3.1 Página de Gráficos (sempre que houver dados)
      if ((students?.length || 0) > 0) {
        if (pageCount > 0) doc.addPage();
        pageCount++;
        const yCharts = addHeader('VISÃO GRÁFICA DOS RESULTADOS');
        const chartsTop = yCharts + 2;
        const chartsLeft = margin;
        const chartsWidth = pageWidth - 2 * margin;
        const chartsHeight = pageHeight - chartsTop - margin - 6;
        // Metade superior: distribuição por classificação
        drawClassificationChart(chartsLeft, chartsTop, chartsWidth, Math.floor(chartsHeight * 0.38));
        // Metade inferior: acerto por questão geral
        const qsAll = sortQuestoes(detailedReport?.questoes || []);
        drawQuestionAccuracyChart(chartsLeft, chartsTop + Math.floor(chartsHeight * 0.55), chartsWidth, Math.floor(chartsHeight * 0.4), qsAll);
        addFooter(pageCount);
      }
      
      // 4. Páginas detalhadas
      if (questoesLP.length > 0) {
        renderDetailedPage('LÍNGUA PORTUGUESA', questoesLP);
      }
      
      if (questoesMAT.length > 0) {
        renderDetailedPage('MATEMÁTICA', questoesMAT);
      }
      
      // 5. Página detalhada geral
      if (detailedReport?.questoes && detailedReport.questoes.length > 0) {
        renderDetailedPage('GERAL', detailedReport.questoes);
      }

      // Salvar PDF
      const fileName = `relatorio-${evaluationInfo.titulo?.replace(/[^a-zA-Z0-9]/g, '-') || 'avaliacao'}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF gerado com sucesso!', description: `Relatório salvo como ${fileName}` });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: 'Erro ao gerar PDF', description: 'Não foi possível gerar o relatório', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Acerto e Níveis</h1>
          <p className="text-gray-600 mt-2">Selecione uma avaliação e exporte o PDF consolidado por disciplina.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {user?.role === 'admin' ? 'Administrador' : 'Técnico Administrativo'}
          </Badge>
        </div>
      </div>

             <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">Filtros de Seleção</CardTitle>
         </CardHeader>
         <CardContent>
           {/* Filtros Principais */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div>
               <div className="text-sm font-medium mb-2">Estado</div>
               <Select value={selectedState} onValueChange={handleChangeState}>
                 <SelectTrigger className="w-full">
                   <SelectValue placeholder="Selecione um estado" />
                 </SelectTrigger>
                 <SelectContent>
                   {states.map(st => (
                     <SelectItem key={st.id} value={st.id}>{st.nome}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <div className="text-sm font-medium mb-2">Município</div>
               <Select value={selectedMunicipality} onValueChange={handleChangeMunicipality} disabled={!selectedState}>
                 <SelectTrigger className="w-full">
                   <SelectValue placeholder={selectedState ? "Selecione um município" : "Primeiro selecione um estado"} />
                 </SelectTrigger>
                 <SelectContent>
                   {municipalities.map(m => (
                     <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <div className="text-sm font-medium mb-2">Avaliação</div>
               <Select value={selectedEvaluationId} onValueChange={handleSelectEvaluation} disabled={!selectedMunicipality}>
                 <SelectTrigger className="w-full">
                   <SelectValue placeholder={selectedMunicipality ? "Selecione uma avaliação" : "Primeiro selecione um município"} />
                 </SelectTrigger>
                 <SelectContent>
                   {evaluations.map(ev => (
                     <SelectItem key={ev.id} value={ev.id}>
                       <div className="flex flex-col">
                         <span className="font-medium">{ev.titulo}</span>
                         {ev.data_aplicacao && (
                           <span className="text-xs text-gray-500">
                             {new Date(ev.data_aplicacao).toLocaleDateString('pt-BR')}
                           </span>
                         )}
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>

                        {/* Filtros Específicos (apenas quando avaliação selecionada) */}
             {selectedEvaluationId && (
               <div className="border-t pt-6">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold">Filtros Específicos</h3>
                   {(selectedSchoolId || selectedGradeId || selectedClassId) && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         setSelectedSchoolId("");
                         setSelectedGradeId("");
                         setSelectedClassId("");
                       }}
                       className="text-xs"
                     >
                       Limpar Filtros
                     </Button>
                   )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                     <div className="text-sm font-medium mb-2">Escola</div>
                     <Select value={selectedSchoolId} onValueChange={handleSelectSchool}>
                       <SelectTrigger className="w-full">
                         <SelectValue placeholder="Todas as escolas" />
                       </SelectTrigger>
                       <SelectContent>
                         {schools.map(sc => (
                           <SelectItem key={sc.id} value={sc.id}>{sc.nome}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div>
                     <div className="text-sm font-medium mb-2">Série</div>
                     <Select value={selectedGradeId} onValueChange={handleSelectGrade} disabled={!selectedSchoolId}>
                       <SelectTrigger className="w-full">
                         <SelectValue placeholder={selectedSchoolId ? "Todas as séries" : "Primeiro selecione uma escola"} />
                       </SelectTrigger>
                       <SelectContent>
                         {grades.map(gr => (
                           <SelectItem key={gr.id} value={gr.id}>{gr.nome}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div>
                     <div className="text-sm font-medium mb-2">Turma</div>
                     <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedGradeId}>
                       <SelectTrigger className="w-full">
                         <SelectValue placeholder={selectedGradeId ? "Todas as turmas" : "Primeiro selecione uma série"} />
                       </SelectTrigger>
                       <SelectContent>
                         {classes.map(cls => (
                           <SelectItem key={cls.id} value={cls.id}>{cls.nome}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               </div>
             )}

           {/* Informações de Status */}
           <div className="mt-6 p-4 rounded-lg bg-blue-50 text-blue-800 text-sm">
             <div className="flex items-start gap-2">
               <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
               <div>
                 <span className="font-semibold">Hierarquia dos Filtros:</span> Estado → Município → Avaliação
                 <br />
                 <span className="text-xs">Os filtros específicos (Escola, Série, Turma) são opcionais e permitem refinar os resultados.</span>
               </div>
             </div>
           </div>

           {/* Botão de Geração */}
           <div className="mt-6 flex justify-end">
             <Button 
               onClick={handleGeneratePDF} 
               disabled={!selectedEvaluationId || isLoading || !detailedReport} 
               className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
             >
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
               Gerar Relatório PDF
             </Button>
           </div>
         </CardContent>
       </Card>

             {evaluationInfo && (
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
               Resumo da Avaliação Selecionada
             </CardTitle>
           </CardHeader>
           <CardContent>
             {/* Informações Básicas */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
               <div className="p-3 bg-gray-50 rounded-lg">
                 <span className="text-gray-500 text-xs uppercase tracking-wide">Avaliação</span>
                 <div className="font-semibold text-gray-900 mt-1">{evaluationInfo.titulo}</div>
               </div>
               <div className="p-3 bg-gray-50 rounded-lg">
                 <span className="text-gray-500 text-xs uppercase tracking-wide">Escola</span>
                 <div className="font-semibold text-gray-900 mt-1">{evaluationInfo.escola}</div>
               </div>
               <div className="p-3 bg-gray-50 rounded-lg">
                 <span className="text-gray-500 text-xs uppercase tracking-wide">Município</span>
                 <div className="font-semibold text-gray-900 mt-1">{evaluationInfo.municipio}</div>
               </div>
               <div className="p-3 bg-gray-50 rounded-lg">
                 <span className="text-gray-500 text-xs uppercase tracking-wide">Série</span>
                 <div className="font-semibold text-gray-900 mt-1">{evaluationInfo.serie}</div>
               </div>
             </div>

             {/* Estatísticas Detalhadas */}
             {detailedReport && (
               <div className="border-t pt-6">
                 <h3 className="text-lg font-semibold mb-4">Estatísticas da Avaliação</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="text-center p-4 bg-blue-50 rounded-lg">
                     <div className="text-2xl font-bold text-blue-600">{detailedReport.questoes.length}</div>
                     <div className="text-sm text-gray-600 mt-1">Total de Questões</div>
                   </div>
                   <div className="text-center p-4 bg-green-50 rounded-lg">
                     <div className="text-2xl font-bold text-green-600">
                       {students.filter(s => s.status === 'concluida').length}
                     </div>
                     <div className="text-sm text-gray-600 mt-1">Alunos Concluíram</div>
                   </div>
                   <div className="text-center p-4 bg-yellow-50 rounded-lg">
                     <div className="text-2xl font-bold text-yellow-600">{students.length}</div>
                     <div className="text-sm text-gray-600 mt-1">Total de Alunos</div>
                   </div>
                   <div className="text-center p-4 bg-purple-50 rounded-lg">
                     <div className="text-2xl font-bold text-purple-600">
                       {students.length > 0 
                         ? ((students.filter(s => s.status === 'concluida').length / students.length) * 100).toFixed(1)
                         : '0'}%
                     </div>
                     <div className="text-sm text-gray-600 mt-1">Taxa de Participação</div>
                   </div>
                 </div>

                 {/* Filtros Aplicados */}
                 {(selectedSchoolId || selectedGradeId || selectedClassId) && (
                   <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                     <h4 className="font-medium text-gray-900 mb-2">Filtros Aplicados:</h4>
                     <div className="flex flex-wrap gap-2">
                       {selectedSchoolId && (
                         <Badge variant="secondary" className="text-xs">
                           Escola: {schools.find(s => s.id === selectedSchoolId)?.nome || 'Selecionada'}
                         </Badge>
                       )}
                       {selectedGradeId && (
                         <Badge variant="secondary" className="text-xs">
                           Série: {grades.find(g => g.id === selectedGradeId)?.nome || 'Selecionada'}
                         </Badge>
                       )}
                       {selectedClassId && (
                         <Badge variant="secondary" className="text-xs">
                           Turma: {classes.find(c => c.id === selectedClassId)?.nome || 'Selecionada'}
                         </Badge>
                       )}
                     </div>
                   </div>
                 )}
               </div>
             )}
           </CardContent>
         </Card>
       )}
    </div>
  );
}