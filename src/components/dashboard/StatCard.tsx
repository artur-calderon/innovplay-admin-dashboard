
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color?: string;
};

export default function StatCard({ icon, title, value, color = "bg-blue-500" }: StatCardProps) {
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
