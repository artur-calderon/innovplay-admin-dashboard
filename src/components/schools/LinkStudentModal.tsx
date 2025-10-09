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
    
    // Admin e tecadm podem vincular qualquer aluno
    if (['admin', 'tecadm'].includes(user.role)) return true;
    
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
        const endpoint = ['admin', 'tecadm'].includes(user?.role || '') ? '/students' : '/students/available';
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            Vincular Alunos à Turma
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Selecione os alunos que deseja vincular à turma <strong>{className}</strong>
            {['admin', 'tecadm'].includes(user?.role || '') && (
              <span className="block mt-1 text-xs sm:text-sm text-blue-600">
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
              className="pl-10 h-11 text-sm sm:text-base"
            />
          </div>

          {/* Students List */}
          <div className="flex-1 overflow-hidden border rounded-lg bg-white min-h-[400px] max-h-[500px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 h-full">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-3" />
                <span className="text-sm sm:text-base text-gray-600">Carregando alunos...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 h-full">
                <div className="bg-green-50 p-4 rounded-full mb-4">
                  <Users className="h-8 w-8 sm:h-12 sm:w-12 text-green-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
                  {searchTerm ? "Nenhum aluno encontrado" : "Nenhum aluno disponível"}
                </h3>
                <p className="text-sm sm:text-base text-gray-500 text-center max-w-sm">
                  {searchTerm 
                    ? "Tente ajustar os termos de busca"
                    : "Todos os alunos já estão vinculados a turmas"
                  }
                </p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-transparent hover:scrollbar-thumb-green-400 scroll-smooth">
                <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleStudentToggle(student.id)}
                        className="flex-shrink-0"
                      />
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <span className="font-medium text-sm sm:text-base truncate text-gray-900">{student.name}</span>
                          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200 w-fit">
                            Aluno
                          </Badge>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                          <div className="truncate">{student.email || student.user?.email}</div>
                          {student.registration && (
                            <div className="text-gray-400">Matrícula: {student.registration}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t bg-gray-50/50 px-4 sm:px-6 py-3">
          <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
            <span className="font-medium">{selectedStudents.length}</span> aluno(s) selecionado(s)
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLinking}
              className="h-10 order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleLinkStudents} 
              disabled={selectedStudents.length === 0 || isLinking}
              className="h-10 order-1 sm:order-2 bg-green-600 hover:bg-green-700"
            >
              {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Users className="mr-2 h-4 w-4" />
              Vincular ({selectedStudents.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
