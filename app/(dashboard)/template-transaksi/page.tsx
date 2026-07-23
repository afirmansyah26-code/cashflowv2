"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Files, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { DebouncedSearchInput } from "@/components/transaction/transaction-filter-toolbar";
import type { TransactionCategory } from "@/components/transaction/types";
import TemplateCard from "@/components/transaction-template/template-card";
import TemplateForm from "@/components/transaction-template/template-form";
import type {
  TransactionTemplate,
  TransactionTemplateFormValue,
  TransactionTemplatesResponse,
} from "@/components/transaction-template/types";

const emptyForm: TransactionTemplateFormValue = {
  name: "",
  type: "expense",
  category_id: "",
  amount: "",
  note: "",
  admin_notes: "",
  is_global: false,
  is_active: true,
};

function formatAmountInput(value: number | null) {
  if (value === null) return "";
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseAmount(value: string) {
  if (!value.trim()) return null;
  return Number(value.replace(/\./g, ""));
}

export default function TemplateTransaksiPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<TransactionTemplate | null>(null);
  const [form, setForm] = useState<TransactionTemplateFormValue>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isAdmin = role.toLowerCase() === "admin";

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search) params.set("search", search);
    return params.toString();
  }, [page, search]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/me", { signal: controller.signal }).then((response) => response.json()),
      fetch("/api/categories", { signal: controller.signal }).then((response) => response.json()),
    ])
      .then(([userData, categoryData]) => {
        setRole(userData.role || "");
        setCategories(categoryData.categories || []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        showToast("error", "Gagal memuat data template");
      });
    return () => controller.abort();
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadTemplates = async () => {
      await Promise.resolve();
      if (active) setLoading(true);
      try {
        const response = await fetch(`/api/transaction-templates?${query}`, {
          signal: controller.signal,
        });
        const data = await response.json() as TransactionTemplatesResponse;
        if (!response.ok) throw new Error(data.error || "Gagal memuat template");
        if (!active) return;
        setTemplates(data.templates || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (active) showToast("error", error instanceof Error ? error.message : "Gagal memuat template");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadTemplates();
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, revision, showToast]);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (template: TransactionTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      type: template.type,
      category_id: template.category_id ? String(template.category_id) : "",
      amount: formatAmountInput(template.amount),
      note: template.note || "",
      admin_notes: template.admin_notes || "",
      is_global: template.is_global,
      is_active: template.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        category_id: form.category_id ? Number(form.category_id) : null,
        amount: parseAmount(form.amount),
        note: form.note || null,
        is_active: form.is_active,
      };
      if (isAdmin) {
        payload.admin_notes = form.admin_notes || null;
        payload.is_global = form.is_global;
      }

      const response = await fetch(
        editingTemplate ? `/api/transaction-templates/${editingTemplate.id}` : "/api/transaction-templates",
        {
          method: editingTemplate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Gagal menyimpan template");
      showToast("success", editingTemplate ? "Template berhasil diperbarui." : "Template berhasil ditambahkan.");
      setFormOpen(false);
      setEditingTemplate(null);
      setRevision((current) => current + 1);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  };

  const toggleTemplate = async (template: TransactionTemplate) => {
    try {
      const response = await fetch(`/api/transaction-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !template.is_active }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Gagal mengubah status template");
      showToast("success", template.is_active ? "Template dinonaktifkan." : "Template diaktifkan.");
      setRevision((current) => current + 1);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Gagal mengubah status template");
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/transaction-templates/${deleteTemplate.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Gagal menghapus template");
      showToast("success", "Template berhasil dihapus.");
      setDeleteTemplate(null);
      setRevision((current) => current + 1);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Gagal menghapus template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Template Transaksi</h1>
          <p className="text-muted template-page-description">Simpan nilai transaksi yang sering digunakan agar input lebih cepat.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Tambah Template
        </button>
      </div>

      <div className="template-page-toolbar">
        <DebouncedSearchInput
          initialValue={search}
          onCommit={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Cari nama, kategori, atau jenis template..."
          ariaLabel="Cari template transaksi"
        />
        <span className="transaction-result-summary">{total} template ditemukan</span>
      </div>

      {loading ? (
        <div className="template-page-state">Memuat template...</div>
      ) : templates.length === 0 ? (
        <div className="template-page-state card">
          <Files size={48} aria-hidden="true" />
          <strong>{search ? "Template tidak ditemukan." : "Belum ada template transaksi."}</strong>
          <span>{search ? "Coba gunakan kata pencarian lain." : "Tambahkan template pertama untuk mempercepat input transaksi."}</span>
          {!search && <button type="button" className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Template</button>}
        </div>
      ) : (
        <div className="transaction-template-grid">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={openEdit}
              onToggle={(item) => void toggleTemplate(item)}
              onDelete={setDeleteTemplate}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="page-btn" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Halaman sebelumnya">«</button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, index) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const pageNumber = start + index;
            if (pageNumber > totalPages) return null;
            return <button type="button" key={pageNumber} className={`page-btn ${pageNumber === page ? "page-btn-active" : ""}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>;
          })}
          <button type="button" className="page-btn" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Halaman berikutnya">»</button>
        </div>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingTemplate ? "Edit Template" : "Tambah Template"}
        size="md"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>Batal</button>
            <button type="submit" form="transaction-template-form" className="btn btn-primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Template"}
            </button>
          </>
        )}
      >
        <form id="transaction-template-form" onSubmit={handleSave}>
          <TemplateForm
            value={form}
            categories={categories}
            role={role}
            disabled={saving}
            autoFocus
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTemplate)}
        onClose={() => setDeleteTemplate(null)}
        title="Hapus Template"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTemplate(null)}>Batal</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? "Menghapus..." : "Hapus"}</button>
          </>
        )}
      >
        <div className="template-delete-confirm">
          <Trash2 size={44} aria-hidden="true" />
          <strong>Hapus template “{deleteTemplate?.name}”?</strong>
          <span>Template tidak lagi tersedia pada Transaction Modal.</span>
        </div>
      </Modal>
    </div>
  );
}
