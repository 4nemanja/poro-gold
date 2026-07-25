import crypto from "node:crypto";
import type { Order } from "./types";
import { upsertExternalOrder, cleanTitle } from "./marketplace";

// PlayerOK has NO official API. This talks to Playerok's own GraphQL endpoint the
// same way the community PlayerokAPI library does — by impersonating a logged-in
// browser session (token + __ddg5_ cookie). Reference:
//   https://github.com/alleexxeeyy/PlayerokAPI  ·  https://playerokapi.readthedocs.io
//
// ⚠️ BEST-EFFORT / FRAGILE — read SETUP-INTEGRATIONS.md:
//  - Needs your live browser session values (PLAYEROK_TOKEN, PLAYEROK_DDG5).
//    They expire; when a sync returns 0 or 401/403, grab fresh cookies.
//  - There is NO official API and NO events/webhook feed, so new orders are
//    picked up by POLLING this on each Refresh — not pushed in real time.
//  - Playerok can change its GraphQL schema / bot-checks at any time.

const ENDPOINT = "https://playerok.com/graphql";
const ORIGIN = "https://playerok.com";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0 Safari/537.36";

// Seller side: deals going out to buyers. (Playerok's ItemDealDirections.)
const DIRECTION = "OUT";
const PAGE_SIZE = 24; // Playerok caps deals pages at 24.

export type PlayerokEnv = { token: string; ddg5: string; userId: string; userAgent: string };

export function playerokEnv(): PlayerokEnv | null {
  const token = process.env.PLAYEROK_TOKEN;
  const ddg5 = process.env.PLAYEROK_DDG5;
  const userId = process.env.PLAYEROK_USER_ID;
  if (!token || !ddg5 || !userId) return null;
  return { token, ddg5, userId, userAgent: process.env.PLAYEROK_USER_AGENT || DEFAULT_UA };
}

const DEALS_QUERY = `query deals($pagination: PaginationInput, $filter: ItemDealFilter) {
  deals(pagination: $pagination, filter: $filter) {
    edges {
      node {
        id
        status
        direction
        createdAt
        completedAt
        item { id name price rawPrice }
        transaction { id value }
        user { id username }
      }
      cursor
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const DEALS_HASH = crypto.createHash("sha256").update(DEALS_QUERY).digest("hex");

type DealNode = {
  id?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
  item?: { name?: string; price?: number | string; rawPrice?: number | string };
  transaction?: { value?: number | string };
  user?: { username?: string };
};
type DealsData = {
  errors?: { message: string; extensions?: { code?: string } }[];
  data?: { deals?: { edges?: { node?: DealNode }[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string } } };
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Map Playerok deal statuses to our order statuses. A confirmed/completed deal
// means the buyer received & confirmed delivery.
function statusFor(raw: string | undefined): string {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("CONFIRM") || s.includes("COMPLET") || s === "PAID" || s === "SENT" || s === "RECEIVED") return "completed";
  if (s.includes("REFUND") || s.includes("ROLL") || s.includes("RETURN")) return "refunded";
  if (s.includes("CANCEL") || s.includes("DECLIN")) return "cancelled";
  return "in_delivery"; // PENDING / PROCESSING / awaiting confirmation
}

function normalize(n: DealNode): Order | null {
  if (!n.id) return null;
  const date = (n.createdAt ?? n.completedAt ?? "").slice(0, 10) || null;
  const price = num(n.transaction?.value) ?? num(n.item?.rawPrice) ?? num(n.item?.price);
  const status = statusFor(n.status);
  const buyer = n.user?.username ? `Buyer: ${n.user.username}` : null;
  return {
    order_id: `POK-${n.id}`,
    date,
    method: null,
    platform: "PlayerOK",
    product: cleanTitle(n.item?.name),
    supplier: null,
    cost: null,
    sold_for: price,
    profit: null,
    status,
    supplier_paid: null,
    notes: buyer, // captures the buyer's name (as seen in the Telegram alert)
    source: "playerok_api",
    currency: "RUB",
    workspace: "playerok",
    completed_at: status === "completed" ? date ?? undefined : undefined,
    added_at: new Date().toISOString(),
  };
}

// One GraphQL call for a page of deals. We send the full query AND the Apollo
// persisted-query hash together: servers using Automatic Persisted Queries
// register+run it, plain servers just run the query. (`extensions` must be a
// real object — Playerok rejects a JSON-encoded string.)
async function fetchDealsPage(env: PlayerokEnv, after: string | null): Promise<DealsData> {
  const body = {
    operationName: "deals",
    query: DEALS_QUERY,
    variables: {
      pagination: { first: PAGE_SIZE, after },
      filter: { userId: env.userId, direction: DIRECTION },
      showForbiddenImage: true,
    },
    extensions: { persistedQuery: { version: 1, sha256Hash: DEALS_HASH } },
  };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": env.userAgent,
    origin: ORIGIN,
    cookie: `token=${env.token}; __ddg5_=${env.ddg5}`,
    "apollographql-client-name": "web",
    "x-gql-op": "deals",
    "x-apollo-operation-name": "deals",
    "x-timezone-offset": "-240",
  };
  const res = await fetch(ENDPOINT, { method: "POST", headers, cache: "no-store", body: JSON.stringify(body) });
  if (res.status === 401 || res.status === 403)
    throw new Error(`PlayerOK auth failed (${res.status}) — session likely expired; refresh PLAYEROK_TOKEN / PLAYEROK_DDG5.`);
  if (!res.ok) throw new Error(`PlayerOK GraphQL returned ${res.status} — session may have expired or the site changed.`);
  const json = (await res.json()) as DealsData;
  if (json.errors?.length) throw new Error(`PlayerOK GraphQL error: ${json.errors[0].message}`);
  return json;
}

export type PlayerokReport = { synced_at: string; source: string; orders: number; historical: boolean };

// Full sync: paginates through EVERY deal (past and present), so it imports
// historical orders as well as new ones and keeps their delivery status current.
export async function syncPlayerok(): Promise<PlayerokReport> {
  const env = playerokEnv();
  if (!env) throw new Error("PlayerOK not configured (set PLAYEROK_TOKEN, PLAYEROK_DDG5, PLAYEROK_USER_ID)");

  const collected: Order[] = [];
  let after: string | null = null;
  for (let guard = 0; guard < 500; guard++) {
    const json = await fetchDealsPage(env, after);
    const deals = json.data?.deals;
    for (const e of deals?.edges ?? []) {
      const o = e.node ? normalize(e.node) : null;
      if (o) collected.push(o);
    }
    if (!deals?.pageInfo?.hasNextPage || !deals.pageInfo.endCursor) break;
    after = deals.pageInfo.endCursor;
  }

  // Omit cost/supplier/profit so any values entered by hand survive a resync.
  for (const o of collected) {
    const { cost, supplier, profit, ...rest } = o;
    void cost; void supplier; void profit;
    await upsertExternalOrder(rest as typeof o);
  }

  return { synced_at: new Date().toISOString(), source: "playerok_api", orders: collected.length, historical: true };
}
