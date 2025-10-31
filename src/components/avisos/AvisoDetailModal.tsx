import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Building2, School, Globe, Calendar, User, Mail } from 'lucide-react';
import type { Aviso } from '@/types/avisos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnreadAvisos } from '@/hooks/useUnreadAvisos';

interface AvisoDetailModalProps {
  aviso: Aviso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvisoDetailModal({ aviso, open, onOpenChange }: AvisoDetailModalProps) {
  const { markAsRead, isAvisoRead } = useUnreadAvisos();

  // Marcar como lido quando o modal abrir com um aviso
  useEffect(() => {
    if (open && aviso && !isAvisoRead(aviso.id)) {
      // Pequeno delay para garantir que o usuário realmente viu
      const timer = setTimeout(() => {
        markAsRead(aviso.id);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [open, aviso, markAsRead, isAvisoRead]);

  if (!aviso) return null;

  const getDestinatarioIcon = () => {
    switch (aviso.destinatarios.tipo) {
      case 'todos':
        return <Globe className="w-5 h-5" />;
      case 'municipio':
        return <Building2 className="w-5 h-5" />;
      case 'escola':
        return <School className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
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

  const getDestinatarioDescricao = () => {
    switch (aviso.destinatarios.tipo) {
      case 'todos':
        return {
          titulo: 'Todos os usuários',
          descricao: 'Este aviso é visível para todos os usuários do sistema em todos os municípios e escolas.',
        };
      case 'municipio':
        return {
          titulo: aviso.destinatarios.municipio_nome || 'Município',
          descricao: `Este aviso é visível para todos os usuários do município ${aviso.destinatarios.municipio_nome || 'selecionado'}.`,
        };
      case 'escola':
        return {
          titulo: aviso.destinatarios.escola_nome || 'Escola',
          descricao: `Este aviso é visível apenas para os usuários da escola ${aviso.destinatarios.escola_nome || 'selecionada'}.`,
        };
      default:
        return {
          titulo: 'Não especificado',
          descricao: 'Destinatários não especificados.',
        };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const destinatarioInfo = getDestinatarioDescricao();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold leading-tight mb-3">
                {aviso.titulo}
              </DialogTitle>
              <Badge variant={getDestinatarioBadgeVariant()} className="flex items-center gap-2 w-fit">
                {getDestinatarioIcon()}
                <span>{destinatarioInfo.titulo}</span>
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        {/* Mensagem Principal */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Mensagem</h4>
            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {aviso.mensagem}
            </p>
          </div>

          <Separator />

          {/* Informações de Destinatários */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Destinatários
            </h4>
            <p className="text-sm text-muted-foreground">
              {destinatarioInfo.descricao}
            </p>
          </div>

          {/* Informações do Autor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-foreground">Publicado por</h4>
              </div>
              <p className="text-sm text-foreground font-medium">{aviso.autor}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {aviso.autor_role === 'admin' && 'Administrador'}
                {aviso.autor_role === 'tecadm' && 'Técnico Administrativo'}
                {aviso.autor_role === 'diretor' && 'Diretor'}
                {aviso.autor_role === 'coordenador' && 'Coordenador'}
                {aviso.autor_role === 'professor' && 'Professor'}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-semibold text-foreground">Data de publicação</h4>
              </div>
              <p className="text-sm text-foreground font-medium">
                {formatDate(aviso.created_at)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

