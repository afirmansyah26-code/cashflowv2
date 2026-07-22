"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});

function subscribeToClientMount() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function getSavedTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("theme");
  return saved === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribeToClientMount, getClientSnapshot, getServerSnapshot);
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const visibleTheme = mounted ? theme : "light";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = visibleTheme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme: visibleTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
