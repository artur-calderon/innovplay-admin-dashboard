import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Medal, Star, Trophy, Zap } from "lucide-react";

interface MedalhasCardProps {
  medalhas: {
    total: number;
    percentage: number;
    conquistadas: Array<{
      id: string;
      nome: string;
      tipo: 'ouro' | 'prata' | 'bronze';
      icone: string;
      descricao: string;
    }>;
    proximas: Array<{
      id: string;
      nome: string;
      requisito: string;
      progresso: number;
    }>;
  };
}

const MedalhasCard: React.FC<MedalhasCardProps> = ({ medalhas }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex-shrink-0">
            <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate">Coleção de Medalhas</div>
            <div className="text-xs text-muted-foreground font-normal">Suas conquistas</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Medalhas Conquistadas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <div className="text-center p-1 sm:p-2 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg border border-yellow-300">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <Medal className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="text-xs font-medium text-yellow-700 truncate">Primeira Nota 10</div>
          </div>
          <div className="text-center p-1 sm:p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg border border-blue-300">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="text-xs font-medium text-blue-700 truncate">Streak 7 dias</div>
          </div>
          <div className="text-center p-1 sm:p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg border border-purple-300">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="text-xs font-medium text-purple-700 truncate">Top 10</div>
          </div>
        </div>

        {/* Progresso Geral */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium truncate">Progresso da Coleção</span>
            <span className="text-xs sm:text-sm text-blue-600 font-bold flex-shrink-0">{medalhas.total}/12</span>
          </div>
          <Progress value={medalhas.percentage} className="h-3" />
          <div className="text-xs text-muted-foreground">
            {medalhas.percentage}% das medalhas conquistadas
          </div>
        </div>

        {/* Próximas Medalhas */}
        <div className="mt-4 p-2 sm:p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-orange-700 truncate">Próximas Conquistas</span>
          </div>
          <div className="space-y-2">
            {medalhas.proximas.map((medalha) => (
              <div key={medalha.id} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded-full opacity-50 flex-shrink-0"></div>
                <span className="text-xs text-gray-600 truncate">{medalha.nome} - {medalha.requisito}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats das Medalhas */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
            <div className="text-base sm:text-lg font-bold text-yellow-600">3</div>
            <div className="text-xs text-yellow-700">Ouro</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
            <div className="text-base sm:text-lg font-bold text-gray-600">1</div>
            <div className="text-xs text-gray-700">Prata</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MedalhasCard;
