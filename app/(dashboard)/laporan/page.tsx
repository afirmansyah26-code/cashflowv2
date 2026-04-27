"use client";
import { useEffect, useState } from "react";
import { Printer, Filter } from "lucide-react";

interface ReportTx { id: number; type: string; amount: number; transaction_date: string; category_name: string; note: string | null; }
interface PrintHeader { id: number; name: string; institution_name: string; subtitle: string | null; address: string | null; phone: string | null; bank_info: string | null; notary_info: string | null; logo: string | null; signer_name: string | null; signer_title: string | null; signer_city: string | null; is_default: boolean; }
interface ReportData {
  transactions: ReportTx[];
  summary: { incomeTotal: number; expenseTotal: number; balance: number; count: number };
  categoryBreakdown: { name: string; income: number; expense: number }[];
}

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function formatShort(n: number) { if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M"; if (n >= 1000) return Math.round(n / 1000) + "K"; return String(n); }

export default function LaporanPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(false);
  const [kopSurat, setKopSurat] = useState<PrintHeader | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width:768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetch("/api/kop-surat").then(r => r.json()).then(d => {
      const def = (d.headers || []).find((h: PrintHeader) => h.is_default);
      if (def) setKopSurat(def);
      else if (d.headers?.length) setKopSurat(d.headers[0]);
    }).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ year });
    if (month) p.set("month", month);
    if (filterType) p.set("filter_type", filterType);
    fetch(`/api/reports?${p}`).then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year, filterType]);

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const getPeriodLabel = () => {
    if (!month && !year) return "Semua Periode";
    if (!month && year) return `Tahun ${year}`;
    if (month && year) return `${months[parseInt(month) - 1]} ${year}`;
    return "Semua Periode";
  };

  return (
    <div>
      {/* ===== NO-PRINT: Filter Panel ===== */}
      <div className="no-print">
        <div className="page-header">
          <h1 className="page-title">Laporan Keuangan</h1>
        </div>

        <div className="card" style={{ marginBottom: 16, padding: isMobile ? 12 : 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto auto auto 1fr auto", gap: isMobile ? 8 : 12, alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>Bulan</label>
              <select className="form-select" style={{ width: "100%" }} value={month} onChange={e => setMonth(e.target.value)}>
                <option value="">Semua</option>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>Tahun</label>
              <select className="form-select" style={{ width: "100%" }} value={year} onChange={e => setYear(e.target.value)}>
                <option value="">Semua</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>Jenis</label>
              <select className="form-select" style={{ width: "100%" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Semua</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "transparent" }}>&nbsp;</label>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", height: 36 }}>
                <Printer size={14} /> Cetak
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="card" style={{ padding: 48, textAlign: "center" }}>Memuat...</div> : !data ? null : (
        <>
          {/* NO-PRINT: Summary Cards */}
          <div className="card-grid no-print" style={{ marginBottom: 16 }}>
            <div className="card stat-card stat-card-income"><div className="stat-label">Pemasukan</div><div className="stat-value stat-value-income">{formatRp(data.summary.incomeTotal)}</div></div>
            <div className="card stat-card stat-card-expense"><div className="stat-label">Pengeluaran</div><div className="stat-value stat-value-expense">{formatRp(data.summary.expenseTotal)}</div></div>
            <div className="card stat-card stat-card-balance"><div className="stat-label">Selisih</div><div className="stat-value stat-value-balance">{formatRp(data.summary.balance)}</div></div>
          </div>

          {/* NO-PRINT: Category Breakdown */}
          <div className="card no-print" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Rincian per Kategori</h3>
            <div className="table-wrap"><table><thead><tr><th>Kategori</th><th style={{ textAlign: "right" }}>Pemasukan</th><th style={{ textAlign: "right" }}>Pengeluaran</th></tr></thead><tbody>
              {data.categoryBreakdown.map((c, i) => <tr key={i}><td>{c.name}</td><td className="text-amount text-income" style={{ textAlign: "right" }}>{formatRp(c.income)}</td><td className="text-amount text-expense" style={{ textAlign: "right" }}>{formatRp(c.expense)}</td></tr>)}
            </tbody></table></div>
          </div>

          {/* ===== PRINT CONTENT: This div is the print output ===== */}
          <div className="print-content">
            {/* Kop Surat — only visible when printing */}
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
              <h2 className="print-kop-title">Laporan Keuangan {getPeriodLabel()}</h2>
            </div>

            {/* Transaction Table — visible on screen AND print */}
            <div className="card print-table-card">
              <h3 className="no-print" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Daftar Transaksi ({data.summary.count})</h3>
              
              {/* Screen table — responsive */}
              <table className="w-full border-collapse no-print">
                <thead>
                  <tr>
                    <th className="print-th" style={{ width: 90 }}>Tanggal</th>
                    {!isMobile&&<th className="print-th" style={{ width: 85 }}>Jenis</th>}
                    <th className="print-th">Kategori</th>
                    <th className="print-th" style={{ textAlign: "right" }}>Jumlah</th>
                    <th className="print-th">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="print-td" style={{whiteSpace:"nowrap"}}>{isMobile?new Date(t.transaction_date).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"}):new Date(t.transaction_date).toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" })}</td>
                      {!isMobile&&<td className="print-td">{t.type === "income" ? "Pemasukan" : "Pengeluaran"}</td>}
                      <td className="print-td">{isMobile&&<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",marginRight:4,verticalAlign:"middle",background:t.type==="income"?"var(--success)":"var(--danger)"}}></span>}{t.category_name}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600, whiteSpace:"nowrap" }}>{isMobile?formatShort(t.amount):formatRp(t.amount)}</td>
                      <td className="print-td">{t.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Print table — always full desktop format */}
              <table className="w-full border-collapse print-only-table" style={{ fontSize: "11pt" }}>
                <thead>
                  <tr>
                    <th className="print-th" style={{ width: 90 }}>Tanggal</th>
                    <th className="print-th" style={{ width: 85 }}>Jenis</th>
                    <th className="print-th" style={{ width: 100 }}>Kategori</th>
                    <th className="print-th" style={{ width: 100, textAlign: "right" }}>Jumlah</th>
                    <th className="print-th">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="print-td">{new Date(t.transaction_date).toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" })}</td>
                      <td className="print-td">{t.type === "income" ? "Pemasukan" : "Pengeluaran"}</td>
                      <td className="print-td">{t.category_name}</td>
                      <td className="print-td" style={{ textAlign: "right", fontWeight: 600 }}>{formatRp(t.amount)}</td>
                      <td className="print-td">{t.note || "-"}</td>
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

      {/* Per-page print styles */}
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
