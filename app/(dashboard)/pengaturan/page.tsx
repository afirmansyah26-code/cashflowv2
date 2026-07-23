"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, Plus, Pencil, Trash2, Settings, Star, Printer, Eye, Keyboard } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import KeyboardShortcutList from "@/components/keyboard-shortcut-list";
import TemplateManager from "@/components/transaction-template/template-manager";

interface Category { id: number; name: string }
interface User { id: number; username: string; role: string; created_at: string }
interface PrintHeader { id: number; name: string; institution_name: string; subtitle: string | null; address: string | null; phone: string | null; bank_info: string | null; notary_info: string | null; logo: string | null; signer_name: string | null; signer_title: string | null; signer_city: string | null; is_default: boolean; }

type SettingsTab = "umum" | "kategori" | "template" | "pengguna" | "kop";

const settingsTabs: { key: SettingsTab; label: string }[] = [
  { key: "umum", label: "Umum" },
  { key: "kategori", label: "Kategori" },
  { key: "template", label: "Template Transaksi" },
  { key: "pengguna", label: "Pengguna" },
  { key: "kop", label: "Kop Surat" },
];

function getSettingsTab(value: string | null): SettingsTab {
  return settingsTabs.some((item) => item.key === value) ? value as SettingsTab : "umum";
}

function PengaturanContent() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = getSettingsTab(searchParams.get("tab"));

  const changeTab = (nextTab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "umum") params.delete("tab");
    else params.set("tab", nextTab);
    const query = params.toString();
    router.replace(query ? `/pengaturan?${query}` : "/pengaturan", { scroll: false });
  };

  // ── Umum (Org Profile) ──
  const [orgForm, setOrgForm] = useState({ app_name: "", name: "", subtitle: "", address: "", logo_path: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [orgSaving, setOrgSaving] = useState(false);

  useEffect(() => {
    fetch("/api/organization").then(r => r.json()).then(d => {
      if (d.organization) {
        setOrgForm({ app_name: d.organization.app_name || "", name: d.organization.name || "", subtitle: d.organization.subtitle || "", address: d.organization.address || "", logo_path: d.organization.logo_path || "" });
        if (d.organization.logo_path) setLogoPreview(d.organization.logo_path.startsWith("/") ? d.organization.logo_path : `/uploads/${d.organization.logo_path.replace("public/uploads/", "")}`);
      }
    });
  }, []);

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault(); setOrgSaving(true);
    try {
      let logoPath = orgForm.logo_path;
      if (logoFile) {
        const fd = new FormData(); fd.append("file", logoFile); fd.append("type", "logo");
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) logoPath = d.path;
      }
      const r = await fetch("/api/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...orgForm, logo_path: logoPath }) });
      const d = await r.json();
      if (d.success) showToast("success", "Pengaturan berhasil disimpan"); else showToast("error", d.error);
    } catch { showToast("error", "Gagal menyimpan"); } finally { setOrgSaving(false); }
  };

  // ── Kategori ──
  const [cats, setCats] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showCatDelete, setShowCatDelete] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const loadCats = () => { fetch("/api/categories").then(r => r.json()).then(d => setCats(d.categories || [])).finally(() => setCatsLoading(false)); };
  useEffect(() => { loadCats(); }, []);

  const handleCatSave = async (e: React.FormEvent) => {
    e.preventDefault(); setCatSaving(true);
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : "/api/categories";
      const method = editCat ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: catName }) });
      const d = await r.json();
      if (d.success) { showToast("success", editCat ? "Kategori diperbarui" : "Kategori ditambahkan"); setShowCatModal(false); setCatName(""); setEditCat(null); loadCats(); }
      else showToast("error", d.error);
    } catch { showToast("error", "Gagal menyimpan"); } finally { setCatSaving(false); }
  };

  const handleCatDelete = async () => {
    if (!deleteCat) return; setCatSaving(true);
    try { const r = await fetch(`/api/categories/${deleteCat.id}`, { method: "DELETE" }); const d = await r.json();
      if (d.success) { showToast("success", "Kategori dihapus"); setShowCatDelete(false); loadCats(); } else showToast("error", d.error);
    } catch { showToast("error", "Gagal menghapus"); } finally { setCatSaving(false); }
  };

  // ── Pengguna ──
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserDelete, setShowUserDelete] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: "", password: "", role: "staf" });
  const [userSaving, setUserSaving] = useState(false);

  const loadUsers = () => { fetch("/api/users").then(r => r.json()).then(d => setUsers(d.users || [])).finally(() => setUsersLoading(false)); };
  useEffect(() => { loadUsers(); }, []);

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault(); setUserSaving(true);
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";
      const body = editUser ? { username: userForm.username, role: userForm.role, ...(userForm.password ? { password: userForm.password } : {}) } : userForm;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { showToast("success", editUser ? "User diperbarui" : "User ditambahkan"); setShowUserModal(false); loadUsers(); }
      else showToast("error", d.error);
    } catch { showToast("error", "Gagal menyimpan"); } finally { setUserSaving(false); }
  };

  const handleUserDelete = async () => {
    if (!deleteUser) return; setUserSaving(true);
    try { const r = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" }); const d = await r.json();
      if (d.success) { showToast("success", "User dihapus"); setShowUserDelete(false); loadUsers(); } else showToast("error", d.error);
    } catch { showToast("error", "Gagal menghapus"); } finally { setUserSaving(false); }
  };

  // ── Kop Surat ──
  const emptyKop = { name: "", institution_name: "", subtitle: "", address: "", phone: "", bank_info: "", notary_info: "", logo: null as string | null, signer_name: "", signer_title: "", signer_city: "" };
  const [kopList, setKopList] = useState<PrintHeader[]>([]);
  const [kopLoading, setKopLoading] = useState(true);
  const [showKopModal, setShowKopModal] = useState(false);
  const [editKopId, setEditKopId] = useState<number | null>(null);
  const [kopForm, setKopForm] = useState(emptyKop);
  const [kopLogoFile, setKopLogoFile] = useState<File | null>(null);
  const [kopLogoPreview, setKopLogoPreview] = useState<string | null>(null);
  const [kopSaving, setKopSaving] = useState(false);
  const [showKopDelete, setShowKopDelete] = useState<PrintHeader | null>(null);
  const [previewKop, setPreviewKop] = useState<PrintHeader | null>(null);

  const loadKop = () => { fetch("/api/kop-surat").then(r => r.json()).then(d => setKopList(d.headers || [])).finally(() => setKopLoading(false)); };
  useEffect(() => { loadKop(); }, []);

  const openKopAdd = () => { setEditKopId(null); setKopForm(emptyKop); setKopLogoFile(null); setKopLogoPreview(null); setShowKopModal(true); };
  const openKopEdit = (h: PrintHeader) => { setEditKopId(h.id); setKopForm({ name: h.name, institution_name: h.institution_name, subtitle: h.subtitle || "", address: h.address || "", phone: h.phone || "", bank_info: h.bank_info || "", notary_info: h.notary_info || "", logo: h.logo, signer_name: h.signer_name || "", signer_title: h.signer_title || "", signer_city: h.signer_city || "" }); setKopLogoFile(null); setKopLogoPreview(h.logo ? `/uploads/${h.logo}` : null); setShowKopModal(true); };

  const handleKopSave = async (e: React.FormEvent) => {
    e.preventDefault(); setKopSaving(true);
    try {
      const fd = new FormData();
      Object.entries(kopForm).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, String(v)); });
      if (kopLogoFile) fd.append("logo_file", kopLogoFile);
      const url = editKopId ? `/api/kop-surat/${editKopId}` : "/api/kop-surat";
      const r = await fetch(url, { method: editKopId ? "PUT" : "POST", body: fd });
      const d = await r.json();
      if (d.success) { showToast("success", d.message); setShowKopModal(false); loadKop(); } else showToast("error", d.error || d.message);
    } catch { showToast("error", "Gagal menyimpan"); } finally { setKopSaving(false); }
  };

  const handleKopDelete = async () => {
    if (!showKopDelete) return; setKopSaving(true);
    try { const r = await fetch(`/api/kop-surat/${showKopDelete.id}`, { method: "DELETE" }); const d = await r.json();
      if (d.success) { showToast("success", d.message); setShowKopDelete(null); loadKop(); } else showToast("error", d.error);
    } catch { showToast("error", "Gagal menghapus"); } finally { setKopSaving(false); }
  };

  const handleSetDefault = async (id: number) => {
    const fd = new FormData(); fd.append("set_default", "true");
    const r = await fetch(`/api/kop-surat/${id}`, { method: "PUT", body: fd });
    const d = await r.json();
    if (d.success) { showToast("success", d.message); loadKop(); } else showToast("error", d.error);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title"><Settings size={24} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />Pengaturan</h1>
      </div>

      {/* Tabs */}
      <div className="settings-tabs no-print" style={{ display: "flex", gap: 0, overflowX: "auto", borderBottom: "2px solid var(--border-color)", marginBottom: 20 }}>
        {settingsTabs.map(t => (
          <button key={t.key} onClick={() => changeTab(t.key)} style={{
            padding: "10px 24px", background: "none", border: "none", borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -2, color: tab === t.key ? "var(--accent)" : "var(--text-secondary)", fontWeight: tab === t.key ? 700 : 500,
            fontSize: 14, cursor: "pointer", transition: "all .2s", fontFamily: "inherit", whiteSpace: "nowrap", flex: "0 0 auto",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Tab: Umum ── */}
      {tab === "umum" && (
        <div className="settings-general-grid">
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pengaturan Umum</h3>
            <form onSubmit={handleOrgSave}>
            <div style={{ background: "var(--bg-tertiary)", padding: 16, borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>Aplikasi</h4>
              <div className="form-group"><label className="form-label">Nama Aplikasi</label><input className="form-input" value={orgForm.app_name} onChange={e => setOrgForm({ ...orgForm, app_name: e.target.value })} placeholder="Nama yang tampil di sidebar & login" /><p className="form-help">Ditampilkan di sidebar, halaman login, dan title browser.</p></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tagline</label><input className="form-input" value={orgForm.subtitle} onChange={e => setOrgForm({ ...orgForm, subtitle: e.target.value })} placeholder="Deskripsi singkat" /><p className="form-help">Ditampilkan di bawah nama aplikasi.</p></div>
            </div>
            <div style={{ background: "var(--bg-tertiary)", padding: 16, borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>Logo Aplikasi</h4>
              <div className="form-group" style={{ marginBottom: 0 }}>
                {logoPreview && <div style={{ marginBottom: 8 }}><img src={logoPreview} alt="Logo" style={{ maxHeight: 80, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} /></div>}
                <input className="form-input" type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }} />
                <p className="form-help">Format: JPG, PNG. Maks 5MB. Ditampilkan di sidebar dan halaman login.</p>
              </div>
            </div>

              <button className="btn btn-primary" disabled={orgSaving}><Save size={16} />{orgSaving ? "Menyimpan..." : "Simpan"}</button>
            </form>
          </div>

          <section className="card settings-shortcut-section" aria-labelledby="settings-shortcut-title">
            <h4 id="settings-shortcut-title">
              <Keyboard size={16} />
              Keyboard Shortcuts
            </h4>
            <p>Gunakan pintasan berikut untuk bekerja lebih cepat di area dashboard.</p>
            <KeyboardShortcutList />
          </section>
        </div>
      )}

      {/* ── Tab: Kategori ── */}
      {tab === "kategori" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Daftar Kategori</h3>
            <button className="btn btn-success btn-sm" onClick={() => { setEditCat(null); setCatName(""); setShowCatModal(true); }}><Plus size={14} />Tambah</button>
          </div>
          <div className="table-wrap"><table><thead><tr><th style={{ width: 50 }}>No</th><th>Nama Kategori</th><th style={{ width: 100 }}>Aksi</th></tr></thead><tbody>
            {catsLoading ? <tr><td colSpan={3} style={{ textAlign: "center", padding: 24 }}>Memuat...</td></tr> :
              cats.length === 0 ? <tr><td colSpan={3} className="text-muted" style={{ textAlign: "center", padding: 24 }}>Belum ada kategori</td></tr> :
                cats.map((c, i) => <tr key={c.id}><td>{i + 1}</td><td>{c.name}</td><td style={{ whiteSpace: "nowrap" }}><button className="btn btn-sm btn-secondary btn-icon" onClick={() => { setEditCat(c); setCatName(c.name); setShowCatModal(true); }}><Pencil size={14} /></button>{" "}<button className="btn btn-sm btn-danger btn-icon" onClick={() => { setDeleteCat(c); setShowCatDelete(true); }}><Trash2 size={14} /></button></td></tr>)}
          </tbody></table></div>
        </div>
      )}

      {/* ── Tab: Template Transaksi ── */}
      {tab === "template" && <TemplateManager embedded />}

      {/* ── Tab: Pengguna ── */}
      {tab === "pengguna" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Daftar Pengguna</h3>
            <button className="btn btn-success btn-sm" onClick={() => { setEditUser(null); setUserForm({ username: "", password: "", role: "staf" }); setShowUserModal(true); }}><Plus size={14} />Tambah</button>
          </div>
          <div className="table-wrap"><table><thead><tr><th style={{ width: 50 }}>No</th><th>Username</th><th style={{ width: 80 }}>Role</th><th style={{ width: 120 }}>Dibuat</th><th style={{ width: 100 }}>Aksi</th></tr></thead><tbody>
            {usersLoading ? <tr><td colSpan={5} style={{ textAlign: "center", padding: 24 }}>Memuat...</td></tr> :
              users.map((u, i) => <tr key={u.id}><td>{i + 1}</td><td style={{ fontWeight: 600 }}>{u.username}</td><td><span className="badge" style={{ background: u.role === "admin" ? "var(--accent-light)" : "var(--success-light)", color: u.role === "admin" ? "var(--accent)" : "var(--success)" }}>{u.role}</span></td><td className="text-muted">{new Date(u.created_at).toLocaleDateString("id-ID")}</td><td style={{ whiteSpace: "nowrap" }}><button className="btn btn-sm btn-secondary btn-icon" onClick={() => { setEditUser(u); setUserForm({ username: u.username, password: "", role: u.role }); setShowUserModal(true); }}><Pencil size={14} /></button>{" "}<button className="btn btn-sm btn-danger btn-icon" onClick={() => { setDeleteUser(u); setShowUserDelete(true); }}><Trash2 size={14} /></button></td></tr>)}
          </tbody></table></div>
        </div>
      )}

      {/* ── Tab: Kop Surat ── */}
      {tab === "kop" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><h3 style={{ fontSize: 16, fontWeight: 700 }}>Kop Surat</h3><p className="text-muted" style={{ fontSize: 13 }}>Kelola header cetak untuk laporan</p></div>
            <button className="btn btn-success btn-sm" onClick={openKopAdd}><Plus size={14} />Tambah</button>
          </div>
          {kopLoading ? <div className="card" style={{ padding: 48, textAlign: "center" }}>Memuat...</div> :
           kopList.length === 0 ? <div className="card" style={{ padding: 48, textAlign: "center" }}><Printer size={40} style={{ opacity: 0.3, margin: "0 auto 12px" }} /><p className="text-muted">Belum ada kop surat</p></div> :
           kopList.map(h => (
            <div key={h.id} className="card" style={{ marginBottom: 12, border: h.is_default ? "2px solid var(--accent)" : undefined }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {h.logo ? <img src={`/uploads/${h.logo}`} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Printer size={24} style={{ opacity: 0.3 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="badge" style={{ background: "var(--bg-tertiary)", fontSize: 11 }}>{h.name}</span>
                    {h.is_default && <span className="badge" style={{ background: "var(--warning-light)", color: "var(--warning)", fontSize: 11 }}><Star size={10} /> Default</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{h.institution_name}</div>
                  {h.subtitle && <div className="text-muted" style={{ fontSize: 12, whiteSpace: "pre-line" }}>{h.subtitle}</div>}
                  {h.address && <div className="text-muted" style={{ fontSize: 12 }}>{h.address}</div>}
                  {h.signer_name && <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Penandatangan: <strong>{h.signer_name}</strong> — {h.signer_title || "-"}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => setPreviewKop(h)}><Eye size={14} /> Preview</button>
                <button className="btn btn-sm btn-secondary" onClick={() => openKopEdit(h)}><Pencil size={14} /> Edit</button>
                {!h.is_default && <button className="btn btn-sm btn-secondary" onClick={() => handleSetDefault(h.id)}><Star size={14} /> Jadikan Default</button>}
                <button className="btn btn-sm btn-danger" style={{ marginLeft: "auto" }} onClick={() => setShowKopDelete(h)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kop Surat Form Modal */}
      <Modal isOpen={showKopModal} onClose={() => setShowKopModal(false)} title={editKopId ? "Edit Kop Surat" : "Tambah Kop Surat"} size="lg" footer={<><button className="btn btn-secondary" onClick={() => setShowKopModal(false)}>Batal</button><button className="btn btn-primary" onClick={() => (document.getElementById("kopForm") as HTMLFormElement)?.requestSubmit()} disabled={kopSaving}>{kopSaving ? "Menyimpan..." : "Simpan"}</button></>}>
        <form id="kopForm" onSubmit={handleKopSave}>
          <div style={{ background: "var(--bg-tertiary)", padding: 16, borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--accent)" }}>IDENTITAS LEMBAGA</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group"><label className="form-label">Nama Label *</label><input className="form-input" value={kopForm.name} onChange={e => setKopForm({ ...kopForm, name: e.target.value })} required placeholder="e.g. Yayasan, SLB" /></div>
              <div className="form-group"><label className="form-label">Nama Lembaga *</label><input className="form-input" value={kopForm.institution_name} onChange={e => setKopForm({ ...kopForm, institution_name: e.target.value })} required placeholder="Nama lengkap lembaga" /></div>
            </div>
            <div className="form-group"><label className="form-label">Subtitle / Deskripsi</label><textarea className="form-textarea" rows={2} value={kopForm.subtitle || ""} onChange={e => setKopForm({ ...kopForm, subtitle: e.target.value })} placeholder="Baris tambahan (setiap baris baru = baris baru di kop surat)" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group"><label className="form-label">Alamat</label><textarea className="form-textarea" rows={2} value={kopForm.address || ""} onChange={e => setKopForm({ ...kopForm, address: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Telepon / Fax</label><input className="form-input" value={kopForm.phone || ""} onChange={e => setKopForm({ ...kopForm, phone: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group"><label className="form-label">Info Bank / Rekening</label><input className="form-input" value={kopForm.bank_info || ""} onChange={e => setKopForm({ ...kopForm, bank_info: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Info Notaris</label><input className="form-input" value={kopForm.notary_info || ""} onChange={e => setKopForm({ ...kopForm, notary_info: e.target.value })} /></div>
            </div>
          </div>
          <div style={{ background: "var(--bg-tertiary)", padding: 16, borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--info)" }}>LOGO</h4>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: "var(--radius-sm)", border: "2px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--bg-secondary)" }}>
                {kopLogoPreview ? <img src={kopLogoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Printer size={28} style={{ opacity: 0.3 }} />}
              </div>
              <div><input className="form-input" type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setKopLogoFile(f); setKopLogoPreview(URL.createObjectURL(f)); } }} /><p className="form-help">PNG / JPG, disarankan 200x200px</p></div>
            </div>
          </div>
          <div style={{ background: "var(--bg-tertiary)", padding: 16, borderRadius: "var(--radius-sm)" }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--success)" }}>PENANDA TANGAN</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Nama</label><input className="form-input" value={kopForm.signer_name || ""} onChange={e => setKopForm({ ...kopForm, signer_name: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Jabatan</label><input className="form-input" value={kopForm.signer_title || ""} onChange={e => setKopForm({ ...kopForm, signer_title: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Kota</label><input className="form-input" value={kopForm.signer_city || ""} onChange={e => setKopForm({ ...kopForm, signer_city: e.target.value })} /></div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Kop Surat Preview Modal */}
      <Modal isOpen={!!previewKop} onClose={() => setPreviewKop(null)} title="Preview Kop Surat" size="lg">
        {previewKop && (
          <div style={{ padding: 24 }}>
            <div style={{ border: "2px solid #000", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {previewKop.logo && <img src={`/uploads/${previewKop.logo}`} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain" }} />}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{previewKop.institution_name}</div>
                  {previewKop.subtitle && <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "pre-line", marginTop: 2 }}>{previewKop.subtitle}</div>}
                  {previewKop.address && <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{previewKop.address}</div>}
                  {previewKop.phone && <div style={{ fontSize: 10 }}>{previewKop.phone}</div>}
                  {previewKop.bank_info && <div style={{ fontSize: 10 }}>{previewKop.bank_info}</div>}
                </div>
              </div>
              <div style={{ borderTop: "3px double #000", marginTop: 10 }}>
                {previewKop.notary_info && <div style={{ fontSize: 9, textAlign: "center", marginTop: 4 }}>{previewKop.notary_info}</div>}
              </div>
            </div>
            {previewKop.signer_name && (
              <div style={{ textAlign: "right", marginTop: 40, fontSize: 11 }}>
                <div style={{ display: "inline-block", textAlign: "center" }}>
                  <div>{previewKop.signer_city || "________"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                  <div style={{ marginTop: 4, marginBottom: 60 }}>{previewKop.signer_title || "________"}</div>
                  <div style={{ fontWeight: 700, textDecoration: "underline" }}>{previewKop.signer_name}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Kop Surat Delete Confirm */}
      <Modal isOpen={!!showKopDelete} onClose={() => setShowKopDelete(null)} title="Hapus Kop Surat" size="sm" footer={<><button className="btn btn-secondary" onClick={() => setShowKopDelete(null)}>Batal</button><button className="btn btn-danger" onClick={handleKopDelete} disabled={kopSaving}>Hapus</button></>}>
        <div style={{ textAlign: "center", padding: 16 }}><Trash2 size={48} color="var(--danger)" /><p style={{ marginTop: 12, fontWeight: 600 }}>Hapus kop surat &quot;{showKopDelete?.name}&quot;?</p></div>
      </Modal>

      {/* Modals */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={editCat ? "Edit Kategori" : "Tambah Kategori"} size="sm" footer={<><button className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Batal</button><button className="btn btn-primary" onClick={() => (document.getElementById("catForm") as HTMLFormElement)?.requestSubmit()} disabled={catSaving}>{catSaving ? "Menyimpan..." : "Simpan"}</button></>}>
        <form id="catForm" onSubmit={handleCatSave}><div className="form-group"><label className="form-label">Nama Kategori</label><input className="form-input" value={catName} onChange={e => setCatName(e.target.value)} required autoFocus /></div></form>
      </Modal>
      <Modal isOpen={showCatDelete} onClose={() => setShowCatDelete(false)} title="Hapus Kategori" size="sm" footer={<><button className="btn btn-secondary" onClick={() => setShowCatDelete(false)}>Batal</button><button className="btn btn-danger" onClick={handleCatDelete} disabled={catSaving}>{catSaving ? "Menghapus..." : "Hapus"}</button></>}>
        <div style={{ textAlign: "center", padding: 16 }}><Trash2 size={48} color="var(--danger)" /><p style={{ marginTop: 12, fontWeight: 600 }}>Hapus kategori &quot;{deleteCat?.name}&quot;?</p><p className="text-muted">Transaksi terkait juga akan terpengaruh.</p></div>
      </Modal>
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editUser ? "Edit User" : "Tambah User"} size="sm" footer={<><button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Batal</button><button className="btn btn-primary" onClick={() => (document.getElementById("userForm") as HTMLFormElement)?.requestSubmit()} disabled={userSaving}>{userSaving ? "Menyimpan..." : "Simpan"}</button></>}>
        <form id="userForm" onSubmit={handleUserSave}>
          <div className="form-group"><label className="form-label">Username</label><input className="form-input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Password{editUser ? " (kosongkan jika tidak diubah)" : ""}</label><input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} {...(!editUser ? { required: true } : {})} /></div>
          <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}><option value="admin">Admin</option><option value="staf">Staf</option></select></div>
        </form>
      </Modal>
      <Modal isOpen={showUserDelete} onClose={() => setShowUserDelete(false)} title="Hapus User" size="sm" footer={<><button className="btn btn-secondary" onClick={() => setShowUserDelete(false)}>Batal</button><button className="btn btn-danger" onClick={handleUserDelete} disabled={userSaving}>Hapus</button></>}>
        <div style={{ textAlign: "center", padding: 16 }}><Trash2 size={48} color="var(--danger)" /><p style={{ marginTop: 12, fontWeight: 600 }}>Hapus user &quot;{deleteUser?.username}&quot;?</p></div>
      </Modal>
    </div>
  );
}

export default function PengaturanPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: 32, textAlign: "center" }}>Memuat pengaturan...</div>}>
      <PengaturanContent />
    </Suspense>
  );
}
