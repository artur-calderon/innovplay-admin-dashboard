import React from 'react';
import { Check, X } from 'lucide-react';

export const TableLegend: React.FC = () => {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-600 space-y-2">
        <div className="font-semibold text-gray-700">Legenda</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-700" />
            <span>Certas</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-600" />
            <span>Erradas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-green-700 font-bold">60%+</div>
            <span>Bom desempenho da turma</span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200" />
        <div className="font-semibold text-gray-700">Níveis</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
            <span>Abaixo do Básico</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
            <span>Básico</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-400" />
            <span>Adequado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
            <span>Avançado</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 