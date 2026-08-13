// The single /order slash command, shared by the registrar and the bot so the
// option names can never drift apart. Discord requires all required options to
// be listed before optional ones.
//
// Platform + Status use fixed choices; keep the platform slugs in sync with
// lib/workspaces.ts in the dashboard. The dashboard resolves a slug, display
// name, or short code, so these values are just the tidy default.

export const PLATFORM_CHOICES = [
  { name: "PlayerOK", value: "playerok" },
  { name: "GameBoost", value: "gameboost" },
  { name: "G2G", value: "g2g" },
  { name: "iGV", value: "igv" },
  { name: "KupujemProdajem", value: "kupujemprodajem" },
];

export const STATUS_CHOICES = [
  { name: "In Progress", value: "in_delivery" },
  { name: "Completed", value: "completed" },
  { name: "Refunded", value: "refunded" },
  { name: "Cancelled", value: "cancelled" },
];

// Option types (avoids importing discord.js enums where not needed):
// 3 = STRING, 10 = NUMBER.
export const orderCommand = {
  name: "order",
  description: "Log a sale into the PoroGold dashboard",
  options: [
    // ----- required -----
    {
      type: 3,
      name: "platform",
      description: "Marketplace the order came from",
      required: true,
      choices: PLATFORM_CHOICES,
    },
    { type: 3, name: "product", description: "Product name, e.g. 2,800 V-Bucks", required: true },
    { type: 10, name: "sold_for", description: "Sale price (what the buyer paid), in USD", required: true, min_value: 0 },
    {
      type: 3,
      name: "status",
      description: "Order status",
      required: true,
      choices: STATUS_CHOICES,
    },
    // ----- optional -----
    { type: 3, name: "order_id", description: "Buyer name / order ref (blank = auto-generated)", required: false },
    { type: 3, name: "supplier", description: "Supplier name, e.g. FFIN", required: false },
    { type: 10, name: "cost", description: "Supplier cost in USD", required: false, min_value: 0 },
    { type: 10, name: "fee_pct", description: "Marketplace fee as % of sale price (e.g. 10)", required: false, min_value: 0, max_value: 100 },
    { type: 10, name: "supplier_share_pct", description: "Supplier profit share % (blank = no split)", required: false, min_value: 0, max_value: 100 },
    { type: 3, name: "date", description: "Order date YYYY-MM-DD (blank = today)", required: false },
    { type: 3, name: "refund_reason", description: "Required only when status is Refunded", required: false },
  ],
};
