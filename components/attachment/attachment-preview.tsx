"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import PdfCard from "./pdf-card";

interface AttachmentPreviewBaseProps {
  fileName?: string;
  compact?: boolean;
}

type AttachmentPreviewProps = AttachmentPreviewBaseProps & (
  | { mode: "new"; file: File; url?: never }
  | { mode: "existing"; url: string; file?: never }
);

function formatFileSize(size?: number) {
  if (size === undefined) return undefined;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

function filenameFromUrl(url: string) {
  const value = url.split("/").pop() || "Lampiran";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function AttachmentPreview(props: AttachmentPreviewProps) {
  const [open, setOpen] = useState(false);
  const [newAttachmentSource, setNewAttachmentSource] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const file = props.mode === "new" ? props.file : null;
  const sourceUrl = props.mode === "new"
    ? newAttachmentSource?.file === props.file ? newAttachmentSource.url : ""
    : props.url;
  const displayName = file?.name || props.fileName || (props.mode === "existing" ? filenameFromUrl(props.url) : "Lampiran");
  const isPdf = file?.type === "application/pdf" || displayName.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // Blob URLs are browser resources: create them in an effect so Strict Mode
    // cleanup is followed by a fresh URL instead of reusing a revoked memo value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewAttachmentSource({ file, url: objectUrl });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [open]);

  if (!sourceUrl) return null;

  return (
    <>
      {isPdf ? (
        <PdfCard
          name={displayName}
          sizeLabel={formatFileSize(file?.size)}
          compact={props.compact}
          onPreview={() => setOpen(true)}
        />
      ) : (
        <button
          type="button"
          className={`attachment-image-card ${props.compact ? "attachment-image-card-compact" : ""}`}
          onClick={() => setOpen(true)}
          aria-label={`Preview gambar ${displayName}`}
          title="Klik untuk memperbesar"
        >
          <img src={sourceUrl} alt={`Bukti ${displayName}`} />
          {!props.compact && <span>{displayName}</span>}
        </button>
      )}

      {open && (
        <div
          className={`attachment-preview-overlay ${isPdf ? "attachment-preview-overlay-pdf" : ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          {isPdf ? (
            <section
              className="attachment-pdf-viewer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="attachment-pdf-title"
            >
              <header>
                <div>
                  <strong id="attachment-pdf-title">Preview PDF</strong>
                  <span>{displayName}</span>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup preview PDF"
                >
                  <X size={19} />
                </button>
              </header>
              <div className="attachment-pdf-frame">
                <object data={sourceUrl} type="application/pdf" aria-label={`Dokumen PDF ${displayName}`}>
                  <div className="attachment-pdf-fallback">
                    <p>Browser tidak dapat menampilkan PDF ini.</p>
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Buka PDF</a>
                  </div>
                </object>
              </div>
              <footer>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Buka PDF ${displayName} di tab baru`}>
                  <ExternalLink size={15} /> Buka PDF
                </a>
                <a href={sourceUrl} download={displayName} aria-label={`Download PDF ${displayName}`}>Download PDF</a>
              </footer>
            </section>
          ) : (
            <div className="attachment-image-lightbox" role="dialog" aria-modal="true" aria-label={`Preview gambar ${displayName}`}>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup preview gambar"
              >
                <X size={24} />
              </button>
              <img src={sourceUrl} alt={`Bukti ${displayName}`} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
