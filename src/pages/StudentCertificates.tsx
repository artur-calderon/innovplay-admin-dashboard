import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Download, Printer, FileText, Calendar } from 'lucide-react';
import { CertificateViewer } from '@/components/certificates/CertificateViewer';
import { CertificatesApiService } from '@/services/certificatesApi';
import type { Certificate } from '@/types/certificates';

export default function StudentCertificates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    const loadCertificates = async () => {
      if (!user.id) return;

      setIsLoading(true);
      try {
        const data = await CertificatesApiService.getMyCertificates();
        setCertificates(data);
      } catch (error) {
        console.error('Erro ao carregar certificados:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar seus certificados.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCertificates();
  }, [user.id, toast]);

  const handleViewCertificate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedCertificate(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meus Certificados</h1>
          <p className="text-muted-foreground mt-2">
            Visualize e imprima seus certificados de desempenho
          </p>
        </div>
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
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meus Certificados</h1>
          <p className="text-muted-foreground mt-2">
            Visualize e imprima seus certificados de desempenho
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-2">
              Você ainda não possui certificados.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Certificados serão disponibilizados após aprovação pelo diretor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meus Certificados</h1>
        <p className="text-muted-foreground mt-2">
          Você possui {certificates.length} certificado{certificates.length > 1 ? 's' : ''} de desempenho
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {certificates.map((certificate) => (
          <Card
            key={certificate.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2 mb-2">
                    {certificate.evaluation_title}
                  </CardTitle>
                  <Badge variant="default" className="bg-green-500">
                    Aprovado
                  </Badge>
                </div>
                <Award className="h-8 w-8 text-yellow-500 flex-shrink-0 ml-2" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Nota: {certificate.grade.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Emitido em: {new Date(certificate.issued_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewCertificate(certificate)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCertificate && (
        <CertificateViewer
          certificate={selectedCertificate}
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}

