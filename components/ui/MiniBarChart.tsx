import { formatNum } from "@/lib/format";

export function MiniBarChart({
  data,
  color = "bg-sky-500",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end space-x-1.5 h-32 w-full mt-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end group relative">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
            {d.label}: {formatNum(d.value)}
          </div>
          <div
            className={`w-full rounded-t-sm transition-all duration-300 ${color} opacity-80 group-hover:opacity-100`}
            style={{ height: `${(d.value / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}
