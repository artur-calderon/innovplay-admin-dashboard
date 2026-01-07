import React from 'react';
import { Check, X, MousePointer2 } from 'lucide-react';

export const TableLegend: React.FC = () => {
  return (
    <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
      <div className="text-xs text-muted-foreground space-y-2">
        <div className="font-semibold text-foreground">Legenda</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-700 dark:text-green-400" />
            <span>Certas</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Erradas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-green-700 dark:text-green-400 font-bold">60%+</div>
            <span>Bom desempenho da turma</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border" />
        <div className="font-semibold text-foreground">Níveis</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 dark:bg-red-600" />
            <span>Abaixo do Básico</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 dark:bg-yellow-600" />
            <span>Básico</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-400 dark:bg-green-600" />
            <span>Adequado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600 dark:bg-green-700" />
            <span>Avançado</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border" />
        <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
          <MousePointer2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Dica:</strong> Clique com o botão direito no nome do aluno para abrir os detalhes em uma nova guia.
          </span>
        </div>
      </div>
    </div>
  );
}; 