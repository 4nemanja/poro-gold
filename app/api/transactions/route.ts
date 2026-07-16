import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTransactions, saveTransactions, resolveWorkspace } from "@/lib/data";
import { COOKIE, verify } from "@/lib/auth";
import type { SupplierTransaction } from "@/lib/types";

// Payments sent to suppliers. Stored in app_config. Any logged-in teammate can
// add one; the creator is taken from their session.
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function currentUser(): Promise<string | null> {
  return verify((await cookies()).get(COOKIE)?.value);
}

async function parse(body: Record<string, unknown>): Promise<{ error: string } | { fields: Omit<SupplierTransaction, "id" | "created_by" | "created_at"> }> {
  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) return { error: "Enter a valid amount." };
  const supplier = String(body.supplier ?? "").trim();
  if (!supplier) return { error: "Supplier is required." };
  const ws = await resolveWorkspace(String(body.platform ?? ""));
  if (!ws) return { error: "Pick a valid platform." };
  const reason = String(body.reason ?? "").trim();
  if (!reason) return { error: "Reason is required." };
  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Enter a valid date (YYYY-MM-DD)." };
  return { fields: { date, amount: Math.round(amount * 100) / 100, supplier, platform: ws.slug, reason } };
}

export async function POST(req: Request) {
  try {
    const p = await parse(await req.json());
    if ("error" in p) return bad(p.error);
    const tx: SupplierTransaction = {
      id: `TX-${Date.now().toString(36).toUpperCase()}`,
      created_by: await currentUser(),
      created_at: new Date().toISOString(),
      ...p.fields,
    };
    const list = await getTransactions();
    list.unshift(tx);
    await saveTransactions(list);
    return NextResponse.json({ ok: true, transaction: tx });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add transaction", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return bad("Missing id.");
    const p = await parse(body);
    if ("error" in p) return bad(p.error);
    const list = await getTransactions();
    const tx = list.find((t) => t.id === id);
    if (!tx) return bad("Transaction not found.", 404);
    Object.assign(tx, p.fields);
    await saveTransactions(list);
    return NextResponse.json({ ok: true, transaction: tx });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to update transaction", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("Missing id.");
    const list = await getTransactions();
    const next = list.filter((t) => t.id !== id);
    if (next.length === list.length) return bad("Transaction not found.", 404);
    await saveTransactions(next);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete transaction", 500);
  }
}
