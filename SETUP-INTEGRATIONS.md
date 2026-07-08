# Connecting your marketplaces (plain-English guide)

This dashboard can pull sales in automatically so you don't have to type them.
GameBoost already does this. This guide adds **G2G**, **iGV**, and **PlayerOK**.

You don't need to be technical. Every setting below is just a short piece of
text you copy from a website and paste into one file.

---

## First, the basics

**What's a "credential"?** It's a secret code a website gives you so your app is
allowed to see your sales. Think of it like a password made just for apps. There
are two kinds you'll see below:

- **API key / secret** — a long random string (like `c09222e3fc40ffb25...`).
- **User ID** — a short number that identifies your seller account.

**Where do they go?** In a file called **`.env.local`** in this project folder.
Open it with any text editor (Notepad is fine). Each line looks like
`NAME=value`. You paste your value after the `=`. Save the file.

**Important:** after editing `.env.local`, **restart the app** (stop it and run
`npm run dev` again) so it picks up the new values.

**Two ways sales come in:**
- **Pull** (GameBoost, PlayerOK): the app fetches your sales when you click
  **Refresh**.
- **Push / "webhook"** (G2G, iGV): *they* send each sale to your app the moment
  it happens. For this to work, your dashboard must be reachable at a **public
  web address** (you said it's deployed — good). A webhook is just a URL on your
  app that the marketplace calls. Yours are:
  - G2G:  `https://YOUR-APP-ADDRESS/api/webhooks/g2g`
  - iGV:  `https://YOUR-APP-ADDRESS/api/webhooks/igv`

  Replace `YOUR-APP-ADDRESS` with wherever your dashboard is hosted.

---

## G2G

G2G sends each sale to your webhook. You need **3 values** from G2G, plus you
register your webhook URL with them.

1. Log into G2G and open the **OpenAPI** settings (Seller → Developer/OpenAPI).
   If you don't see it, you may need to request API access from G2G first.
2. There you'll find / create:
   - an **API key** and a **Webhook Secret** (a secret token for webhooks),
   - your **User ID** (a number like `509205`).
3. Still in G2G, add a **webhook** and set its URL to:
   `https://YOUR-APP-ADDRESS/api/webhooks/g2g`
   Subscribe it to the order events (order.completed, order.refunded, etc.).
4. Paste into `.env.local`:
   ```
   G2G_WEBHOOK_SECRET=the webhook secret from G2G
   G2G_USER_ID=your G2G user id number
   G2G_WEBHOOK_URL=https://YOUR-APP-ADDRESS/api/webhooks/g2g
   ```
   > `G2G_WEBHOOK_URL` must be **exactly** the URL you registered in step 3 —
   > G2G uses it to sign each message, so it has to match character-for-character.
5. Restart the app. New G2G sales now appear on their own, tagged **G2G**.

**Check it's live:** open `https://YOUR-APP-ADDRESS/api/webhooks/g2g` in a
browser. You should see `{"ok":true,"endpoint":"g2g-webhook","configured":true}`.

---

## iGV

iGV also pushes sales to a webhook. You need **1 value** (a secret key).

1. Log into iGV, open the **Seller / Open API** settings, and find your
   **Secret Key** (iGV assigns this to you).
2. Register your callback/webhook URL with iGV:
   `https://YOUR-APP-ADDRESS/api/webhooks/igv`
3. Paste into `.env.local`:
   ```
   IGV_WEBHOOK_SECRET=the secret key from iGV
   ```
4. Restart the app.

**Check it's live:** open `https://YOUR-APP-ADDRESS/api/webhooks/igv` — you
should see `configured":true`.

> Note: iGV doesn't publish the exact shape of the data they send, so the app
> reads it defensively and **logs the first real callback**. Once one real iGV
> sale comes through, send me that logged data and I'll lock the mapping so the
> product name / amount always line up perfectly.

---

## PlayerOK  ⚠️ (works, but fragile)

PlayerOK has **no official API**. The only way to read sales is to act like your
logged-in browser, using an unofficial method. It works, but it can break
whenever PlayerOK changes their site or if your login expires — then you just
refresh the values below. Sales are pulled in when you click **Refresh**.

You need 3 values, taken from your browser while logged into playerok.com:

1. Open **playerok.com** in Chrome and log in.
2. Press **F12** to open Developer Tools → go to the **Application** tab →
   **Cookies** → `https://playerok.com`.
3. Copy the value of the cookie named **`token`** and the one named **`__ddg5_`**.
4. Your **User ID** is your Playerok account id (visible in the address bar on
   your profile page, or ask me and I'll help pull it).
5. Paste into `.env.local`:
   ```
   PLAYEROK_TOKEN=the token cookie value
   PLAYEROK_DDG5=the __ddg5_ cookie value
   PLAYEROK_USER_ID=your playerok account id
   ```
6. Restart the app, then click **Refresh**. PlayerOK sales appear tagged
   **PlayerOK**.

> Heads-up: PlayerOK prices are in **RUB** (₽), so those sales are stored in RUB.
> If a Refresh suddenly shows 0 PlayerOK sales or an error, your login expired —
> repeat steps 2–5 with fresh cookie values. This is the only site of the four
> that needs occasional re-login, because it has no real API.

---

## What happens to cost / profit?

For every auto-synced sale (all four sites), the app records the **sale price**
and marks which site it came from. It **never** overwrites the **supplier cost**,
**fee**, or **supplier split** you enter by hand — so you can add your costs to a
synced order and they'll stick through future refreshes.
