"use client";

import { Copy, FileText, Globe2, Pencil, Power, Trash2, UserRound } from "lucide-react";
import type { TransactionTemplate } from "./types";

interface TemplateCardProps {
  template: TransactionTemplate;
  onUse?: (template: TransactionTemplate) => void;
  onEdit?: (template: TransactionTemplate) => void;
  onToggle?: (template: TransactionTemplate) => void;
  onDelete?: (template: TransactionTemplate) => void;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function TemplateCard({
  template,
  onUse,
  onEdit,
  onToggle,
  onDelete,
}: TemplateCardProps) {
  return (
    <article className={`transaction-template-card ${template.is_active ? "" : "transaction-template-card-inactive"}`}>
      <header>
        <span className="transaction-template-card-icon"><FileText size={19} /></span>
        <div>
          <h3>{template.name}</h3>
          <div className="transaction-template-badges">
            <span className={`badge ${template.type === "income" ? "badge-income" : "badge-expense"}`}>
              {template.type === "income" ? "Pemasukan" : "Pengeluaran"}
            </span>
            {template.is_global ? (
              <span className="template-scope-badge"><Globe2 size={11} /> Global</span>
            ) : (
              <span className="template-scope-badge"><UserRound size={11} /> Pribadi</span>
            )}
            {!template.is_active && <span className="template-inactive-badge">Nonaktif</span>}
          </div>
        </div>
      </header>

      <dl className="transaction-template-details">
        <div><dt>Kategori</dt><dd>{template.category_name}</dd></div>
        <div><dt>Nominal</dt><dd>{template.amount === null ? "Fleksibel" : formatRupiah(template.amount)}</dd></div>
        {template.note && <div><dt>Catatan</dt><dd>{template.note}</dd></div>}
        <div><dt>Pemilik</dt><dd>{template.owner_name}</dd></div>
      </dl>

      <footer>
        {onUse && (
          <button type="button" className="btn btn-primary" onClick={() => onUse(template)}>
            <Copy size={14} /> Gunakan
          </button>
        )}
        {template.can_edit && onEdit && (
          <button type="button" className="btn btn-secondary btn-icon" onClick={() => onEdit(template)} title="Edit template" aria-label={`Edit template ${template.name}`}>
            <Pencil size={14} />
          </button>
        )}
        {template.can_edit && onToggle && (
          <button type="button" className="btn btn-secondary btn-icon" onClick={() => onToggle(template)} title={template.is_active ? "Nonaktifkan template" : "Aktifkan template"} aria-label={`${template.is_active ? "Nonaktifkan" : "Aktifkan"} template ${template.name}`}>
            <Power size={14} />
          </button>
        )}
        {template.can_edit && onDelete && (
          <button type="button" className="btn btn-danger btn-icon" onClick={() => onDelete(template)} title="Hapus template" aria-label={`Hapus template ${template.name}`}>
            <Trash2 size={14} />
          </button>
        )}
      </footer>
    </article>
  );
}
