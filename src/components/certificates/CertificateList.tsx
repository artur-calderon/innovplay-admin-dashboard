import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle2, Clock, Users } from 'lucide-react';
import { CertificatesApiService } from '@/services/certificatesApi';
import type { EvaluationWithCertificates } from '@/types/certificates';

interface CertificateListProps {
  schoolId?: string;
  municipalityId?: string;
  isAdmin?: boolean;
  onSelectEvaluation: (evaluationId: string) => void;
}

export function CertificateList({ schoolId, municipalityId, isAdmin = false, onSelectEvaluation }: CertificateListProps) {
  const [evaluations, setEvaluations] = useState<EvaluationWithCertificates[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvaluations = async () => {
      // Se for admin, não precisa de filtros
      if (!isAdmin && (!schoolId || !municipalityId)) return;
      
      setIsLoading(true);
      try {
        const data = await CertificatesApiService.getEvaluationsBySchool(
          schoolId, 
          municipalityId, 
          isAdmin
        );
        setEvaluations(data);
      } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvaluations();
  }, [schoolId, municipalityId, isAdmin]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            Sem certificado
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            {isAdmin 
              ? 'Nenhuma avaliação encontrada no sistema.'
              : 'Nenhuma avaliação encontrada para sua escola.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {evaluations.map((evaluation) => (
        <Card
          key={evaluation.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelectEvaluation(evaluation.id)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg line-clamp-2">{evaluation.title}</CardTitle>
              {getStatusBadge(evaluation.certificate_status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{evaluation.subject}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {evaluation.approved_students_count} de {evaluation.total_students_count} alunos aprovados
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Aplicada em: {new Date(evaluation.applied_at).toLocaleDateString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

