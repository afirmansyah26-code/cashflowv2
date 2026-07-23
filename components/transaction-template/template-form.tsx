"use client";

import { formatAmountInput } from "@/components/transaction/transaction-form";
import type { TransactionCategory } from "@/components/transaction/types";
import type { TransactionTemplateFormValue } from "./types";

interface TemplateFormProps {
  value: TransactionTemplateFormValue;
  categories: TransactionCategory[];
  role: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (patch: Partial<TransactionTemplateFormValue>) => void;
}

export default function TemplateForm({
  value,
  categories,
  role,
  disabled = false,
  autoFocus = false,
  onChange,
}: TemplateFormProps) {
  const isAdmin = role.toLowerCase() === "admin";

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="template-name">Nama Template</label>
        <input
          id="template-name"
          className="form-input"
          value={value.name}
          onChange={(event) => onChange({ name: event.target.value })}
          maxLength={150}
          disabled={disabled}
          autoFocus={autoFocus}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="template-type">Jenis Transaksi</label>
          <select
            id="template-type"
            className="form-select"
            value={value.type}
            onChange={(event) => onChange({ type: event.target.value as TransactionTemplateFormValue["type"] })}
            disabled={disabled}
          >
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="template-category">Kategori</label>
          <select
            id="template-category"
            className="form-select"
            value={value.category_id}
            onChange={(event) => onChange({ category_id: event.target.value })}
            disabled={disabled}
          >
            <option value="">Tanpa Kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="template-amount">Nominal (Opsional)</label>
        <input
          id="template-amount"
          className="form-input"
          value={value.amount}
          onChange={(event) => onChange({ amount: formatAmountInput(event.target.value) })}
          inputMode="numeric"
          placeholder="Kosongkan jika nominal berubah-ubah"
          disabled={disabled}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="template-note">Catatan</label>
        <textarea
          id="template-note"
          className="form-textarea"
          rows={2}
          value={value.note}
          onChange={(event) => onChange({ note: event.target.value })}
          maxLength={2000}
          disabled={disabled}
        />
      </div>

      {isAdmin && (
        <div className="form-group">
          <label className="form-label" htmlFor="template-admin-notes">Admin Notes</label>
          <textarea
            id="template-admin-notes"
            className="form-textarea"
            rows={2}
            value={value.admin_notes}
            onChange={(event) => onChange({ admin_notes: event.target.value })}
            maxLength={2000}
            disabled={disabled}
          />
        </div>
      )}

      <div className="template-form-options">
        <label className="template-checkbox">
          <input
            type="checkbox"
            checked={value.is_active}
            onChange={(event) => onChange({ is_active: event.target.checked })}
            disabled={disabled}
          />
          <span>Template aktif</span>
        </label>
        {isAdmin && (
          <label className="template-checkbox">
            <input
              type="checkbox"
              checked={value.is_global}
              onChange={(event) => onChange({ is_global: event.target.checked })}
              disabled={disabled}
            />
            <span>Template Global</span>
          </label>
        )}
      </div>
    </>
  );
}
