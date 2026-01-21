import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Clock, User } from 'lucide-react';
import { CertificatesApiService } from '@/services/certificatesApi';
import type { ApprovedStudent } from '@/types/certificates';

interface StudentListProps {
  evaluationId: string;
  onSelectStudent?: (studentId: string) => void;
}

export function StudentList({ evaluationId, onSelectStudent }: StudentListProps) {
  const [students, setStudents] = useState<ApprovedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      if (!evaluationId) return;
      
      setIsLoading(true);
      try {
        const data = await CertificatesApiService.getApprovedStudents(evaluationId);
        setStudents(data);
      } catch (error) {
        console.error('Erro ao carregar alunos participantes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [evaluationId]);

  const getStatusBadge = (status?: string) => {
    if (status === 'approved') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Certificado Aprovado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum aluno participante encontrado nesta avaliação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Alunos Participantes ({students.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead className="text-center">Nota</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {onSelectStudent && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.class_name || 'N/A'}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-base">
                    {student.grade.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(student.certificate_status)}
                </TableCell>
                {onSelectStudent && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectStudent(student.id)}
                    >
                      Ver Detalhes
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

