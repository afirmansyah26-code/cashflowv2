"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, RefreshCcw, Trash2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useMediaQuery } from "@/components/use-media-query";
import RecycleBinFilterToolbar, {
  type RecycleBinFilterKey,
  type RecycleBinFilters,
} from "@/components/transaction/recycle-bin-filter-toolbar";
import { useTransactionModal } from "@/components/transaction/transaction-modal-provider";
import type { TransactionCategory } from "@/components/transaction/types";

interface RecycleBinTransaction {
  id: number;
  category_name: string;
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  note: string | null;
  username: string;
  deleted_at: string;
  deleted_by: string;
}

interface RecycleBinResponse {
  transactions?: RecycleBinTransaction[];
  total?: number;
  totalPages?: number;
  error?: string;
}

const emptyFilters: RecycleBinFilters = {
  type: "",
  category: "",
  start: "",
  end: "",
};

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatRupiahShort(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatTransactionDate(value: string, compact = false) {
  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!dateOnly) return "-";
  return new Date(`${dateOnly}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    ...(compact ? { day: "2-digit", month: "2-digit" } : {}),
    timeZone: "UTC",
  });
}

function formatDeletedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecycleBinPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { transactionRevision, notifyTransactionChanged } = useTransactionModal();
  const isMobile = useMediaQuery("(max-width:768px)");
  const [transactions, setTransactions] = useState<RecycleBinTransaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<RecycleBinFilters>(emptyFilters);
  const [authChecking, setAuthChecking] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [targetTransaction, setTargetTransaction] = useState<RecycleBinTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (filters.type) params.set("filter_type", filters.type);
    if (filters.category) params.set("filter_category", filters.category);
    if (filters.start) params.set("date_from", filters.start);
    if (filters.end) params.set("date_to", filters.end);
    return params.toString();
  }, [filters, limit, page, search]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/me", { signal: controller.signal }).then((response) => response.json()),
      fetch("/api/categories", { signal: controller.signal }).then((response) => response.json()),
    ])
      .then(([authData, categoryData]) => {
        if (!authData.role) {
          router.push("/");
          return;
        }
        setCategories(categoryData.categories || []);
        setAuthChecking(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        router.push("/");
      });
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;
    const controller = new AbortController();
    let active = true;

    const loadData = async () => {
      await Promise.resolve();
      if (active) setRefreshing(true);
      try {
        const response = await fetch(`/api/transactions/trash?${apiQuery}`, {
          signal: controller.signal,
        });
        const data = await response.json() as RecycleBinResponse;
        if (!response.ok) throw new Error(data.error || "Gagal memuat data Recycle Bin");
        if (!active) return;
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setHasLoaded(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (active) {
          showToast("error", error instanceof Error ? error.message : "Gagal memuat data Recycle Bin");
        }
      } finally {
        if (active) setRefreshing(false);
      }
    };

    void loadData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [apiQuery, authChecking, showToast, transactionRevision]);

  const handleRestore = async () => {
    if (!targetTransaction) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/transactions/${targetTransaction.id}/restore`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Gagal memulihkan transaksi");
      showToast("success", "Transaksi berhasil dipulihkan.");
      setTargetTransaction(null);
      notifyTransactionChanged();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Gagal memulihkan transaksi");
    } finally {
      setSaving(false);
    }
  };

  const removeFilter = (key: RecycleBinFilterKey) => {
    setPage(1);
    setFilters((current) => key === "date"
      ? { ...current, start: "", end: "" }
      : { ...current, [key]: "" });
  };

  const resetFilters = () => {
    setSearch("");
    setFilters(emptyFilters);
    setPage(1);
  };

  const hasActiveQuery = Boolean(search || Object.values(filters).some(Boolean));

  if (authChecking) {
    return <div className="page-loading-state">Memuat...</div>;
  }

  return (
    <div>
      <div className="page-header recycle-bin-page-header">
        <div>
          <h1 className="page-title">
            <Trash2 size={24} aria-hidden="true" /> Recycle Bin
          </h1>
          <p className="text-muted">Transaksi yang dihapus dapat dipulihkan kembali.</p>
        </div>
        <select
          className="form-select recycle-bin-limit"
          value={limit}
          onChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(1);
          }}
          aria-label="Jumlah baris per halaman"
        >
          {[10, 25, 50, 100].map((value) => (
            <option key={value} value={value}>{value} baris</option>
          ))}
        </select>
      </div>

      <RecycleBinFilterToolbar
        search={search}
        filters={filters}
        categories={categories}
        refreshing={refreshing}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onRemove={removeFilter}
        onReset={resetFilters}
      />

      <div className={`card recycle-bin-card ${refreshing && hasLoaded ? "transaction-table-refreshing" : ""}`}>
        <p className="transaction-result-summary">
          {total > transactions.length
            ? `Menampilkan ${transactions.length} dari ${total} transaksi`
            : `${total} transaksi di Recycle Bin`}
        </p>

        {!hasLoaded && refreshing ? (
          <div className="page-loading-state">Memuat...</div>
        ) : transactions.length === 0 ? (
          <div className="transaction-empty-filter">
            <ArchiveRestore size={48} aria-hidden="true" />
            <strong>Recycle Bin kosong.</strong>
            {hasActiveQuery && (
              <>
                <span>Tidak ada transaksi yang sesuai dengan pencarian atau filter.</span>
                <button type="button" className="btn btn-secondary" onClick={resetFilters}>Reset Filter</button>
              </>
            )}
          </div>
        ) : isMobile ? (
          <div className="recycle-bin-mobile-list">
            {transactions.map((transaction) => (
              <article className="recycle-bin-mobile-item" key={transaction.id}>
                <div className="recycle-bin-mobile-main">
                  <div>
                    <strong>{transaction.category_name}</strong>
                    <span>{formatTransactionDate(transaction.transaction_date, true)}</span>
                  </div>
                  <strong className={transaction.type === "income" ? "text-income" : "text-expense"}>
                    {formatRupiahShort(transaction.amount)}
                  </strong>
                </div>
                <div className="recycle-bin-mobile-meta">
                  <span className={`badge ${transaction.type === "income" ? "badge-income" : "badge-expense"}`}>
                    {transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}
                  </span>
                  <span>Dihapus {formatDeletedAt(transaction.deleted_at)}</span>
                  <span>Oleh {transaction.deleted_by}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={() => setTargetTransaction(transaction)}
                  aria-label={`Pulihkan transaksi ${transaction.category_name}`}
                >
                  <RefreshCcw size={14} /> Pulihkan
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tanggal Transaksi</th>
                  <th>Jenis</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: "right" }}>Nominal</th>
                  <th>Tanggal Dihapus</th>
                  <th>Dihapus Oleh</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatTransactionDate(transaction.transaction_date)}</td>
                    <td>
                      <span className={`badge ${transaction.type === "income" ? "badge-income" : "badge-expense"}`}>
                        {transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </td>
                    <td>
                      <strong>{transaction.category_name}</strong>
                      {transaction.note && <div className="text-muted recycle-bin-note">{transaction.note}</div>}
                    </td>
                    <td
                      className={`text-amount ${transaction.type === "income" ? "text-income" : "text-expense"}`}
                      style={{ textAlign: "right" }}
                    >
                      {formatRupiah(transaction.amount)}
                    </td>
                    <td>{formatDeletedAt(transaction.deleted_at)}</td>
                    <td>
                      <strong>{transaction.deleted_by}</strong>
                      <div className="text-muted recycle-bin-note">Pemilik: {transaction.username}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => setTargetTransaction(transaction)}
                        title="Pulihkan transaksi"
                        aria-label={`Pulihkan transaksi ${transaction.category_name}`}
                      >
                        <RefreshCcw size={14} /> Pulihkan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Halaman sebelumnya"
            >
              «
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, index) => {
              const start = Math.max(1, Math.min(page - 3, totalPages - 6));
              const pageNumber = start + index;
              if (pageNumber > totalPages) return null;
              return (
                <button
                  type="button"
                  key={pageNumber}
                  className={`page-btn ${pageNumber === page ? "page-btn-active" : ""}`}
                  onClick={() => setPage(pageNumber)}
                  aria-label={`Buka halaman ${pageNumber}`}
                  aria-current={pageNumber === page ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              type="button"
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Halaman berikutnya"
            >
              »
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(targetTransaction)}
        onClose={() => setTargetTransaction(null)}
        title="Konfirmasi Pulihkan"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setTargetTransaction(null)}>
              Batal
            </button>
            <button type="button" className="btn btn-success" onClick={handleRestore} disabled={saving}>
              {saving ? "Memproses..." : "Pulihkan"}
            </button>
          </>
        )}
      >
        <div className="recycle-bin-restore-confirm">
          <RefreshCcw size={48} aria-hidden="true" />
          <strong>Pulihkan transaksi ini?</strong>
          <p className="text-muted">Transaksi akan kembali ke daftar utama.</p>
        </div>
      </Modal>
    </div>
  );
}
