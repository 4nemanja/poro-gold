import { colors } from "@/lib/theme";

export function Card({
  children,
  className = "",
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`${colors.card} ${colors.border} border rounded-xl overflow-hidden flex flex-col shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-200 bg-zinc-50/60">
          {title && (
            <h3 className={`text-sm font-medium ${colors.textMain}`}>{title}</h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}
