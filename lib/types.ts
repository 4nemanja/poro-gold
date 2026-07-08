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
  supplier_share_pct?: number | null; // % of gross profit the supplier takes
  supplier_cut?: number | null; // $ the supplier takes from gross profit
};

// A supplier the user manages by hand. FIXED = you keep all profit; SPLIT = the
// supplier takes a share of each order's profit. Stored in app_config.
export type SupplierRecord = {
  name: string;
  description: string;
  profit_system: "FIXED" | "SPLIT";
  share_pct: number; // default % of profit the supplier takes on SPLIT orders
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
