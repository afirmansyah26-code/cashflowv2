"use client";
import { useEffect, useState, useCallback } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
import { Filter, RotateCcw, Printer, TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { useTransactionModal } from "@/components/transaction/transaction-modal-provider";
import { useMediaQuery } from "@/components/use-media-query";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const DEFAULT_TODAY = new Date().toISOString().split("T")[0];
const DEFAULT_THIRTY_DAYS_AGO = new Date(new Date().getTime() - 30 * 86400000).toISOString().split("T")[0];

interface BalanceData { date: string; daily_income: number; daily_expense: number; cumulative_balance: number; }
interface Summary { saldoAwal: number; totalIncome: number; totalExpense: number; saldoAkhir: number; dateFrom: string; dateTo: string; }
interface PrintHeader { id: number; name: string; institution_name: string; subtitle: string | null; address: string | null; phone: string | null; bank_info: string | null; notary_info: string | null; logo: string | null; signer_name: string | null; signer_title: string | null; signer_city: string | null; is_default: boolean; }

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
function formatShort(n: number) { if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M"; if (n >= 1000) return Math.round(n / 1000) + "K"; return String(n); }

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function SaldoHistorisPage() {
  const { transactionRevision } = useTransactionModal();
  const [data, setData] = useState<BalanceData[]>([]);
  const [summary, setSummary] = useState<Summary>({ saldoAwal: 0, totalIncome: 0, totalExpense: 0, saldoAkhir: 0, dateFrom: "", dateTo: "" });
  const [loading, setLoading] = useState(true);
  const [kopSurat, setKopSurat] = useState<PrintHeader | null>(null);
  const isMobile = useMediaQuery("(max-width:768px)");

  // Default: last 30 days
  const today = DEFAULT_TODAY;
  const thirtyDaysAgo = DEFAULT_THIRTY_DAYS_AGO;
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    fetch("/api/kop-surat").then(r => r.json()).then(d => {
      const def = (d.headers || []).find((h: PrintHeader) => h.is_default);
      if (def) setKopSurat(def);
      else if (d.headers?.length) setKopSurat(d.headers[0]);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    fetch(`/api/historical-balance?${params}`)
      .then(r => r.json())
      .then(d => {
        setData(d.data || []);
        setSummary(d.summary || { saldoAwal: 0, totalIncome: 0, totalExpense: 0, saldoAkhir: 0, dateFrom: "", dateTo: "" });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData, transactionRevision]);

  const handleReset = () => {
    setDateFrom(thirtyDaysAgo);
    setDateTo(today);
  };

  const getPeriodLabel = () => {
    if (dateFrom && dateTo) return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
    return "Semua Periode";
  };

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [{
      label: "Saldo Berjalan",
      data: data.map(d => d.cumulative_balance),
      borderColor: "#6366f1",
      backgroundColor: "rgba(99,102,241,.1)",
      fill: true,
      tension: .4,
      pointRadius: 2,
    }],
  };

  return (
    <div>
      {/* ===== NO-PRINT: Header & Filters ===== */}
      <div className="no-print">
        <div className="page-header">
          <h1 className="page-title">Saldo Historis (Rekap Per Hari)</h1>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto auto auto 1fr auto", gap: isMobile ? 8 : 16, alignItems: "flex-end" }}>
            <div style={isMobile ? { gridColumn: "1 / -1" } : undefined}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>Tanggal Mulai</label>
              <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={isMobile ? { gridColumn: "1 / -1" } : undefined}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>Tanggal Akhir</label>
              <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Filter size={14} /> Filter
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleReset} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <RotateCcw size={14} /> Reset
              </button>
            </div>
            <div style={isMobile ? undefined : { marginLeft: "auto" }}>
              <button className="btn btn-sm" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--info)", color: "#fff" }}>
                <Printer size={14} /> Cetak
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="card-grid" style={{ marginBottom: 20 }}>
          <div className="card stat-card" style={{ borderLeft: "4px solid var(--info)" }}>
            <div className="stat-label"><DollarSign size={14} style={{ display: "inline", marginRight: 4 }} />Saldo Awal</div>
            <div className="stat-value" style={{ color: "var(--info)" }}>{formatRupiah(summary.saldoAwal)}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Per {formatDate(summary.dateFrom)}</div>
          </div>
          <div className="card stat-card stat-card-income">
            <div className="stat-label"><TrendingUp size={14} style={{ display: "inline", marginRight: 4 }} />Total Pemasukan</div>
            <div className="stat-value stat-value-income">{formatRupiah(summary.totalIncome)}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Periode ini</div>
          </div>
          <div className="card stat-card stat-card-expense">
            <div className="stat-label"><TrendingDown size={14} style={{ display: "inline", marginRight: 4 }} />Total Pengeluaran</div>
            <div className="stat-value stat-value-expense">{formatRupiah(summary.totalExpense)}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Periode ini</div>
          </div>
          <div className="card stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
            <div className="stat-label"><Wallet size={14} style={{ display: "inline", marginRight: 4 }} />Saldo Akhir</div>
            <div className="stat-value" style={{ color: "var(--success)" }}>{formatRupiah(summary.saldoAkhir)}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Per {formatDate(summary.dateTo)}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Memuat data...</p></div>
      ) : (
        <>
          {/* NO-PRINT: Chart */}
          <div className="card no-print" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Grafik Saldo Berjalan</h3>
            <div className="chart-container" style={{ height: 350 }}>
              <Line data={chartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 12 } } },
                scales: {
                  y: { ticks: { callback: v => "Rp " + Number(v).toLocaleString("id-ID") } },
                  x: { ticks: { maxRotation: 45, font: { size: 10 } } },
                },
              }} />
            </div>
          </div>

          {/* ===== PRINT CONTENT ===== */}
          <div className="print-content">
            {/* Kop Surat */}
            <div className="print-kop">
              <div className="print-kop-inner">
                {kopSurat?.logo && (
                  <img src={`/uploads/${kopSurat.logo}`} alt="Logo" className="print-kop-logo" />
                )}
                <div className="print-kop-text">
                  <h1 className="print-kop-name">{kopSurat?.institution_name || "Organisasi"}</h1>
                  {kopSurat?.subtitle && <p className="print-kop-subtitle">{kopSurat.subtitle}</p>}
                  {kopSurat?.address && <p className="print-kop-address">{kopSurat.address}</p>}
                  {kopSurat?.phone && <p className="print-kop-phone">{kopSurat.phone}</p>}
                  {kopSurat?.bank_info && <p className="print-kop-phone">{kopSurat.bank_info}</p>}
                </div>
              </div>
              <div className="print-kop-line" />
              {kopSurat?.notary_info && <p className="print-kop-notary">{kopSurat.notary_info}</p>}
              <div className="print-kop-line2" />
              <h2 className="print-kop-title">Laporan Saldo Historis {getPeriodLabel()}</h2>
            </div>

            {/* Table */}
            <div className="card print-table-card">
              <h3 className="no-print" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Detail Harian</h3>
              
              {/* Screen table — responsive */}
              <table className="w-full border-collapse no-print">
                <thead>
                  <tr>
                    <th className="print-th">Tanggal</th>
                    <th className="print-th" style={{ textAlign: "right" }}>{isMobile?"Masuk":"Pemasukan"}</th>
                    <th className="print-th" style={{ textAlign: "right" }}>{isMobile?"Keluar":"Pengeluaran"}</th>
                    <th className="print-th" style={{ textAlign: "right" }}>{isMobile?"Saldo":"Saldo Kumulatif"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan={4} className="text-muted" style={{ textAlign: "center", padding: 24 }}>Tidak ada data pada periode ini</td></tr>
                  ) : data.map((d, i) => (
                    <tr key={i}>
                      <td className="print-td">{isMobile?new Date(d.date).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"}):formatDate(d.date)}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600 }}>{isMobile?formatShort(d.daily_income):formatRupiah(d.daily_income)}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600 }}>{isMobile?formatShort(d.daily_expense):formatRupiah(d.daily_expense)}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600 }}>{isMobile?formatShort(d.cumulative_balance):formatRupiah(d.cumulative_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Print table — always full desktop format */}
              <table className="w-full border-collapse print-only-table" style={{ fontSize: "11pt" }}>
                <thead>
                  <tr>
                    <th className="print-th">Tanggal</th>
                    <th className="print-th" style={{ textAlign: "right" }}>Pemasukan</th>
                    <th className="print-th" style={{ textAlign: "right" }}>Pengeluaran</th>
                    <th className="print-th" style={{ textAlign: "right" }}>Saldo Kumulatif</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan={4} className="text-muted" style={{ textAlign: "center", padding: 24 }}>Tidak ada data pada periode ini</td></tr>
                  ) : data.map((d, i) => (
                    <tr key={i}>
                      <td className="print-td">{formatDate(d.date)}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600 }}>{formatRupiah(d.daily_income)}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600 }}>{formatRupiah(d.daily_expense)}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600 }}>{formatRupiah(d.cumulative_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Print-only: signer footer */}
              <div className="print-signer">
                {kopSurat?.signer_name && (
                  <div style={{ textAlign: "right", marginTop: 30, fontSize: 11 }}>
                    <div style={{ display: "inline-block", textAlign: "center" }}>
                      <div>{kopSurat.signer_city || "________"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                      <div style={{ marginTop: 4, marginBottom: 60 }}>{kopSurat.signer_title || "Hormat kami,"}</div>
                      <div style={{ fontWeight: 700, textDecoration: "underline" }}>{kopSurat.signer_name}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Print styles — same pattern as laporan */}
      <style jsx global>{`
        .print-kop { display: none; }
        .print-signer { display: none; }
        .print-th {
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          border-bottom: 2px solid var(--border-color);
          white-space: nowrap;
        }
        .print-td {
          padding: 6px 10px;
          border-bottom: 1px solid var(--border-light);
          vertical-align: middle;
        }

        .print-only-table { display: none; }

        @media print {
          .no-print { display: none !important; }
          .print-only-table { display: table !important; }
          .sidebar, .topbar, header.fixed, nav.fixed, aside.fixed { display: none !important; }
          .main-area { margin-left: 0 !important; margin-top: 0 !important; }
          .main-content { padding: 0 !important; }
          body {
            background: #fff !important;
            color: #000 !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }
          * { overflow: visible !important; }
          ::-webkit-scrollbar { display: none !important; width: 0 !important; }

          .print-kop { display: block !important; margin-bottom: 8px; }
          .print-kop-inner { display: flex; align-items: center; gap: 12px; margin-bottom: 0; }
          .print-kop-logo { width: 70px; height: 70px; object-fit: contain; flex-shrink: 0; }
          .print-kop-text { flex: 1; text-align: center; }
          .print-kop-name { font-size: 18px; font-weight: 700; color: #000; margin: 0; line-height: 1.3; }
          .print-kop-subtitle { font-size: 9px; font-weight: 700; color: #000; margin: 1px 0 0 0; line-height: 1.5; white-space: pre-line; }
          .print-kop-address { font-size: 9px; font-weight: 700; color: #000; margin: 1px 0 0 0; }
          .print-kop-phone { font-size: 9px; color: #000; margin: 1px 0 0 0; }
          .print-kop-line { border-top: 3px double #333; margin: 4px 0 0 0; }
          .print-kop-notary { font-size: 8px; text-align: center; margin: 2px 0 0 0; color: #000; }
          .print-kop-line2 { border-top: 1px solid #333; margin: 2px 0 12px 0; }
          .print-kop-title { text-align: center; font-size: 13px; font-weight: 700; margin: 0 0 10px 0; color: #000; text-decoration: underline; }

          .print-table-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .print-content table { table-layout: auto !important; border-collapse: collapse; font-size: 11pt; width: 100%; }
          .print-th {
            background: transparent !important;
            color: #000 !important;
            font-size: 11px !important;
            text-transform: none !important;
            letter-spacing: 0 !important;
            padding: 5px 8px !important;
            border: 1px solid #999 !important;
            font-weight: 700 !important;
            white-space: nowrap;
          }
          .print-td {
            padding: 4px 8px !important;
            border: 1px solid #bbb !important;
            font-size: 11px;
            color: #000;
          }

          .card { box-shadow: none !important; border: none !important; padding: 0 !important; }

          .print-signer { display: block !important; page-break-inside: avoid; }

          @page { margin: 10mm 10mm 8mm 10mm; size: A4 portrait; }
        }
      `}</style>
    </div>
  );
}
