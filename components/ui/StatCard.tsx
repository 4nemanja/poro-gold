import { Card } from "./Card";

export function StatCard({
  label,
  value,
  icon,
  iconClass = "bg-zinc-100 text-zinc-600",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-sm text-zinc-500">{label}</span>
        <div className={`p-2 rounded-lg ${iconClass}`}>{icon}</div>
      </div>
      <div className="mt-4 text-4xl font-bold text-zinc-900 tracking-tight">{value}</div>
    </Card>
  );
}
