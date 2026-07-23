"use client";

import { useEffect, useMemo, useState } from "react";
import { Files } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { DebouncedSearchInput } from "@/components/transaction/transaction-filter-toolbar";
import TemplateCard from "./template-card";
import type { TransactionTemplate, TransactionTemplatesResponse } from "./types";

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TransactionTemplate) => void;
}

export default function TemplatePicker({ isOpen, onClose, onSelect }: TemplatePickerProps) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      active_only: "true",
      page: String(page),
      limit: "6",
    });
    if (search) params.set("search", search);
    return params.toString();
  }, [page, search]);

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
  }, [query, showToast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gunakan Template" size="lg">
      <div className="template-picker-search">
        <DebouncedSearchInput
          initialValue={search}
          onCommit={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Cari nama, kategori, atau jenis template..."
          ariaLabel="Cari template transaksi"
        />
      </div>

      {loading ? (
        <div className="template-picker-state">Memuat template...</div>
      ) : templates.length === 0 ? (
        <div className="template-picker-state">
          <Files size={42} aria-hidden="true" />
          <strong>Tidak ada template aktif.</strong>
          <span>{search ? "Coba gunakan kata pencarian lain." : "Buat template terlebih dahulu dari form transaksi atau menu Master Data."}</span>
        </div>
      ) : (
        <div className="transaction-template-grid transaction-template-picker-grid">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} onUse={onSelect} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="page-btn" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Halaman sebelumnya">«</button>
          <span className="template-picker-page">{page} / {totalPages}</span>
          <button type="button" className="page-btn" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Halaman berikutnya">»</button>
        </div>
      )}
    </Modal>
  );
}
