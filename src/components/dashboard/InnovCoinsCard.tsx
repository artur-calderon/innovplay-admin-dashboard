import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, BookOpen, Star, Flame, ArrowUp } from "lucide-react";

interface InnovCoinsCardProps {
  moedas: {
    total: number;
    ganhasHoje: number;
    historico: Array<{
      data: string;
      acao: string;
      valor: number;
    }>;
    loja: Array<{
      item: string;
      preco: number;
      disponivel: boolean;
    }>;
  };
}

const InnovCoinsCard: React.FC<InnovCoinsCardProps> = ({ moedas }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex-shrink-0">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate">InnovCoins</div>
            <div className="text-xs text-muted-foreground font-normal">Sua economia</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Saldo Atual */}
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-1">{moedas.total}</div>
          <div className="text-xs sm:text-sm text-yellow-700">InnovCoins disponíveis</div>
          <div className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
            <ArrowUp className="w-3 h-3" />
            +{moedas.ganhasHoje} hoje
          </div>
        </div>

        {/* Maneiras de Ganhar */}
        <div className="space-y-2 mb-4">
          <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Como ganhar mais:</div>
          <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs truncate">Fazer avaliação</span>
            </div>
            <span className="text-xs font-bold text-green-600 flex-shrink-0">+2 coins</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs truncate">Nota acima de 8</span>
            </div>
            <span className="text-xs font-bold text-blue-600 flex-shrink-0">+5 coins</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Flame className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs truncate">Streak 7 dias</span>
            </div>
            <span className="text-xs font-bold text-purple-600 flex-shrink-0">+10 coins</span>
          </div>
        </div>

        {/* Loja Preview */}
        <div className="p-2 sm:p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">🛍️</span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-indigo-700 truncate">Loja de Recompensas</span>
          </div>
          <div className="space-y-1">
            {moedas.loja.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className={`text-xs ${item.disponivel ? 'text-indigo-600' : 'text-gray-400'} truncate`}>
                  {item.item}
                </span>
                <span className={`text-xs font-bold ${item.disponivel ? 'text-indigo-700' : 'text-gray-500'} flex-shrink-0`}>
                  {item.preco} coins
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico Rápido */}
        <div className="mt-4">
          <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Últimas transações:</div>
          <div className="space-y-1 text-xs">
            {moedas.historico.map((transacao, index) => (
              <div key={index} className="flex items-center justify-between py-1">
                <span className="text-gray-600 truncate">{transacao.acao}</span>
                <span className="text-green-600 font-medium flex-shrink-0">+{transacao.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InnovCoinsCard;
