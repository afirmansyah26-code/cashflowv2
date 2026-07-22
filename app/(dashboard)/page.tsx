"use client";
import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from "lucide-react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend, Filler } from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { useTransactionModal } from "@/components/transaction/transaction-modal-provider";
import { useMediaQuery } from "@/components/use-media-query";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend, Filler);

interface DashboardData {
  summary: { totalIncome: number; totalExpense: number; balance: number; totalTransactions: number };
  trendData: { period: string; income: number; expense: number }[];
  topExpenseCategories: { name: string; total: number }[];
  recentTransactions: { id: number; type: string; amount: number; transaction_date: string; category_name: string; note: string; username: string }[];
  balanceMovement: { date: string; balance: number }[];
}

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
function formatShort(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}

export default function DashboardPage() {
  const { transactionRevision } = useTransactionModal();
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery("(max-width:768px)");
  const chartRef = useRef(null);

  useEffect(() => {
    fetch(`/api/dashboard?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, transactionRevision]);

  if (loading || !data) return <div className="empty-state"><div className="empty-state-icon">📊</div><p>Memuat dashboard...</p></div>;

  const trendChart = {
    labels: data.trendData.map((d) => d.period),
    datasets: [
      { label: "Pemasukan", data: data.trendData.map((d) => d.income), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,.1)", fill: true, tension: .4 },
      { label: "Pengeluaran", data: data.trendData.map((d) => d.expense), borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,.1)", fill: true, tension: .4 },
    ],
  };

  const donutColors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  const donutChart = {
    labels: data.topExpenseCategories.map((c) => c.name),
    datasets: [{ data: data.topExpenseCategories.map((c) => c.total), backgroundColor: donutColors, borderWidth: 0 }],
  };

  const balanceChart = {
    labels: data.balanceMovement.map((b) => b.date),
    datasets: [{ label: "Saldo", data: data.balanceMovement.map((b) => b.balance), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,.1)", fill: true, tension: .4, pointRadius: 2 }],
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: "flex", gap: 4 }}>
          {["week","month","year","all"].map((p) => (
            <button key={p} className={`btn btn-sm ${period===p?"btn-primary":"btn-secondary"}`} onClick={() => { setLoading(true); setPeriod(p); }}>
              {p === "week" ? "Minggu" : p === "month" ? "Bulan" : p === "year" ? "Tahun" : "Semua"}
            </button>
          ))}
        </div>
      </div>

      <div className="card-grid" style={{ marginBottom: 20 }}>
        <div className="card stat-card stat-card-income"><div className="stat-label"><TrendingUp size={14} style={{display:"inline",marginRight:4}} />Total Pemasukan</div><div className="stat-value stat-value-income">{formatRupiah(data.summary.totalIncome)}</div></div>
        <div className="card stat-card stat-card-expense"><div className="stat-label"><TrendingDown size={14} style={{display:"inline",marginRight:4}} />Total Pengeluaran</div><div className="stat-value stat-value-expense">{formatRupiah(data.summary.totalExpense)}</div></div>
        <div className="card stat-card stat-card-balance"><div className="stat-label"><Wallet size={14} style={{display:"inline",marginRight:4}} />Saldo</div><div className="stat-value stat-value-balance">{formatRupiah(data.summary.balance)}</div></div>
        <div className="card stat-card stat-card-count"><div className="stat-label"><ArrowLeftRight size={14} style={{display:"inline",marginRight:4}} />Total Transaksi</div><div className="stat-value stat-value-count">{data.summary.totalTransactions}</div></div>
      </div>

      <div className="chart-grid" style={{ marginBottom: 20 }}>
        <div className="card"><h3 style={{fontSize:13,fontWeight:600,marginBottom:12}}>Tren Transaksi</h3><div style={{height:220,position:"relative"}}><Line ref={chartRef} data={trendChart} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{usePointStyle:true,padding:8,font:{size:10}}}},scales:{y:{beginAtZero:true,ticks:{font:{size:9},callback:(v)=>"Rp "+Number(v).toLocaleString("id-ID")}},x:{ticks:{font:{size:9},maxRotation:45}}}}} /></div></div>
        <div className="card"><h3 style={{fontSize:13,fontWeight:600,marginBottom:12}}>Pergerakan Saldo</h3><div style={{height:220,position:"relative"}}><Line data={balanceChart} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{font:{size:9},callback:(v)=>"Rp "+Number(v).toLocaleString("id-ID")}},x:{ticks:{font:{size:9},maxRotation:45}}}}} /></div></div>
        <div className="card"><h3 style={{fontSize:13,fontWeight:600,marginBottom:12}}>Pengeluaran per Kategori</h3><div style={{height:220,position:"relative"}}><Doughnut data={donutChart} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{usePointStyle:true,padding:8,font:{size:10}}}}}} /></div></div>
      </div>

      <div className="card">
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>Transaksi Terbaru</h3>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Tanggal</th>
              {!isMobile&&<th>Jenis</th>}
              <th>Kategori</th>
              <th style={{textAlign:"right"}}>Jumlah</th>
              <th>Catatan</th>
            </tr></thead>
            <tbody>
              {data.recentTransactions.length === 0 ? (
                <tr><td colSpan={isMobile?4:5} className="text-muted" style={{textAlign:"center",padding:24}}>Belum ada transaksi</td></tr>
              ) : data.recentTransactions.map((t) => (
                <tr key={t.id}>
                  <td style={{whiteSpace:"nowrap"}}>{isMobile?new Date(t.transaction_date).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"}):new Date(t.transaction_date).toLocaleDateString("id-ID")}</td>
                  {!isMobile&&<td><span className={`badge ${t.type==="income"?"badge-income":"badge-expense"}`}>{t.type==="income"?"Masuk":"Keluar"}</span></td>}
                  <td>{isMobile&&<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",marginRight:4,verticalAlign:"middle",background:t.type==="income"?"var(--success)":"var(--danger)"}}></span>}{t.category_name}</td>
                  <td className={`text-amount ${t.type==="income"?"text-income":"text-expense"}`} style={{textAlign:"right",whiteSpace:"nowrap"}}>{isMobile?formatShort(t.amount):formatRupiah(t.amount)}</td>
                  <td className="text-muted">{t.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
