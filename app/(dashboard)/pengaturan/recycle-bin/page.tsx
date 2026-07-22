"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCcw, Trash2, X } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useMediaQuery } from "@/components/use-media-query";

interface Transaction { id:number; category_name:string; type:string; amount:number; transaction_date:string; note:string|null; admin_notes:string|null; username:string; deleted_at:string; deleted_by:string; }

function formatRupiah(n:number){return "Rp "+n.toLocaleString("id-ID");}
function formatRupiahShort(n:number){if(n>=1000000)return(n/1000000).toFixed(n%1000000===0?0:1)+"M";if(n>=1000)return(n/1000).toFixed(n%1000===0?0:0)+"K";return String(n);}

export default function RecycleBinPage() {
  const { showToast } = useToast();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [showRestore, setShowRestore] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [targetTx, setTargetTx] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const isMobile = useMediaQuery("(max-width:768px)");
  const [authChecking, setAuthChecking] = useState(true);
  const router = useRouter();

  const loadData = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    fetch(`/api/transactions/trash?${params}`)
      .then(r => r.json())
      .then(d => {
        setTxns(d.transactions || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(() => showToast("error", "Gagal memuat data recycle bin"))
      .finally(() => setLoading(false));
  }, [page, limit, showToast]);

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then(d => {
        if (d.role === "admin") {
          setAuthChecking(false);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => { 
    if (!authChecking) {
      loadData(); 
    }
  }, [loadData, authChecking]);

  const handleRestore = async () => {
    if (!targetTx) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/transactions/${targetTx.id}/restore`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        showToast("success", "Transaksi berhasil dipulihkan");
        setShowRestore(false);
        setTargetTx(null);
        loadData();
      } else {
        showToast("error", d.error || "Gagal memulihkan transaksi");
      }
    } catch {
      showToast("error", "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handlePurge = async () => {
    if (!targetTx) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/transactions/${targetTx.id}/purge`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) {
        showToast("success", "Transaksi permanen dihapus");
        setShowPurge(false);
        setTargetTx(null);
        loadData();
      } else {
        showToast("error", d.error || "Gagal menghapus transaksi");
      }
    } catch {
      showToast("error", "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (authChecking) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>Memuat...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Trash2 size={24} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />Recycle Bin</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>Daftar transaksi yang telah dihapus.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="form-select" style={{ width: 100 }} value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
            {[10, 25, 50, 100].map(l => <option key={l} value={l}>{l} baris</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: isMobile ? 55 : 85, padding: isMobile ? "6px 4px" : undefined }}>Tgl Trx</th>
                {!isMobile && <th style={{ width: 60 }}>Jenis</th>}
                <th style={{ padding: isMobile ? "6px 4px" : undefined }}>Kategori</th>
                <th style={{ textAlign: "right", width: isMobile ? 60 : 100, padding: isMobile ? "6px 4px" : undefined }}>Jumlah</th>
                {!isMobile && <th>Catatan</th>}
                <th style={{ padding: isMobile ? "6px 4px" : undefined }}>Info Hapus</th>
                <th style={{ width: isMobile ? 65 : 100, padding: isMobile ? "6px 4px" : undefined, textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={isMobile ? 5 : 7} style={{ textAlign: "center", padding: 32 }}>Memuat...</td></tr> :
               txns.length === 0 ? <tr><td colSpan={isMobile ? 5 : 7} className="text-muted" style={{ textAlign: "center", padding: 32 }}>Tidak ada transaksi yang dihapus</td></tr> :
               txns.map(t => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: "nowrap", padding: isMobile ? "6px 4px" : undefined }}>{isMobile ? new Date(t.transaction_date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" }) : new Date(t.transaction_date).toLocaleDateString("id-ID")}</td>
                  {!isMobile && <td><span className={`badge ${t.type === "income" ? "badge-income" : "badge-expense"}`}>{t.type === "income" ? "Masuk" : "Keluar"}</span></td>}
                  <td style={{ padding: isMobile ? "6px 4px" : undefined }}>{isMobile && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 4, verticalAlign: "middle", background: t.type === "income" ? "var(--success)" : "var(--danger)" }}></span>}{t.category_name}</td>
                  <td className={`text-amount ${t.type === "income" ? "text-income" : "text-expense"}`} style={{ textAlign: "right", padding: isMobile ? "6px 4px" : undefined }}>{isMobile ? formatRupiahShort(t.amount) : formatRupiah(t.amount)}</td>
                  {!isMobile && <td style={{ color: "var(--text-secondary)" }}>{t.note || "-"}</td>}
                  <td style={{ fontSize: 12, padding: isMobile ? "6px 4px" : undefined }}>
                    <div style={{ color: "var(--danger)" }}>{new Date(t.deleted_at).toLocaleDateString("id-ID")}</div>
                    <div className="text-muted">Oleh: {t.deleted_by}</div>
                    {!isMobile && <div className="text-muted">Dibuat: {t.username}</div>}
                  </td>
                  <td style={{ whiteSpace: "nowrap", padding: isMobile ? "6px 2px" : undefined, textAlign: "center" }}>
                    <button className="btn btn-sm btn-success btn-icon" onClick={() => { setTargetTx(t); setShowRestore(true); }} title="Pulihkan"><RefreshCcw size={14} /></button>
                    {" "}
                    <button className="btn btn-sm btn-danger btn-icon" onClick={() => { setTargetTx(t); setShowPurge(true); }} title="Hapus Permanen"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="pagination"><button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>«</button>{Array.from({ length: Math.min(7, totalPages) }, (_, i) => { const s = Math.max(1, page - 3); const p = s + i; if (p > totalPages) return null; return <button key={p} className={`page-btn ${p === page ? "page-btn-active" : ""}`} onClick={() => setPage(p)}>{p}</button>; })}<button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>»</button></div>}
        <div className="text-muted" style={{ textAlign: "center", marginTop: 8 }}>Total: {total} transaksi di tempat sampah</div>
      </div>

      {/* Restore Confirm */}
      <Modal isOpen={showRestore} onClose={() => setShowRestore(false)} title="Konfirmasi Pulihkan" size="sm" footer={<><button className="btn btn-secondary" onClick={() => setShowRestore(false)}>Batal</button><button className="btn btn-success" onClick={handleRestore} disabled={saving}>{saving ? "Memproses..." : "Pulihkan"}</button></>}>
        <div style={{ textAlign: "center", padding: "16px 0" }}><RefreshCcw size={48} color="var(--success)" style={{ marginBottom: 12 }}/><p style={{ fontSize: 16, fontWeight: 600 }}>Pulihkan transaksi ini?</p><p className="text-muted">Transaksi akan kembali ke daftar utama.</p></div>
      </Modal>

      {/* Purge Confirm */}
      <Modal isOpen={showPurge} onClose={() => setShowPurge(false)} title="Konfirmasi Hapus Permanen" size="sm" footer={<><button className="btn btn-secondary" onClick={() => setShowPurge(false)}>Batal</button><button className="btn btn-danger" onClick={handlePurge} disabled={saving}>{saving ? "Menghapus..." : "Hapus Permanen"}</button></>}>
        <div style={{ textAlign: "center", padding: "16px 0" }}><Trash2 size={48} color="var(--danger)" style={{ marginBottom: 12 }}/><p style={{ fontSize: 16, fontWeight: 600 }}>Yakin ingin menghapus permanen?</p><p style={{ color: "var(--danger)", fontWeight: 500, marginTop: 8, fontSize: 14 }}>Data transaksi dan lampiran akan dihapus permanen.<br/>Tindakan ini tidak dapat dibatalkan.</p></div>
      </Modal>
    </div>
  );
}
