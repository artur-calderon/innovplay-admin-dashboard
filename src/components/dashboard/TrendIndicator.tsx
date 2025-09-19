import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  current: number;
  previous: number;
  isPositive?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export default function TrendIndicator({ 
  current, 
  previous, 
  isPositive = true, 
  showPercentage = true,
  className 
}: TrendIndicatorProps) {
  const trend = current > previous ? "up" : current < previous ? "down" : "stable";
  const percentage = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return isPositive ? "↗️" : "↘️";
      case "down":
        return isPositive ? "↘️" : "↗️";
      case "stable":
        return "→";
    }
  };

  const getTrendColor = () => {
    if (trend === "stable") return "text-gray-600";
    
    const isGoodTrend = (trend === "up" && isPositive) || (trend === "down" && !isPositive);
    return isGoodTrend ? "text-green-600" : "text-red-600";
  };

  const getTrendBgColor = () => {
    if (trend === "stable") return "bg-gray-100";
    
    const isGoodTrend = (trend === "up" && isPositive) || (trend === "down" && !isPositive);
    return isGoodTrend ? "bg-green-50" : "bg-red-50";
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
      getTrendBgColor(),
      getTrendColor(),
      className
    )}>
      <span>{getTrendIcon()}</span>
      {showPercentage && (
        <span>{Math.abs(percentage).toFixed(1)}%</span>
      )}
    </div>
  );
}

