# PoroGold Discord order-entry bot

Lets staff log a sale from Discord for marketplaces with no API (PlayerOK, etc.).
Running `/order` sends the raw inputs to the dashboard's
`/api/webhooks/discord` endpoint, which creates a **normal manual order** —
same validation, withdrawal-fee lookup, profit math, status tracking and
analytics as the dashboard's "Add Order" form. The bot never calculates money;
it only collects inputs.

## What `/order` collects

| Option | Required | Notes |
| --- | --- | --- |
| `platform` | ✓ | PlayerOK / GameBoost / G2G / iGV / KupujemProdajem |
| `product` | ✓ | e.g. `2,800 V-Bucks` |
| `sold_for` | ✓ | sale price in USD |
| `status` | ✓ | In Progress / Completed / Refunded / Cancelled |
| `order_id` | | buyer name / order ref — blank auto-generates a `MAN-…` id |
| `supplier` | | supplier name |
| `cost` | | supplier cost in USD |
| `fee_pct` | | marketplace fee as % of the sale price |
| `supplier_share_pct` | | supplier profit share % — blank means no split |
| `date` | | `YYYY-MM-DD`, defaults to today |
| `refund_reason` | | required by the bot when status is Refunded |

The platform withdrawal fee is **not** entered here — the dashboard applies it
automatically from the platform's configured rate, and takes both the
marketplace fee and the withdrawal fee off before the supplier profit share.

## Setup

1. **Create the app + bot** at <https://discord.com/developers/applications> →
   New Application → Bot → Reset Token (copy it). Copy the Application ID from
   General Information.
2. **Invite it** to your server with the `applications.commands` scope
   (OAuth2 → URL Generator).
3. **Configure the dashboard**: set `DISCORD_BOT_SECRET` in the dashboard's
   environment to a strong random string (e.g.
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   and redeploy.
4. **Configure the bot**: `cp .env.example .env` and fill it in — use the **same**
   `DISCORD_BOT_SECRET`, and point `DASHBOARD_URL` at the deployed dashboard.
5. Install and register:

   ```bash
   npm install
   npm run register   # registers /order (set DISCORD_GUILD_ID for instant testing)
   npm start          # runs the bot
   ```

Keep the bot process running (any Node host — a small VPS, Railway, Fly, a
Raspberry Pi). It only needs outbound HTTPS to Discord and the dashboard.

## Security

- The bot authenticates to the dashboard with `Authorization: Bearer
  <DISCORD_BOT_SECRET>`; requests without the matching secret get `401`.
- Set `ALLOWED_ROLE_ID` to restrict `/order` to a specific staff role.
- Replies are ephemeral (only the person who ran the command sees them).
