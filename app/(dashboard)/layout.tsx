import { SidebarProvider } from "@/components/sidebar-provider";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import FloatingCalculator from "@/components/floating-calculator";
import { TransactionModalProvider } from "@/components/transaction/transaction-modal-provider";
import MobileTransactionShortcut from "@/components/transaction/mobile-transaction-shortcut";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TransactionModalProvider>
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
        <MobileTransactionShortcut />
        <FloatingCalculator />
      </SidebarProvider>
    </TransactionModalProvider>
  );
}
