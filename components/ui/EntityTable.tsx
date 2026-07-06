import { Card } from "./Card";

export type EntityColumn<T> = {
  label: string;
  key: keyof T;
  align?: "left" | "right";
  className?: string;
  render?: (val: T[keyof T], row: T) => React.ReactNode;
};

export function EntityTable<T extends Record<string, unknown>>({
  columns,
  data,
}: {
  columns: EntityColumn<T>[];
  data: T[];
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="border-b border-zinc-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`pb-3 text-xs font-medium text-zinc-500 uppercase ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50 transition-colors">
              {columns.map((col, j) => (
                <td
                  key={j}
                  className={`py-4 text-sm ${
                    col.align === "right" ? "text-right" : ""
                  } ${col.className || "text-zinc-700"}`}
                >
                  {col.render ? col.render(row[col.key], row) : (row[col.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-sm text-zinc-500">
                No data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
