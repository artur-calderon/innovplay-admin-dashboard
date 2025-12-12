import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { AnswerSheetCard } from './AnswerSheetCard';
import { AnswerSheetConfig, StudentAnswerSheet } from '@/types/answer-sheet';

interface AnswerSheetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentAnswerSheet | null;
  config: AnswerSheetConfig;
}

export function AnswerSheetPreviewModal({
  isOpen,
  onClose,
  student,
  config
}: AnswerSheetPreviewModalProps) {

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prévia do Cartão Resposta</DialogTitle>
          <DialogDescription>
            Visualização do cartão para {student.name}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <AnswerSheetCard student={student} config={config} />
        </div>

        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


