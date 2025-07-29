import React from 'react';

export const TableLegend: React.FC = () => {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-600 space-y-2">
        <div className="font-semibold text-gray-700">Legenda:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-1">
            <span className="text-green-700 text-2xl font-bold">✓</span>
            <span>Aluno acertou</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-600 text-2xl font-bold">✗</span>
            <span>Aluno errou</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-lg font-bold">-</span>
            <span>Questão não respondida</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-300 text-sm">○</span>
            <span>Questão não disponível</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 font-semibold mb-2">Porcentagem da Turma:</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-1">
              <span className="text-green-700 font-bold">60%+</span>
              <span>Turma teve bom desempenho</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600 font-bold">&lt;60%</span>
              <span>Turma teve dificuldade</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 