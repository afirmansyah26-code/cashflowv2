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
}

export default function Modal({ isOpen, onClose, title, children, size = "md", footer, headerBadge }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
      <div className="modal-content" style={{ maxWidth: widths[size] }}>
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
