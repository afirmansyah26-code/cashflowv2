"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import {
  LayoutDashboard, ArrowLeftRight, ChevronDown, Database, FileText, TrendingUp,
  LayoutTemplate, Settings, X, Trash2
} from "lucide-react";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/transaksi", label: "Transaksi", icon: <ArrowLeftRight size={20} /> },
  { href: "/laporan", label: "Laporan", icon: <FileText size={20} /> },
  { href: "/saldo-historis", label: "Saldo Historis", icon: <TrendingUp size={20} /> },
  { href: "/pengaturan", label: "Pengaturan", icon: <Settings size={20} />, adminOnly: true },
  { href: "/pengaturan/recycle-bin", label: "Recycle Bin", icon: <Trash2 size={20} /> },
];

const masterDataItems: NavItem[] = [
  { href: "/template-transaksi", label: "Template Transaksi", icon: <LayoutTemplate size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const [role, setRole] = useState<string>("");
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(() => pathname.startsWith("/template-transaksi"));

  useEffect(() => {

    fetch("/api/app-meta")
      .then((r) => r.json())
      .then((d) => {
        setOrgName(d.app_name || "Aplikasi Keuangan");
        if (d.logo_path) {
          const lp = d.logo_path;
          setOrgLogo(lp.startsWith("/") ? lp : `/uploads/${lp.replace("public/uploads/", "")}`);
        }
      })
      .catch(() => { setOrgName("Aplikasi Keuangan"); })
      .finally(() => setLoaded(true));

    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (d.role) setRole(d.role); })
      .catch(() => {})
      .finally(() => setRoleLoaded(true));
  }, []);

  const filteredItems = roleLoaded
    ? navItems.filter((item) => !item.adminOnly || role === "admin")
    : navItems.filter((item) => !item.adminOnly);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo" style={{ minWidth: 32, minHeight: 32 }}>
              {loaded && (orgLogo ? <img src={orgLogo} alt="Logo" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 6 }} /> : "💰")}
            </div>
            <span className="sidebar-brand-text">{loaded ? orgName : ""}</span>
          </div>
          <button className="sidebar-close-btn" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredItems.slice(0, 4).map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                onClick={close}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-text">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            className={`sidebar-link sidebar-group-toggle ${pathname.startsWith("/template-transaksi") ? "sidebar-group-toggle-active" : ""}`}
            onClick={() => setMasterDataOpen((current) => !current)}
            aria-expanded={masterDataOpen}
          >
            <span className="sidebar-link-icon"><Database size={20} /></span>
            <span className="sidebar-link-text">Master Data</span>
            <ChevronDown size={15} className={`sidebar-group-chevron ${masterDataOpen ? "sidebar-group-chevron-open" : ""}`} />
          </button>
          {masterDataOpen && (
            <div className="sidebar-submenu">
              {masterDataItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link sidebar-submenu-link ${pathname.startsWith(item.href) ? "sidebar-link-active" : ""}`}
                  onClick={close}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-text">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {filteredItems.slice(4).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                onClick={close}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">Aplikasi Keuangan v2.0 <br />&copy;2026 | afirmansyah</div>
        </div>
      </aside>
    </>
  );
}
