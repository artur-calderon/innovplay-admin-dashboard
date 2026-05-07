import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Building2, School, Calendar, User, Mail, Pencil, Trash2, Save, X } from 'lucide-react';
import type { Aviso, CreateAvisoDTO } from '@/types/avisos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnreadAvisos } from '@/hooks/useUnreadAvisos';
import { useAuth } from '@/context/authContext';
import { useToast } from '@/hooks/use-toast';

interface AvisoDetailModalProps {
  aviso: Aviso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditAviso: (id: string, data: Partial<CreateAvisoDTO>) => Promise<void>;
  onDeleteAviso: (id: string) => Promise<void>;
}

export function AvisoDetailModal({
  aviso,
  open,
  onOpenChange,
  onEditAviso,
  onDeleteAviso,
}: AvisoDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markAsRead, isAvisoRead } = useUnreadAvisos();
  const [isEditing, setIsEditing] = useState(false);
  const [tituloEdit, setTituloEdit] = useState('');
  const [mensagemEdit, setMensagemEdit] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Marcar como lido quando o modal abrir com um aviso
  useEffect(() => {
    if (!open || !aviso || isAvisoRead(aviso.id)) return;
    const isCreator =
      !!user?.id && !!aviso.autor_id && String(aviso.autor_id) === String(user.id);
    if (isCreator) return;
    // Pequeno delay para garantir que o usuário realmente viu
    const timer = setTimeout(() => {
      markAsRead(aviso.id);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [open, aviso, markAsRead, isAvisoRead, user?.id]);

  useEffect(() => {
    if (!aviso) return;
    setTituloEdit(aviso.titulo);
    setMensagemEdit(aviso.mensagem);
    setIsEditing(false);
  }, [aviso?.id, aviso?.titulo, aviso?.mensagem]);

  const canManageAviso = useMemo(() => {
    if (!aviso) return false;
    const isAuthor = !!user?.id && String(aviso.autor_id) === String(user.id);
    return isAuthor || ['admin', 'tecadm'].includes(user?.role ?? '');
  }, [aviso, user?.id, user?.role]);

  if (!aviso) return null;

  const getDestinatarioIcon = () => {
    switch (aviso.destinatarios.tipo) {
      case 'todos':
        return <Building2 className="w-5 h-5" />;
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
          titulo: 'Escopo anterior (global)',
          descricao:
            'Este aviso foi criado antes da restrição a município ou escola. O envio atual não permite mais escopo global.',
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

  const handleSaveEdit = async () => {
    const titulo = tituloEdit.trim();
    const mensagem = mensagemEdit.trim();
    if (!titulo || !mensagem) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título e mensagem para salvar.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onEditAviso(aviso.id, { titulo, mensagem });
      setIsEditing(false);
      toast({
        title: 'Aviso atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch {
      toast({
        title: 'Erro ao editar',
        description: 'Não foi possível salvar o aviso.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAviso(aviso.id);
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
      toast({
        title: 'Aviso apagado',
        description: 'O aviso foi removido com sucesso.',
      });
    } catch {
      toast({
        title: 'Erro ao apagar',
        description: 'Não foi possível remover o aviso.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Detalhes do aviso, com informações de destinatários, autor e data de publicação.
          </DialogDescription>
          <div className="flex items-start justify-between gap-4">
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
            {canManageAviso && (
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-10">
                {!isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? 'Apagando...' : 'Apagar'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          {canManageAviso && (
            <div className="sm:hidden flex items-center justify-end gap-2 mt-2">
              {!isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Apagando...' : 'Apagar'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogHeader>

        <Separator className="my-4" />

        {/* Mensagem Principal */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Mensagem</h4>
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="aviso-titulo-edit">Titulo</Label>
                  <Input
                    id="aviso-titulo-edit"
                    value={tituloEdit}
                    onChange={(e) => setTituloEdit(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aviso-mensagem-edit">Mensagem</Label>
                  <Textarea
                    id="aviso-mensagem-edit"
                    value={mensagemEdit}
                    onChange={(e) => setMensagemEdit(e.target.value)}
                    rows={6}
                    maxLength={5000}
                  />
                </div>
              </div>
            ) : (
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                {aviso.mensagem}
              </p>
            )}
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove o aviso para os usuarios e nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Apagando...' : 'Sim, apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

