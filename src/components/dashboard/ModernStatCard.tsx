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
  
  const getPerformanceColors = (perf: ModernStatCardProps['performance']) => {
    switch (perf) {
      case 'excellent':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          valueColor: 'text-green-700',
          borderColor: 'border-green-200',
          hoverBg: 'hover:bg-green-50'
        };
      case 'good':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          valueColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          hoverBg: 'hover:bg-blue-50'
        };
      case 'average':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          valueColor: 'text-yellow-700',
          borderColor: 'border-yellow-200',
          hoverBg: 'hover:bg-yellow-50'
        };
      case 'poor':
        return {
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          valueColor: 'text-orange-700',
          borderColor: 'border-orange-200',
          hoverBg: 'hover:bg-orange-50'
        };
      case 'critical':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          valueColor: 'text-red-700',
          borderColor: 'border-red-200',
          hoverBg: 'hover:bg-red-50'
        };
    }
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

