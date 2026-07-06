"""
GameBoost -> Marketplace OS sync.

Pulls the full order history from the GameBoost seller API and normalizes it
into the same fact_orders shape the rest of the app uses. Re-runnable: run it
any time to refresh GameBoost data.

HARD SECURITY RULE (same as the Credentials sheet):
    The GameBoost API returns buyer `credentials` (login + plaintext password),
    plus `offer_credentials` and `delivery_instructions` on account orders.
    These are NEVER normalized, written to disk, pushed to Supabase, or shown in
    the UI. They are dropped the moment each order is read. A final assertion
    scans the output and aborts if any credential-looking field leaked through.

The API knows the SELL side only (what the buyer paid). It does not know your
supplier cost, so `cost` and `profit` stay null here - those come from your own
cost data, joined in later.

Usage:
    python scripts/sync_gameboost.py            # pull + write local JSON
    python scripts/sync_gameboost.py --push     # also push to Supabase (needs env vars)

Env (read from .env.local if not already set):
    GAMEBOOST_API_KEY            required
    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   only for --push
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "ingested"
API_BASE = "https://api.gameboost.com/v2"

# Fields that must never survive ingestion.
FORBIDDEN_FIELDS = ("credentials", "offer_credentials", "delivery_instructions")


def load_env_local():
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def api_get(path: str, api_key: str) -> dict:
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "PoroGold-Sync/1.0")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                wait = 2 ** attempt
                print(f"  rate limited, backing off {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("unreachable")


def ts_to_date(ts) -> str | None:
    if not ts:
        return None
    return datetime.fromtimestamp(int(ts), tz=timezone.utc).strftime("%Y-%m-%d")


def price_usd(order: dict) -> float | None:
    p = order.get("price_usd") or order.get("price")
    if isinstance(p, dict):
        v = p.get("value")
        return float(v) if v is not None else None
    return float(p) if isinstance(p, (int, float)) else None


def clean_title(title: str | None) -> str | None:
    if not title:
        return None
    # Strip emoji / decorative symbols, collapse whitespace.
    t = re.sub(r"[^\x00-\x7F]+", "", title).strip()
    t = re.sub(r"\s{2,}", " ", t)
    return t or title.strip()


def normalize(order: dict, order_kind: str) -> dict:
    """Map a GameBoost order to the fact_orders shape. Credentials never touched."""
    gid = order.get("id")
    return {
        "order_id": f"GB-{gid}",
        "date": ts_to_date(order.get("created_at") or order.get("purchased_at")),
        "method": order_kind,  # "item" or "account" - GameBoost fulfillment kind
        "platform": "GameBoost",
        "product": clean_title(order.get("title")),
        "supplier": None,  # your internal data, not something GameBoost knows
        "cost": None,      # API is sell-side only; cost/profit filled from your data later
        "sold_for": price_usd(order),
        "profit": None,
        "status": order.get("status"),
        "supplier_paid": None,
        "notes": None,
        "source": "gameboost_api",
        "purchased_at": ts_to_date(order.get("purchased_at")),
        "completed_at": ts_to_date(order.get("completed_at")),
        "refunded_at": ts_to_date(order.get("refunded_at")),
        "is_disputed": bool(order.get("is_disputed")),
    }


def pull_all(path: str, order_kind: str, api_key: str) -> list:
    orders = []
    page = 1
    while True:
        payload = api_get(f"{path}?per_page=50&sort=-created_at&page={page}", api_key)
        data = payload.get("data", [])
        for raw in data:
            # Defensive: never even carry credentials into memory-normalized form.
            for f in FORBIDDEN_FIELDS:
                raw.pop(f, None)
            orders.append(normalize(raw, order_kind))
        meta = payload.get("meta", {})
        last_page = meta.get("last_page", page)
        print(f"  {path} page {page}/{last_page} ({len(data)} orders)")
        if page >= last_page or not data:
            break
        page += 1
    return orders


def assert_no_credentials(orders: list):
    """Abort if anything credential-looking leaked into the normalized output."""
    blob = json.dumps(orders).lower()
    for needle in ("password", "credential", "login", "delivery_instruction"):
        if needle in blob:
            print(f"ABORT: '{needle}' found in normalized output - refusing to write.", file=sys.stderr)
            sys.exit(2)


def push_to_supabase(rows, url, key):
    endpoint = f"{url.rstrip('/')}/rest/v1/fact_orders?on_conflict=order_id"
    body = json.dumps([{k: r[k] for k in (
        "order_id", "date", "method", "platform", "product", "supplier",
        "cost", "sold_for", "profit", "status", "supplier_paid", "notes",
    )} for r in rows]).encode("utf-8")
    req = urllib.request.Request(endpoint, data=body, method="POST")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=representation")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return len(json.loads(resp.read().decode("utf-8")))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--push", action="store_true")
    args = parser.parse_args()

    load_env_local()
    api_key = os.environ.get("GAMEBOOST_API_KEY")
    if not api_key:
        print("ERROR: GAMEBOOST_API_KEY not set (check .env.local).", file=sys.stderr)
        sys.exit(1)

    print("Pulling GameBoost item-orders...")
    item_orders = pull_all("/item-orders", "item", api_key)
    print("Pulling GameBoost account-orders...")
    account_orders = pull_all("/account-orders", "account", api_key)
    print("Pulling GameBoost currency-orders...")
    currency_orders = pull_all("/currency-orders", "currency", api_key)
    print("Pulling GameBoost gift-card-orders...")
    gift_card_orders = pull_all("/gift-card-orders", "gift_card", api_key)

    orders = item_orders + account_orders + currency_orders + gift_card_orders
    assert_no_credentials(orders)

    # Sort newest first for stable output.
    orders.sort(key=lambda o: o["date"] or "", reverse=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "fact_orders_gameboost.json").write_text(json.dumps(orders, indent=2))

    dates = [o["date"] for o in orders if o["date"]]
    revenue = sum(o["sold_for"] or 0 for o in orders)
    refunds = sum(1 for o in orders if (o["status"] or "").lower() == "refunded")
    report = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "source": "gameboost_api",
        "orders": len(orders),
        "item_orders": len(item_orders),
        "account_orders": len(account_orders),
        "currency_orders": len(currency_orders),
        "gift_card_orders": len(gift_card_orders),
        "date_range": {"first": min(dates), "last": max(dates)} if dates else None,
        "gross_revenue_usd": round(revenue, 2),
        "refunds": refunds,
        "credentials_stored": False,
    }
    (OUT_DIR / "gameboost_sync_report.json").write_text(json.dumps(report, indent=2))

    print(f"\nSynced {len(orders)} GameBoost orders ({len(item_orders)} item + "
          f"{len(account_orders)} account + {len(currency_orders)} currency + "
          f"{len(gift_card_orders)} gift-card).")
    print(f"Date range: {report['date_range']}")
    print(f"Gross revenue (USD, sell-side): ${report['gross_revenue_usd']:,.2f}")
    print(f"Refunded orders: {refunds}")
    print("Credentials: never stored (verified).")

    if args.push:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("\n--push given but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.", file=sys.stderr)
            sys.exit(1)
        n = push_to_supabase(orders, url, key)
        print(f"\nPushed {n} rows to Supabase fact_orders. Query them back to confirm.")


if __name__ == "__main__":
    main()
