import { getNotes } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { NoteModal } from "@/components/NoteModal";
import { DeleteNoteButton } from "@/components/DeleteNoteButton";
import { NotesFilter } from "@/components/NotesFilter";

export const dynamic = "force-dynamic";

type ViewParams = { date?: string; author?: string };

export default async function NotesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<ViewParams>;
}) {
  const sp = await searchParams;
  const all = await getNotes();
  const authors = [...new Set(all.map((n) => n.author).filter((a): a is string => !!a))].sort();

  const notes = all
    .filter((n) => (!sp.date || n.date === sp.date) && (!sp.author || n.author === sp.author))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Daily Notes</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Internal diary of what happened each day — sales dips, days off, platform or supplier issues.
          </p>
        </div>
        <NoteModal />
      </div>

      <NotesFilter authors={authors} />

      <Card
        title="Notes History"
        action={<span className="text-xs text-zinc-400">{notes.length} of {all.length}</span>}
      >
        {notes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {all.length === 0 ? "No notes yet. Use Add Note to record what happened on a day." : "No notes match this filter."}
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Note</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Author</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Created</th>
                <th className="pb-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {notes.map((n) => (
                <tr key={n.id} className="hover:bg-zinc-50 transition-colors align-top">
                  <td className="py-3.5 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">{n.date}</span>
                  </td>
                  <td className="py-3.5 text-sm text-zinc-700 whitespace-pre-wrap">{n.content}</td>
                  <td className="py-3.5 text-sm text-zinc-500">{n.author ?? "—"}</td>
                  <td className="py-3.5 text-sm text-zinc-500">
                    {(n.created_at ?? "").replace("T", " ").slice(0, 16)}
                    {n.updated_at && <span className="text-zinc-400"> (edited)</span>}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <NoteModal note={n} />
                      <DeleteNoteButton id={n.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
