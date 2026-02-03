import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, BookOpen, Award } from "lucide-react";

interface StatsCardsProps {
  stats: {
    proficiencia: { value: number; change: number; trend: 'up' | 'down' };
    nota: { value: number; change: number; trend: 'up' | 'down' };
    nivel: { value: string; change: number; trend: 'up' | 'down' };
  };
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon,
  color = "bg-blue-500"
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) => (
  <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
              {typeof value === 'number' && value % 1 !== 0 ? (Math.ceil(value * 10) / 10).toString().replace('.', ',') : value}
            </span>
          </div>
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${color} text-white flex-shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
      <StatCard
        title="Proficiência"
        value={stats.proficiencia.value || 0}
        icon={Target}
        color="bg-green-500"
      />
      <StatCard
        title="Nota"
        value={stats.nota.value ? Math.ceil(stats.nota.value * 10) / 10 : 0}
        icon={BookOpen}
        color="bg-red-500"
      />
      <StatCard
        title="Nível de Classificação"
        value={stats.nivel.value || 'N/A'}
        icon={Award}
        color="bg-yellow-500"
      />
    </div>
  );
};

export default StatsCards;
