"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Pencil, SearchX, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import AttachmentPreview from "@/components/attachment/attachment-preview";
import TransactionModal from "@/components/transaction/transaction-modal";
import { useTransactionModal } from "@/components/transaction/transaction-modal-provider";
import TransactionFilterToolbar, {
  getActiveFilterChips,
  type TransactionFilterKey,
  type TransactionFilterValues,
  type TransactionSort,
  type TransactionUserOption,
} from "@/components/transaction/transaction-filter-toolbar";
import type {
  TransactionCategory,
  TransactionRecord,
} from "@/components/transaction/types";
import { useMediaQuery } from "@/components/use-media-query";

interface TransactionsResponse {
  transactions?: TransactionRecord[];
  total?: number;
  totalPages?: number;
  error?: string;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatRupiahShort(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatTransactionDate(value: string, isMobile: boolean) {
  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!dateOnly) return "-";
  return new Date(`${dateOnly}T00:00:00.000Z`).toLocaleDateString(
    "id-ID",
    isMobile
      ? { day: "2-digit", month: "2-digit", timeZone: "UTC" }
      : { timeZone: "UTC" },
  );
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveIntegerString(value: string | null) {
  if (!value || !/^\d+$/.test(value) || Number(value) < 1) return "";
  return value;
}

function amountString(value: string | null) {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return "";
  if (Number(value) > 999999999999.99) return "";
  return value;
}

function dateString(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) return "";
  return value;
}

function TransactionPageContent() {
  const { showToast } = useToast();
  const { openTransaction, transactionRevision, notifyTransactionChanged } = useTransactionModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const isMobile = useMediaQuery("(max-width:768px)");

  const urlState = useMemo(() => {
    const params = new URLSearchParams(queryString);
    const rawType = params.get("type");
    const rawPreset = params.get("preset");
    const rawSort = params.get("sort");
    const limitValue = positiveInteger(params.get("limit"), 25);

    return {
      search: (params.get("q") || "").slice(0, 100),
      filters: {
        type: rawType === "income" || rawType === "expense" ? rawType : "",
        category: positiveIntegerString(params.get("category")),
        preset: ["today", "this_week", "this_month", "last_month", "this_year"].includes(rawPreset || "")
          ? rawPreset as TransactionFilterValues["preset"]
          : "",
        start: dateString(params.get("start")),
        end: dateString(params.get("end")),
        min: amountString(params.get("min")),
        max: amountString(params.get("max")),
        user: positiveIntegerString(params.get("user")),
      } satisfies TransactionFilterValues,
      page: positiveInteger(params.get("page"), 1),
      limit: [10, 25, 50, 100].includes(limitValue) ? limitValue : 25,
      sort: ["date_desc", "date_asc", "amount_desc", "amount_asc"].includes(rawSort || "")
        ? rawSort as TransactionSort
        : "date_desc" as TransactionSort,
    };
  }, [queryString]);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [users, setUsers] = useState<TransactionUserOption[]>([]);
  const [role, setRole] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransactionRecord | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<TransactionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const isAdmin = role.toLowerCase() === "admin";

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/categories", { signal: controller.signal }).then((response) => response.json()),
      fetch("/api/me", { signal: controller.signal }).then((response) => response.json()),
    ])
      .then(async ([categoryData, userData]) => {
        setCategories(categoryData.categories || []);
        setRole(userData.role || "");

        if (String(userData.role).toLowerCase() === "admin") {
          const response = await fetch("/api/users", { signal: controller.signal });
          const data = await response.json();
          setUsers(data.users || []);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        showToast("error", "Gagal memuat pilihan filter");
      });

    return () => controller.abort();
  }, [showToast]);

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(urlState.page),
      limit: String(urlState.limit),
    });
    if (urlState.search) params.set("search", urlState.search);
    if (urlState.filters.type) params.set("filter_type", urlState.filters.type);
    if (urlState.filters.category) params.set("filter_category", urlState.filters.category);
    if (urlState.filters.start) params.set("date_from", urlState.filters.start);
    if (urlState.filters.end) params.set("date_to", urlState.filters.end);
    if (urlState.filters.min) params.set("amount_min", urlState.filters.min);
    if (urlState.filters.max) params.set("amount_max", urlState.filters.max);
    if (isAdmin && urlState.filters.user) params.set("filter_user", urlState.filters.user);
    if (urlState.sort !== "date_desc") params.set("sort", urlState.sort);
    return params.toString();
  }, [isAdmin, urlState]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadTransactions = async () => {
      await Promise.resolve();
      if (active) setRefreshing(true);

      try {
        const response = await fetch(`/api/transactions?${apiQuery}`, { signal: controller.signal });
        const data = await response.json() as TransactionsResponse;
        if (!response.ok) throw new Error(data.error || "Gagal memuat transaksi");
        if (!active) return;
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setHasLoaded(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (active) showToast("error", error instanceof Error ? error.message : "Gagal memuat transaksi");
      } finally {
        if (active) setRefreshing(false);
      }
    };

    void loadTransactions();
    return () => {
      active = false;
      controller.abort();
    };
  }, [apiQuery, showToast, transactionRevision]);

  const replaceQuery = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, queryString, router]);

  const applyFilters = (filters: TransactionFilterValues) => {
    replaceQuery({
      type: filters.type || null,
      category: filters.category || null,
      preset: filters.preset || null,
      start: filters.start || null,
      end: filters.end || null,
      min: filters.min || null,
      max: filters.max || null,
      user: isAdmin ? filters.user || null : null,
      page: null,
    });
  };

  const removeFilter = (key: TransactionFilterKey) => {
    const updates: Record<string, string | null> = { page: null };
    if (key === "date") {
      updates.preset = null;
      updates.start = null;
      updates.end = null;
    } else updates[key] = null;
    replaceQuery(updates);
  };

  const resetFilters = () => {
    replaceQuery({
      q: null,
      type: null,
      category: null,
      preset: null,
      start: null,
      end: null,
      min: null,
      max: null,
      user: null,
      page: null,
    });
  };

  const handleDelete = async () => {
    if (!deleteTransaction) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/transactions/${deleteTransaction.id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        showToast("success", "Transaksi berhasil dihapus");
        setShowDelete(false);
        setDeleteTransaction(null);
        notifyTransactionChanged();
      } else {
        showToast("error", data.error || "Gagal menghapus");
      }
    } catch {
      showToast("error", "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const hasActiveQuery = Boolean(urlState.search || Object.values(urlState.filters).some(Boolean));
  const visibleFilters = isAdmin ? urlState.filters : { ...urlState.filters, user: "" };
  const activeFilterChips = getActiveFilterChips({
    filters: visibleFilters,
    categories,
    users,
    isAdmin,
  });
  const resultSummary = total > transactions.length
    ? `Menampilkan ${transactions.length} dari ${total} transaksi`
    : `${total} transaksi ditemukan`;
  const toolbarKey = [
    ...Object.values(urlState.filters),
    isAdmin ? "admin" : "staff",
  ].join("|");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Daftar Transaksi</h1>
      </div>

      <TransactionFilterToolbar
        key={toolbarKey}
        search={urlState.search}
        filters={urlState.filters}
        categories={categories}
        users={users}
        isAdmin={isAdmin}
        sort={urlState.sort}
        limit={urlState.limit}
        refreshing={refreshing && hasLoaded}
        onSearchChange={(value) => replaceQuery({ q: value || null, page: null })}
        onApplyFilters={applyFilters}
        onRemoveFilter={removeFilter}
        onReset={resetFilters}
        onSortChange={(sort) => replaceQuery({ sort: sort === "date_desc" ? null : sort, page: null })}
        onLimitChange={(limit) => replaceQuery({ limit: limit === 25 ? null : String(limit), page: null })}
      />

      <div className="card" aria-busy={refreshing}>
        {hasLoaded && <div className="transaction-result-summary">{resultSummary}</div>}
        <div className={`table-wrap ${refreshing && hasLoaded ? "transaction-table-refreshing" : ""}`}>
          <table>
            <thead>
              <tr>
                <th style={{ width: isMobile ? 55 : 85, padding: isMobile ? "6px 4px" : undefined }}>Tanggal</th>
                {!isMobile && <th style={{ width: 60 }}>Jenis</th>}
                <th style={{ padding: isMobile ? "6px 4px" : undefined }}>Kategori</th>
                <th style={{ textAlign: "right", width: isMobile ? 60 : 100, padding: isMobile ? "6px 4px" : undefined }}>Jumlah</th>
                <th style={{ padding: isMobile ? "6px 4px" : undefined }}>Catatan</th>
                {!isMobile && <th>Admin Notes</th>}
                {!isMobile && <th style={{ width: 50 }}>Bukti</th>}
                <th style={{ width: isMobile ? 108 : 116, padding: isMobile ? "6px 4px" : undefined }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!hasLoaded ? (
                <tr><td colSpan={isMobile ? 5 : 8} style={{ textAlign: "center", padding: 32 }}>Memuat...</td></tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={isMobile ? 5 : 8}>
                    <div className="transaction-empty-filter">
                      <SearchX size={42} />
                      <strong>{hasActiveQuery ? "Tidak ada transaksi yang sesuai dengan filter." : "Belum ada transaksi."}</strong>
                      {hasActiveQuery && (
                        <div className="transaction-empty-active-filters" aria-label="Filter aktif yang tidak menghasilkan transaksi">
                          <span>Filter aktif:</span>
                          {urlState.search && <span className="transaction-filter-chip">Pencarian: {urlState.search}</span>}
                          {activeFilterChips.map((chip) => (
                            <span className="transaction-filter-chip" key={chip.key}>{chip.label}</span>
                          ))}
                        </div>
                      )}
                      {hasActiveQuery && (
                        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td style={{ whiteSpace: "nowrap", padding: isMobile ? "6px 4px" : undefined }}>
                    {formatTransactionDate(transaction.transaction_date, isMobile)}
                  </td>
                  {!isMobile && (
                    <td><span className={`badge ${transaction.type === "income" ? "badge-income" : "badge-expense"}`}>{transaction.type === "income" ? "Masuk" : "Keluar"}</span></td>
                  )}
                  <td style={{ padding: isMobile ? "6px 4px" : undefined }}>
                    {isMobile && <span className={`badge-dot ${transaction.type === "income" ? "badge-dot-income" : "badge-dot-expense"}`} />}
                    {transaction.category_name}
                  </td>
                  <td className={`text-amount ${transaction.type === "income" ? "text-income" : "text-expense"}`} style={{ textAlign: "right", padding: isMobile ? "6px 4px" : undefined }}>
                    {isMobile ? formatRupiahShort(transaction.amount) : formatRupiah(transaction.amount)}
                  </td>
                  <td style={{ color: "var(--text-secondary)", padding: isMobile ? "6px 4px" : undefined }}>{transaction.note || "-"}</td>
                  {!isMobile && <td style={{ color: "var(--text-muted)" }}>{transaction.admin_notes || "-"}</td>}
                  {!isMobile && (
                    <td style={{ textAlign: "center" }}>
                      {transaction.attachment ? (
                        <AttachmentPreview
                          mode="existing"
                          url={`/api/files/private/bukti/${encodeURIComponent(transaction.attachment)}`}
                          fileName={transaction.attachment}
                          compact
                        />
                      ) : <span className="text-muted">-</span>}
                    </td>
                  )}
                  <td style={{ whiteSpace: "nowrap", padding: isMobile ? "6px 2px" : undefined }}>
                    <div className="transaction-row-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary btn-icon"
                      onClick={() => openTransaction({ mode: "duplicate", transaction })}
                      title="Duplicate Transaction"
                      aria-label={`Duplicate Transaction #${transaction.id}`}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary btn-icon"
                      onClick={() => {
                        setEditTransaction(transaction);
                        setShowEdit(true);
                      }}
                      title="Edit"
                      aria-label={`Edit transaksi #${transaction.id}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger btn-icon"
                      onClick={() => {
                        setDeleteTransaction(transaction);
                        setShowDelete(true);
                      }}
                      title="Hapus"
                      aria-label={`Hapus transaksi #${transaction.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button type="button" className="page-btn" disabled={urlState.page <= 1} onClick={() => replaceQuery({ page: String(urlState.page - 1) })}>«</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, index) => {
              const startPage = Math.max(1, Math.min(urlState.page - 3, totalPages - 6));
              const pageNumber = startPage + index;
              if (pageNumber > totalPages) return null;
              return (
                <button
                  type="button"
                  key={pageNumber}
                  className={`page-btn ${pageNumber === urlState.page ? "page-btn-active" : ""}`}
                  onClick={() => replaceQuery({ page: pageNumber === 1 ? null : String(pageNumber) })}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button type="button" className="page-btn" disabled={urlState.page >= totalPages} onClick={() => replaceQuery({ page: String(urlState.page + 1) })}>»</button>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={showEdit}
        mode="edit"
        onClose={() => {
          setShowEdit(false);
          setEditTransaction(null);
        }}
        onSaved={notifyTransactionChanged}
        transaction={editTransaction}
      />

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Konfirmasi Hapus"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowDelete(false)}>Batal</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? "Menghapus..." : "Hapus"}</button>
          </>
        )}
      >
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <Trash2 size={48} color="var(--danger)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>Yakin ingin menghapus transaksi ini?</p>
          <p className="text-muted">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      </Modal>

    </div>
  );
}

export default function TransaksiPage() {
  return (
    <Suspense fallback={<div className="empty-state"><p>Memuat transaksi...</p></div>}>
      <TransactionPageContent />
    </Suspense>
  );
}
