import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type StatCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color?: string;
  isLoading?: boolean;
};

export default function StatCard({ icon, title, value, color = "bg-blue-500", isLoading = false }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="mobile-card flex items-center gap-3 sm:gap-4">
        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-card flex items-center gap-3 sm:gap-4 card-hover">
      <div className={cn("p-2 sm:p-3 rounded-lg text-white flex-shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-500 text-xs sm:text-sm truncate">{title}</p>
        <p className="text-lg sm:text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
