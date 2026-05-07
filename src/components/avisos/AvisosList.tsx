import { useState } from 'react';
import { AvisoCard } from './AvisoCard';
import { AvisoDetailModal } from './AvisoDetailModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import type { Aviso, CreateAvisoDTO } from '@/types/avisos';

interface AvisosListProps {
  avisos: Aviso[];
  isLoading: boolean;
  onEditAviso: (id: string, data: Partial<CreateAvisoDTO>) => Promise<void>;
  onDeleteAviso: (id: string) => Promise<void>;
}

export function AvisosList({ avisos, isLoading, onEditAviso, onDeleteAviso }: AvisosListProps) {
  const [selectedAviso, setSelectedAviso] = useState<Aviso | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (aviso: Aviso) => {
    setSelectedAviso(aviso);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Pequeno delay antes de limpar o aviso selecionado para transição suave
    setTimeout(() => {
      setSelectedAviso(null);
    }, 200);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Carregando avisos...</p>
      </div>
    );
  }

  if (avisos.length === 0) {
    return (
      <Alert className="max-w-2xl mx-auto">
        <Inbox className="h-5 w-5" />
        <AlertDescription className="ml-2">
          <p className="font-medium mb-1">Nenhum aviso encontrado</p>
          <p className="text-sm text-gray-600">
            Não há avisos disponíveis para visualização no momento.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Grid de Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {avisos.map((aviso) => (
          <AvisoCard
            key={aviso.id}
            aviso={aviso}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {/* Informação de Total */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Exibindo {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
      </div>

      {/* Modal de Detalhes */}
      <AvisoDetailModal
        aviso={selectedAviso}
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        onEditAviso={onEditAviso}
        onDeleteAviso={onDeleteAviso}
      />
    </>
  );
}

