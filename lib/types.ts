export type Order = {
  order_id: string;
  date: string | null;
  method: string | null;
  platform: string | null;
  product: string | null;
  supplier: string | null;
  cost: number | null;
  sold_for: number | null;
  profit: number | null;
  status: string | null;
  supplier_paid: boolean | null;
  notes: string | null;
  source_row?: number;
  // Present on API-sourced orders (e.g. GameBoost sync); optional elsewhere.
  source?: string;
  purchased_at?: string | null;
  completed_at?: string | null;
  refunded_at?: string | null;
  is_disputed?: boolean;
  // Present on G2G (Excel) orders.
  earning?: number | null; // net after G2G fees
  refunded_amount?: number | null;
  currency?: string | null;
  // Present on manually-added orders.
  workspace?: string;
  added_at?: string; // ISO timestamp when logged - used to keep newest on top
  // Fee (marketplace/payment) and supplier profit-split, stored in app_config
  // (order_extras) since the orders table schema can't be altered. `profit`
  // already reflects both; these are kept for display + the Costs breakdown.
  // The fee is entered as a PERCENT of the sale price; fee (the $ amount it works
  // out to) is derived and stored for the Costs breakdown.
  fee_pct?: number | null; // % of sold_for taken as the selling/marketplace fee
  fee?: number | null; // $ amount = sold_for * fee_pct/100
  withdrawal_fee?: number | null; // $ cost of cashing out, off the platform's %
  supplier_share_pct?: number | null; // % of gross profit the supplier takes
  supplier_cut?: number | null; // $ the supplier takes from gross profit
  // A gift order is a normal order flagged as a gift so it also shows in the Gift
  // System — one row, so status stays in sync and it's never duplicated.
  is_gift?: boolean | null;
  vbucks?: number | null; // V-Bucks amount when it's a gift order
  // Why an order was refunded (required when status is refunded). Kept even if
  // the status later changes, so it isn't lost. Stored in app_config.
  refund_reason?: string | null;
};

// A supplier the user manages by hand. FIXED = you keep all profit; SPLIT = the
// supplier takes a share of each order's profit. Stored in app_config.
export type SupplierRecord = {
  name: string;
  description: string;
  profit_system: "FIXED" | "SPLIT";
  share_pct: number; // default % of profit the supplier takes on SPLIT orders
};

// A daily note — an internal business diary entry explaining what happened on a
// given day (few sales, day off, platform issue, etc.). Stored in app_config.
export type DailyNote = {
  id: string;
  date: string; // the day the note is about (can be past or future)
  content: string;
  author: string | null; // who wrote it (from their login)
  created_at: string;
  updated_at?: string;
};

// A payment/transfer sent to a supplier. Tracked on the Transactions page.
// Stored in app_config.
export type SupplierTransaction = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  supplier: string; // supplier name
  platform: string; // workspace slug the money went through
  reason: string;
  created_by: string | null; // from the logged-in session
  created_at: string;
};

// A bug report / feature request logged by a teammate. Stored in app_config.
// An optional amount + unit lets them attach a $ or % to a financial issue.
export type BugReport = {
  id: string;
  title: string;
  description: string | null;
  type: "bug" | "request"; // an actual bug, or something they want added
  amount: number | null; // optional $ / % value tied to the issue
  amount_unit: "$" | "%" | null;
  reporter: string | null; // who logged it (from their login)
  status: "open" | "resolved";
  created_at: string;
};

export type Platform = {
  name: string;
  offers: string | null;
  active: boolean | null;
  description: string | null;
  withdrawal_fee_pct: number | null;
  withdrawal_fee_raw: string | null;
  withdrawal_method: string | null;
  sync_status: string;
};

export type Supplier = {
  name: string;
  status: string;
};

export type WeeklyPlatformTotal = {
  week_label: string;
  platform: string;
  total_sold: number;
  total_cost: number;
  total_sales_revenue: number;
  total_refund: number;
  disputes: number;
  total_income_after_fees: number;
};

export type Investor = {
  investor_name: string;
  amount_invested: number;
  invested_date: string;
  profit_share_pct: number;
};

export type IngestionReport = {
  ingested_at: string;
  orders_count: number;
  current_week_range: { start: string; end: string } | null;
  weekly_totals_rows: number;
  orders_missing_profit: number;
  quality_issues: string[];
};
