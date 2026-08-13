// PoroGold order-entry bot. Listens for /order, builds the payload, and POSTs it
// to the dashboard's /api/webhooks/discord endpoint, which creates a NORMAL
// manual order (same validation, fees, profit math, analytics as the dashboard
// form). The bot sends ONLY the raw input values — every calculation happens on
// the dashboard.
//
// Env (see .env.example):
//   DISCORD_TOKEN        bot token
//   DASHBOARD_URL        e.g. https://dashboard.porogold.com  (no trailing slash)
//   DISCORD_BOT_SECRET   shared secret, must equal the dashboard's DISCORD_BOT_SECRET
//   ALLOWED_ROLE_ID      optional: only members with this role may use /order

import "dotenv/config";
import { Client, GatewayIntentBits, Events, MessageFlags } from "discord.js";

const token = process.env.DISCORD_TOKEN;
const dashboardUrl = (process.env.DASHBOARD_URL ?? "").replace(/\/+$/, "");
const secret = process.env.DISCORD_BOT_SECRET;
const allowedRole = process.env.ALLOWED_ROLE_ID;

if (!token || !dashboardUrl || !secret) {
  console.error("Missing DISCORD_TOKEN, DASHBOARD_URL, or DISCORD_BOT_SECRET in .env");
  process.exit(1);
}

const endpoint = `${dashboardUrl}/api/webhooks/discord`;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => (n == null ? "—" : `$${Number(n).toFixed(2)}`);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}. Posting orders to ${endpoint}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "order") return;

  // Optional role gate — only staff with the configured role may log orders.
  if (allowedRole && !interaction.member?.roles?.cache?.has(allowedRole)) {
    await interaction.reply({ content: "You don't have permission to log orders.", flags: MessageFlags.Ephemeral });
    return;
  }

  const opt = interaction.options;
  const status = opt.getString("status");
  const refundReason = opt.getString("refund_reason") ?? "";
  const rawDate = opt.getString("date");

  // Validate the couple of things Discord can't enforce on its own.
  if (status === "refunded" && !refundReason.trim()) {
    await interaction.reply({ content: "A refund needs a reason — fill in `refund_reason`.", flags: MessageFlags.Ephemeral });
    return;
  }
  const date = rawDate?.trim() ? rawDate.trim() : today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await interaction.reply({ content: "Date must be `YYYY-MM-DD` (or leave it blank for today).", flags: MessageFlags.Ephemeral });
    return;
  }

  const payload = {
    platform: opt.getString("platform"),
    date,
    product: opt.getString("product"),
    order_id: opt.getString("order_id") ?? "",
    supplier: opt.getString("supplier") ?? "",
    status,
    cost: opt.getNumber("cost") ?? "",
    sold_for: opt.getNumber("sold_for"),
    fee_pct: opt.getNumber("fee_pct") ?? "",
    supplier_share_pct: opt.getNumber("supplier_share_pct") ?? "",
    refund_reason: refundReason,
  };

  // Give ourselves time — the dashboard hits Supabase a few times.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      await interaction.editReply(`❌ Couldn't log the order: ${data.error ?? `HTTP ${res.status}`}`);
      return;
    }
    const o = data.order;
    await interaction.editReply(
      [
        `✅ Order logged on **${o.platform}**`,
        `**${o.product}** — sold ${money(o.sold_for)}, status \`${o.status}\``,
        `Net profit: **${money(o.profit)}**  ·  ID: \`${o.order_id}\``,
      ].join("\n"),
    );
  } catch (err) {
    await interaction.editReply(`❌ Failed to reach the dashboard: ${err instanceof Error ? err.message : String(err)}`);
  }
});

client.login(token);
