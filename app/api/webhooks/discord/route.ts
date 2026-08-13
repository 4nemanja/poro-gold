import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createOrder } from "@/lib/orders";
import { getAllWorkspaces } from "@/lib/data";

// External order-entry endpoint for the Discord bot. PlayerOK (and other
// API-less marketplaces) have no way to push orders in, so staff enter them from
// a Discord slash command; the bot POSTs here and we create a NORMAL manual
// order via lib/orders.createOrder — identical validation, withdrawal-fee lookup,
// profit math and analytics as the dashboard's "Add Order" form.
//
// This route is exempt from the app's cookie auth (see proxy.ts, which lets any
// /api/webhooks/* through) and instead authenticates the bot with a shared
// secret bearer token: Authorization: Bearer <DISCORD_BOT_SECRET>.
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Timing-safe compare of the presented bearer token against the configured secret.
function tokenOk(presented: string, secret: string): boolean {
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function bearer(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : "";
}

// The bot speaks in human terms ("platform": "PlayerOK", "order_id": "Mimileri").
// Map those onto the exact field names createOrder expects: a workspace SLUG and
// custom_id. Accepts a slug, a display name, or a short code, case-insensitively.
async function resolveWorkspaceSlug(input: string): Promise<string | null> {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  const all = await getAllWorkspaces();
  const hit =
    all.find((w) => w.slug.toLowerCase() === q) ??
    all.find((w) => w.name.toLowerCase() === q) ??
    all.find((w) => w.short.toLowerCase() === q);
  return hit ? hit.slug : null;
}

export async function POST(req: Request) {
  const secret = process.env.DISCORD_BOT_SECRET;
  if (!secret) {
    return bad("Discord bot not configured (set DISCORD_BOT_SECRET).", 503);
  }
  const presented = bearer(req);
  if (!presented || !tokenOk(presented, secret)) {
    return bad("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON");
  }

  // Normalize the bot's payload onto createOrder's field names. `workspace` or
  // `platform` may carry the site; `custom_id` or `order_id` the buyer/order ref.
  const platformInput = String(body.workspace ?? body.platform ?? "").trim();
  const slug = await resolveWorkspaceSlug(platformInput);
  if (!slug) return bad(`Unknown platform "${platformInput}".`);

  // The bot fills date in for us, but default a missing/blank one to today so
  // the endpoint is forgiving; createOrder still validates the YYYY-MM-DD shape.
  const date = String(body.date ?? "").trim() || new Date().toISOString().slice(0, 10);

  const mapped: Record<string, unknown> = {
    workspace: slug,
    date,
    product: body.product,
    custom_id: body.custom_id ?? body.order_id ?? "",
    supplier: body.supplier,
    status: body.status,
    cost: body.cost,
    sold_for: body.sold_for,
    fee_pct: body.fee_pct,
    supplier_share_pct: body.supplier_share_pct,
    refund_reason: body.refund_reason,
  };

  try {
    const res = await createOrder(mapped);
    if (!res.ok) return bad(res.error);
    const o = res.order;
    return NextResponse.json({
      ok: true,
      order: {
        order_id: o.order_id,
        platform: o.platform,
        product: o.product,
        status: o.status,
        sold_for: o.sold_for,
        profit: o.profit,
      },
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to create order", 500);
  }
}

// Health/handshake check — lets the bot confirm the endpoint and secret are wired.
export function GET() {
  return NextResponse.json({ ok: true, endpoint: "discord-webhook", configured: !!process.env.DISCORD_BOT_SECRET });
}
