import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMilestones, saveMilestones } from "@/lib/data";
import { COOKIE, verify } from "@/lib/auth";
import type { Milestone } from "@/lib/types";

// Milestones — hand-managed goals with a required due date, shown on the Daily
// Tracker. Any logged-in teammate can add, complete, or delete one.
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function requireUser(): Promise<string | null | false> {
  const user = verify((await cookies()).get(COOKIE)?.value);
  return user ?? false;
}

export async function POST(req: Request) {
  try {
    if ((await requireUser()) === false) return bad("Unauthorized", 401);
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const due = String(body.due_date ?? "").trim();
    if (!title) return bad("Milestone needs a title.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return bad("Pick a due date.");
    const milestone: Milestone = {
      id: `MS-${Date.now().toString(36).toUpperCase()}`,
      title,
      due_date: due,
      done: false,
      created_at: new Date().toISOString(),
    };
    const list = await getMilestones();
    list.push(milestone);
    await saveMilestones(list);
    return NextResponse.json({ ok: true, milestone });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add milestone", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    if ((await requireUser()) === false) return bad("Unauthorized", 401);
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return bad("Missing id.");
    const list = await getMilestones();
    const ms = list.find((m) => m.id === id);
    if (!ms) return bad("Milestone not found.", 404);
    ms.done = typeof body.done === "boolean" ? body.done : !ms.done;
    await saveMilestones(list);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to update milestone", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    if ((await requireUser()) === false) return bad("Unauthorized", 401);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("Missing id.");
    const list = await getMilestones();
    await saveMilestones(list.filter((m) => m.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete milestone", 500);
  }
}
