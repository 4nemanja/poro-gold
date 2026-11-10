@AGENTS.md

# PoroGold

Nick's PoroGold dashboard (game items and subscriptions sales: orders, weekly review,
catalog, landing page). Next.js 16 + Supabase, with a Discord order bot in `discord-bot/`.

**Separate environment.** Nothing to do with Nexora Intel, the trading bot or the betting
tracker. Never mix data, scripts, keys or memory between them.

## How it runs
- Local: `npm run dev` on http://localhost:3010 (preview config `poro-gold-dev`).
- Live: https://poro-gold-ten.vercel.app - Vercel deploys every push to `main` on
  `4nemanja/poro-gold`. `dashboard.porogold.com` is a different app, never the target.
- Secrets live in `.env.local` (not on GitHub). On a new machine copy it from the other
  computer or from the Vercel project's Environment Variables. Keys used:
  SUPABASE_URL, SUPABASE_SECRET_KEY, AUTH_SECRET, AUTH_USERS, DISCORD_*, G2G_*,
  GAMEBOOST_API_KEY, IGV_WEBHOOK_SECRET, PLAYEROK_*. See `SETUP-INTEGRATIONS.md`.

## Rules
- Nick is not technical: explain simply, and end every task with what changed and how he
  can check it himself (a URL, not a screenshot).
- **Never an em dash or en dash**, anywhere, chat replies included. Use " - " or a full stop.
- Verify changes through the API or server output before saying done.
- When a change is finished and verified: commit only that change's files, push to `main`
  (that ships to production), then confirm it is live on poro-gold-ten.vercel.app.
  No auto-commit hook here on purpose - a sweep would deploy half-done work.
- Never spend money on any paid service without Nick's yes for that run.
