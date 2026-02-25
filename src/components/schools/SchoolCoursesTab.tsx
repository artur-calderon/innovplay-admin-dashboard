import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Loader2, PlusCircle } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Curso {
  id: string;
  name: string;
}

interface SchoolCoursesTabProps {
  schoolId: string;
  schoolName?: string;
}

export function SchoolCoursesTab({ schoolId, schoolName }: SchoolCoursesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [linkedCourses, setLinkedCourses] = useState<Curso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Curso[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [unlinkingCourseId, setUnlinkingCourseId] = useState<string | null>(null);

  const canLinkOrUnlink = () => {
    if (!user) return false;
    return ["admin", "tecadm", "diretor", "coordenador"].includes(user.role);
  };

  const fetchLinkedCourses = async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/school/${schoolId}/courses`);
      const data = response.data;
      if (data?.courses && Array.isArray(data.courses)) {
        setLinkedCourses(
          data.courses.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      } else {
        setLinkedCourses([]);
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status !== 404 && err?.response?.status !== 403) {
        toast({
          title: "Erro",
          description: "Erro ao carregar cursos da escola.",
          variant: "destructive",
        });
      }
      setLinkedCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedCourses();
  }, [schoolId]);

  const openLinkModal = async () => {
    setIsLinkModalOpen(true);
    setSelectedCourseIds([]);
    setIsLoadingModal(true);
    try {
      const response = await api.get("/education_stages/all");
      const data = Array.isArray(response.data) ? response.data : [];
      setAvailableCourses(
        data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      );
      const linkedIds = linkedCourses.map((c) => c.id);
      setSelectedCourseIds(linkedIds);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar cursos disponíveis.",
        variant: "destructive",
      });
      setAvailableCourses([]);
    } finally {
      setIsLoadingModal(false);
    }
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleLinkCourses = async () => {
    if (selectedCourseIds.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um curso para vincular.",
        variant: "destructive",
      });
      return;
    }
    setIsLinking(true);
    try {
      const response = await api.post(`/school/${schoolId}/courses`, {
        education_stage_ids: selectedCourseIds,
      });
      const msg =
        response.data?.message ||
        `${selectedCourseIds.length} curso(s) vinculado(s) com sucesso.`;
      toast({ title: "Sucesso", description: msg, variant: "default" });
      setIsLinkModalOpen(false);
      await fetchLinkedCourses();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; details?: string } } };
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        "Erro ao vincular cursos.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkCourse = async (courseId: string) => {
    setIsUnlinking(true);
    setUnlinkingCourseId(courseId);
    try {
      await api.delete(`/school/${schoolId}/courses/${courseId}`);
      toast({
        title: "Sucesso",
        description: "Curso desvinculado da escola com sucesso.",
        variant: "default",
      });
      await fetchLinkedCourses();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; details?: string } } };
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        "Erro ao desvincular curso.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsUnlinking(false);
      setUnlinkingCourseId(null);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              Cursos da Escola
            </CardTitle>
            <CardDescription>
              Cursos/etapas de ensino vinculados a esta instituição
            </CardDescription>
          </div>
          {canLinkOrUnlink() && (
            <Button variant="outline" size="sm" onClick={openLinkModal}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Vincular cursos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : linkedCourses.length === 0 ? (
          <div className="text-center py-8">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum curso vinculado a esta instituição
            </p>
            {canLinkOrUnlink() && (
              <Button variant="outline" onClick={openLinkModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Vincular cursos
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {linkedCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">{course.name}</span>
                </div>
                {canLinkOrUnlink() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlinkCourse(course.id)}
                    disabled={isUnlinking && unlinkingCourseId === course.id}
                  >
                    {isUnlinking && unlinkingCourseId === course.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Desvinculando...
                      </>
                    ) : (
                      "Desvincular"
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular cursos à escola</DialogTitle>
            <DialogDescription>
              Selecione os cursos que deseja vincular a esta instituição. Eles
              poderão ser usados ao criar turmas.
            </DialogDescription>
          </DialogHeader>
          {isLoadingModal ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto py-2">
              {availableCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    id={`course-${course.id}`}
                    checked={selectedCourseIds.includes(course.id)}
                    onCheckedChange={() => handleToggleCourse(course.id)}
                  />
                  <label
                    htmlFor={`course-${course.id}`}
                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                  >
                    {course.name}
                  </label>
                </div>
              ))}
              {availableCourses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum curso disponível. Crie cursos em Cadastros → Curso.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinkModalOpen(false)}
              disabled={isLinking}
            >
              Cancelar
            </Button>
            <Button onClick={handleLinkCourses} disabled={isLinking || isLoadingModal}>
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                "Vincular"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
