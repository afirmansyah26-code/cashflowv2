"use client";

import { type FormEvent, useState } from "react";
import { ChevronDown, Filter, RotateCcw, X } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useMediaQuery } from "@/components/use-media-query";
import { DebouncedSearchInput } from "./transaction-filter-toolbar";
import type { TransactionCategory } from "./types";

export interface RecycleBinFilters {
  type: "" | "income" | "expense";
  category: string;
  start: string;
  end: string;
}

export type RecycleBinFilterKey = keyof RecycleBinFilters | "date";

interface RecycleBinFilterToolbarProps {
  search: string;
  filters: RecycleBinFilters;
  categories: TransactionCategory[];
  refreshing: boolean;
  onSearchChange: (value: string) => void;
  onApply: (filters: RecycleBinFilters) => void;
  onRemove: (key: RecycleBinFilterKey) => void;
  onReset: () => void;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function RecycleBinFilterToolbar({
  search,
  filters,
  categories,
  refreshing,
  onSearchChange,
  onApply,
  onRemove,
  onReset,
}: RecycleBinFilterToolbarProps) {
  const isMobile = useMediaQuery("(max-width:768px)");
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const [isOpen, setIsOpen] = useState(hasActiveFilters);
  const [draft, setDraft] = useState(filters);
  const [lastFilters, setLastFilters] = useState(filters);
  const [error, setError] = useState("");

  if (filters !== lastFilters) {
    setLastFilters(filters);
    setDraft(filters);
  }

  const activeChips: Array<{ key: RecycleBinFilterKey; label: string }> = [];
  if (filters.type) activeChips.push({
    key: "type",
    label: filters.type === "income" ? "Pemasukan" : "Pengeluaran",
  });
  if (filters.category) {
    const category = categories.find((item) => String(item.id) === filters.category);
    activeChips.push({ key: "category", label: category?.name || `Kategori #${filters.category}` });
  }
  if (filters.start || filters.end) {
    activeChips.push({
      key: "date",
      label: filters.start && filters.end
        ? `${formatDate(filters.start)} – ${formatDate(filters.end)}`
        : filters.start
          ? `Mulai ${formatDate(filters.start)}`
          : `Sampai ${formatDate(filters.end)}`,
    });
  }

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.start && draft.end && draft.start > draft.end) {
      setError("Tanggal mulai tidak boleh melewati tanggal akhir.");
      return;
    }
    setError("");
    onApply(draft);
    if (isMobile) setIsOpen(false);
  };

  const reset = () => {
    const empty: RecycleBinFilters = { type: "", category: "", start: "", end: "" };
    setDraft(empty);
    setError("");
    onReset();
    if (isMobile) setIsOpen(false);
  };

  const filterForm = (
    <form onSubmit={apply}>
      <div className="transaction-filter-grid recycle-bin-filter-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="trash-filter-type">Jenis Transaksi</label>
          <select
            id="trash-filter-type"
            className="form-select"
            value={draft.type}
            onChange={(event) => setDraft((current) => ({
              ...current,
              type: event.target.value as RecycleBinFilters["type"],
            }))}
          >
            <option value="">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="trash-filter-category">Kategori</label>
          <select
            id="trash-filter-category"
            className="form-select"
            value={draft.category}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          >
            <option value="">Semua Kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="trash-filter-start">Tanggal Mulai</label>
          <input
            id="trash-filter-start"
            className="form-input"
            type="date"
            value={draft.start}
            onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="trash-filter-end">Tanggal Akhir</label>
          <input
            id="trash-filter-end"
            className="form-input"
            type="date"
            value={draft.end}
            onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))}
          />
        </div>
      </div>
      {error && <p className="transaction-filter-error" role="alert">{error}</p>}
      <div className="transaction-filter-actions">
        <button type="button" className="btn btn-secondary" onClick={reset}>
          <RotateCcw size={14} /> Reset Filter
        </button>
        <button type="submit" className="btn btn-primary">Terapkan Filter</button>
      </div>
    </form>
  );

  return (
    <div className="transaction-filter-toolbar">
      <div className="transaction-toolbar-row">
        <DebouncedSearchInput
          initialValue={search}
          onCommit={onSearchChange}
          placeholder="Cari catatan, kategori, nominal, nomor..."
          ariaLabel="Cari transaksi di Recycle Bin"
        />
        <button
          type="button"
          className={`btn ${hasActiveFilters ? "btn-primary" : "btn-secondary"} transaction-filter-toggle`}
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls="recycle-bin-filter-panel"
        >
          <Filter size={15} /> Filter
          {activeChips.length > 0 && <span className="transaction-filter-count">{activeChips.length}</span>}
          <ChevronDown size={14} className={isOpen ? "transaction-filter-chevron-open" : ""} />
        </button>
        {(search || hasActiveFilters) && (
          <button type="button" className="btn btn-ghost transaction-reset-button" onClick={reset}>
            Reset
          </button>
        )}
        {refreshing && <span className="transaction-refreshing" role="status">Memperbarui...</span>}
      </div>

      {activeChips.length > 0 && (
        <div className="transaction-filter-chips" aria-label="Filter Recycle Bin aktif">
          {activeChips.map((chip) => (
            <span className="transaction-filter-chip" key={chip.key}>
              {chip.label}
              <button
                type="button"
                onClick={() => onRemove(chip.key)}
                aria-label={`Hapus filter ${chip.label}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {!isMobile && isOpen && (
        <div id="recycle-bin-filter-panel" className="card transaction-filter-panel">
          {filterForm}
        </div>
      )}

      {isMobile && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Filter Recycle Bin">
          <div id="recycle-bin-filter-panel">{filterForm}</div>
        </Modal>
      )}
    </div>
  );
}
