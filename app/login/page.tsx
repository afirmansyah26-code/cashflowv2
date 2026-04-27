"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

interface AppMeta {
  app_name: string;
  subtitle: string | null;
  logo_path: string | null;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<AppMeta>({ app_name: "", subtitle: null, logo_path: null });
  const router = useRouter();

  useEffect(() => {
    fetch("/api/app-meta")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
      } else {
        setError(data.error || "Login gagal");
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {meta.logo_path ? (
          <img
            src={meta.logo_path}
            alt="Logo"
            style={{ width: 72, height: 72, objectFit: "contain", margin: "0 auto 12px", display: "block" }}
          />
        ) : (
          <div className="login-logo">💰</div>
        )}
        <h1 className="login-title">{meta.app_name || "Cashflow App"}</h1>
        {meta.subtitle && <p className="login-subtitle">{meta.subtitle}</p>}
        {!meta.subtitle && <p className="login-subtitle">Masuk ke akun Anda</p>}
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 8, padding: "12px" }} disabled={loading}>
            <LogIn size={16} /> {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
