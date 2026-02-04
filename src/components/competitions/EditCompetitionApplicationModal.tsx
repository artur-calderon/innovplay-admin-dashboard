/**
 * Modal para editar apenas data de aplicação e data de expiração da competição.
 * Acesso pelo botão "Datas" no card (quando status = rascunho).
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCompetition, updateCompetition } from '@/services/competitionsApi';
import { parseISOToDatetimeLocal, convertDateTimeLocalToISONaive } from '@/utils/date';
import { CalendarRange, Loader2 } from 'lucide-react';

export interface EditCompetitionApplicationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competitionId: string | null;
  competitionName?: string;
}

export function EditCompetitionApplicationModal({
  open,
  onClose,
  onSuccess,
  competitionId,
  competitionName = '',
}: EditCompetitionApplicationModalProps) {
  const { toast } = useToast();
  const [application, setApplication] = useState('');
  const [expiration, setExpiration] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!open || !competitionId) return;
    setLoadingData(true);
    getCompetition(competitionId)
      .then((c) => {
        setApplication(parseISOToDatetimeLocal(c.application));
        setExpiration(parseISOToDatetimeLocal(c.expiration));
      })
      .catch(() => toast({ title: 'Erro ao carregar competição.', variant: 'destructive' }))
      .finally(() => setLoadingData(false));
  }, [open, competitionId, toast]);

  const handleSubmit = async () => {
    if (!competitionId) return;
    setLoading(true);
    try {
      const payload = {
        application: application.trim() ? convertDateTimeLocalToISONaive(application.trim()) : undefined,
        expiration: expiration.trim() ? convertDateTimeLocalToISONaive(expiration.trim()) : undefined,
      };
      await updateCompetition(competitionId, payload);
      toast({ title: 'Datas de aplicação e expiração atualizadas.' });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao salvar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Aplicação e expiração
          </DialogTitle>
          <DialogDescription>
            {competitionName ? `Competição: ${competitionName}` : 'Defina a data de aplicação e de expiração da competição.'}
          </DialogDescription>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="application">Data e hora de aplicação</Label>
              <Input
                id="application"
                type="datetime-local"
                step="60"
                value={application}
                onChange={(e) => setApplication(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration">Data e hora de expiração</Label>
              <Input
                id="expiration"
                type="datetime-local"
                step="60"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingData}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
