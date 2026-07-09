import { NextResponse } from "next/server";
import { getInvestmentBatches, saveInvestmentBatches } from "@/lib/data";
import type { InvestmentBatch } from "@/lib/data";

// Capital batches (e.g. $500 injections). Stored in app_config.
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function parse(body: Record<string, unknown>): { error: string } | { fields: Omit<InvestmentBatch, "id"> } {
  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) return { error: "Enter a valid batch amount (USD)." };
  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Enter a valid date (YYYY-MM-DD)." };
  return { fields: { date, amount: Math.round(amount * 100) / 100, note: String(body.note ?? "").trim() } };
}

export async function POST(req: Request) {
  try {
    const p = parse(await req.json());
    if ("error" in p) return bad(p.error);
    const batch: InvestmentBatch = { id: `INV-${Date.now().toString(36).toUpperCase()}`, ...p.fields };
    const list = await getInvestmentBatches();
    list.push(batch);
    await saveInvestmentBatches(list);
    return NextResponse.json({ ok: true, batch });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add batch", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return bad("Missing id.");
    const p = parse(body);
    if ("error" in p) return bad(p.error);
    const list = await getInvestmentBatches();
    const batch = list.find((b) => b.id === id);
    if (!batch) return bad("Batch not found.", 404);
    Object.assign(batch, p.fields);
    await saveInvestmentBatches(list);
    return NextResponse.json({ ok: true, batch });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to update batch", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("Missing id.");
    const list = await getInvestmentBatches();
    const next = list.filter((b) => b.id !== id);
    if (next.length === list.length) return bad("Batch not found.", 404);
    await saveInvestmentBatches(next);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete batch", 500);
  }
}
