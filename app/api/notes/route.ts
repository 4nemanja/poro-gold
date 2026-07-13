import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNotes, saveNotes } from "@/lib/data";
import { COOKIE, verify } from "@/lib/auth";
import type { DailyNote } from "@/lib/types";

// Daily notes — internal diary, stored in app_config. Any logged-in teammate can
// add one; the author is taken from their session. A note's date can be any day
// (past or future — e.g. flagging a day off in advance).
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function currentUser(): Promise<string | null> {
  return verify((await cookies()).get(COOKIE)?.value);
}

function parse(body: Record<string, unknown>): { error: string } | { date: string; content: string } {
  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Enter a valid date (YYYY-MM-DD)." };
  const content = String(body.content ?? "").trim();
  if (!content) return { error: "Note can't be empty." };
  return { date, content };
}

export async function POST(req: Request) {
  try {
    const p = parse(await req.json());
    if ("error" in p) return bad(p.error);
    const note: DailyNote = {
      id: `NOTE-${Date.now().toString(36).toUpperCase()}`,
      date: p.date,
      content: p.content,
      author: await currentUser(),
      created_at: new Date().toISOString(),
    };
    const list = await getNotes();
    list.unshift(note);
    await saveNotes(list);
    return NextResponse.json({ ok: true, note });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add note", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return bad("Missing id.");
    const p = parse(body);
    if ("error" in p) return bad(p.error);
    const list = await getNotes();
    const note = list.find((n) => n.id === id);
    if (!note) return bad("Note not found.", 404);
    note.date = p.date;
    note.content = p.content;
    note.updated_at = new Date().toISOString();
    await saveNotes(list);
    return NextResponse.json({ ok: true, note });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to update note", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("Missing id.");
    const list = await getNotes();
    const next = list.filter((n) => n.id !== id);
    if (next.length === list.length) return bad("Note not found.", 404);
    await saveNotes(next);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete note", 500);
  }
}
