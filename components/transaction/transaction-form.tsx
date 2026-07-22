"use client";

import AttachmentDropzone from "@/components/attachment/attachment-dropzone";
import AttachmentPreview from "@/components/attachment/attachment-preview";
import type {
  TransactionCategory,
  TransactionFormValue,
  TransactionModalMode,
} from "./types";

interface TransactionFormProps {
  mode: TransactionModalMode;
  value: TransactionFormValue;
  categories: TransactionCategory[];
  role: string;
  file: File | null;
  disabled?: boolean;
  uploading?: boolean;
  autoFocus?: boolean;
  onChange: (patch: Partial<TransactionFormValue>) => void;
  onFileChange: (file: File | null) => void;
  onFileValidationError: (message: string) => void;
}

export function formatAmountInput(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function TransactionForm({
  mode,
  value,
  categories,
  role,
  file,
  disabled = false,
  uploading = false,
  autoFocus = false,
  onChange,
  onFileChange,
  onFileValidationError,
}: TransactionFormProps) {
  const existingAttachmentName = value.attachment.split("/").pop() || value.attachment;
  const existingAttachmentUrl = existingAttachmentName
    ? `/api/files/private/bukti/${encodeURIComponent(existingAttachmentName)}`
    : "";

  return (
    <>
      <div className="form-group">
        <label className="form-label">Kategori</label>
        <select
          className="form-select"
          value={value.category_id}
          onChange={(event) => onChange({ category_id: event.target.value })}
          autoFocus={autoFocus}
        >
          <option value="">-- Pilih Kategori --</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Jenis</label>
          <select
            className="form-select"
            value={value.type}
            onChange={(event) => onChange({ type: event.target.value as TransactionFormValue["type"] })}
          >
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Jumlah</label>
          <input
            className="form-input"
            value={value.amount}
            onChange={(event) => onChange({ amount: formatAmountInput(event.target.value) })}
            placeholder="contoh: 1.000.000"
            inputMode="numeric"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Tanggal</label>
        <input
          className="form-input"
          type="date"
          value={value.transaction_date}
          onChange={(event) => onChange({ transaction_date: event.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Catatan</label>
        <textarea
          className="form-textarea"
          rows={2}
          value={value.note}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Bukti Transaksi</label>
        {mode === "duplicate" && (
          <p className="transaction-duplicate-attachment-note" role="note">
            Lampiran tidak ikut diduplikasi. Pilih file baru jika diperlukan.
          </p>
        )}
        <AttachmentDropzone
          file={file}
          disabled={disabled}
          uploading={uploading}
          onFileSelect={onFileChange}
          onValidationError={onFileValidationError}
        />
        <p className="form-help">File diperiksa kembali oleh server sebelum disimpan.</p>

        {(file || existingAttachmentUrl) && (
          <div className="attachment-form-preview">
            <span className="form-help">{file ? "File dipilih:" : "File saat ini:"}</span>
            {file ? (
              <AttachmentPreview mode="new" file={file} />
            ) : (
              <AttachmentPreview
                mode="existing"
                url={existingAttachmentUrl}
                fileName={existingAttachmentName}
              />
            )}
          </div>
        )}
      </div>

      {role === "admin" && (
        <div className="form-group">
          <label className="form-label">Admin Notes</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={value.admin_notes}
            onChange={(event) => onChange({ admin_notes: event.target.value })}
            placeholder="Catatan internal"
          />
          <p className="form-help">Hanya tampil di halaman transaksi, tidak di laporan.</p>
        </div>
      )}
    </>
  );
}
