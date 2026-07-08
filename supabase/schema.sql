-- Admin Dashboard (POROGOLD) — Supabase schema
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- RLS is enabled with NO policies, so the anon/publishable key can read nothing.
-- The app talks to these tables server-side with the SECRET key, which bypasses
-- RLS. Never expose the secret key to the browser.

-- All orders across every marketplace (GameBoost API, G2G Excel, manual).
create table if not exists orders (
  order_id        text primary key,
  date            date,
  method          text,
  platform        text,
  product         text,
  supplier        text,
  cost            numeric,
  sold_for        numeric,
  profit          numeric,
  status          text,
  supplier_paid   boolean,
  notes           text,
  source          text,          -- gameboost_api | g2g_excel | manual
  workspace       text,          -- gameboost | g2g | igv | playerok | kupujemprodajem
  currency        text,
  earning         numeric,        -- G2G net after fees
  refunded_amount numeric,
  purchased_at    date,
  completed_at    date,
  refunded_at     date,
  is_disputed     boolean default false,
  added_at        timestamptz
);
create index if not exists orders_date_idx     on orders (date);
create index if not exists orders_platform_idx on orders (platform);
create index if not exists orders_status_idx   on orders (status);

-- Gift System: V-Bucks gifts sold to customers.
create table if not exists gift_orders (
  id        text primary key,
  date      date,
  customer  text,
  vbucks    integer,
  sold_for  numeric,
  cost      numeric,
  status    text,               -- in_progress | completed | refunded
  added_at  timestamptz
);

-- SKU / pricing catalog, per workspace.
create table if not exists skus (
  id        bigint generated always as identity primary key,
  workspace text,
  label     text,
  price     numeric,
  payout    numeric,
  active    boolean default true
);

-- Singletons + small key/value config, all JSONB. Keys in use:
--   investment       - capital/treasury config
--   gift_config      - gift system config
--   sync_report      - last GameBoost sync summary
--   suppliers        - managed suppliers [{name, description, profit_system, share_pct}]
--   withdrawal_fees  - editable per-platform withdrawal fee %, keyed by workspace slug
--   order_extras     - per-order {fee, supplier_share_pct, supplier_cut}, keyed by order_id
--   gift_extras      - per-gift {fee}, keyed by gift id
-- order_extras/gift_extras live here because the orders/gift_orders tables can't
-- be altered from the app. `profit` (a real orders column) already nets out fee
-- and supplier split; the extras are for display + the Profit & Costs breakdown.
create table if not exists app_config (
  key   text primary key,
  value jsonb
);

alter table orders      enable row level security;
alter table gift_orders enable row level security;
alter table skus        enable row level security;
alter table app_config  enable row level security;
