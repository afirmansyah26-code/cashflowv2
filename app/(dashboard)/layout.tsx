import { SidebarProvider } from "@/components/sidebar-provider";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <Topbar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
