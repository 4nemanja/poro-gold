"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <button onClick={logout} title="Sign out" className="text-zinc-400 hover:text-zinc-700 transition-colors">
      <LogOut size={18} />
    </button>
  );
}
