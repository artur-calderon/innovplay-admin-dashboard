import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDataContext } from "@/context/dataContext";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Eye, Pencil, Trash2, Edit, Loader2 } from "lucide-react";
import { CreateClassForm } from "./CreateClassForm";
import { AddStudentForm } from "./AddStudentForm";
import { AddTeacherForm } from "./AddTeacherForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import SchoolForm from "./SchoolForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface City {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

interface School {
  id: string;
  name: string;
  city_id: string;
  address: string;
  domain: string;
  created_at: string;
  city: City;
}

interface Grade {
  id: string;
  name: string;
  education_stage_id: string;
}

interface Class {
  id: string;
  name: string;
  school_id: string;
  grade_id: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  registration?: string;
  birth_date?: string;
}

export default function SchoolDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEscolas } = useDataContext();
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingSchool, setIsLoadingSchool] = useState(true);

  useEffect(() => {
    const fetchSchool = async () => {
      if (!id) return;
      setIsLoadingSchool(true);
      try {
        const schoolData = await getEscolas(id);
        if (schoolData) {
          setSchool(schoolData as School);
        } else {
          toast({
            title: "Erro",
            description: "Escola não encontrada",
            variant: "destructive",
          });
          navigate("/app/escolas");
        }
      } catch (error) {
        console.error("Error fetching school:", error);
      } finally {
        setIsLoadingSchool(false);
      }
    };

    fetchSchool();
  }, [id, getEscolas, navigate, toast]);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await api.get("/grades/");
        const gradesMap: Record<string, string> = {};
        response.data.forEach((grade: Grade) => {
          gradesMap[grade.id] = grade.name;
        });
        setGrades(gradesMap);
      } catch (error) {
        console.error("Error fetching grades:", error);
      }
    };

    fetchGrades();
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!id) return;

      try {
        const response = await api.get(`/classes/school/${id}`);
        setClasses(response.data);
      } catch (error) {
        console.error("Error fetching classes:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar turmas",
          variant: "destructive",
        });
      }
    };

    fetchClasses();
  }, [id, toast]);

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!id) return;

      try {
        const response = await api.get(`/teacher/school/${id}`);
        setTeachers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar professores",
          variant: "destructive",
        });
        setTeachers([]);
      }
    };

    fetchTeachers();
  }, [id, toast]);

  const handleClassCreated = () => {
    // Refetch classes when a new one is created
    if (id) {
      api.get(`/classes/school/${id}`).then(response => {
        console.log(response.data);
        setClasses(response.data);
      });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta turma?")) return;

    try {
      await api.delete(`/classes/${classId}`);
      toast({
        title: "Sucesso",
        description: "Turma excluída com sucesso",
      });
      // Refetch classes
      if (id) {
        const response = await api.get(`/classes/school/${id}`);
        setClasses(response.data);
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir turma",
        variant: "destructive",
      });
    }
  };

  if (isLoadingSchool) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900">Escola não encontrada</h2>
        <p className="text-gray-500 mt-2">A escola que você está procurando não existe ou foi removida.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{school.name}</h1>
        <div className="flex gap-4">
          <AddTeacherForm
            schoolId={school.id}
            schoolName={school.name}
            classes={classes}
            onSuccess={() => {
              // Você pode adicionar qualquer lógica de atualização aqui se necessário
            }}
          />
          <AddStudentForm
            schoolId={school.id}
            schoolName={school.name}
            onSuccess={() => {
              // Você pode adicionar qualquer lógica de atualização aqui se necessário
            }}
          />
          <CreateClassForm schoolId={school.id} onSuccess={handleClassCreated} />
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Detalhes da Escola</h2>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Escola
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Nome da Escola</dt>
                  <dd className="mt-1 text-sm text-gray-900">{school.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Município</dt>
                  <dd className="mt-1 text-sm text-gray-900">{school.city.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1 text-sm text-gray-900">{school.city.state}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                  <dd className="mt-1 text-sm text-gray-900">{school.address}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Domínio</dt>
                  <dd className="mt-1 text-sm text-gray-900">{school.domain}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Professores</h2>
          {teachers.length === 0 ? (
            <p className="text-gray-500">Nenhum professor cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{teacher.name}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.registration || "-"}</TableCell>
                    <TableCell>
                      {teacher.birth_date
                        ? new Date(teacher.birth_date).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/app/professor/${teacher.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/app/professor/${teacher.id}/editar`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Turmas</h2>
          {classes.length === 0 ? (
            <p className="text-gray-500">Nenhuma turma cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Turma</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell>{classItem.name}</TableCell>
                    <TableCell>{grades[classItem.grade_id] || "Carregando..."}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/app/turma/${classItem.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/app/turma/${classItem.id}/editar`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClass(classItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {isEditDialogOpen && (
        <SchoolForm
          school={school}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedSchool) => {
            if (school) {
              setSchool({ ...school, ...updatedSchool });
            }
            setIsEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
} 