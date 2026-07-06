import { Card } from "./Card";

export function StubPage({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
      </div>
      <Card className="flex items-center justify-center h-64 text-center">
        <p className="text-sm text-zinc-500 max-w-md">{note}</p>
      </Card>
    </div>
  );
}
