import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, Target, ArrowUp, ArrowDown } from "lucide-react";

interface RankingCardProps {
  ranking: {
    posicaoAtual: number;
    pontos: number;
    mudancaPosicao: number;
    lista: Array<{
      id: number;
      nome: string;
      acertos: number;
      total: number;
      posicao: number;
      pontos: number;
      avatar?: string;
    }>;
    proximoObjetivo: {
      posicao: number;
      pontosNecessarios: number;
      progresso: number;
    };
  };
  rankingFilter: 'turma' | 'escola' | 'municipio';
  onRankingFilterChange: (filter: 'turma' | 'escola' | 'municipio') => void;
  userName?: string;
}

const RankingCard: React.FC<RankingCardProps> = ({ 
  ranking, 
  rankingFilter, 
  onRankingFilterChange, 
  userName 
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex-shrink-0">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold truncate">Ranking</div>
            <div className="text-xs text-muted-foreground">Sua posição atual</div>
          </div>
        </CardTitle>
        
        {/* Filtros do Ranking */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mt-3">
          <Button 
            size="sm" 
            variant={rankingFilter === 'turma' ? 'default' : 'ghost'} 
            className="text-xs px-1 sm:px-2 py-1"
            onClick={() => onRankingFilterChange('turma')}
          >
            <span className="hidden sm:inline">Turma</span>
            <span className="sm:hidden">T</span>
          </Button>
          <Button 
            size="sm" 
            variant={rankingFilter === 'escola' ? 'default' : 'ghost'} 
            className="text-xs px-1 sm:px-2 py-1"
            onClick={() => onRankingFilterChange('escola')}
          >
            <span className="hidden sm:inline">Escola</span>
            <span className="sm:hidden">E</span>
          </Button>
          <Button 
            size="sm" 
            variant={rankingFilter === 'municipio' ? 'default' : 'ghost'} 
            className="text-xs px-1 sm:px-2 py-1"
            onClick={() => onRankingFilterChange('municipio')}
          >
            <span className="hidden sm:inline">Município</span>
            <span className="sm:hidden">M</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Sua Posição Destacada */}
        <div className="bg-gradient-to-r from-blue-50 dark:from-blue-950/30 to-purple-50 dark:to-purple-950/30 rounded-lg p-2 sm:p-3 mb-4 border-2 border-blue-200 dark:border-blue-800 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs sm:text-sm">{userName ? userName.charAt(0).toUpperCase() : 'J'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs sm:text-sm text-foreground truncate">Você está em</div>
            <div className="flex items-center gap-1 sm:gap-2 mt-1">
              <Badge className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 text-xs px-1 sm:px-2 py-1 flex-shrink-0">{ranking.posicaoAtual}º lugar</Badge>
              {ranking.mudancaPosicao !== 0 && (
                <span className={`text-xs flex items-center gap-1 font-medium ${ranking.mudancaPosicao > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} flex-shrink-0`}>
                  {ranking.mudancaPosicao > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {ranking.mudancaPosicao > 0 ? '+' : ''}{ranking.mudancaPosicao} posição{Math.abs(ranking.mudancaPosicao) > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">{ranking.pontos}</div>
            <div className="text-xs text-muted-foreground">pontos</div>
          </div>
        </div>

        {/* Top 3 Destacado */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-4">
          {ranking.lista.slice(0, 3).map((item, index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const colors = [
              { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', icon: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
              { bg: 'bg-muted', border: 'border-border', icon: 'bg-gray-400 dark:bg-gray-500', text: 'text-foreground' },
              { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', icon: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' }
            ];
            return (
              <div key={item.id} className={`text-center p-1 sm:p-2 ${colors[index].bg} rounded-lg border ${colors[index].border}`}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 ${colors[index].icon} rounded-full flex items-center justify-center mx-auto mb-1`}>
                  <span className="text-white font-bold text-xs">{medals[index]}</span>
                </div>
            <div className="text-xs font-medium truncate text-foreground">{item.nome}</div>
            <div className={`text-xs ${colors[index].text} font-bold`}>{item.pontos.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
          
        {/* Lista Completa */}
        <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30">
          {ranking.lista.slice(3).map((item, index) => (
            <div key={item.id} className="flex items-center gap-2 sm:gap-3 py-2 px-2 hover:bg-muted rounded-lg transition-all duration-200 group">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted rounded-full flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-950/30 transition-colors flex-shrink-0">
                <span className="text-xs font-bold text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {item.posicao}
                </span>
              </div>
              <Avatar className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                <AvatarFallback className="text-xs bg-muted">
                  {item.nome.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate text-foreground">{item.nome}</div>
              </div>
              <div className="text-xs font-bold text-muted-foreground flex-shrink-0">{item.pontos}</div>
            </div>
          ))}
        </div>

        {/* Próximo Objetivo */}
        <div className="mt-4 p-2 sm:p-3 bg-gradient-to-r from-green-50 dark:from-green-950/30 to-emerald-50 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400 truncate">Próximo Objetivo</span>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mb-1">
            Faltam apenas <span className="font-bold">{ranking.proximoObjetivo.pontosNecessarios} pontos</span> para alcançar o {ranking.proximoObjetivo.posicao}º lugar!
          </div>
          <Progress value={ranking.proximoObjetivo.progresso} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default RankingCard;
