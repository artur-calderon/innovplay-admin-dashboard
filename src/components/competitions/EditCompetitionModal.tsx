/**
 * Modal de edição de competição (admin/coordenador).
 * Similar a CreateCompetitionModal com campos preenchidos.
 * Regras: se status != 'rascunho', campos críticos (questões, datas) devem ser desabilitados;
 * só permite editar descrição, recompensas (se não houver inscritos) e opções avançadas.
 */
import React from 'react';
import { CreateCompetitionModal } from '@/components/competitions/CreateCompetitionModal';
import type { Competition } from '@/types/competition-types';

export interface EditCompetitionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competitionId: string;
  competition: Competition | null;
}

export function EditCompetitionModal({
  open,
  onClose,
  onSuccess,
  competitionId,
}: EditCompetitionModalProps) {
  return (
    <CreateCompetitionModal
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      editId={competitionId}
    />
  );
}
