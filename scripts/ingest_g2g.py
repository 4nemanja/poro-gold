"""
G2G -> V-Bucks Relay ingestion.

G2G has no API yet, so the source of truth is the "sold order report" Excel
exports (one file per month) dropped into source-docs/g2g/. This script reads
every .xlsx there, normalizes each row into the shared fact_orders shape, and
writes data/ingested/fact_orders_g2g.json.

Re-runnable: add new monthly exports to source-docs/g2g/ and run again.

Columns in the G2G export:
  Order Date | Sold Order ID | Order Status | Service | Brand | Product |
  Currency | Order Amount | Delivered Quantity | Delivered Amount |
  Refunded Amount | Earning Amount
"""

import glob
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "source-docs" / "g2g"
OUT_DIR = ROOT / "data" / "ingested"

STATUS_MAP = {
    "completed": "completed",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "refunded": "refunded",
}


def clean(s):
    if s is None:
        return None
    return re.sub(r"\s{2,}", " ", str(s).encode("ascii", "ignore").decode().strip()) or None


def parse_date(raw):
    if not raw:
        return None
    txt = str(raw).strip()
    for fmt in ("%d/%m/%y %H:%M", "%d/%m/%Y %H:%M", "%d/%m/%y", "%d/%m/%Y"):
        try:
            return datetime.strptime(txt, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def to_float(v):
    if v is None or v == "":
        return None
    try:
        return float(str(v).replace(",", ""))
    except ValueError:
        return None


def main():
    files = sorted(glob.glob(str(SRC_DIR / "*.xlsx")))
    if not files:
        print(f"No G2G .xlsx files found in {SRC_DIR}")
        return

    orders = []
    for f in files:
        ws = openpyxl.load_workbook(f, data_only=True).active
        for r in ws.iter_rows(min_row=2, values_only=True):
            if r[1] is None:  # no Sold Order ID = empty row
                continue
            status_raw = clean(r[2]) or ""
            orders.append({
                "order_id": f"G2G-{clean(r[1])}",
                "date": parse_date(r[0]),
                "method": clean(r[3]),  # Service: Accounts / Items / Top Up
                "platform": "G2G",
                "product": clean(r[5]),
                "supplier": None,
                "cost": None,
                "sold_for": to_float(r[7]),  # Order Amount
                "profit": None,
                "status": STATUS_MAP.get(status_raw.lower(), status_raw.lower() or None),
                "supplier_paid": None,
                "notes": None,
                "source": "g2g_excel",
                "earning": to_float(r[11]),   # Earning Amount (net after G2G fees)
                "refunded_amount": to_float(r[10]),
                "currency": clean(r[6]),
            })

    orders.sort(key=lambda o: o["date"] or "", reverse=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "fact_orders_g2g.json").write_text(json.dumps(orders, indent=2))

    dates = [o["date"] for o in orders if o["date"]]
    completed = [o for o in orders if o["status"] == "completed"]
    rev_completed = sum(o["sold_for"] or 0 for o in completed)
    earn_completed = sum(o["earning"] or 0 for o in completed)
    curr = {o["currency"] for o in orders}
    report = {
        "ingested_at": datetime.now(timezone.utc).isoformat(),
        "source": "g2g_excel",
        "files": [Path(f).name for f in files],
        "orders": len(orders),
        "completed_orders": len(completed),
        "cancelled_orders": sum(1 for o in orders if o["status"] == "cancelled"),
        "date_range": {"first": min(dates), "last": max(dates)} if dates else None,
        "revenue_completed": round(rev_completed, 2),
        "earning_completed": round(earn_completed, 2),
        "currencies": sorted(c for c in curr if c),
    }
    (OUT_DIR / "g2g_ingest_report.json").write_text(json.dumps(report, indent=2))

    print(f"Ingested {len(orders)} G2G orders from {len(files)} files "
          f"({report['date_range']}).")
    print(f"Completed: {len(completed)} | revenue ${rev_completed:,.2f} | "
          f"earning ${earn_completed:,.2f}")
    print(f"Currencies present: {report['currencies']} "
          f"(amounts stored as-reported).")


if __name__ == "__main__":
    main()
