"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, Truck, Undo2, Wallet, Gift, Zap, LineChart, Bug, Layers, NotebookPen } from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Main Dashboard", href: "/" },
  { icon: LineChart, label: "Profit & Costs", href: "/analytics" },
  { icon: Globe, label: "By Website", href: "/website" },
  { icon: Truck, label: "Suppliers", href: "/suppliers" },
  { icon: Undo2, label: "Refunded", href: "/refunded" },
  { icon: Wallet, label: "Investment", href: "/investment" },
  { icon: Layers, label: "Batch Analysis", href: "/batches" },
  { icon: Gift, label: "Gift System", href: "/gifts" },
  { icon: NotebookPen, label: "Daily Notes", href: "/notes" },
  { icon: Bug, label: "Bugs & Requests", href: "/bugs" },
];

export function Sidebar() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col fixed h-full z-10">
      <div className="h-16 flex items-center px-4 border-b border-zinc-200">
        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center mr-3">
          <Zap size={16} className="text-white" fill="currentColor" />
        </div>
        <span className="font-bold text-zinc-900 tracking-tight">Admin Dashboard</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map(({ icon: Icon, label, href }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                on ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <Icon size={18} className={`mr-3 ${on ? "text-zinc-900" : "text-zinc-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-200 flex items-center">
        <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold mr-3">N</div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-zinc-900">Admin User</span>
          <span className="text-xs text-zinc-500">Admin</span>
        </div>
      </div>
    </aside>
  );
}
