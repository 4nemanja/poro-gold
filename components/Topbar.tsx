import { RefreshButton } from "./RefreshButton";
import { LogoutButton } from "./LogoutButton";

export function Topbar({ lastSynced }: { lastSynced?: string }) {
  return (
    <header className="h-16 border-b border-zinc-200 bg-white sticky top-0 z-20 flex items-center justify-end px-8 gap-4">
      <RefreshButton lastSynced={lastSynced} />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-xs font-semibold">
          AD
        </div>
        <span className="text-sm font-medium text-zinc-900">Admin</span>
      </div>
      <LogoutButton />
    </header>
  );
}
