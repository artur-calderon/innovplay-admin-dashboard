import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Building2, School, Eye, Calendar, User, CircleDot } from 'lucide-react';
import type { Aviso } from '@/types/avisos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnreadAvisos } from '@/hooks/useUnreadAvisos';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/authContext';
import { computeAvisoUnread } from '@/utils/avisosRead';

interface AvisoCardProps {
  aviso: Aviso;
  onViewDetails: (aviso: Aviso) => void;
}

export function AvisoCard({ aviso, onViewDetails }: AvisoCardProps) {
  const { user } = useAuth();
  const { isAvisoRead } = useUnreadAvisos();
  const isUnread = computeAvisoUnread(aviso, user?.id, (id) => isAvisoRead(id));

  const getDestinatarioIcon = () => {
    switch (aviso.destinatarios.tipo) {
      case 'todos':
        return <Building2 className="w-4 h-4" />;
      case 'municipio':
        return <Building2 className="w-4 h-4" />;
      case 'escola':
        return <School className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getDestinatarioBadgeVariant = () => {
    switch (aviso.destinatarios.tipo) {
      case 'todos':
        return 'default';
      case 'municipio':
        return 'secondary';
      case 'escola':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getDestinatarioText = () => {
    switch (aviso.destinatarios.tipo) {
      case 'todos':
        return 'Escopo anterior';
      case 'municipio':
        return aviso.destinatarios.municipio_nome || 'Município';
      case 'escola':
        return aviso.destinatarios.escola_nome || 'Escola';
      default:
        return 'Não especificado';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Trunca mensagem para preview (150 caracteres)
  const previewMensagem = aviso.mensagem.length > 150
    ? `${aviso.mensagem.substring(0, 150)}...`
    : aviso.mensagem;

  return (
      <Card className={cn(
      "hover:shadow-lg transition-shadow duration-200 flex flex-col h-full relative",
      isUnread && "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {aviso.titulo}
            </h3>
            {isUnread && (
              <CircleDot className="w-4 h-4 text-blue-500 flex-shrink-0 animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isUnread && (
            <Badge variant="default" className="bg-blue-500 text-white text-xs">
              Novo
            </Badge>
          )}
          <Badge variant={getDestinatarioBadgeVariant()} className="flex items-center gap-1">
            {getDestinatarioIcon()}
            <span className="text-xs">{getDestinatarioText()}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {previewMensagem}
        </p>
      </CardContent>

      <CardFooter className="pt-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{aviso.autor}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(aviso.created_at)}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(aviso)}
          className="w-full sm:w-auto"
        >
          <Eye className="w-4 h-4 mr-2" />
          Ver detalhes
        </Button>
      </CardFooter>
    </Card>
  );
}

