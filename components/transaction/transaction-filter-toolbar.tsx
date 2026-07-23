"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, RotateCcw, Search, X } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useMediaQuery } from "@/components/use-media-query";
import type { TransactionCategory } from "./types";

export interface TransactionFilterValues {
  type: "" | "income" | "expense";
  category: string;
  preset: DatePreset | "";
  start: string;
  end: string;
  min: string;
  max: string;
  user: string;
}

export type DatePreset = "today" | "this_week" | "this_month" | "last_month" | "this_year";
export type TransactionSort = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export interface TransactionUserOption {
  id: number;
  username: string;
}

export type TransactionFilterKey = keyof TransactionFilterValues | "date";

export interface TransactionActiveFilterChip {
  key: TransactionFilterKey;
  label: string;
}

interface TransactionFilterToolbarProps {
  search: string;
  filters: TransactionFilterValues;
  categories: TransactionCategory[];
  users: TransactionUserOption[];
  isAdmin: boolean;
  sort: TransactionSort;
  limit: number;
  refreshing: boolean;
  onSearchChange: (value: string) => void;
  onApplyFilters: (filters: TransactionFilterValues) => void;
  onRemoveFilter: (key: TransactionFilterKey) => void;
  onReset: () => void;
  onSortChange: (sort: TransactionSort) => void;
  onLimitChange: (limit: number) => void;
}

const datePresets: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Hari Ini" },
  { value: "this_week", label: "Minggu Ini" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_month", label: "Bulan Lalu" },
  { value: "this_year", label: "Tahun Ini" },
];

function formatInputDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset: DatePreset, now = new Date()) {
  // Capture the user's calendar day, then do all range arithmetic in UTC.
  // The resulting YYYY-MM-DD values stay date-only and cannot shift when sent
  // to Prisma/MariaDB DATE filters.
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const calendarDate = new Date(Date.UTC(year, month, day));

  switch (preset) {
    case "today":
      return { start: formatInputDate(calendarDate), end: formatInputDate(calendarDate) };
    case "this_week": {
      const mondayOffset = (calendarDate.getUTCDay() + 6) % 7;
      const start = new Date(Date.UTC(year, month, day - mondayOffset));
      const end = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 6,
      ));
      return { start: formatInputDate(start), end: formatInputDate(end) };
    }
    case "this_month":
      return {
        start: formatInputDate(new Date(Date.UTC(year, month, 1))),
        end: formatInputDate(new Date(Date.UTC(year, month + 1, 0))),
      };
    case "last_month":
      return {
        start: formatInputDate(new Date(Date.UTC(year, month - 1, 1))),
        end: formatInputDate(new Date(Date.UTC(year, month, 0))),
      };
    case "this_year":
      return {
        start: formatInputDate(new Date(Date.UTC(year, 0, 1))),
        end: formatInputDate(new Date(Date.UTC(year, 11, 31))),
      };
  }
}

function formatCurrency(value: string) {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateFilterLabel(filters: TransactionFilterValues) {
  if (filters.preset === "today") return "Hari Ini";
  if (filters.preset === "this_week") return "Minggu Ini";
  if (filters.preset === "this_year" && filters.start) {
    return new Date(`${filters.start}T00:00:00.000Z`).toLocaleDateString("id-ID", {
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if ((filters.preset === "this_month" || filters.preset === "last_month") && filters.start) {
    return new Date(`${filters.start}T00:00:00.000Z`).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (filters.start && filters.end) return `${formatDate(filters.start)} – ${formatDate(filters.end)}`;
  if (filters.start) return `Mulai ${formatDate(filters.start)}`;
  return `Sampai ${formatDate(filters.end)}`;
}

export function getActiveFilterChips({
  filters,
  categories,
  users,
  isAdmin,
}: {
  filters: TransactionFilterValues;
  categories: TransactionCategory[];
  users: TransactionUserOption[];
  isAdmin: boolean;
}): TransactionActiveFilterChip[] {
  const chips: TransactionActiveFilterChip[] = [];
  if (filters.type) chips.push({
    key: "type",
    label: filters.type === "income" ? "Pemasukan" : "Pengeluaran",
  });
  if (filters.category) {
    const category = categories.find((item) => String(item.id) === filters.category);
    chips.push({ key: "category", label: category?.name || `Kategori #${filters.category}` });
  }
  if (filters.start || filters.end) chips.push({ key: "date", label: formatDateFilterLabel(filters) });
  if (filters.min) chips.push({ key: "min", label: `≥ ${formatCurrency(filters.min)}` });
  if (filters.max) chips.push({ key: "max", label: `≤ ${formatCurrency(filters.max)}` });
  if (isAdmin && filters.user) {
    const user = users.find((item) => String(item.id) === filters.user);
    chips.push({ key: "user", label: `User: ${user?.username || `#${filters.user}`}` });
  }
  return chips;
}

export function DebouncedSearchInput({
  initialValue,
  onCommit,
  placeholder = "Cari catatan, kategori, nominal, nomor...",
  ariaLabel = "Cari transaksi",
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [lastInitialValue, setLastInitialValue] = useState(initialValue);
  const [lastCommittedValue, setLastCommittedValue] = useState(initialValue);
  const timeoutRef = useRef<number | null>(null);

  if (initialValue !== lastInitialValue) {
    setLastInitialValue(initialValue);
    if (initialValue !== lastCommittedValue) setValue(initialValue);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const commit = (nextValue: string, immediate = false) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (immediate) {
      setLastCommittedValue(nextValue.trim());
      onCommit(nextValue.trim());
      return;
    }
    timeoutRef.current = window.setTimeout(() => {
      setLastCommittedValue(nextValue.trim());
      onCommit(nextValue.trim());
    }, 400);
  };

  return (
    <div className="transaction-search-box">
      <Search size={17} aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(value, true);
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            commit("", true);
          }}
          aria-label="Hapus pencarian"
          title="Hapus pencarian"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function FilterFields({
  filters,
  categories,
  users,
  isAdmin,
  onChange,
}: {
  filters: TransactionFilterValues;
  categories: TransactionCategory[];
  users: TransactionUserOption[];
  isAdmin: boolean;
  onChange: (patch: Partial<TransactionFilterValues>) => void;
}) {
  return (
    <div className="transaction-filter-grid">
      <div className="form-group">
        <label className="form-label" htmlFor="transaction-filter-type">Jenis Transaksi</label>
        <select
          id="transaction-filter-type"
          className="form-select"
          value={filters.type}
          onChange={(event) => onChange({ type: event.target.value as TransactionFilterValues["type"] })}
        >
          <option value="">Semua</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-filter-category">Kategori</label>
        <select
          id="transaction-filter-category"
          className="form-select"
          value={filters.category}
          onChange={(event) => onChange({ category: event.target.value })}
        >
          <option value="">Semua Kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-filter-start">Tanggal Mulai</label>
        <input
          id="transaction-filter-start"
          className="form-input"
          type="date"
          value={filters.start}
          onChange={(event) => onChange({ start: event.target.value, preset: "" })}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-filter-end">Tanggal Akhir</label>
        <input
          id="transaction-filter-end"
          className="form-input"
          type="date"
          value={filters.end}
          onChange={(event) => onChange({ end: event.target.value, preset: "" })}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-filter-min">Nominal Minimum</label>
        <input
          id="transaction-filter-min"
          className="form-input"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={filters.min}
          onChange={(event) => onChange({ min: event.target.value })}
          placeholder="0"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-filter-max">Nominal Maximum</label>
        <input
          id="transaction-filter-max"
          className="form-input"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={filters.max}
          onChange={(event) => onChange({ max: event.target.value })}
          placeholder="Tanpa batas"
        />
      </div>

      {isAdmin && (
        <div className="form-group">
          <label className="form-label" htmlFor="transaction-filter-user">User Pembuat</label>
          <select
            id="transaction-filter-user"
            className="form-select"
            value={filters.user}
            onChange={(event) => onChange({ user: event.target.value })}
          >
            <option value="">Semua User</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.username}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function TransactionFilterToolbar({
  search,
  filters: initialFilters,
  categories,
  users,
  isAdmin,
  sort,
  limit,
  refreshing,
  onSearchChange,
  onApplyFilters,
  onRemoveFilter,
  onReset,
  onSortChange,
  onLimitChange,
}: TransactionFilterToolbarProps) {
  const isMobile = useMediaQuery("(max-width:768px)");
  const visibleInitialFilters = isAdmin ? initialFilters : { ...initialFilters, user: "" };
  const [filters, setFilters] = useState(visibleInitialFilters);
  const [desktopOpen, setDesktopOpen] = useState(() => Object.values(visibleInitialFilters).some(Boolean));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");

  const advancedFilterCount = [
    visibleInitialFilters.type,
    visibleInitialFilters.category,
    visibleInitialFilters.start || visibleInitialFilters.end,
    visibleInitialFilters.min,
    visibleInitialFilters.max,
    isAdmin ? visibleInitialFilters.user : "",
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(search) || advancedFilterCount > 0;

  const handlePresetSelect = (preset: DatePreset) => {
    const nextFilters = { ...filters, preset, ...getPresetRange(preset) };
    setFilters(nextFilters);
    setError("");
    onApplyFilters(nextFilters);
    if (isMobile) setMobileOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filters.start && filters.end && filters.start > filters.end) {
      setError("Tanggal mulai tidak boleh melewati tanggal akhir.");
      return;
    }
    if (filters.min && filters.max && Number(filters.min) > Number(filters.max)) {
      setError("Nominal minimum tidak boleh melebihi nominal maximum.");
      return;
    }
    setError("");
    onApplyFilters(filters);
    setMobileOpen(false);
  };

  const filterForm = (
    <form onSubmit={handleSubmit}>
      <fieldset className="transaction-date-presets">
        <legend>Preset Tanggal</legend>
        <div>
          {datePresets.map((preset) => (
            <button
              type="button"
              key={preset.value}
              className={filters.preset === preset.value ? "transaction-date-preset-active" : ""}
              onClick={() => handlePresetSelect(preset.value)}
              aria-pressed={filters.preset === preset.value}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </fieldset>
      <FilterFields
        filters={filters}
        categories={categories}
        users={users}
        isAdmin={isAdmin}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />
      {error && <p className="transaction-filter-error" role="alert">{error}</p>}
      <div className="transaction-filter-actions">
        {isMobile && hasActiveFilters && (
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            <RotateCcw size={15} /> Reset Filter
          </button>
        )}
        <button type="submit" className="btn btn-primary">Terapkan Filter</button>
      </div>
    </form>
  );

  const chips = getActiveFilterChips({
    filters: visibleInitialFilters,
    categories,
    users,
    isAdmin,
  });

  return (
    <div className="transaction-filter-toolbar">
      <div className="transaction-toolbar-row">
        <DebouncedSearchInput initialValue={search} onCommit={onSearchChange} />

        <button
          type="button"
          className={`btn ${advancedFilterCount ? "btn-primary" : "btn-secondary"} transaction-filter-toggle`}
          onClick={() => isMobile ? setMobileOpen(true) : setDesktopOpen((open) => !open)}
          aria-expanded={isMobile ? mobileOpen : desktopOpen}
          aria-controls="transaction-filter-panel"
        >
          <Filter size={16} /> Filter
          {advancedFilterCount > 0 && <span className="transaction-filter-count">{advancedFilterCount}</span>}
          {!isMobile && <ChevronDown size={15} className={desktopOpen ? "transaction-filter-chevron-open" : ""} />}
        </button>

        <label className="transaction-sort-control">
          <span className="sr-only">Urutkan transaksi</span>
          <select
            className="form-select"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as TransactionSort)}
            aria-label="Urutkan transaksi"
          >
            <option value="date_desc">Tanggal Terbaru</option>
            <option value="date_asc">Tanggal Terlama</option>
            <option value="amount_desc">Nominal Terbesar</option>
            <option value="amount_asc">Nominal Terkecil</option>
          </select>
        </label>

        <label className="transaction-limit-control">
          <span className="sr-only">Jumlah baris</span>
          <select
            className="form-select"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            aria-label="Jumlah baris per halaman"
          >
            {[10, 25, 50, 100].map((value) => <option key={value} value={value}>{value} baris</option>)}
          </select>
        </label>

        {refreshing && <span className="transaction-refreshing" role="status">Memperbarui...</span>}

        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary transaction-reset-button" onClick={onReset}>
            <RotateCcw size={15} /> Reset Filter
          </button>
        )}
      </div>

      {!isMobile && desktopOpen && (
        <div id="transaction-filter-panel" className="transaction-filter-panel card">
          {filterForm}
        </div>
      )}

      {chips.length > 0 && (
        <div className="transaction-filter-chips" aria-label="Filter aktif">
          {chips.map((chip) => (
            <span className="transaction-filter-chip" key={chip.key}>
              {chip.label}
              <button
                type="button"
                onClick={() => onRemoveFilter(chip.key)}
                aria-label={`Hapus filter ${chip.label}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {isMobile && (
        <Modal
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          title="Filter Transaksi"
          size="lg"
        >
          <div id="transaction-filter-panel">{filterForm}</div>
        </Modal>
      )}
    </div>
  );
}
