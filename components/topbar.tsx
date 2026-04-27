"use client";
import { useSidebar } from "./sidebar-provider";
import { useTheme } from "./theme-provider";
import { useRouter } from "next/navigation";
import { Menu, Sun, Moon, LogOut, KeyRound, User } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function Topbar() {
  const { toggle } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.username) setUsername(d.username);
        if (d.role) setRole(d.role);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={toggle}>
          <Menu size={22} />
        </button>
      </div>

      <div className="topbar-right">
        <button className="topbar-theme-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="topbar-user" ref={dropdownRef}>
          <button
            className="topbar-user-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <User size={18} />
            <span className="topbar-username">{username}</span>
            <span className="topbar-role-badge">{role}</span>
          </button>

          {showDropdown && (
            <div className="topbar-dropdown">
              <button
                className="topbar-dropdown-item"
                onClick={() => {
                  setShowDropdown(false);
                  router.push("/ganti-password");
                }}
              >
                <KeyRound size={16} />
                <span>Ganti Password</span>
              </button>
              <button className="topbar-dropdown-item topbar-dropdown-danger" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
