import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/context/authContext";
import { getUserHierarchyContext } from "@/utils/userHierarchy";

interface Curso {
  id: string;
  name: string;
}

interface FormData {
  name: string;
}

interface School {
  id: string;
  name: string;
}

interface SchoolWithCourses extends School {
  courses: Curso[];
}

export default function Curso() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Curso | null>(null);
  const [deletingItem, setDeletingItem] = useState<Curso | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
  });
  const { toast } = useToast();

  // Estados para vincular cursos à escola
  const [availableCourses, setAvailableCourses] = useState<Curso[]>([]);
  const [linkedCoursesIds, setLinkedCoursesIds] = useState<string[]>([]);
  const [linkedCourses, setLinkedCourses] = useState<Curso[]>([]);
  const [selectedCoursesIds, setSelectedCoursesIds] = useState<string[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLinkingCourses, setIsLinkingCourses] = useState(false);
  const [isUnlinkingCourse, setIsUnlinkingCourse] = useState(false);
  const [unlinkingCourseId, setUnlinkingCourseId] = useState<string | null>(null);
  
  // Estado para modal do admin (criar ou vincular)
  const [adminModalTab, setAdminModalTab] = useState<"create" | "link">("create");
  
  // Estado para cursos vinculados à escola na página principal
  const [schoolLinkedCoursesIds, setSchoolLinkedCoursesIds] = useState<string[]>([]);
  const [currentSchoolForPage, setCurrentSchoolForPage] = useState<School | null>(null);
  
  // Estado para tecadm/professor: escolas com seus cursos
  const [schoolsWithCourses, setSchoolsWithCourses] = useState<SchoolWithCourses[]>([]);
  const [isLoadingSchoolsWithCourses, setIsLoadingSchoolsWithCourses] = useState(false);

  useEffect(() => {
    // Só executar quando o user estiver disponível
    if (!user?.role) return;
    
    // Para tecadm e professor: buscar escolas com cursos
    if (user.role === 'tecadm' || user.role === 'professor') {
      // Para tecadm/professor, usar isLoadingSchoolsWithCourses, então definir isLoading como false
      setIsLoading(false);
      fetchSchoolsWithCourses();
    } else if (user.role === 'admin') {
      // Admin: apenas buscar todos os cursos (não precisa buscar vinculados)
      fetchCursos();
    } else {
      // Para outros roles (diretor, coordenador): buscar cursos vinculados à escola
      // fetchCursos já busca os cursos vinculados, então não precisa chamar fetchSchoolLinkedCourses aqui
      fetchCursos();
      // fetchSchoolLinkedCourses será chamado depois de fetchCursos terminar, se necessário
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Buscar cursos vinculados à escola na página principal
  const fetchSchoolLinkedCourses = async () => {
    if (!user) return;
    
    try {
      // Para admin: não buscar cursos vinculados (vê todos)
      if (user.role === 'admin') {
        return;
      }
      
      // Para tecadm/diretor/coordenador: buscar escola e cursos vinculados
      if (canLinkCoursesToSchool()) {
        const school = await fetchCurrentSchool();
        if (school) {
          setCurrentSchoolForPage(school);
          const linkedData = await fetchLinkedCourses(school.id);
          setSchoolLinkedCoursesIds(linkedData.ids);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar cursos vinculados à escola:", error);
    }
  };

  const fetchCursos = async () => {
    try {
      setIsLoading(true);
      
      // Admin: buscar todos os cursos usando /education_stages/all
      if (user?.role === 'admin') {
        const response = await api.get("/education_stages/all");
        setCursos(Array.isArray(response.data) ? response.data : []);
      } else {
        // Para outros usuários (tecadm, diretor, coordenador, professor):
        // Usar GET /school/{school_id}/courses para buscar cursos vinculados à escola
        const school = await fetchCurrentSchool();
        
        if (!school?.id) {
          // Se não houver escola, não há cursos para mostrar
          setCursos([]);
          setSchoolLinkedCoursesIds([]);
          setCurrentSchoolForPage(null);
          // Não fazer return aqui - deixar o finally executar
        } else {
          try {
            const response = await api.get(`/school/${school.id}/courses`);
            const data = response.data;
            
            // A resposta tem formato: { school_id, school_name, courses: [...] }
            if (data?.courses && Array.isArray(data.courses)) {
              setCursos(data.courses);
              // Atualizar também o currentSchoolForPage e schoolLinkedCoursesIds
              setCurrentSchoolForPage(school);
              setSchoolLinkedCoursesIds(data.courses.map((c: Curso) => c.id));
            } else {
              console.warn("fetchCursos: Resposta não tem formato esperado ou courses não é array:", data);
              setCursos([]);
              setSchoolLinkedCoursesIds([]);
            }
          } catch (error: any) {
            console.error("fetchCursos: Erro ao buscar cursos vinculados:", error);
            
            // Se for erro 404 ou 403 (escola não encontrada/sem permissão), não mostrar toast
            // apenas retornar array vazio
            if (error?.response?.status === 404 || error?.response?.status === 403) {
              setCursos([]);
              setSchoolLinkedCoursesIds([]);
              setCurrentSchoolForPage(null);
              // Não fazer return aqui - deixar o finally executar
            } else {
              throw error; // Re-lançar para ser tratado no catch externo
            }
          }
        }
      }
    } catch (error) {
      console.error("fetchCursos: Erro geral ao buscar cursos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cursos. Verifique sua conexão.",
        variant: "destructive",
      });
      setCursos([]);
      setSchoolLinkedCoursesIds([]);
      setCurrentSchoolForPage(null);
    } finally {
      // Garantir que isLoading seja sempre atualizado, mesmo em caso de erro
      setIsLoading(false);
    }
  };

  // Verificar se o usuário pode vincular cursos à escola
  const canLinkCoursesToSchool = () => {
    if (!user) return false;
    return ['admin', 'tecadm', 'diretor', 'coordenador'].includes(user.role);
  };

  // Verificar se o usuário pode criar cursos
  const canCreateCourse = () => {
    if (!user) return false;
    return user.role === 'admin';
  };

  // Verificar se o usuário pode editar/excluir cursos
  const canEditOrDeleteCourse = () => {
    if (!user) return false;
    return ['admin'].includes(user.role);
  };

  // Verificar se é professor (só visualiza)
  const isProfessor = () => {
    if (!user) return false;
    return user.role === 'professor';
  };

  // Buscar escola atual para diretor/coordenador
  const fetchCurrentSchool = async () => {
    if (!user?.id || !user?.role) return null;

    try {
      if (user.role === 'diretor' || user.role === 'coordenador') {
        const context = await getUserHierarchyContext(user.id, user.role);
        if (context.school) {
          return {
            id: context.school.id,
            name: context.school.name
          };
        }
        
        // Tentar buscar via endpoint alternativo
        try {
          const response = await api.get(`/users/school/${user.id}`);
          const schoolData = response.data?.school || response.data;
          if (schoolData?.id) {
            return {
              id: schoolData.id,
              name: schoolData.name || schoolData.nome
            };
          }
        } catch (error) {
          console.error("Erro ao buscar escola do usuário:", error);
        }
      } else if (user.role === 'tecadm') {
        const context = await getUserHierarchyContext(user.id, user.role);
        if (context.municipality?.id) {
          // Buscar escolas do município
          try {
            const response = await api.get(`/school/city/${context.municipality.id}`);
            const schools = response.data || [];
            setAvailableSchools(schools.map((s: any) => ({
              id: s.id,
              name: s.name || s.nome
            })));
          } catch (error) {
            console.error("Erro ao buscar escolas do município:", error);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar escola atual:", error);
    }

    return null;
  };

  // Buscar escolas com cursos para tecadm/professor
  const fetchSchoolsWithCourses = async () => {
    if (!user || (user.role !== 'tecadm' && user.role !== 'professor')) return;
    
    setIsLoadingSchoolsWithCourses(true);
    try {
      // Buscar município do usuário
      const context = await getUserHierarchyContext(user.id, user.role);

      if (!context.municipality?.id) {
        setSchoolsWithCourses([]);
        // Não fazer return aqui - deixar o finally executar
      } else {
        // Buscar escolas do município
        let schools = [];
        try {
          const schoolsResponse = await api.get(`/school/city/${context.municipality.id}`);
          schools = schoolsResponse.data || [];
        } catch (error: any) {
          // Se a API retornar erro 404/400, SEMPRE exibir exatamente a mensagem do backend (campo message), nunca mensagem genérica
          if (error?.response?.status === 404 || error?.response?.status === 400) {
            setSchoolsWithCourses([]);
            const backendMsg = error?.response?.data?.message;
            toast({
              title: backendMsg ? 'Aviso' : 'Erro',
              description: backendMsg || `Erro ${error?.response?.status} ao buscar escolas do município.`,
              variant: backendMsg ? 'default' : 'destructive',
            });
            return;
          } else {
            console.error('Erro ao buscar escolas do município:', error);
            toast({
              title: 'Erro',
              description: 'Erro ao buscar escolas do município.',
              variant: 'destructive',
            });
            setSchoolsWithCourses([]);
            return;
          }
        }

        // Para cada escola, buscar cursos vinculados
        const schoolsWithCoursesData: SchoolWithCourses[] = await Promise.all(
          schools.map(async (school: any) => {
            try {
              const coursesResponse = await api.get(`/school/${school.id}/courses`);
              const coursesData = coursesResponse.data;

              const courses = coursesData?.courses && Array.isArray(coursesData.courses)
                ? coursesData.courses
                : [];

              return {
                id: school.id,
                name: school.name || school.nome,
                courses: courses
              };
            } catch (error: any) {
              // Se der erro 404/403, retornar escola sem cursos
              if (error?.response?.status === 404 || error?.response?.status === 403) {
                return {
                  id: school.id,
                  name: school.name || school.nome,
                  courses: []
                };
              }
              throw error;
            }
          })
        );

        setSchoolsWithCourses(schoolsWithCoursesData);
      }
    } catch (error) {
      console.error('Erro ao buscar escolas com cursos:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar escolas e cursos.',
        variant: 'destructive',
      });
      setSchoolsWithCourses([]);
    } finally {
      setIsLoadingSchoolsWithCourses(false);
    }
  };

  // Buscar cursos já vinculados à escola usando a nova rota
  const fetchLinkedCourses = async (schoolId: string) => {
    if (!schoolId) {
      return { ids: [], courses: [] };
    }

    try {
      // Usar a nova rota GET /school/<school_id>/courses
      const response = await api.get(`/school/${schoolId}/courses`);
      const data = response.data;
      
      // Verificar se a resposta tem o formato esperado
      if (data?.courses && Array.isArray(data.courses)) {
        const courses = data.courses.map((course: any) => ({
          id: course.id,
          name: course.name
        }));
        const result = {
          ids: courses.map((c: Curso) => c.id),
          courses: courses
        };
        return result;
      }
      
      console.warn("Formato de resposta inesperado:", data);
      // Se não tiver no formato esperado, retornar arrays vazios
      return { ids: [], courses: [] };
    } catch (error: any) {
      console.error("Erro ao buscar cursos vinculados:", error);
      
      // Se for erro de escola não encontrada ou sem permissão, não mostrar toast
      // pois isso pode ser tratado no modal
      if (error?.response?.status === 404 || error?.response?.status === 403) {
        return { ids: [], courses: [] };
      }
      
      return { ids: [], courses: [] };
    }
  };

  const openCreateModal = async () => {
    setEditingItem(null);
    setFormData({ name: "" });
    setSelectedCoursesIds([]);
    setCurrentSchool(null);
    setSelectedSchoolId("");
    setAdminModalTab("create"); // Reset para tab de criar
    setIsModalOpen(true);

    // Se o usuário pode vincular cursos à escola, carregar dados necessários
    if (canLinkCoursesToSchool() && user?.role !== 'admin') {
      setIsLoadingCourses(true);
      
      try {
        // Buscar cursos disponíveis usando a nova rota GET /education_stages/all
        const coursesResponse = await api.get("/education_stages/all");
        const coursesData = coursesResponse.data;
        
        // A rota retorna um array direto de cursos
        if (Array.isArray(coursesData)) {
          setAvailableCourses(coursesData);
        } else {
          // Se vier com formato de erro, tratar
          if (coursesData?.error) {
            throw new Error(coursesData.error || coursesData.details || "Erro ao buscar cursos");
          }
          setAvailableCourses([]);
        }

        // Buscar escola atual
        const school = await fetchCurrentSchool();
        if (school) {
          setCurrentSchool(school);
          setSelectedSchoolId(school.id);
          
          // Buscar cursos já vinculados usando a nova rota
          const linkedData = await fetchLinkedCourses(school.id);
          setLinkedCoursesIds(linkedData.ids);
          setLinkedCourses(linkedData.courses);
          setSelectedCoursesIds(linkedData.ids); // Pré-selecionar cursos já vinculados
        }
      } catch (error: any) {
        console.error("Erro ao carregar dados do modal:", error);
        const errorMessage = error?.response?.data?.error || 
                            error?.response?.data?.details ||
                            "Erro ao carregar dados. Tente novamente.";
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingCourses(false);
      }
    } else if (user?.role === 'admin') {
      // Admin: carregar dados para ambas as opções (criar ou vincular)
      setIsLoadingCourses(true);
      
      try {
        // Buscar cursos disponíveis
        const coursesResponse = await api.get("/education_stages/all");
        const coursesData = coursesResponse.data;
        
        if (Array.isArray(coursesData)) {
          setAvailableCourses(coursesData);
        } else if (coursesData?.error) {
          throw new Error(coursesData.error || coursesData.details || "Erro ao buscar cursos");
        } else {
          setAvailableCourses([]);
        }

        // Buscar todas as escolas para admin poder selecionar
        try {
          const schoolsResponse = await api.get("/school");
          const schools = schoolsResponse.data || [];
          setAvailableSchools(schools.map((s: any) => ({
            id: s.id,
            name: s.name || s.nome
          })));
        } catch (error) {
          console.error("Erro ao buscar escolas:", error);
        }
      } catch (error: any) {
        console.error("Erro ao carregar dados do modal:", error);
        const errorMessage = error?.response?.data?.error || 
                            error?.response?.data?.details ||
                            "Erro ao carregar dados. Tente novamente.";
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingCourses(false);
      }
    }
  };

  const openEditModal = (item: Curso) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (item: Curso) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Handler para seleção de escola (tecadm ou admin)
  const handleSchoolChange = async (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setCurrentSchool(availableSchools.find(s => s.id === schoolId) || null);
    setIsLoadingCourses(true);
    setLinkedCoursesIds([]);
    setLinkedCourses([]);
    setSelectedCoursesIds([]);
    
    try {
      // Buscar cursos já vinculados à escola selecionada usando a nova rota
      const linkedData = await fetchLinkedCourses(schoolId);
      setLinkedCoursesIds(linkedData.ids);
      setLinkedCourses(linkedData.courses);
      setSelectedCoursesIds(linkedData.ids); // Pré-selecionar cursos já vinculados
    } catch (error: any) {
      console.error("Erro ao carregar cursos vinculados:", error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.details ||
                          "Erro ao carregar cursos vinculados";
      
      // Só mostrar toast se não for erro de permissão ou não encontrado (já tratado no modal)
      if (error?.response?.status !== 404 && error?.response?.status !== 403) {
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Handler para toggle de curso
  const handleCourseToggle = (courseId: string) => {
    setSelectedCoursesIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Admin: Verificar qual tab está ativa
    if (user?.role === 'admin' && !editingItem) {
      if (adminModalTab === 'link') {
        // Vincular cursos à escola
        const schoolId = selectedSchoolId;
        
        if (!schoolId) {
          toast({
            title: "Erro",
            description: "Selecione uma escola primeiro",
            variant: "destructive",
          });
          return;
        }

        if (selectedCoursesIds.length === 0) {
          toast({
            title: "Erro",
            description: "Selecione pelo menos um curso para vincular",
            variant: "destructive",
          });
          return;
        }

        setIsLinkingCourses(true);
        try {
          const response = await api.post(`/school/${schoolId}/courses`, {
            education_stage_ids: selectedCoursesIds
          });

          const responseData = response.data;
          let message = responseData?.message || `${selectedCoursesIds.length} curso(s) vinculado(s) à escola com sucesso!`;
          
          if (responseData?.already_linked_courses && responseData.already_linked_courses.length > 0) {
            message += ` ${responseData.already_linked_courses.length} curso(s) já estava(m) vinculado(s).`;
          }

          toast({
            title: "Sucesso",
            description: message,
            variant: "default",
          });
          
          // Aguardar um pouco para garantir que o backend processou
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Atualizar lista de cursos vinculados
          setIsLoadingCourses(true);
          try {
            const linkedData = await fetchLinkedCourses(schoolId);
            console.log("Cursos vinculados após vincular (admin):", linkedData);
            
            setLinkedCoursesIds(linkedData.ids);
            setLinkedCourses(linkedData.courses);
            
            // Atualizar seleção para incluir os cursos recém-vinculados
            setSelectedCoursesIds(linkedData.ids);
          } finally {
            setIsLoadingCourses(false);
          }
          
        // Recarregar lista geral de cursos (admin sempre usa fetchCursos)
        await fetchCursos();
        
        // Não fechar o modal imediatamente - deixar usuário ver os cursos vinculados
        // setIsModalOpen(false);
        } catch (error: any) {
          console.error("Erro ao vincular cursos:", error);
          let errorMessage = "Erro ao vincular cursos à escola";
          
          if (error?.response?.data?.error) {
            errorMessage = error.response.data.error;
            
            if (error.response.data.missing_course_ids) {
              errorMessage += ` Cursos não encontrados: ${error.response.data.missing_course_ids.join(", ")}`;
            }
          } else if (error?.response?.data?.details) {
            errorMessage = error.response.data.details;
          }
          
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsLinkingCourses(false);
        }
        return;
      } else {
        // Criar novo curso (tab create)
        if (!formData.name.trim()) {
          toast({
            title: "Erro",
            description: "Nome é obrigatório",
            variant: "destructive",
          });
          return;
        }

        setIsLinkingCourses(true);
        try {
          await api.post("/education_stages", {
            name: formData.name.trim()
          });

          toast({
            title: "Sucesso",
            description: "Curso criado com sucesso!",
            variant: "default",
          });
          
          await fetchCursos();
          
          setIsModalOpen(false);
          setFormData({ name: "" });
        } catch (error: any) {
          console.error("Erro ao criar curso:", error);
          const errorMessage = error?.response?.data?.error || 
                              error?.response?.data?.details ||
                              error?.response?.data?.erro || 
                              "Erro ao criar curso";
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsLinkingCourses(false);
        }
        return;
      }
    }

    // Se for tecadm/diretor/coordenador, vincular cursos à escola
    if (canLinkCoursesToSchool() && user?.role !== 'admin') {
      const schoolId = user?.role === 'tecadm' ? selectedSchoolId : currentSchool?.id;
      
      if (!schoolId) {
        toast({
          title: "Erro",
          description: user?.role === 'tecadm' 
            ? "Selecione uma escola primeiro" 
            : "Não foi possível identificar a escola",
          variant: "destructive",
        });
        return;
      }

      if (selectedCoursesIds.length === 0) {
        toast({
          title: "Erro",
          description: "Selecione pelo menos um curso para vincular",
          variant: "destructive",
        });
        return;
      }

      setIsLinkingCourses(true);
      try {
        // Vincular cursos à escola usando POST /school/<school_id>/courses
        // A API espera education_stage_ids (array)
        const response = await api.post(`/school/${schoolId}/courses`, {
          education_stage_ids: selectedCoursesIds
        });

        const responseData = response.data;
        let message = responseData?.message || `${selectedCoursesIds.length} curso(s) vinculado(s) à escola com sucesso!`;
        
        // Se houver cursos que já estavam vinculados, mostrar informação adicional
        if (responseData?.already_linked_courses && responseData.already_linked_courses.length > 0) {
          message += ` ${responseData.already_linked_courses.length} curso(s) já estava(m) vinculado(s).`;
        }

        toast({
          title: "Sucesso",
          description: message,
          variant: "default",
        });
        
        // Aguardar um pouco para garantir que o backend processou
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Atualizar lista de cursos vinculados
        setIsLoadingCourses(true);
        try {
          const linkedData = await fetchLinkedCourses(schoolId);
          console.log("Cursos vinculados após vincular:", linkedData);
          
          setLinkedCoursesIds(linkedData.ids);
          setLinkedCourses(linkedData.courses);
          
          // Atualizar seleção para incluir os cursos recém-vinculados
          setSelectedCoursesIds(linkedData.ids);
        } finally {
          setIsLoadingCourses(false);
        }
        
        // Recarregar lista geral de cursos e cursos vinculados
        if (user?.role === 'tecadm' || user?.role === 'professor') {
          await fetchSchoolsWithCourses();
        } else {
          await fetchCursos();
          await fetchSchoolLinkedCourses();
        }
        
        // Não fechar o modal imediatamente - deixar usuário ver os cursos vinculados
        // setIsModalOpen(false);
      } catch (error: any) {
        console.error("Erro ao vincular cursos:", error);
        let errorMessage = "Erro ao vincular cursos à escola";
        
        if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
          
          // Tratar erros específicos
          if (error.response.data.missing_course_ids) {
            errorMessage += ` Cursos não encontrados: ${error.response.data.missing_course_ids.join(", ")}`;
          }
        } else if (error?.response?.data?.details) {
          errorMessage = error.response.data.details;
        }
        
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLinkingCourses(false);
      }
    } else {
      // Comportamento original para admin (criar novo curso)
      if (!formData.name.trim()) {
        toast({
          title: "Erro",
          description: "Nome é obrigatório",
          variant: "destructive",
        });
        return;
      }

      setIsLinkingCourses(true);
      try {
        // Criar novo curso usando POST /education_stages
        await api.post("/education_stages", {
          name: formData.name.trim()
        });

        toast({
          title: "Sucesso",
          description: "Curso criado com sucesso!",
          variant: "default",
        });
        
        // Recarregar lista de cursos e cursos vinculados
        if (user?.role === 'tecadm' || user?.role === 'professor') {
          await fetchSchoolsWithCourses();
        } else {
          await fetchCursos();
          await fetchSchoolLinkedCourses();
        }
        
        setIsModalOpen(false);
        setFormData({ name: "" });
      } catch (error: any) {
        console.error("Erro ao criar curso:", error);
        const errorMessage = error?.response?.data?.error || 
                            error?.response?.data?.details ||
                            error?.response?.data?.erro || 
                            "Erro ao criar curso";
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLinkingCourses(false);
      }
    }
  };

  // Handler para desvincular curso da escola
  const handleUnlinkCourse = async (courseId: string, schoolId: string) => {
    if (!courseId || !schoolId) return;

    setIsUnlinkingCourse(true);
    setUnlinkingCourseId(courseId);
    
    try {
      // Desvincular curso da escola usando DELETE /school/<school_id>/courses/<course_id>
      await api.delete(`/school/${schoolId}/courses/${courseId}`);

      toast({
        title: "Sucesso",
        description: "Curso desvinculado da escola com sucesso!",
        variant: "default",
      });
      
      // Atualizar lista de cursos vinculados
      const linkedData = await fetchLinkedCourses(schoolId);
      setLinkedCoursesIds(linkedData.ids);
      setLinkedCourses(linkedData.courses);
      setSelectedCoursesIds(linkedData.ids);
      
      // Recarregar lista de cursos e cursos vinculados na página principal
      if (user?.role === 'tecadm' || user?.role === 'professor') {
        await fetchSchoolsWithCourses();
      } else {
        await fetchCursos();
        await fetchSchoolLinkedCourses();
      }
    } catch (error: any) {
      console.error("Erro ao desvincular curso:", error);
      let errorMessage = "Erro ao desvincular curso da escola";
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
        
        // Tratar erro específico de turmas vinculadas
        if (error.response.data.error.includes("turmas vinculadas")) {
          errorMessage = error.response.data.error;
          if (error.response.data.details) {
            errorMessage += ` ${error.response.data.details}`;
          }
        }
      } else if (error?.response?.data?.details) {
        errorMessage = error.response.data.details;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUnlinkingCourse(false);
      setUnlinkingCourseId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setIsLinkingCourses(true); // Reutilizando estado de loading
    try {
      // Deletar curso usando DELETE /education_stages/<id>
      await api.delete(`/education_stages/${deletingItem.id}`);

      toast({
        title: "Sucesso",
        description: "Curso excluído com sucesso!",
        variant: "default",
      });
      
      // Recarregar lista de cursos e cursos vinculados
      if (user?.role === 'tecadm' || user?.role === 'professor') {
        await fetchSchoolsWithCourses();
      } else {
        await fetchCursos();
        await fetchSchoolLinkedCourses();
      }
      
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error: any) {
      console.error("Erro ao excluir curso:", error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.details ||
                          error?.response?.data?.erro || 
                          "Erro ao excluir curso";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLinkingCourses(false);
    }
  };

  const filteredCursos = cursos.filter(curso =>
    curso.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determinar qual estado de loading usar baseado no role
  const isCurrentlyLoading = (user?.role === 'tecadm' || user?.role === 'professor') 
    ? isLoadingSchoolsWithCourses 
    : isLoading;

  if (isCurrentlyLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-64" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-6 w-12" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            Gerenciar Cursos
          </h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie os cursos/etapas de ensino
          </p>
        </div>
        {!isProfessor() && (
          <Button onClick={openCreateModal}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {canCreateCourse() ? "Novo Curso" : "Vincular Cursos"}
          </Button>
        )}
      </div>



      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (user?.role === 'tecadm' || user?.role === 'professor') {
              fetchSchoolsWithCourses();
            } else {
              fetchCursos();
            }
          }}
          disabled={isLoading || isLoadingSchoolsWithCourses}
        >
          {(isLoading || isLoadingSchoolsWithCourses) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Atualizar"
          )}
        </Button>
      </div>

      {/* Accordion para tecadm e professor */}
      {(user?.role === 'tecadm' || user?.role === 'professor') ? (
        isLoadingSchoolsWithCourses ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : schoolsWithCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma escola encontrada
              </h3>
              <p className="text-muted-foreground text-center">
                Não há escolas cadastradas no seu município
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
              {schoolsWithCourses
                .filter(school => 
                  searchTerm === "" || 
                  school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  school.courses.some(course => 
                    course.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                )
                .map((school) => (
                  <AccordionItem key={school.id} value={school.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold">{school.name}</span>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {school.courses.length} curso(s)
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {school.courses.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          Nenhum curso vinculado a esta escola
                        </p>
                      ) : (
                        <div className="space-y-2 pt-2">
                          {school.courses.map((course) => (
                            <div 
                              key={course.id} 
                              className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium">{course.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {user?.role === 'professor' && (
                                  <Badge variant="secondary" className="text-xs">
                                    Visualização apenas
                                  </Badge>
                                )}
                                {user?.role === 'tecadm' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnlinkCourse(course.id, school.id)}
                                    disabled={isUnlinkingCourse && unlinkingCourseId === course.id}
                                  >
                                    {isUnlinkingCourse && unlinkingCourseId === course.id ? (
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
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
        )
      ) : (
        /* Cards para admin, diretor e coordenador */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCursos.map((curso) => {
            // Verificar se o curso está vinculado à escola (para tecadm/diretor/coordenador)
            const isLinkedToSchool = canLinkCoursesToSchool() && schoolLinkedCoursesIds.includes(curso.id);
            
            return (
            <Card key={curso.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                  {curso.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isLinkedToSchool && (
                    <Badge variant="outline" className="text-xs">
                      Vinculado
                    </Badge>
                  )}
                  <Badge variant="default">
                    Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {canEditOrDeleteCourse() && (
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditModal(curso)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openDeleteDialog(curso)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  )}
                  {isProfessor() && (
                    <p className="text-xs text-muted-foreground mt-4">
                      Visualização apenas
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Empty state apenas para admin, diretor e coordenador */}
      {(user?.role !== 'tecadm' && user?.role !== 'professor') && filteredCursos.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhum curso encontrado" : "Nenhum curso cadastrado"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? "Tente ajustar sua pesquisa" 
                : "Comece criando seu primeiro curso no sistema"}
            </p>
            {!searchTerm && !isProfessor() && (
              <Button onClick={openCreateModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                {canCreateCourse() ? "Novo Curso" : "Vincular Cursos"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? "Editar Curso" 
                : user?.role === 'admin'
                  ? "Gerenciar Cursos"
                  : canLinkCoursesToSchool() 
                    ? "Vincular Cursos à Escola" 
                    : "Novo Curso"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações do curso" 
                : user?.role === 'admin'
                  ? "Escolha entre criar um novo curso ou vincular cursos existentes a uma escola"
                  : canLinkCoursesToSchool()
                    ? "Selecione os cursos que deseja vincular à escola. Esses cursos poderão ser usados ao criar turmas."
                    : "Preencha os dados para criar um novo curso"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin: Tabs para escolher entre criar ou vincular */}
            {user?.role === 'admin' && !editingItem && (
              <Tabs value={adminModalTab} onValueChange={(value) => setAdminModalTab(value as "create" | "link")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">Criar Novo Curso</TabsTrigger>
                  <TabsTrigger value="link">Vincular à Escola</TabsTrigger>
                </TabsList>
                
                <TabsContent value="create" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome do curso"
                      required
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="link" className="mt-4">
                  {/* Seleção de escola para admin */}
                  <div className="space-y-2">
                    <Label htmlFor="school">Escola *</Label>
                    <Select 
                      value={selectedSchoolId} 
                      onValueChange={handleSchoolChange}
                      disabled={isLoadingSchools || isLoadingCourses}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingSchools ? "Carregando escolas..." : "Selecione uma escola"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSchools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableSchools.length === 0 && !isLoadingSchools && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Nenhuma escola encontrada
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Lista de cursos disponíveis para admin */}
                  {selectedSchoolId && (
                    <div className="space-y-2 mt-4">
                      <Label>Cursos Disponíveis *</Label>
                      {isLoadingCourses ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : availableCourses.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Nenhum curso disponível no sistema
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="border rounded-md p-4 space-y-3 max-h-[300px] overflow-y-auto">
                          {availableCourses.map((course) => {
                            const isLinked = linkedCoursesIds.includes(course.id);
                            const isSelected = selectedCoursesIds.includes(course.id);
                            
                            return (
                              <div 
                                key={course.id} 
                                className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleCourseToggle(course.id)}
                                  id={`course-${course.id}`}
                                />
                                <Label 
                                  htmlFor={`course-${course.id}`}
                                  className="flex-1 cursor-pointer font-normal"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCourseToggle(course.id);
                                  }}
                                >
                                  {course.name}
                                </Label>
                                {isLinked && (
                                  <Badge variant="outline" className="text-xs">
                                    Já vinculado
                                  </Badge>
                                )}
                                {isLinked && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnlinkCourse(course.id, selectedSchoolId);
                                    }}
                                    disabled={isUnlinkingCourse && unlinkingCourseId === course.id}
                                  >
                                    {isUnlinkingCourse && unlinkingCourseId === course.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Selecione os cursos que deseja vincular à escola. Cursos já vinculados aparecem marcados.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {/* Modal para tecadm, diretor, coordenador (sem admin) */}
            {canLinkCoursesToSchool() && !editingItem && user?.role !== 'admin' && (
              <>
                {/* Seleção de escola para tecadm */}
                {user?.role === 'tecadm' && (
                  <div className="space-y-2">
                    <Label htmlFor="school">Escola *</Label>
                    <Select 
                      value={selectedSchoolId} 
                      onValueChange={handleSchoolChange}
                      disabled={isLoadingSchools || isLoadingCourses}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingSchools ? "Carregando escolas..." : "Selecione uma escola"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSchools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableSchools.length === 0 && !isLoadingSchools && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Nenhuma escola encontrada no seu município
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Exibir escola atual para diretor/coordenador */}
                {user?.role !== 'tecadm' && currentSchool && (
                  <div className="space-y-2">
                    <Label>Escola</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">{currentSchool.name}</p>
                    </div>
                  </div>
                )}

                {/* Exibir mensagem se não houver escola */}
                {user?.role !== 'tecadm' && !currentSchool && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {user?.role === 'diretor' || user?.role === 'coordenador'
                        ? "Não foi possível identificar sua escola. Entre em contato com o administrador."
                        : "Selecione uma escola primeiro"}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Lista de cursos disponíveis */}
                {((user?.role === 'tecadm' && selectedSchoolId) || (user?.role !== 'tecadm' && currentSchool)) && (
                  <div className="space-y-2">
                    <Label>Cursos Disponíveis *</Label>
                    {isLoadingCourses ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : availableCourses.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Nenhum curso disponível no sistema
                        </AlertDescription>
                      </Alert>
                      ) : (
                        <div className="border rounded-md p-4 space-y-3 max-h-[300px] overflow-y-auto">
                          {availableCourses.map((course) => {
                            const isLinked = linkedCoursesIds.includes(course.id);
                            const isSelected = selectedCoursesIds.includes(course.id);
                            
                            return (
                              <div 
                                key={course.id} 
                                className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleCourseToggle(course.id)}
                                  id={`course-${course.id}`}
                                />
                                <Label 
                                  htmlFor={`course-${course.id}`}
                                  className="flex-1 cursor-pointer font-normal"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCourseToggle(course.id);
                                  }}
                                >
                                  {course.name}
                                </Label>
                                {isLinked && (
                                  <Badge variant="outline" className="text-xs">
                                    Já vinculado
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    <p className="text-xs text-muted-foreground">
                      Selecione os cursos que deseja vincular à escola. Cursos já vinculados aparecem marcados.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={isLinkingCourses}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isLinkingCourses || isLoadingCourses}
              >
                {isLinkingCourses ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {user?.role === 'admin' && adminModalTab === 'link' ? "Vinculando..." : 
                     user?.role === 'admin' && adminModalTab === 'create' ? "Criando..." :
                     "Vinculando..."}
                  </>
                ) : editingItem ? (
                  "Atualizar"
                ) : user?.role === 'admin' ? (
                  adminModalTab === 'link' ? "Vincular Cursos" : "Criar Curso"
                ) : canLinkCoursesToSchool() ? (
                  "Vincular Cursos"
                ) : (
                  "Criar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o curso "{deletingItem?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}