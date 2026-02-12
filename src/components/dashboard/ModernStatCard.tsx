import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import TrendIndicator from "./TrendIndicator";
import AnimatedCard from "./AnimatedCard";

interface ModernStatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    current: number;
    previous: number;
    isPositive?: boolean;
  };
  performance?: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function ModernStatCard({ 
  icon, 
  title, 
  value, 
  subtitle,
  trend,
  performance = 'average',
  isLoading = false,
  className,
  onClick
}: ModernStatCardProps) {
  
  // Cores roxas habituais do sistema (sem mistura de amarelo/azul)
  const getPerformanceColors = (_perf: ModernStatCardProps['performance']) => {
    return {
      iconBg: 'bg-violet-100 dark:bg-violet-950/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-violet-700 dark:text-violet-400',
      borderColor: 'border-violet-200 dark:border-violet-800',
      hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-950/30'
    };
  };

  const colors = getPerformanceColors(performance);

  if (isLoading) {
    return (
      <AnimatedCard className={cn("p-4 rounded-lg border bg-card", className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            {subtitle && <Skeleton className="h-3 w-24" />}
          </div>
        </div>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard 
      className={cn(
        "p-4 rounded-lg border bg-card cursor-pointer transition-all duration-200",
        colors.borderColor,
        colors.hoverBg,
        onClick && "hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Ícone */}
        <div className={cn("p-2 rounded-lg", colors.iconBg)}>
          <div className={cn("h-5 w-5", colors.iconColor)}>
            {icon}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xl font-bold", colors.valueColor)}>
              {value}
            </span>
            {trend && (
              <TrendIndicator
                current={trend.current}
                previous={trend.previous}
                isPositive={trend.isPositive}
                showPercentage={true}
              />
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}

