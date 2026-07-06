"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Login failed");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center mr-3">
            <Zap size={18} className="text-white" fill="currentColor" />
          </div>
          <span className="font-bold text-lg text-zinc-900 tracking-tight">Admin Dashboard</span>
        </div>
        <form onSubmit={submit} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
          <h1 className="text-sm font-semibold text-zinc-900">Sign in</h1>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Email
            <input name="email" type="email" autoComplete="username" required className={cls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Password
            <input name="password" type="password" autoComplete="current-password" required className={cls} />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const cls = "w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900";
