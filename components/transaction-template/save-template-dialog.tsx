"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { TransactionFormValue } from "@/components/transaction/types";

interface SaveTemplateDialogProps {
  isOpen: boolean;
  role: string;
  form: TransactionFormValue;
  onClose: () => void;
  onSaved?: () => void;
}

function parseAmount(value: string) {
  if (!value.trim()) return null;
  return Number(value.replace(/\./g, ""));
}

export default function SaveTemplateDialog({
  isOpen,
  role,
  form,
  onClose,
  onSaved,
}: SaveTemplateDialogProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const isAdmin = role.toLowerCase() === "admin";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        type: form.type,
        category_id: form.category_id ? Number(form.category_id) : null,
        amount: parseAmount(form.amount),
        note: form.note || null,
        is_global: isAdmin && isGlobal,
        is_active: true,
      };
      if (isAdmin) payload.admin_notes = form.admin_notes || null;

      const response = await fetch("/api/transaction-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal menyimpan template");
      }
      showToast("success", "Template transaksi berhasil disimpan.");
      onSaved?.();
      onClose();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Simpan sebagai Template"
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary" form="save-transaction-template-form" disabled={saving}>
            <Save size={14} /> {saving ? "Menyimpan..." : "Simpan Template"}
          </button>
        </>
      )}
    >
      <form id="save-transaction-template-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="quick-template-name">Nama Template</label>
          <input
            id="quick-template-name"
            className="form-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={150}
            autoFocus
            required
          />
        </div>
        {isAdmin && (
          <label className="template-checkbox">
            <input type="checkbox" checked={isGlobal} onChange={(event) => setIsGlobal(event.target.checked)} />
            <span>Jadikan Template Global</span>
          </label>
        )}
        <p className="form-help template-save-help">Tanggal dan lampiran tidak akan disimpan ke template.</p>
      </form>
    </Modal>
  );
}
