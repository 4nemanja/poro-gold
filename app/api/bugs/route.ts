import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBugs, saveBugs } from "@/lib/data";
import { COOKIE, verify } from "@/lib/auth";
import type { BugReport } from "@/lib/types";

// Shared bug/request board, stored in app_config. Any logged-in teammate can add
// one; the reporter is taken from their session so you can see who logged it.
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function currentUser(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return verify(token);
}

function parse(body: Record<string, unknown>): { error: string } | { fields: Omit<BugReport, "id" | "created_at" | "reporter" | "status"> } {
  const title = String(body.title ?? "").trim();
  if (!title) return { error: "A short title is required." };
  const type = String(body.type ?? "bug").toLowerCase();
  if (type !== "bug" && type !== "request") return { error: "Type must be bug or request." };
  const amtRaw = body.amount;
  const amount = amtRaw === "" || amtRaw == null ? null : Number(amtRaw);
  if (amount != null && Number.isNaN(amount)) return { error: "Amount must be a number." };
  let unit = body.amount_unit == null ? null : String(body.amount_unit);
  if (unit !== "$" && unit !== "%") unit = amount != null ? "$" : null;
  return {
    fields: {
      title,
      description: String(body.description ?? "").trim() || null,
      type: type as BugReport["type"],
      amount,
      amount_unit: amount != null ? (unit as "$" | "%") : null,
    },
  };
}

export async function POST(req: Request) {
  try {
    const p = parse(await req.json());
    if ("error" in p) return bad(p.error);
    const bug: BugReport = {
      id: `BUG-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      reporter: await currentUser(),
      status: "open",
      ...p.fields,
    };
    const list = await getBugs();
    list.unshift(bug);
    await saveBugs(list);
    return NextResponse.json({ ok: true, bug });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add bug", 500);
  }
}

// Edit a bug and/or flip its status (open <-> resolved).
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return bad("Missing id.");
    const list = await getBugs();
    const bug = list.find((b) => b.id === id);
    if (!bug) return bad("Bug not found.", 404);

    // Status-only update (the resolve/reopen toggle).
    if (body.status != null && body.title == null) {
      const status = String(body.status).toLowerCase();
      if (status !== "open" && status !== "resolved") return bad("Invalid status.");
      bug.status = status as BugReport["status"];
    } else {
      const p = parse(body);
      if ("error" in p) return bad(p.error);
      Object.assign(bug, p.fields);
      if (body.status === "open" || body.status === "resolved") bug.status = body.status;
    }
    await saveBugs(list);
    return NextResponse.json({ ok: true, bug });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to update bug", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("Missing id.");
    const list = await getBugs();
    const next = list.filter((b) => b.id !== id);
    if (next.length === list.length) return bad("Bug not found.", 404);
    await saveBugs(next);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete bug", 500);
  }
}
