import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/authContext";

interface Student {
  id: string;
  name: string;
  email?: string;
  registration?: string;
  user?: {
    email: string;
  };
}

interface LinkStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classId: string;
  className: string;
  onSuccess: () => void;
}

export function LinkStudentModal({
  isOpen,
  onClose,
  schoolId,
  classId,
  className,
  onSuccess,
}: LinkStudentModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Verificar permissões para vincular alunos
  const canLinkStudents = () => {
    if (!user) return false;
    
    // Admin pode vincular qualquer aluno
    if (user.role === 'admin') return true;
    
    // Diretor, coordenador e professor podem vincular alunos da sua escola
    return ['diretor', 'coordenador', 'professor'].includes(user.role);
  };

  // Se não tem permissão, não renderizar o modal
  if (!canLinkStudents()) {
    return null;
  }

  // Buscar alunos não vinculados à turma
  useEffect(() => {
    if (!isOpen) return;

    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const endpoint = user?.role === 'admin' ? '/students' : '/students/available';
        const response = await api.get(endpoint);
        const allStudents = response.data || [];
        
        setStudents(allStudents);
      } catch (error) {
        console.error("Erro ao buscar alunos:", error);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [isOpen, schoolId, user?.role, toast]);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.registration && student.registration.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleLinkStudents = async () => {
    try {
      setIsLinking(true);
      await api.post(`/classes/${classId}/add_student`, {
        student_ids: selectedStudents
      });
      
      toast({
        title: "Sucesso",
        description: "Alunos vinculados com sucesso!",
      });
      
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Erro ao vincular alunos:", error);
      toast({
        title: "Erro",
        description: "Erro ao vincular alunos à turma",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Vincular Alunos à Turma
          </DialogTitle>
          <DialogDescription>
            Selecione os alunos que deseja vincular à turma <strong>{className}</strong>
            {user?.role === 'admin' && (
              <span className="block mt-1 text-xs text-blue-600">
                ⚡ Visualizando todos os alunos do sistema
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar alunos por nome, email ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Students List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Carregando alunos...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center p-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "Nenhum aluno encontrado" : "Nenhum aluno disponível"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm 
                    ? "Tente ajustar os termos de busca"
                    : "Todos os alunos já estão vinculados a turmas"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{student.name}</span>
                        <Badge variant="secondary" className="text-xs">Aluno</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="truncate">{student.email || student.user?.email}</div>
                        {student.registration && (
                          <div>Matrícula: {student.registration}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedStudents.length} aluno(s) selecionado(s)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLinking}>
              Cancelar
            </Button>
            <Button 
              onClick={handleLinkStudents} 
              disabled={selectedStudents.length === 0 || isLinking}
            >
              {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vincular ({selectedStudents.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
