import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Upload, Palette } from "lucide-react";
import { FilterComponentAnalise } from "@/components/filters";
import { useAuth } from "@/context/authContext";
import {
  EvaluationResultsApiService,
  REPORT_ENTITY_TYPE_ANSWER_SHEET,
  type ReportEntityTypeQuery,
  type NovaRespostaAPI,
} from "@/services/evaluation/evaluationResultsApi";
import { mapAnswerSheetResultadosAgregadosToNovaResposta, type AnswerSheetResultadosAgregadosRaw } from "@/utils/answer-sheet/mapAnswerSheetResultadosAgregadosToNovaResposta";
import { getUserHierarchyContext, getRestrictionMessage, validateReportAccess, UserHierarchyContext, cityIdQueryParamForAdmin } from "@/utils/userHierarchy";
import { api } from "@/lib/api";
import buildDeckDataForPresentation19Slides from "@/utils/reports/presentation19/buildDeckData";
import { buildSlideSpec } from "@/utils/reports/presentation19/buildSlideSpec";
import { normalizeRelatorioCompletoForAnaliseUI } from "@/utils/report/relatorioCompletoNormalize";
import type { Presentation19DeckData, Presentation19Mode } from "@/types/presentation19-slides";
import { Presentation19NativePreviewDeck } from "@/components/reports/presentation19/Presentation19NativePreviewDeck";
import { exportPresentation19Pdf, exportPresentation19Pptx } from "@/services/reports/presentation19/Presentation19SlidesExportService";
import type { RelatorioCompleto } from "@/types/evaluation-results";
import { resolveReportLogoForPdf } from "@/utils/pdfCityBranding";
import { normalizeResultsPeriodYm } from "@/utils/resultsPeriod";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export default function RelatorioApresentacao19Slides() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeMode, setActiveMode] = useState<Presentation19Mode>("answer_sheet");

  const [userHierarchyContext, setUserHierarchyContext] = useState<UserHierarchyContext | null>(null);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(true);

  // filtros compartilhados (estado/município/escola)
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // filtros específicos por aba (evaluation_id vs gabarito)
  const [selectedEvaluationAnswerSheet, setSelectedEvaluationAnswerSheet] = useState<string>("all");
  const [selectedEvaluationEval, setSelectedEvaluationEval] = useState<string>("all");

  const selectedEvaluation = activeMode === "answer_sheet" ? selectedEvaluationAnswerSheet : selectedEvaluationEval;

  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  const [primaryColor, setPrimaryColor] = useState<string>("#7c3aed");
  const [logoDataUrl, setLogoDataUrl] = useState<string>("/LOGO-1-menor.png");

  const [deckData, setDeckData] = useState<Presentation19DeckData | null>(null);

  const slidesCount = useMemo(() => (deckData ? buildSlideSpec(deckData).slides.length : 19), [deckData]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportProgressTimerRef = useRef<number | null>(null);

  const normalizedRole = useMemo(() => user?.role?.toLowerCase(), [user?.role]);
  const roleRequiresSpecificSchool = useMemo(
    () => (normalizedRole ? ["diretor", "coordenador", "professor"].includes(normalizedRole) : false),
    [normalizedRole]
  );

  const fallbackSchools = useMemo(() => {
    const uniqueSchools = new Map<string, { id: string; name: string; municipalityId?: string }>();

    if (userHierarchyContext?.school?.id) {
      uniqueSchools.set(userHierarchyContext.school.id, {
        id: userHierarchyContext.school.id,
        name: userHierarchyContext.school.name,
        municipalityId: userHierarchyContext.school.municipality_id,
      });
    }

    if (Array.isArray(userHierarchyContext?.classes)) {
      userHierarchyContext!.classes!.forEach((classe) => {
        if (classe.school_id) {
          uniqueSchools.set(classe.school_id, {
            id: classe.school_id,
            name: classe.school_name,
            municipalityId: userHierarchyContext?.municipality?.id,
          });
        }
      });
    }

    return Array.from(uniqueSchools.values());
  }, [userHierarchyContext]);

  const adminCityIdQuery = useMemo(
    () => cityIdQueryParamForAdmin(user?.role, selectedMunicipality === "all" ? undefined : selectedMunicipality),
    [user?.role, selectedMunicipality]
  );

  const periodoApi = useMemo(() => {
    if (selectedPeriod === "all") return undefined;
    const n = normalizeResultsPeriodYm(selectedPeriod);
    return n === "all" ? undefined : n;
  }, [selectedPeriod]);

  // hierarquia do usuário (permissões + pre-seleções)
  useEffect(() => {
    const loadUserHierarchy = async () => {
      if (!user?.id || !user?.role) {
        setIsLoadingHierarchy(false);
        return;
      }
      try {
        setIsLoadingHierarchy(true);
        const context = await getUserHierarchyContext(user.id, user.role);
        setUserHierarchyContext(context);
      } catch {
        toast({
          title: "Aviso",
          description: "Não foi possível carregar suas permissões.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHierarchy(false);
      }
    };
    void loadUserHierarchy();
  }, [user?.id, user?.role, toast]);

  // fallback de valores: a lógica de seleção inicial do FilterComponentAnalise costuma cuidar.
  // Aqui mantemos apenas a validação de acesso antes do export.

  const allRequiredFiltersSelected = useMemo(() => {
    return (
      selectedState !== "all" &&
      selectedMunicipality !== "all" &&
      selectedEvaluation !== "all" &&
      (!roleRequiresSpecificSchool || selectedSchool !== "all")
    );
  }, [roleRequiresSpecificSchool, selectedEvaluation, selectedMunicipality, selectedSchool, selectedState]);

  useEffect(() => {
    // ao trocar aba, limpamos o deck para forçar recálculo com os dados corretos
    setDeckData(null);
  }, [activeMode, selectedEvaluation]);

  const reportEntityType: ReportEntityTypeQuery | undefined =
    activeMode === "answer_sheet" ? REPORT_ENTITY_TYPE_ANSWER_SHEET : undefined;

  const loadDeckData = useCallback(async (): Promise<Presentation19DeckData | null> => {
    if (!allRequiredFiltersSelected) return null;

    const evaluationId = selectedEvaluation;

    try {
      setIsGenerating(true);

      // 1) endpoint 1: relatório completo (necessário para gerar presença/níveis/proficiência)
      const relatorioCompleto = await EvaluationResultsApiService.getRelatorioCompleto(evaluationId, {
        ...(selectedSchool !== "all" ? { schoolId: selectedSchool } : {}),
        ...(selectedMunicipality !== "all" ? { cityId: selectedMunicipality } : {}),
        ...(adminCityIdQuery ? { adminCityIdQuery } : {}),
        ...(reportEntityType ? { reportEntityType } : {}),
      });

      if (!relatorioCompleto) {
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível obter o relatório completo (endpoint 1).",
          variant: "destructive",
        });
        return null;
      }

      // Se o backend retornar um payload "vazio" para o recorte de filtros, o deck vai renderizar N/A.
      // Mostramos um aviso claro para facilitar o diagnóstico.
      const hasCoreData =
        Boolean(relatorioCompleto.total_alunos) &&
        Boolean(relatorioCompleto.niveis_aprendizagem) &&
        Boolean(relatorioCompleto.proficiencia) &&
        Boolean(relatorioCompleto.acertos_por_habilidade);

      if (!hasCoreData) {
        toast({
          title: "Dados incompletos no relatório",
          description:
            "O relatório retornou sem dados essenciais (presença/níveis/proficiência/questões). Verifique os filtros ou permissões.",
          variant: "destructive",
        });
      }

      // 2) endpoint 2: agregados por modo
      let novaResposta: NovaRespostaAPI | null = null;

      let relatorioNormalizado: RelatorioCompleto = relatorioCompleto;
      if (activeMode === "answer_sheet") {
        // `reports/dados-json` pode vir em shape diferente para answer_sheet.
        // Normalizamos para bater com o que `buildDeckDataForPresentation19Slides` espera.
        relatorioNormalizado = normalizeRelatorioCompletoForAnaliseUI(relatorioCompleto);

        const params = new URLSearchParams();
        params.set("estado", selectedState);
        params.set("municipio", selectedMunicipality);
        params.set("gabarito", evaluationId);
        if (periodoApi) params.set("periodo", periodoApi);

        const res2 = await api.get<AnswerSheetResultadosAgregadosRaw>(
          `/answer-sheets/resultados-agregados?${params.toString()}`,
          // Garante contexto/tenant do município para o backend
          selectedMunicipality !== "all" ? { meta: { cityId: selectedMunicipality } } : {}
        );

        novaResposta = mapAnswerSheetResultadosAgregadosToNovaResposta(res2.data, {
          estado: selectedState,
          municipio: selectedMunicipality,
          gabarito: evaluationId,
          escola: selectedSchool,
          serie: "all",
          turma: "all",
        });
      } else {
        const params = new URLSearchParams();
        params.set("estado", selectedState);
        params.set("municipio", selectedMunicipality);
        params.set("avaliacao", evaluationId);
        if (adminCityIdQuery) params.set("city_id", adminCityIdQuery);
        if (periodoApi) params.set("periodo", periodoApi);

        const resEval = await api.get<NovaRespostaAPI>(
          `/evaluation-results/avaliacoes?${params.toString()}`,
          selectedMunicipality !== "all" ? { meta: { cityId: selectedMunicipality } } : {}
        );
        novaResposta = resEval.data;
      }

      const deck = buildDeckDataForPresentation19Slides({
        mode: activeMode,
        relatorioDetalhado: relatorioNormalizado,
        novaRespostaAgregados: novaResposta,
        primaryColor,
        logoDataUrl,
      });

      setDeckData(deck);
      return deck;
    } catch (err) {
      toast({
        title: "Erro ao gerar",
        description: err instanceof Error ? err.message : "Falha ao carregar dados para o relatório.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [
    adminCityIdQuery,
    activeMode,
    allRequiredFiltersSelected,
    logoDataUrl,
    primaryColor,
    reportEntityType,
    selectedEvaluation,
    selectedMunicipality,
    selectedSchool,
    selectedState,
    periodoApi,
    toast,
  ]);

  const validateAccess = useCallback(() => {
    if (!userHierarchyContext || !user?.role) return true;
    const validation = validateReportAccess(
      user.role,
      {
        state: selectedState,
        municipality: selectedMunicipality,
        school: selectedSchool,
      },
      userHierarchyContext
    );
    if (!validation.isValid) {
      toast({
        title: "Acesso Negado",
        description: validation.reason || getRestrictionMessage(user.role),
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [selectedMunicipality, selectedSchool, selectedState, toast, user?.role, userHierarchyContext]);

  const handleExport = useCallback(
    async (format: "pdf" | "pptx") => {
      if (!validateAccess()) return;
      if (!allRequiredFiltersSelected) {
        toast({
          title: "Atenção",
          description: "Selecione Estado, Município, Escola e Avaliação/Gabarito para gerar o relatório.",
          variant: "destructive",
        });
        return;
      }
      setIsGenerating(true);
      setExportProgress(10);

      // Progresso "indeterminado" (incremental) enquanto o exportador processa.
      if (exportProgressTimerRef.current) {
        window.clearInterval(exportProgressTimerRef.current);
      }
      exportProgressTimerRef.current = window.setInterval(() => {
        setExportProgress((prev) => {
          // sobe mais rápido no começo e desacelera perto de 90%
          if (prev >= 90) return prev;
          const step = prev < 50 ? 12 : 6;
          return Math.min(90, prev + step);
        });
      }, 450);

      try {
        // Se o deck ainda não existe para as seleções atuais, carregamos.
        let activeDeck = deckData;
        if (!activeDeck) {
          activeDeck = await loadDeckData();
        }

        if (!activeDeck) {
          throw new Error("Deck não disponível para exportação.");
        }
        const safeEval = selectedEvaluation.replace(/[^a-zA-Z0-9-_]+/g, "-").toLowerCase();
        const fileName = `relatorio_19-slides_${activeMode}_${safeEval}_${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : "pptx"}`;

        if (format === "pdf") {
          let deckForPdf = activeDeck;
          if (selectedMunicipality !== "all") {
            const mLogo = await resolveReportLogoForPdf(selectedMunicipality);
            if (mLogo) {
              deckForPdf = { ...activeDeck, logoDataUrl: mLogo.dataUrl };
            }
          }
          await exportPresentation19Pdf({
            deckData: deckForPdf,
            fileName,
          });
        } else {
          await exportPresentation19Pptx({
            deckData: activeDeck,
            fileName,
          });
        }

        toast({
          title: "Exportação concluída!",
          description: format === "pdf" ? "PDF gerado com sucesso." : "PPTX gerado com sucesso.",
        });
      } catch (e) {
        toast({
          title: "Erro na exportação",
          description: e instanceof Error ? e.message : "Falha ao exportar o relatório.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
        if (exportProgressTimerRef.current) {
          window.clearInterval(exportProgressTimerRef.current);
          exportProgressTimerRef.current = null;
        }
        setExportProgress(100);
        window.setTimeout(() => setExportProgress(0), 700);
      }
    },
    [activeMode, allRequiredFiltersSelected, deckData, loadDeckData, selectedEvaluation, selectedMunicipality, toast, validateAccess]
  );

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Relatório Apresentação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gere um deck exportável em PDF/PPTX com personalização de logo e cor principal.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as Presentation19Mode)}>
            <TabsList className="grid grid-cols-2 bg-muted/60 rounded-xl p-1 border border-border">
              <TabsTrigger value="answer_sheet">Cartões resposta</TabsTrigger>
              <TabsTrigger value="evaluations">Avaliações</TabsTrigger>
            </TabsList>

          <TabsContent value="answer_sheet" className="space-y-6 mt-4">
            <FilterComponentAnalise
              selectedState={selectedState}
              selectedMunicipality={selectedMunicipality}
              selectedSchool={selectedSchool}
              selectedEvaluation={selectedEvaluationAnswerSheet}
              onStateChange={setSelectedState}
              onMunicipalityChange={setSelectedMunicipality}
              onSchoolChange={setSelectedSchool}
              onEvaluationChange={setSelectedEvaluationAnswerSheet}
              isLoadingFilters={isLoadingFilters}
              onLoadingChange={setIsLoadingFilters}
              userRole={user?.role}
              canSelectState={userHierarchyContext?.restrictions.canSelectState}
              canSelectMunicipality={userHierarchyContext?.restrictions.canSelectMunicipality}
              canSelectSchool={userHierarchyContext?.restrictions.canSelectSchool}
              reportEntityType={REPORT_ENTITY_TYPE_ANSWER_SHEET}
              fallbackSchools={fallbackSchools}
              loadSchoolsAfterEvaluation={true}
              adminCityIdQuery={adminCityIdQuery}
              selectedPeriod={selectedPeriod}
              onPeriodChange={(p) => {
                setSelectedPeriod(p);
                setDeckData(null);
              }}
            />
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-6 mt-4">
            <FilterComponentAnalise
              selectedState={selectedState}
              selectedMunicipality={selectedMunicipality}
              selectedSchool={selectedSchool}
              selectedEvaluation={selectedEvaluationEval}
              onStateChange={setSelectedState}
              onMunicipalityChange={setSelectedMunicipality}
              onSchoolChange={setSelectedSchool}
              onEvaluationChange={setSelectedEvaluationEval}
              isLoadingFilters={isLoadingFilters}
              onLoadingChange={setIsLoadingFilters}
              userRole={user?.role}
              canSelectState={userHierarchyContext?.restrictions.canSelectState}
              canSelectMunicipality={userHierarchyContext?.restrictions.canSelectMunicipality}
              canSelectSchool={userHierarchyContext?.restrictions.canSelectSchool}
              fallbackSchools={fallbackSchools}
              loadSchoolsAfterEvaluation={true}
              adminCityIdQuery={adminCityIdQuery}
              selectedPeriod={selectedPeriod}
              onPeriodChange={(p) => {
                setSelectedPeriod(p);
                setDeckData(null);
              }}
              // sem reportEntityType
            />
          </TabsContent>
          </Tabs>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Personalização
              </CardTitle>
              <CardDescription>Logo e cor principal serão aplicadas ao layout do deck.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 border border-border rounded-md bg-background p-0"
                    aria-label="Cor principal"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-background text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                    aria-label="Cor principal (hex)"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Dica: use cores que combinem com o tema institucional.
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label
                    className="flex-1 flex items-center justify-center gap-2 border border-border rounded-md px-4 py-2 cursor-pointer hover:bg-muted transition-colors"
                    htmlFor="presentation-logo-upload"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Upload de Logo</span>
                  </label>
                  <input
                    id="presentation-logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await readFileAsDataUrl(file);
                        setLogoDataUrl(dataUrl);
                      } catch {
                        toast({ title: "Erro", description: "Não foi possível carregar o arquivo de logo.", variant: "destructive" });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-muted-foreground">Pré-visualização</div>
                  <img src={logoDataUrl} alt="Logo selecionada" className="h-12 w-auto object-contain border border-border rounded-md bg-white" />
                </div>
              </div>
              </div>
            </CardContent>
          </Card>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleExport("pdf")}
                disabled={isGenerating || !allRequiredFiltersSelected}
                style={{
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }}
                className="text-white hover:opacity-95"
              >
                <Download className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("pptx")}
                disabled={isGenerating || !allRequiredFiltersSelected}
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                }}
                className="hover:opacity-95"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar PPTX
              </Button>
            </div>

            {isGenerating && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Gerando relatório...</div>
                  <div className="text-xs text-muted-foreground">{exportProgress}%</div>
                </div>
                <Progress value={exportProgress} className="h-2" />
              </div>
            )}

          {deckData && (
            <div className="relative border border-border rounded-xl p-4 bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <div className="font-bold">Pré-visualização</div>
                  <div className="text-xs text-muted-foreground">
                    A exportação usa renderização nativa (sem print de tela). Slides extras aparecem quando a tabela de
                    questões tem mais de 15 linhas (uma página a cada 15 questões).
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{slidesCount} slides</div>
              </div>

              <div className="overflow-auto">
                <div>
                  <Presentation19NativePreviewDeck deckData={deckData} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

