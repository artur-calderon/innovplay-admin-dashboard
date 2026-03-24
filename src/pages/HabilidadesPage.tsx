import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Target, List, Grid, ArrowLeft, Filter, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useSkillsStore } from "@/stores/useSkillsStore";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import CategoryPickerModal from "@/components/evaluations/questions/CategoryPickerModal";
import AddSkillModal from "@/components/evaluations/questions/AddSkillModal";
import AddSkillsBatchModal from "@/components/evaluations/questions/AddSkillsBatchModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "@/components/evaluations/questions/SkillsSelector.css";

const ALLOWED_SKILL_ROLES = ["admin", "professor", "coordenador", "diretor", "tecadm"];
const BATCH_ADD_ROLES = ["admin", "tecadm"];
const DELETE_SKILL_ROLES = ["admin"];

interface Skill {
  id: string;
  code: string;
  description: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

const HabilidadesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canManageSkills = user?.role && ALLOWED_SKILL_ROLES.includes(user.role);
  const canAddBatch = user?.role && BATCH_ADD_ROLES.includes(user.role);
  const canDeleteSkills = user?.role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState<string>("all");
  const [gradeId, setGradeId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [skillSortBy, setSkillSortBy] = useState<"code-asc" | "code-desc" | "desc-asc" | "desc-desc">("code-asc");

  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const fetchSkillsByGrade = useSkillsStore((s) => s.fetchSkillsByGrade);
  const invalidateCache = useSkillsStore((s) => s.invalidateCache);

  // Carregar subjects e grades
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [subjectsRes, gradesRes] = await Promise.all([
          api.get("/subjects"),
          api.get("/grades/"),
        ]);
        setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
        setGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      }
    };
    loadInitialData();
  }, []);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      if (subjectId !== "all" && gradeId !== "all") {
        const result = await fetchSkills(subjectId, gradeId);
        setSkills(result);
      } else if (subjectId !== "all") {
        const result = await fetchSkills(subjectId);
        setSkills(result);
      } else if (gradeId !== "all") {
        const result = await fetchSkillsByGrade(gradeId);
        setSkills(result);
      } else {
        const subjectsRes = await api.get("/subjects");
        const allSubjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];
        const skillsMap = new Map<string, Skill>();

        for (const subject of allSubjects) {
          try {
            const res = await api.get(`/skills/subject/${subject.id}`);
            const list: Skill[] = Array.isArray(res.data)
              ? res.data.map((s: { id: string; code: string; description: string }) => ({
                  id: s.id,
                  code: s.code,
                  description: s.description,
                  name: `${s.code} - ${s.description}`,
                }))
              : [];
            list.forEach((s) => {
              if (!skillsMap.has(s.code)) skillsMap.set(s.code, s);
            });
          } catch {
            /* ignorar */
          }
        }
        setSkills(Array.from(skillsMap.values()));
      }
    } catch (error) {
      console.error("Erro ao carregar habilidades:", error);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId, gradeId, fetchSkills, fetchSkillsByGrade]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleSkillAdded = useCallback((count = 1) => {
    invalidateCache();
    loadSkills();
    toast({
      title: count > 1 ? `${count} habilidades adicionadas com sucesso.` : "Habilidade adicionada com sucesso.",
    });
  }, [invalidateCache, loadSkills, toast]);

  const handleDeleteSkills = useCallback(async () => {
    const ids = pendingDeleteIds;
    if (!ids || ids.length === 0) return;
    setPendingDeleteIds(null);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await api.delete(`/skills/${id}`);
        success++;
      } catch {
        failed++;
      }
    }
    invalidateCache();
    loadSkills();
    setSelectedSkillIds((prev) => prev.filter((id) => !ids.includes(id)));
    if (failed === 0) {
      toast({ title: success > 1 ? `${success} habilidades removidas com sucesso.` : "Habilidade removida com sucesso." });
    } else {
      toast({ title: "Exclusão parcial", description: `${success} removida(s), ${failed} com erro.`, variant: "destructive" });
    }
  }, [pendingDeleteIds, invalidateCache, loadSkills, toast]);

  // Filtrar por busca (declarado primeiro para evitar TDZ)
  const filteredSkills = useMemo(() => {
    if (!searchTerm) return skills;
    const searchLower = searchTerm.toLowerCase();
    return skills.filter(
      (skill) =>
        skill.code.toLowerCase().includes(searchLower) ||
        skill.description.toLowerCase().includes(searchLower)
    );
  }, [skills, searchTerm]);

  // Agrupar habilidades por categoria
  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    skills.forEach((skill) => {
      if (!skill.code) return;
      const prefix = skill.code.split(".")[0] || skill.code.split("-")[0] || "Outros";
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(skill);
    });
    return groups;
  }, [skills]);

  const filteredGroupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    filteredSkills.forEach((skill) => {
      if (!skill.code) return;
      const prefix = skill.code.split(".")[0] || skill.code.split("-")[0] || "Outros";
      if (selectedCategories.length > 0 && !selectedCategories.includes(prefix)) return;
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(skill);
    });
    const sortFn = (a: Skill, b: Skill) => {
      switch (skillSortBy) {
        case "code-asc": return a.code.localeCompare(b.code);
        case "code-desc": return b.code.localeCompare(a.code);
        case "desc-asc": return a.description.localeCompare(b.description);
        case "desc-desc": return b.description.localeCompare(a.description);
        default: return 0;
      }
    };
    const sorted: Record<string, Skill[]> = {};
    Object.entries(groups).forEach(([cat, items]) => {
      sorted[cat] = [...items].sort(sortFn);
    });
    return sorted;
  }, [filteredSkills, selectedCategories, skillSortBy]);

  const visibleSkillIds = useMemo(
    () => Object.values(filteredGroupedSkills).flat().map((s) => s.id),
    [filteredGroupedSkills]
  );

  const handleSelectAllSkills = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedSkillIds(visibleSkillIds);
    } else {
      setSelectedSkillIds([]);
    }
  }, [visibleSkillIds]);

  const handleSelectSkill = useCallback((id: string, checked: boolean) => {
    setSelectedSkillIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }, []);

  const categoriesForPicker = useMemo(
    () =>
      Object.entries(groupedSkills).map(([name, items]) => ({
        name,
        count: items.length,
      })),
    [groupedSkills]
  );

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/cadastros/questao")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 shrink-0" />
              Banco de Habilidades BNCC
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Consulte todas as habilidades da Base Nacional Comum Curricular
            </p>
          </div>
        </div>
        {canManageSkills && (
          <div className="flex flex-wrap justify-center gap-2 w-full sm:w-auto sm:justify-end">
            <Button onClick={() => setAddSkillOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar habilidade
            </Button>
            {canAddBatch && (
              <Button variant="outline" onClick={() => setAddBatchOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar em lote
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-muted/30 p-3 sm:p-4 rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Disciplina</label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as disciplinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as disciplinas</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Série</label>
            <Select value={gradeId} onValueChange={setGradeId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as séries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as séries</SelectItem>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[500px]">
        {/* Sidebar de categorias - desktop */}
        <div className="hidden lg:flex lg:w-64 xl:w-72 border rounded-lg bg-muted/50 flex-col shrink-0 h-[min(560px,70vh)] overflow-hidden">
          <div className="p-4 border-b shrink-0">
            <h4 className="font-semibold text-sm text-foreground mb-3">Categorias</h4>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start mb-2"
              onClick={() => setCategoryPickerOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Buscar categorias...
            </Button>
            <button
              onClick={() => setSelectedCategories([])}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                selectedCategories.length === 0
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Todas</span>
                <Badge variant="outline" className="text-xs">
                  {skills.length}
                </Badge>
              </div>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
            <div className="space-y-1">
              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      prev.includes(category)
                        ? prev.filter((c) => c !== category)
                        : [...prev, category]
                    )
                  }
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    selectedCategories.includes(category)
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-left truncate">{category}</span>
                    <Badge variant="outline" className="text-xs ml-2 shrink-0">
                      {categorySkills.length}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <CategoryPickerModal
          open={categoryPickerOpen}
          onOpenChange={setCategoryPickerOpen}
          categories={categoriesForPicker}
          selected={selectedCategories}
          onConfirm={setSelectedCategories}
          title="Buscar categorias"
        />

        <AddSkillModal
          open={addSkillOpen}
          onOpenChange={setAddSkillOpen}
          onSuccess={handleSkillAdded}
          subjects={subjects}
          grades={grades}
          defaultSubjectId={subjectId !== "all" ? subjectId : undefined}
          defaultGradeId={gradeId !== "all" ? gradeId : undefined}
        />

        <AddSkillsBatchModal
          open={addBatchOpen}
          onOpenChange={setAddBatchOpen}
          onSuccess={handleSkillAdded}
          subjects={subjects}
          grades={grades}
          defaultSubjectId={subjectId !== "all" ? subjectId : undefined}
          defaultGradeId={gradeId !== "all" ? gradeId : undefined}
        />

        <AlertDialog open={!!pendingDeleteIds?.length} onOpenChange={(o) => !o && setPendingDeleteIds(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir habilidade{pendingDeleteIds && pendingDeleteIds.length > 1 ? "s" : ""}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeleteIds && pendingDeleteIds.length > 1
                  ? `Tem certeza que deseja excluir as ${pendingDeleteIds.length} habilidades selecionadas? Esta ação não pode ser desfeita.`
                  : "Tem certeza que deseja excluir esta habilidade? Esta ação não pode ser desfeita."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSkills} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Área principal */}
        <div className="flex-1 flex flex-col min-w-0 border rounded-lg bg-background overflow-hidden">
          <div className="p-3 sm:p-4 border-b bg-background space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {selectedCategories.length === 0
                    ? "Todas as Habilidades"
                    : selectedCategories.length === 1
                    ? selectedCategories[0]
                    : `${selectedCategories.length} categorias selecionadas`}
                </span>
              </div>
              <div className="lg:hidden flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setCategoryPickerOpen(true)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Buscar categorias
                </Button>
              </div>
              {canDeleteSkills && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={visibleSkillIds.length > 0 && visibleSkillIds.every((id) => selectedSkillIds.includes(id))}
                    onCheckedChange={(c) => handleSelectAllSkills(!!c)}
                    aria-label="Selecionar todas as visíveis"
                  />
                  <span className="text-sm text-muted-foreground">Selecionar todas</span>
                  {selectedSkillIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setPendingDeleteIds(selectedSkillIds)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir ({selectedSkillIds.length})
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Select value={skillSortBy} onValueChange={(v: typeof skillSortBy) => setSkillSortBy(v)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code-asc">Código (A-Z)</SelectItem>
                    <SelectItem value="code-desc">Código (Z-A)</SelectItem>
                    <SelectItem value="desc-asc">Descrição (A-Z)</SelectItem>
                    <SelectItem value="desc-desc">Descrição (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="hidden sm:flex"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="hidden sm:flex"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-[400px]">
            <div className="p-3 sm:p-4 space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
                  <p className="text-muted-foreground">Carregando habilidades...</p>
                </div>
              ) : Object.keys(filteredGroupedSkills).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Nenhuma habilidade encontrada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {skills.length === 0
                      ? "Selecione uma disciplina ou série para visualizar as habilidades."
                      : "Tente ajustar os filtros de busca."}
                  </p>
                </div>
              ) : (
                Object.entries(filteredGroupedSkills)
                  .map(([category, categorySkills]) => (
                    <div key={category}>
                      <div className="skills-category-header flex items-center gap-2 mb-3 sticky top-0 bg-background z-20 py-2 sm:py-3 border-b border-border -mx-3 sm:-mx-4 px-3 sm:px-4 backdrop-blur-sm">
                        <h4 className="font-semibold text-sm sm:text-base text-foreground">
                          {category}
                        </h4>
                        <Badge variant="outline" className="text-xs bg-muted">
                          {categorySkills.length}
                        </Badge>
                      </div>
                      <div
                        className={cn(
                          "gap-2 sm:gap-3",
                          viewMode === "grid"
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3"
                            : "space-y-2"
                        )}
                      >
                        {categorySkills.map((skill) => (
                          <div
                            key={skill.id}
                            className={cn(
                              "border rounded-lg p-3 transition-all border-border hover:border-border/80 bg-card group",
                              viewMode === "grid" ? "text-center relative" : "flex items-start gap-3"
                            )}
                          >
                            {canDeleteSkills && (
                              <Checkbox
                                checked={selectedSkillIds.includes(skill.id)}
                                onCheckedChange={(c) => handleSelectSkill(skill.id, !!c)}
                                onClick={(e) => e.stopPropagation()}
                                className={cn("shrink-0 mt-0.5", viewMode === "grid" && "absolute top-2 left-2")}
                                aria-label={`Selecionar ${skill.code}`}
                              />
                            )}
                            <div
                              className={cn(
                                "flex-1 min-w-0",
                                viewMode === "grid" && "text-center",
                                viewMode === "grid" && canDeleteSkills && "pt-6"
                              )}
                            >
                              <div
                                className={cn(
                                  "font-mono text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1 break-all",
                                  viewMode === "grid" && "text-center"
                                )}
                              >
                                {skill.code}
                              </div>
                              <div
                                className={cn(
                                  "text-xs sm:text-sm text-foreground leading-tight",
                                  viewMode === "grid" && "text-center"
                                )}
                              >
                                {skill.description}
                              </div>
                            </div>
                            {canDeleteSkills && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10",
                                  viewMode === "grid" && "absolute top-2 right-2"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingDeleteIds([skill.id]);
                                }}
                                title="Excluir habilidade"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
              <div className="h-4" />
            </div>
          </ScrollArea>

          {!loading && skills.length > 0 && (
            <div className="p-3 sm:p-4 border-t bg-muted/20 text-sm text-muted-foreground text-center">
              {filteredSkills.length} habilidade{filteredSkills.length !== 1 ? "s" : ""} exibida
              {filteredSkills.length !== skills.length && ` de ${skills.length}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HabilidadesPage;
