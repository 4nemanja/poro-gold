import type { Order } from "./types";
import { upsertExternalOrder, cleanTitle } from "./marketplace";

// PlayerOK has NO official API. This replicates the community PlayerokAPI library
// (https://github.com/alleexxeeyy/PlayerokAPI): it calls Playerok's GraphQL by
// impersonating a logged-in browser session (token + __ddg5_ cookie).
//
// ⚠️ BEST-EFFORT / FRAGILE:
//  - Needs your live browser session values (PLAYEROK_TOKEN, PLAYEROK_DDG5).
//  - Playerok can change its GraphQL schema or trigger bot checks at any time,
//    which would break this. If a refresh returns 0 or errors, the session
//    likely expired — grab fresh cookie values and update .env.local.
//  - The exact field selection below is inferred from the library's types and
//    may need a tweak once tested against a live session.

const ENDPOINT = "https://playerok.com/graphql";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

// Deals where you are the seller (outgoing to a buyer).
const DIRECTION = "OUT";
// Statuses that represent a real, paid sale we want to record.
const STATUSES = ["CONFIRMED", "PAID", "SENT", "PENDING", "ROLLED_BACK"];

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

type DealNode = {
  id?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
  item?: { name?: string; price?: number | string; rawPrice?: number | string };
  transaction?: { value?: number | string };
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function statusFor(raw: string | undefined): string {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("CONFIRM") || s.includes("COMPLET") || s === "PAID" || s === "SENT") return "completed";
  if (s.includes("REFUND") || s.includes("ROLL")) return "refunded";
  if (s.includes("CANCEL")) return "cancelled";
  return "in_delivery";
}

function normalize(n: DealNode): Order | null {
  if (!n.id) return null;
  const date = (n.createdAt ?? n.completedAt ?? "").slice(0, 10) || null;
  const price = num(n.transaction?.value) ?? num(n.item?.rawPrice) ?? num(n.item?.price);
  const status = statusFor(n.status);
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
    notes: null,
    source: "playerok_api",
    currency: "RUB",
    workspace: "playerok",
    completed_at: status === "completed" ? date ?? undefined : undefined,
    added_at: new Date().toISOString(),
  };
}

export type PlayerokReport = { synced_at: string; source: string; orders: number };

export async function syncPlayerok(): Promise<PlayerokReport> {
  const env = playerokEnv();
  if (!env) throw new Error("PlayerOK not configured (set PLAYEROK_TOKEN, PLAYEROK_DDG5, PLAYEROK_USER_ID)");

  const headers = {
    "content-type": "application/json",
    "user-agent": env.userAgent,
    cookie: `token=${env.token}; __ddg5_=${env.ddg5}`,
    "apollographql-client-name": "web",
  };

  const collected: Order[] = [];
  let after: string | null = null;
  for (let guard = 0; guard < 100; guard++) {
    const variables = {
      pagination: { first: 24, after },
      filter: { userId: env.userId, direction: DIRECTION, status: STATUSES },
    };
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ operationName: "deals", query: DEALS_QUERY, variables }),
    });
    if (!res.ok) throw new Error(`PlayerOK GraphQL returned ${res.status} (session may have expired)`);
    const json = (await res.json()) as {
      errors?: { message: string }[];
      data?: { deals?: { edges?: { node?: DealNode }[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string } } };
    };
    if (json.errors?.length) throw new Error(`PlayerOK GraphQL error: ${json.errors[0].message}`);
    const deals = json.data?.deals;
    for (const e of deals?.edges ?? []) {
      const o = e.node ? normalize(e.node) : null;
      if (o) collected.push(o);
    }
    if (!deals?.pageInfo?.hasNextPage || !deals.pageInfo.endCursor) break;
    after = deals.pageInfo.endCursor;
  }

  for (const o of collected) {
    const { cost, supplier, profit, ...rest } = o;
    void cost; void supplier; void profit;
    await upsertExternalOrder(rest as typeof o);
  }

  return { synced_at: new Date().toISOString(), source: "playerok_api", orders: collected.length };
}
