import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { getSyncReport } from "@/lib/data";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const report = await getSyncReport();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <Topbar lastSynced={report?.synced_at} />
        <div className="p-8 max-w-[1400px] w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
