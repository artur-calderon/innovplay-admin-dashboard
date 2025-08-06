import React from 'react';

export const TableLegend: React.FC = () => {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-600 space-y-2">
        <div className="font-semibold text-gray-700">Legenda:</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 text-green-600 flex items-center justify-center">✓</div>
            <span>Aluno acertou</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 text-red-600 flex items-center justify-center">✗</div>
            <span>Aluno errou ou deixou em branco</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 