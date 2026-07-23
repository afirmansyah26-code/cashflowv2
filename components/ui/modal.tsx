"use client";
import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  headerBadge?: string;
  contentClassName?: string;
}

let openModalCount = 0;
let originalBodyOverflow = "";

export default function Modal({ isOpen, onClose, title, children, size = "md", footer, headerBadge, contentClassName }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (openModalCount === 0) originalBodyOverflow = document.body.style.overflow;
    openModalCount += 1;
    document.body.style.overflow = "hidden";
    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.style.overflow = originalBodyOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const openOverlays = Array.from(document.querySelectorAll(".modal-overlay"));
      if (openOverlays.at(-1) !== overlayRef.current) return;
      e.preventDefault();
      onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = { sm: "420px", md: "560px", lg: "720px" };

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`modal-content${contentClassName ? ` ${contentClassName}` : ""}`} style={{ maxWidth: widths[size] }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title">{title}</h3>
            {headerBadge && <span className="modal-header-badge">{headerBadge}</span>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={`Tutup ${title}`}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
