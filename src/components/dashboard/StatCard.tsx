
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color?: string;
};

export default function StatCard({ icon, title, value, color = "bg-blue-500" }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={cn("stat-card-icon", color)}>{icon}</div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
