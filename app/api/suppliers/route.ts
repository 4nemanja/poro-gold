import { NextResponse } from "next/server";
import { getSuppliers, saveSuppliers } from "@/lib/data";
import type { SupplierRecord } from "@/lib/types";

// Suppliers are managed by hand and stored in app_config. name is the key.
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function parse(body: Record<string, unknown>): { error: string } | { record: SupplierRecord } {
  const name = String(body.name ?? "").trim();
  if (!name) return { error: "Supplier name is required." };
  const system = String(body.profit_system ?? "FIXED").toUpperCase();
  if (system !== "FIXED" && system !== "SPLIT") return { error: "Profit system must be FIXED or SPLIT." };
  const shareRaw = body.share_pct;
  let share = shareRaw === "" || shareRaw == null ? 0 : Number(shareRaw);
  if (Number.isNaN(share) || share < 0 || share > 100) return { error: "Share % must be between 0 and 100." };
  if (system === "FIXED") share = 0;
  return {
    record: {
      name,
      description: String(body.description ?? "").trim(),
      profit_system: system,
      share_pct: share,
    },
  };
}

// Add or update a supplier (matched by name, case-insensitive).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p = parse(body);
    if ("error" in p) return bad(p.error);
    const list = await getSuppliers();
    const original = String(body.original_name ?? p.record.name).trim().toLowerCase();
    const next = list.filter((s) => s.name.toLowerCase() !== original && s.name.toLowerCase() !== p.record.name.toLowerCase());
    next.push(p.record);
    next.sort((a, b) => a.name.localeCompare(b.name));
    await saveSuppliers(next);
    return NextResponse.json({ ok: true, supplier: p.record });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to save supplier", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const name = new URL(req.url).searchParams.get("name");
    if (!name) return bad("Missing supplier name.");
    const list = await getSuppliers();
    const next = list.filter((s) => s.name.toLowerCase() !== name.trim().toLowerCase());
    await saveSuppliers(next);
    return NextResponse.json({ ok: true, deleted: name });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete supplier", 500);
  }
}
