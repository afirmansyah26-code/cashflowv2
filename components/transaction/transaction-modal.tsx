"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import TransactionForm, { formatAmountInput } from "./transaction-form";
import type {
  TransactionCategory,
  TransactionFormValue,
  TransactionModalMode,
  TransactionRecord,
} from "./types";

interface TransactionModalProps {
  isOpen: boolean;
  mode: TransactionModalMode;
  onClose: () => void;
  onSaved?: () => void;
  transaction?: TransactionRecord | null;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
}

function formatDateInputValue(value: Date | string = new Date()) {
  if (typeof value === "string") {
    const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (dateOnly) return dateOnly;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialValue(mode: TransactionModalMode, transaction?: TransactionRecord | null): TransactionFormValue {
  if (mode === "create" || !transaction) {
    return {
      category_id: "",
      type: "income",
      amount: "",
      transaction_date: formatDateInputValue(),
      note: "",
      admin_notes: "",
      attachment: "",
    };
  }

  return {
    category_id: transaction.category_id ? String(transaction.category_id) : "",
    type: transaction.type,
    amount: formatAmountInput(String(Math.round(transaction.amount))),
    transaction_date: mode === "duplicate"
      ? formatDateInputValue()
      : formatDateInputValue(transaction.transaction_date),
    note: transaction.note || "",
    admin_notes: transaction.admin_notes || "",
    attachment: mode === "duplicate" ? "" : transaction.attachment || "",
  };
}

function parseAmountInput(value: string) {
  return parseInt(value.replace(/\./g, ""), 10) || 0;
}

function OpenTransactionModal({
  onClose,
  onSaved,
  mode,
  transaction,
}: Omit<TransactionModalProps, "isOpen">) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [role, setRole] = useState("");
  const [form, setForm] = useState<TransactionFormValue>(() => getInitialValue(mode, transaction));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/categories", { signal: controller.signal }).then((response) => response.json()),
      fetch("/api/me", { signal: controller.signal }).then((response) => response.json()),
    ])
      .then(([categoryData, userData]) => {
        setCategories(categoryData.categories || []);
        if (userData.role) setRole(userData.role);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        showToast("error", "Gagal memuat data form transaksi");
      });

    return () => controller.abort();
  }, [showToast]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      const isCtrlS = event.ctrlKey
        && !event.altKey
        && !event.metaKey
        && !event.shiftKey
        && event.key.toLowerCase() === "s";

      if (!isCtrlS) return;

      event.preventDefault();
      if (!savingRef.current) formRef.current?.requestSubmit();
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, []);

  const updateForm = useCallback((patch: Partial<TransactionFormValue>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const uploadFile = async () => {
    if (!file) return form.attachment;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("type", "bukti");
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.filename as string;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);

    try {
      const attachment = await uploadFile();
      const payload: Record<string, unknown> = {
        ...form,
        amount: parseAmountInput(form.amount),
        attachment,
      };
      if (role !== "admin") delete payload.admin_notes;

      const isEditing = mode === "edit";
      const response = await fetch(
        isEditing ? `/api/transactions/${transaction?.id}` : "/api/transactions",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json() as ApiResponse;

      if (!result.success) {
        showToast("error", result.error || (isEditing ? "Gagal memperbarui" : "Gagal menyimpan"));
        savingRef.current = false;
        setSaving(false);
        return;
      }

      savingRef.current = false;
      setSaving(false);
      showToast(
        "success",
        isEditing
          ? "Transaksi berhasil diperbarui"
          : mode === "duplicate"
            ? "Transaksi berhasil diduplikasi."
            : "Transaksi berhasil ditambahkan",
      );
      onSaved?.();
      onClose();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan transaksi");
      savingRef.current = false;
      setSaving(false);
    }
  };

  const isEditing = mode === "edit";
  const isDuplicate = mode === "duplicate";

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEditing ? "Edit Transaksi" : "Tambah Transaksi"}
      headerBadge={isDuplicate ? "Duplicate Transaction" : undefined}
      size="lg"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={saving}
          >
            {uploading ? "Mengunggah..." : saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan"}
          </button>
        </>
      )}
    >
      <form ref={formRef} onSubmit={handleSubmit}>
        <TransactionForm
          mode={mode}
          value={form}
          categories={categories}
          role={role}
          file={file}
          disabled={saving}
          uploading={uploading}
          autoFocus
          onChange={updateForm}
          onFileChange={setFile}
          onFileValidationError={(message) => showToast("error", message)}
        />
      </form>
    </Modal>
  );
}

export default function TransactionModal(props: TransactionModalProps) {
  if (!props.isOpen) return null;
  if (props.mode !== "create" && !props.transaction) return null;
  return (
    <OpenTransactionModal
      key={`${props.mode}-${props.transaction?.id || "new"}`}
      {...props}
    />
  );
}
