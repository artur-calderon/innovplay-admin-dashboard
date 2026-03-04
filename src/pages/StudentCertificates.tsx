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
      <div className="container mx-auto p-6 space-y-6 min-h-screen">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/30">
              <Award className="w-5 h-5 text-white drop-shadow" />
            </span>
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">Meus Certificados</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Visualize e imprima seus certificados de desempenho
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl border-2 border-violet-200/40 dark:border-violet-500/20 overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6 min-h-screen">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/30 transition-transform duration-300 hover:scale-110">
              <Award className="w-5 h-5 text-white drop-shadow" />
            </span>
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">Meus Certificados</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Visualize e imprima seus certificados de desempenho
          </p>
        </div>
        <Card className="rounded-2xl border-2 border-dashed border-violet-200/60 dark:border-violet-500/40 overflow-hidden bg-gradient-to-br from-violet-500/5 to-transparent animate-fade-in-up">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="font-medium text-foreground text-center mb-2">
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
    <div className="container mx-auto p-6 space-y-6 min-h-screen">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" id="certificates-page-title">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/30 transition-transform duration-300 hover:scale-110">
            <Award className="w-5 h-5 text-white drop-shadow" />
          </span>
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">Meus Certificados</span>
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          Você possui {certificates.length} certificado{certificates.length > 1 ? 's' : ''} de desempenho
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {certificates.map((certificate, i) => (
          <Card
            key={certificate.id}
            className="cursor-pointer rounded-2xl border-2 border-violet-200/60 dark:border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/20 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: `${i * 0.05}s` }}
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

