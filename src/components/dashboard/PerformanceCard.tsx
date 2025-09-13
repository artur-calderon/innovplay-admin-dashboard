import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import TrendIndicator from "./TrendIndicator";

interface PerformanceCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  performance?: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  trend?: {
    current: number;
    previous: number;
    isPositive?: boolean;
  };
  isLoading?: boolean;
  className?: string;
}

export default function PerformanceCard({ 
  icon, 
  title, 
  value, 
  subtitle,
  performance = 'average',
  trend,
  isLoading = false,
  className 
}: PerformanceCardProps) {
  
  const getPerformanceColors = (perf: PerformanceCardProps['performance']) => {
    switch (perf) {
      case 'excellent':
        return {
          bg: 'bg-green-50',
          icon: 'text-green-600',
          value: 'text-green-700',
          border: 'border-green-200'
        };
      case 'good':
        return {
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          value: 'text-blue-700',
          border: 'border-blue-200'
        };
      case 'average':
        return {
          bg: 'bg-yellow-50',
          icon: 'text-yellow-600',
          value: 'text-yellow-700',
          border: 'border-yellow-200'
        };
      case 'poor':
        return {
          bg: 'bg-orange-50',
          icon: 'text-orange-600',
          value: 'text-orange-700',
          border: 'border-orange-200'
        };
      case 'critical':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-600',
          value: 'text-red-700',
          border: 'border-red-200'
        };
    }
  };

  const colors = getPerformanceColors(performance);

  if (isLoading) {
    return (
      <div className={cn("p-4 rounded-lg border", className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            {subtitle && <Skeleton className="h-3 w-24" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all duration-200 hover:shadow-md",
      colors.bg,
      colors.border,
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Ícone */}
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <div className={colors.icon}>
            {icon}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-600 truncate">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xl font-bold", colors.value)}>
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
            <p className="text-xs text-gray-500 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

