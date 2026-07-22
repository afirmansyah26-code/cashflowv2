"use client";

import { FileText } from "lucide-react";

interface PdfCardProps {
  name: string;
  sizeLabel?: string;
  compact?: boolean;
  onPreview: () => void;
}

export default function PdfCard({ name, sizeLabel, compact = false, onPreview }: PdfCardProps) {
  return (
    <button
      type="button"
      className={`attachment-pdf-card ${compact ? "attachment-pdf-card-compact" : ""}`}
      onClick={onPreview}
      aria-label={`Preview PDF ${name}`}
      title={`Preview ${name}`}
    >
      <span className="attachment-pdf-icon" aria-hidden="true"><FileText size={compact ? 18 : 24} /></span>
      {compact ? (
        <span className="attachment-pdf-compact-label">PDF</span>
      ) : (
        <>
          <span className="attachment-pdf-details">
            <strong>{name}</strong>
            {sizeLabel && <small>{sizeLabel}</small>}
          </span>
          <span className="attachment-pdf-action">Klik untuk preview</span>
        </>
      )}
    </button>
  );
}
