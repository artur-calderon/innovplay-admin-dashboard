import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { generatePasswordFromName, generateEmailFromName } from "@/hooks/useEmailCheck";
import { teacherIdFromCreateResponse } from "@/lib/teacher-create-response";
import { Loader2, Users, AlertCircle, CheckCircle2, GraduationCap } from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  grade?: string | { id: string; name: string };
}

interface TeacherInClass {
  id: string;
  user_id?: string;
  vinculo_id?: string;
}

interface CreatedTeacher {
  id: string;
  nome: string;
  email: string;
  senha: string;
  error?: string;
}

interface ClassManageTeacher {
  id: string;
  nome: string;
  email: string;
}

type ClassMode = "created" | "existing";

export type BulkTeachersModalInitialEntry = "import" | "link-classes";

interface BulkManageTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  schoolCityId: string;
  classes: ClassItem[];
  classTeachers: Record<string, TeacherInClass[]>;
  onSuccess: () => void;
  /** Abre direto no passo de vincular turmas aos professores da escola */
  initialEntry?: BulkTeachersModalInitialEntry;
}

type Step = "import" | "classes";

const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const teacherClassKey = (teacherId: string, classId: string): string => `${teacherId}::${classId}`;

const getApiMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
    if (data) {
      const message = data.erro ?? data.error ?? data.message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function BulkManageTeachersModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  schoolCityId,
  classes,
  classTeachers,
  onSuccess,
  initialEntry = "import",
}: BulkManageTeachersModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("import");
  const [teachersInput, setTeachersInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingClasses, setIsSavingClasses] = useState(false);
  const [isLoadingExistingTeachers, setIsLoadingExistingTeachers] = useState(false);
  const [createProgress, setCreateProgress] = useState({ current: 0, total: 0 });
  const [linkProgress, setLinkProgress] = useState({ current: 0, total: 0 });
  const [createdTeachers, setCreatedTeachers] = useState<CreatedTeacher[]>([]);
  const [classMode, setClassMode] = useState<ClassMode>("created");
  const [classStepTeachers, setClassStepTeachers] = useState<ClassManageTeacher[]>([]);
  const [selectedByTeacher, setSelectedByTeacher] = useState<Record<string, string[]>>({});
  const [initialByTeacher, setInitialByTeacher] = useState<Record<string, string[]>>({});
  const [vinculoIdsByKey, setVinculoIdsByKey] = useState<Record<string, string>>({});

  const role = String(user?.role || "").toLowerCase();
  const canSetCity = role === "admin" || role === "tecadm";

  const parsedNames = useMemo(
    () =>
      teachersInput
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    [teachersInput]
  );

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const gradeA = typeof a.grade === "object" && a.grade ? a.grade.name : String(a.grade || "");
      const gradeB = typeof b.grade === "object" && b.grade ? b.grade.name : String(b.grade || "");
      const gradeCompare = gradeA.localeCompare(gradeB, "pt-BR", { sensitivity: "base" });
      if (gradeCompare !== 0) return gradeCompare;
      return a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" });
    });
  }, [classes]);

  useEffect(() => {
    if (!isOpen) {
      setStep("import");
      setTeachersInput("");
      setIsCreating(false);
      setIsSavingClasses(false);
      setIsLoadingExistingTeachers(false);
      setCreateProgress({ current: 0, total: 0 });
      setLinkProgress({ current: 0, total: 0 });
      setCreatedTeachers([]);
      setClassMode("created");
      setClassStepTeachers([]);
      setSelectedByTeacher({});
      setInitialByTeacher({});
      setVinculoIdsByKey({});
    }
  }, [isOpen]);

  const resolveEmail = async (name: string): Promise<string> => {
    const baseEmail = generateEmailFromName(name);
    if (!baseEmail) throw new Error("Não foi possível gerar email para o nome informado.");

    const { data } = await api.post("/users/check-email", { email: baseEmail });
    if (data?.disponivel) return baseEmail;
    return data?.email_sugerido || baseEmail;
  };

  const handleCreateTeachers = async () => {
    if (parsedNames.length === 0) {
      toast({
        title: "Lista vazia",
        description: "Informe pelo menos um professor, um por linha.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    setCreateProgress({ current: 0, total: parsedNames.length });
    const today = getTodayDate();
    const created: CreatedTeacher[] = [];

    for (const nome of parsedNames) {
      try {
        const email = await resolveEmail(nome);
        const senha = generatePasswordFromName(nome);

        const payload: Record<string, unknown> = {
          nome,
          email,
          senha,
          birth_date: today,
          escolas_ids: [schoolId],
        };

        if (canSetCity) {
          payload.city_id = schoolCityId;
        }

        const response = await api.post("/teacher", payload);
        const teacherId = teacherIdFromCreateResponse(response.data);

        if (!teacherId) {
          created.push({
            id: "",
            nome,
            email,
            senha,
            error: "Professor criado sem id retornado pela API.",
          });
          continue;
        }

        created.push({ id: teacherId, nome, email, senha });
      } catch (error: unknown) {
        const apiMessage = getApiMessage(error, "Erro ao criar professor");
        created.push({
          id: "",
          nome,
          email: generateEmailFromName(nome),
          senha: generatePasswordFromName(nome),
          error: String(apiMessage),
        });
      }
      setCreateProgress((prev) => ({ ...prev, current: Math.min(prev.current + 1, prev.total) }));
    }

    setCreatedTeachers(created);

    const successful = created.filter((teacher) => teacher.id && !teacher.error);
    if (successful.length === 0) {
      toast({
        title: "Nenhum professor criado",
        description: "Verifique os erros e tente novamente.",
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    openClassStep(
      successful.map((teacher) => ({
        id: teacher.id,
        nome: teacher.nome,
        email: teacher.email,
      })),
      "created"
    );
    setIsCreating(false);
  };

  const buildClassSelections = useCallback(
    (teachers: ClassManageTeacher[]) => {
      const initialSelection: Record<string, string[]> = {};
      const vinculoMap: Record<string, string> = {};

      teachers.forEach((teacher) => {
        const selectedClassIds: string[] = [];
        Object.entries(classTeachers).forEach(([classId, linkedTeachers]) => {
          const match = linkedTeachers.find(
            (linked) => linked.id === teacher.id || linked.user_id === teacher.id
          );
          if (match) {
            selectedClassIds.push(classId);
            if (match.vinculo_id) {
              vinculoMap[teacherClassKey(teacher.id, classId)] = match.vinculo_id;
            }
          }
        });
        initialSelection[teacher.id] = selectedClassIds;
      });

      return { initialSelection, vinculoMap };
    },
    [classTeachers]
  );

  const openClassStep = useCallback(
    (teachers: ClassManageTeacher[], mode: ClassMode) => {
      const { initialSelection, vinculoMap } = buildClassSelections(teachers);
      setClassMode(mode);
      setClassStepTeachers(teachers);
      setInitialByTeacher(initialSelection);
      setSelectedByTeacher(initialSelection);
      setVinculoIdsByKey(vinculoMap);
      setStep("classes");
    },
    [buildClassSelections]
  );

  const openClassStepFromExisting = useCallback(async () => {
    try {
      setIsLoadingExistingTeachers(true);
      setStep("classes");
      setClassStepTeachers([]);
      const response = await api.get(`/teacher/school/${schoolId}`);
      const list = Array.isArray(response.data?.professores) ? response.data.professores : [];

      const dedup = new Map<string, ClassManageTeacher>();
      list.forEach((item: Record<string, unknown>) => {
        const professor = (item.professor ?? {}) as Record<string, unknown>;
        const usuario = (item.usuario ?? {}) as Record<string, unknown>;
        const id = String(professor.id ?? usuario.id ?? "").trim();
        const nome = String(professor.name ?? usuario.name ?? "").trim();
        const email = String(professor.email ?? usuario.email ?? "").trim();
        if (!id || !nome) return;
        if (!dedup.has(id)) {
          dedup.set(id, { id, nome, email });
        }
      });

      const teachers = Array.from(dedup.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
      );

      if (teachers.length === 0) {
        toast({
          title: "Sem professores",
          description: "Nenhum professor encontrado na escola para vincular turmas.",
          variant: "destructive",
        });
        return;
      }

      openClassStep(teachers, "existing");
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: getApiMessage(error, "Não foi possível carregar os professores da escola."),
        variant: "destructive",
      });
    } finally {
      setIsLoadingExistingTeachers(false);
    }
  }, [schoolId, toast, openClassStep]);

  useLayoutEffect(() => {
    if (!isOpen || initialEntry !== "link-classes") return;
    setStep("classes");
  }, [isOpen, initialEntry]);

  useEffect(() => {
    if (!isOpen || initialEntry !== "link-classes") return;
    void openClassStepFromExisting();
    // Intencional: só ao abrir o modal nesse modo (evita refetch ao mudar classTeachers).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialEntry]);

  const openClassStepFromCreated = () => {
    const successful = createdTeachers
      .filter((teacher) => teacher.id && !teacher.error)
      .map((teacher) => ({
        id: teacher.id,
        nome: teacher.nome,
        email: teacher.email,
      }));

    if (successful.length === 0) {
      toast({
        title: "Sem professores do lote",
        description: "Crie ao menos um professor no lote para usar este atalho.",
        variant: "destructive",
      });
      return;
    }

    openClassStep(successful, "created");
  };

  const handleToggleClass = (teacherId: string, classId: string) => {
    setSelectedByTeacher((prev) => {
      const current = prev[teacherId] || [];
      const exists = current.includes(classId);
      return {
        ...prev,
        [teacherId]: exists ? current.filter((id) => id !== classId) : [...current, classId],
      };
    });
  };

  const handleSaveClasses = async () => {
    const validTeachers = classStepTeachers;
    if (validTeachers.length === 0) {
      toast({
        title: "Sem professores selecionados",
        description: "Selecione professores para vincular turmas.",
        variant: "destructive",
      });
      return;
    }

    const totalOperations = validTeachers.reduce((acc, teacher) => {
      const current = new Set(selectedByTeacher[teacher.id] || []);
      const initial = new Set(initialByTeacher[teacher.id] || []);
      const toAddCount = [...current].filter((classId) => !initial.has(classId)).length;
      const toRemoveCount = [...initial].filter((classId) => !current.has(classId)).length;
      return acc + toAddCount + toRemoveCount;
    }, 0);

    setIsSavingClasses(true);
    setLinkProgress({ current: 0, total: totalOperations });
    const errors: string[] = [];

    for (const teacher of validTeachers) {
      const current = new Set(selectedByTeacher[teacher.id] || []);
      const initial = new Set(initialByTeacher[teacher.id] || []);

      const toAdd = [...current].filter((classId) => !initial.has(classId));
      const toRemove = [...initial].filter((classId) => !current.has(classId));

      for (const classId of toAdd) {
        try {
          await api.post("/teacher-class", {
            teacher_id: teacher.id,
            class_id: classId,
          });
        } catch (error: unknown) {
          const apiMessage = getApiMessage(error, "Erro ao vincular turma");
          errors.push(`${teacher.nome}: ${apiMessage}`);
        }
        setLinkProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }

      for (const classId of toRemove) {
        const vinculoId = vinculoIdsByKey[teacherClassKey(teacher.id, classId)];
        if (!vinculoId) continue;
        try {
          await api.delete(`/teacher-class/${vinculoId}`);
        } catch (error: unknown) {
          const apiMessage = getApiMessage(error, "Erro ao remover turma");
          errors.push(`${teacher.nome}: ${apiMessage}`);
        }
        setLinkProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }
    }

    if (errors.length > 0) {
      toast({
        title: "Concluído com pendências",
        description: `${errors.length} vínculo(s) apresentaram erro.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Turmas vinculadas/desvinculadas com sucesso.",
      });
    }

    setIsSavingClasses(false);
    setLinkProgress({ current: 0, total: 0 });
    onSuccess();
    onClose();
  };

  const createdSuccessCount = createdTeachers.filter((teacher) => teacher.id && !teacher.error).length;
  const createdErrorCount = createdTeachers.filter((teacher) => teacher.error).length;
  const teachersForClassStep = classStepTeachers;

  const isProcessing = isCreating || isSavingClasses || isLoadingExistingTeachers;
  const createProgressPercent =
    createProgress.total > 0 ? Math.round((createProgress.current / createProgress.total) * 100) : 0;
  const linkProgressPercent =
    linkProgress.total > 0 ? Math.round((linkProgress.current / linkProgress.total) * 100) : 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) return;
        if (isProcessing) {
          toast({
            title: "Processamento em andamento",
            description: "Aguarde finalizar para não interromper o cadastro/vínculo.",
            variant: "destructive",
          });
          return;
        }
        onClose();
      }}
    >
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Professores em lote
          </DialogTitle>
          <DialogDescription>
            Escola: {schoolName}. Cadastre por lista de nomes e vincule turmas com checkboxes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === "import" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">1) Lista de professores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label htmlFor="teachers-list">Um nome por linha</Label>
                  <Textarea
                    id="teachers-list"
                    value={teachersInput}
                    onChange={(event) => setTeachersInput(event.target.value)}
                    placeholder={"Maria Silva\nJoao Pereira\nAna Souza"}
                    className="min-h-[180px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    {parsedNames.length} nome(s) válido(s).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Você também pode gerenciar turmas de professores já cadastrados a qualquer momento.
                  </p>
                  {isCreating && (
                    <div className="space-y-2 border rounded-md p-3 bg-blue-50/60 dark:bg-blue-950/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Adicionando professores...</span>
                        <span>
                          {createProgress.current}/{createProgress.total}
                        </span>
                      </div>
                      <Progress value={createProgressPercent} />
                      <p className="text-xs text-muted-foreground">
                        Não feche a aba até concluir a criação dos professores.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {createdTeachers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resultado do cadastro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                        {createdSuccessCount} criado(s)
                      </Badge>
                      {createdErrorCount > 0 && (
                        <Badge variant="destructive">{createdErrorCount} com erro</Badge>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {createdTeachers.map((teacher, index) => (
                        <div
                          key={`${teacher.nome}-${index}`}
                          className="border rounded-md p-3 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="font-medium text-sm">{teacher.nome}</p>
                            <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                            {!teacher.error && (
                              <p className="text-xs text-muted-foreground">Senha: {teacher.senha}</p>
                            )}
                            {teacher.error && (
                              <p className="text-xs text-red-600">{teacher.error}</p>
                            )}
                          </div>
                          {teacher.error ? (
                            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  Turmas por professor {classMode === "created" ? "(lote atual)" : "(Escola atual)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={classMode === "created" ? "default" : "outline"}
                    size="sm"
                    onClick={openClassStepFromCreated}
                    disabled={isSavingClasses}
                  >
                    Professores do lote
                  </Button>
                  <Button
                    variant={classMode === "existing" ? "default" : "outline"}
                    size="sm"
                    onClick={openClassStepFromExisting}
                    disabled={isSavingClasses || isLoadingExistingTeachers}
                  >
                    {isLoadingExistingTeachers && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Professores da escola
                  </Button>
                </div>
                {isSavingClasses && (
                  <div className="space-y-2 border rounded-md p-3 bg-purple-50/60 dark:bg-purple-950/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Atrelando turmas...</span>
                      <span>
                        {linkProgress.current}/{linkProgress.total}
                      </span>
                    </div>
                    <Progress value={linkProgressPercent} />
                    <p className="text-xs text-muted-foreground">
                      Não feche a aba até concluir o vínculo/desvínculo das turmas.
                    </p>
                  </div>
                )}

                {isLoadingExistingTeachers && teachersForClassStep.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando professores...</p>
                  </div>
                ) : teachersForClassStep.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum professor disponível para vincular turmas neste modo.
                  </p>
                ) : (
                  teachersForClassStep.map((teacher) => (
                    <div key={teacher.id} className="border rounded-md p-3 space-y-3">
                      <div>
                        <p className="font-medium text-sm">{teacher.nome}</p>
                        <p className="text-xs text-muted-foreground">{teacher.email}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {sortedClasses.map((classItem) => {
                          const gradeName =
                            typeof classItem.grade === "object" && classItem.grade
                              ? classItem.grade.name
                              : String(classItem.grade || "Sem série");
                          const checked = (selectedByTeacher[teacher.id] || []).includes(classItem.id);
                          return (
                            <label
                              key={`${teacher.id}-${classItem.id}`}
                              className="flex items-center gap-2 border rounded-md px-2 py-1.5 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => handleToggleClass(teacher.id, classItem.id)}
                              />
                              <span className="truncate">
                                {gradeName} - {classItem.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>

          {step === "import" ? (
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateTeachers} disabled={isCreating || parsedNames.length === 0}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar professores
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("import")}
                disabled={isProcessing}
              >
                Voltar
              </Button>
              <Button onClick={handleSaveClasses} disabled={isSavingClasses}>
                {isSavingClasses && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar turmas
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
