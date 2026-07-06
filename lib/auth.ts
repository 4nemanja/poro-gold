import crypto from "node:crypto";

// Simple credential auth for a small fixed set of users. Credentials live in the
// AUTH_USERS env var ("email:password,email:password"), never in the code/repo.
// Session is a cookie signed with AUTH_SECRET (HMAC), verified on every request.

export const COOKIE = "pg_session";

function users(): Map<string, string> {
  const m = new Map<string, string>();
  for (const pair of (process.env.AUTH_USERS ?? "").split(",")) {
    const idx = pair.indexOf(":");
    if (idx === -1) continue;
    const email = pair.slice(0, idx).trim().toLowerCase();
    const pw = pair.slice(idx + 1);
    if (email && pw) m.set(email, pw);
  }
  return m;
}

export function checkCredentials(email: string, password: string): boolean {
  const pw = users().get((email ?? "").trim().toLowerCase());
  return !!pw && pw === password;
}

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

export function sign(email: string): string {
  const e = Buffer.from(email.toLowerCase()).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(e).digest("base64url");
  return `${e}.${sig}`;
}

export function verify(token: string | undefined): string | null {
  if (!token) return null;
  const [e, sig] = token.split(".");
  if (!e || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(e).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return Buffer.from(e, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}
