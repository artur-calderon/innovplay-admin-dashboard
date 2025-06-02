import { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, School as SchoolIcon, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SchoolForm from "@/components/schools/SchoolForm";

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

export default function Schools() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const { toast } = useToast();

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/school/");
      let schoolsData = response.data;

      // Se não for admin, filtra apenas as escolas do município do usuário
      if (user.role !== 'admin') {
        schoolsData = schoolsData.filter((school: School) => school.city_id === user.tenant_id);
      }

      setSchools(schoolsData);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar escolas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [user.role, user.tenant_id, toast]);

  const handleSaveSchool = (school: School) => {
    if (selectedSchool) {
      // Atualizar escola existente
      setSchools(schools.map(s => s.id === school.id ? school : s));
    } else {
      // Adicionar nova escola
      setSchools([...schools, school]);
    }
    setIsAddDialogOpen(false);
    setSelectedSchool(null);
  };

  const handleDeleteSchool = (schoolId: string) => {
    setSchools(schools.filter(s => s.id !== schoolId));
    setSelectedSchool(null);
  };

  // Filter schools based on search query
  const filteredSchools = schools?.filter((school) =>
    school.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Escolas</h2>
          {user.role === 'admin' && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Escola
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar escolas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Município</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                {user.role === 'admin' && <TableHead className="w-[100px]">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredSchools || filteredSchools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user.role === 'admin' ? 6 : 5} className="text-center py-6">
                    <div className="flex flex-col items-center gap-2">
                      <SchoolIcon className="h-10 w-10 text-gray-400" />
                      <h3 className="font-medium text-lg">
                        {searchQuery ? "Nenhuma escola encontrada" : "Nenhuma escola cadastrada"}
                      </h3>
                      <p className="text-gray-500">
                        {searchQuery
                          ? "Tente uma busca diferente."
                          : "Não há escolas cadastradas no sistema."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.address}</TableCell>
                    <TableCell>{school.domain}</TableCell>
                    <TableCell>{school.city.name} - {school.city.state}</TableCell>
                    <TableCell>
                      {new Date(school.created_at + 'Z').toLocaleDateString('pt-BR', {
                        timeZone: 'UTC'
                      })}
                    </TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedSchool(school)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedSchool(school);
                              handleDeleteSchool(school.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit School Dialog */}
      {(isAddDialogOpen || selectedSchool) && (
        <SchoolForm
          school={selectedSchool || undefined}
          onClose={() => {
            setIsAddDialogOpen(false);
            setSelectedSchool(null);
          }}
          onSave={handleSaveSchool}
          onDelete={handleDeleteSchool}
        />
      )}
    </div>
  );
}
