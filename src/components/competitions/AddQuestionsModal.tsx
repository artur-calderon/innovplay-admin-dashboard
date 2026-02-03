import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addCompetitionQuestions } from '@/services/competitionsApi';
import { Loader2 } from 'lucide-react';

interface AddQuestionsModalProps {
  competitionId: string | null;
  competitionName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddQuestionsModal({
  competitionId,
  competitionName,
  open,
  onClose,
  onSuccess,
}: AddQuestionsModalProps) {
  const { toast } = useToast();
  const [rawIds, setRawIds] = useState('');
  const [loading, setLoading] = useState(false);

  const questionIds = rawIds
    .split(/[\n,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = async () => {
    if (!competitionId || questionIds.length === 0) {
      toast({
        title: 'Informe ao menos um ID de questão.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await addCompetitionQuestions(competitionId, questionIds);
      toast({ title: `${questionIds.length} questão(ões) adicionada(s) com sucesso.` });
      setRawIds('');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao adicionar questões.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar questões</DialogTitle>
          <DialogDescription>
            {competitionName}. Informe os IDs das questões (um por linha ou separados por vírgula).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="question_ids">IDs das questões</Label>
          <Textarea
            id="question_ids"
            value={rawIds}
            onChange={(e) => setRawIds(e.target.value)}
            placeholder="id1&#10;id2&#10;id3"
            rows={5}
            className="font-mono text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {questionIds.length} questão(ões) detectada(s).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || questionIds.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
