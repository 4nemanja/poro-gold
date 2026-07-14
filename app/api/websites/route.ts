import { NextResponse } from "next/server";
import { getAllWorkspaces, getCustomWebsites, saveCustomWebsites, setPlatformFee } from "@/lib/data";
import type { Workspace } from "@/lib/workspaces";

// Websites (marketplaces). GET returns the full list (built-in + custom) for the
// client dropdowns/filters. POST adds a custom website (Admin — every logged-in
// user of this internal dashboard is an admin).
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET() {
  return NextResponse.json({ ok: true, websites: await getAllWorkspaces() });
}

const SOURCES: Record<string, Workspace["source"]> = { manual: "manual", "live api": "api", api: "api", "excel export": "excel", excel: "excel" };

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40);
}
function shortOf(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase().slice(0, 4);
  return name.slice(0, 3).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return bad("Website name is required.");
    const source = SOURCES[String(body.source ?? "manual").toLowerCase()] ?? "manual";

    let slug = slugify(name);
    if (!slug) return bad("Website name must contain letters or numbers.");
    const existing = await getAllWorkspaces();
    if (existing.some((w) => w.slug === slug)) {
      // Disambiguate if the slug collides.
      let n = 2;
      while (existing.some((w) => w.slug === `${slug}${n}`)) n++;
      slug = `${slug}${n}`;
    }

    const website: Workspace = { slug, name, short: shortOf(name), source };
    const custom = await getCustomWebsites();
    custom.push(website);
    await saveCustomWebsites(custom);

    // Optional fees reuse the existing per-platform fee config.
    const selling = Number(body.selling_fee);
    if (!Number.isNaN(selling) && selling > 0) await setPlatformFee("selling", slug, Math.round(selling * 100) / 100);
    const withdrawal = Number(body.withdrawal_fee);
    if (!Number.isNaN(withdrawal) && withdrawal > 0) await setPlatformFee("withdrawal", slug, Math.round(withdrawal * 100) / 100);

    return NextResponse.json({ ok: true, website });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add website", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return bad("Missing slug.");
    const custom = await getCustomWebsites();
    const next = custom.filter((w) => w.slug !== slug);
    if (next.length === custom.length) return bad("Only custom websites can be removed.", 404);
    await saveCustomWebsites(next);
    return NextResponse.json({ ok: true, deleted: slug });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete website", 500);
  }
}
