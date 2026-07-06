"""One-time import of the local JSON data into Supabase.

Reads SUPABASE_URL / SUPABASE_SECRET_KEY from .env.local and upserts:
  - orders  (GameBoost + G2G + manual)
  - gift_orders, skus
  - app_config (investment, gift_config)

Re-runnable: orders/gift_orders/app_config upsert on their keys; skus are
replaced per workspace.
"""

import json
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ING = ROOT / "data" / "ingested"
MAN = ROOT / "data" / "manual"

env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

URL = env["SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SECRET_KEY"]

ORDER_COLS = ["order_id", "date", "method", "platform", "product", "supplier", "cost",
              "sold_for", "profit", "status", "supplier_paid", "notes", "source",
              "workspace", "currency", "earning", "refunded_amount", "purchased_at",
              "completed_at", "refunded_at", "is_disputed", "added_at"]


def load(p):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return []


def req(method, table, rows, on_conflict=None, prefer="resolution=merge-duplicates,return=minimal"):
    q = f"?on_conflict={on_conflict}" if on_conflict else ""
    url = f"{URL}/rest/v1/{table}{q}"
    body = json.dumps(rows).encode("utf-8")
    r = urllib.request.Request(url, data=body, method=method)
    r.add_header("apikey", KEY)
    r.add_header("Authorization", f"Bearer {KEY}")
    r.add_header("Content-Type", "application/json")
    r.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print("  ERROR", e.code, e.read().decode("utf-8")[:400])
        raise


def upsert_orders(rows, workspace=None):
    out = []
    for o in rows:
        row = {c: o.get(c) for c in ORDER_COLS}
        if workspace:
            row["workspace"] = workspace
        if not row.get("currency"):
            row["currency"] = "USD"
        out.append(row)
    for i in range(0, len(out), 500):
        req("POST", "orders", out[i:i + 500], on_conflict="order_id")
    return len(out)


def main():
    gb = load(ING / "fact_orders_gameboost.json")
    g2 = load(ING / "fact_orders_g2g.json")
    man = load(MAN / "manual_orders.json")
    n = 0
    n += upsert_orders(gb, workspace="gameboost")
    n += upsert_orders(g2, workspace="g2g")
    n += upsert_orders(man)  # manual rows already carry workspace/source
    print(f"orders upserted: {n}")

    gifts = load(MAN / "gift_orders.json")
    if gifts:
        req("POST", "gift_orders", gifts, on_conflict="id")
    print(f"gift_orders: {len(gifts)}")

    # skus: replace per workspace
    for ws in ("gameboost", "g2g"):
        skus = load(MAN / f"skus_{ws}.json")
        if not skus:
            continue
        # delete existing for this workspace
        durl = f"{URL}/rest/v1/skus?workspace=eq.{ws}"
        dr = urllib.request.Request(durl, method="DELETE")
        dr.add_header("apikey", KEY)
        dr.add_header("Authorization", f"Bearer {KEY}")
        try:
            urllib.request.urlopen(dr, timeout=30)
        except urllib.error.HTTPError:
            pass
        rows = [{"workspace": ws, "label": s["label"], "price": s["price"],
                 "payout": s["payout"], "active": s.get("active", True)} for s in skus]
        req("POST", "skus", rows, prefer="return=minimal")
        print(f"skus {ws}: {len(rows)}")

    inv = load(MAN / "investment.json")
    gcfg = load(MAN / "gift_config.json")
    cfgs = []
    if inv:
        cfgs.append({"key": "investment", "value": inv})
    if gcfg:
        cfgs.append({"key": "gift_config", "value": gcfg})
    if cfgs:
        req("POST", "app_config", cfgs, on_conflict="key")
    print(f"app_config keys: {[c['key'] for c in cfgs]}")
    print("DONE")


if __name__ == "__main__":
    main()
