import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Award, CheckCircle2 } from 'lucide-react';
import { CertificateList } from '@/components/certificates/CertificateList';
import { StudentList } from '@/components/certificates/StudentList';
import { CertificateCustomizer } from '@/components/certificates/CertificateCustomizer';
import { CertificateTemplateComponent } from '@/components/certificates/CertificateTemplate';
import { CertificatesApiService } from '@/services/certificatesApi';
import { getUserHierarchyContext } from '@/utils/userHierarchy';
import type { CertificateTemplate, ApprovedStudent } from '@/types/certificates';

export default function Certificates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
  const [students, setStudents] = useState<ApprovedStudent[]>([]);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const loadHierarchy = async () => {
      if (!user.id) return;
      
      setIsLoadingHierarchy(true);
      try {
        const hierarchy = await getUserHierarchyContext(user.id, user.role);
        
        if (hierarchy.school?.id) {
          setSchoolId(hierarchy.school.id);
        }
        
        if (hierarchy.municipality?.id) {
          setMunicipalityId(hierarchy.municipality.id);
        }
      } catch (error) {
        console.error('Erro ao carregar hierarquia:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar informações da escola.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingHierarchy(false);
      }
    };

    loadHierarchy();
  }, [user.id, user.role, toast]);

  useEffect(() => {
    const loadTemplateAndStudents = async () => {
      if (!selectedEvaluation) return;

      try {
        const [templateData, studentsData] = await Promise.all([
          CertificatesApiService.getCertificateTemplate(selectedEvaluation),
          CertificatesApiService.getApprovedStudents(selectedEvaluation)
        ]);

        setTemplate(templateData || null);
        setStudents(studentsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados da avaliação.',
          variant: 'destructive',
        });
      }
    };

    loadTemplateAndStudents();
  }, [selectedEvaluation, toast]);

  const handleSelectEvaluation = (evaluationId: string) => {
    setSelectedEvaluation(evaluationId);
    setIsCustomizing(false);
  };

  const handleBack = () => {
    setSelectedEvaluation(null);
    setIsCustomizing(false);
    setTemplate(null);
    setStudents([]);
  };

  const handleSaveTemplate = async (newTemplate: CertificateTemplate) => {
    if (!selectedEvaluation) return;

    try {
      const savedTemplate = await CertificatesApiService.saveCertificateTemplate({
        ...newTemplate,
        evaluation_id: selectedEvaluation
      });
      setTemplate(savedTemplate);
      setIsCustomizing(false);
      toast({
        title: 'Sucesso',
        description: 'Template salvo com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive',
      });
    }
  };

  const handleApproveCertificates = async () => {
    if (!selectedEvaluation || !template || students.length === 0) return;

    setIsApproving(true);
    try {
      const studentIds = students.map(s => s.id);
      
      const result = await CertificatesApiService.approveCertificates({
        evaluation_id: selectedEvaluation,
        student_ids: studentIds,
        template: template
      });

      // Nota: O backend deve enviar notificações automaticamente.
      // Se necessário, podemos também enviar notificações adicionais aqui.
      // Por enquanto, assumimos que o backend cuida disso.

      toast({
        title: 'Sucesso',
        description: `Certificados aprovados e enviados para ${students.length} alunos!`,
      });

      // Recarregar dados para atualizar status
      const updatedStudents = await CertificatesApiService.getApprovedStudents(selectedEvaluation);
      setStudents(updatedStudents);
    } catch (error) {
      console.error('Erro ao aprovar certificados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar os certificados.',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoadingHierarchy) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Para admin, não precisa de escola/município específico - pode ver todas
  if (user.role !== 'admin' && (!schoolId || !municipalityId)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Não foi possível identificar sua escola. Entre em contato com o suporte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedEvaluation) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Certificados</h1>
          <p className="text-muted-foreground mt-2">
            {user.role === 'admin' 
              ? 'Visualize todas as avaliações do sistema para gerenciar certificados'
              : 'Selecione uma avaliação para gerenciar certificados dos alunos aprovados'}
          </p>
        </div>
        <CertificateList
          schoolId={schoolId || undefined}
          municipalityId={municipalityId || undefined}
          isAdmin={user.role === 'admin'}
          onSelectEvaluation={handleSelectEvaluation}
        />
      </div>
    );
  }

  if (isCustomizing) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setIsCustomizing(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Personalizar Certificado</h1>
            <p className="text-muted-foreground mt-2">
              Personalize o certificado que será enviado aos alunos
            </p>
          </div>
        </div>
        <CertificateCustomizer
          evaluationId={selectedEvaluation}
          initialTemplate={template || undefined}
          onSave={handleSaveTemplate}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Certificados</h1>
            <p className="text-muted-foreground mt-2">
              Personalize e aprove certificados para os alunos aprovados
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCustomizing(true)}
          >
            Personalizar Certificado
          </Button>
          {template && students.length > 0 && (
            <Button
              onClick={handleApproveCertificates}
              disabled={isApproving}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isApproving ? 'Aprovando...' : `Aprovar ${students.length} Certificado(s)`}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <StudentList evaluationId={selectedEvaluation} />
        </div>
        
        {template && (
          <Card>
            <CardHeader>
              <CardTitle>Preview do Certificado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[600px]">
                <CertificateTemplateComponent
                  template={template}
                  studentName="Nome do Aluno"
                  evaluationTitle="Avaliação Exemplo"
                  grade={8.5}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

