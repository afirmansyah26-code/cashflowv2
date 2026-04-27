"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, X, Upload } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface Transaction { id:number; user_id:number; category_id:number|null; category_name:string; type:string; amount:number; transaction_date:string; note:string|null; admin_notes:string|null; attachment:string|null; username:string; }
interface Category { id:number; name:string; }

function formatRupiah(n:number){return "Rp "+n.toLocaleString("id-ID");}
function formatRupiahShort(n:number){if(n>=1000000)return(n/1000000).toFixed(n%1000000===0?0:1)+"M";if(n>=1000)return(n/1000).toFixed(n%1000===0?0:0)+"K";return String(n);}
function formatNum(v:string){return v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");}
function parseNum(v:string){return parseInt(v.replace(/\./g,""),10)||0;}

export default function TransaksiPage(){
  const{showToast}=useToast();
  const[txns,setTxns]=useState<Transaction[]>([]);
  const[cats,setCats]=useState<Category[]>([]);
  const[total,setTotal]=useState(0);
  const[page,setPage]=useState(1);
  const[limit,setLimit]=useState(25);
  const[totalPages,setTotalPages]=useState(1);
  const[search,setSearch]=useState("");
  const[filterType,setFilterType]=useState("");
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[showEdit,setShowEdit]=useState(false);
  const[showDelete,setShowDelete]=useState(false);
  const[editTx,setEditTx]=useState<Transaction|null>(null);
  const[deleteTx,setDeleteTx]=useState<Transaction|null>(null);
  const[saving,setSaving]=useState(false);
  const[form,setForm]=useState({category_id:"",type:"income",amount:"",transaction_date:new Date().toISOString().split("T")[0],note:"",admin_notes:"",attachment:""});
  const[file,setFile]=useState<File|null>(null);
  const[role,setRole]=useState("");
  const[isMobile,setIsMobile]=useState(false);

  useEffect(()=>{
    fetch("/api/me").then(r=>r.json()).then(d=>{if(d.role)setRole(d.role);}).catch(()=>{});
    const mq=window.matchMedia("(max-width:768px)");
    setIsMobile(mq.matches);
    const handler=(e:MediaQueryListEvent)=>setIsMobile(e.matches);
    mq.addEventListener("change",handler);
    return()=>mq.removeEventListener("change",handler);
  },[]);

  const loadData=useCallback(()=>{
    setLoading(true);
    const params=new URLSearchParams({page:String(page),limit:String(limit)});
    if(search)params.set("search",search);
    if(filterType)params.set("filter_type",filterType);
    Promise.all([
      fetch(`/api/transactions?${params}`).then(r=>r.json()),
      fetch("/api/categories").then(r=>r.json()),
    ]).then(([td,cd])=>{
      setTxns(td.transactions||[]);setTotal(td.total||0);setTotalPages(td.totalPages||1);
      setCats(cd.categories||[]);
    }).catch(()=>showToast("error","Gagal memuat data")).finally(()=>setLoading(false));
  },[page,limit,search,filterType,showToast]);

  useEffect(()=>{loadData();},[loadData]);

  const uploadFile=async():Promise<string>=>{
    if(!file)return form.attachment;
    const fd=new FormData();fd.append("file",file);fd.append("type","bukti");
    const r=await fetch("/api/upload",{method:"POST",body:fd});
    const d=await r.json();
    if(!d.success)throw new Error(d.error);
    return d.filename;
  };

  const handleAdd=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);
    try{
      const attachment=await uploadFile();
      const r=await fetch("/api/transactions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,amount:parseNum(form.amount),attachment})});
      const d=await r.json();
      if(d.success){showToast("success","Transaksi berhasil ditambahkan");setShowAdd(false);resetForm();loadData();}
      else showToast("error",d.error||"Gagal menyimpan");
    }catch(err){showToast("error",String(err));}finally{setSaving(false);}
  };

  const handleEdit=async(e:React.FormEvent)=>{
    e.preventDefault();if(!editTx)return;setSaving(true);
    try{
      let attachment=form.attachment;
      if(file)attachment=await uploadFile();
      const r=await fetch(`/api/transactions/${editTx.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,amount:parseNum(form.amount),attachment})});
      const d=await r.json();
      if(d.success){showToast("success","Transaksi berhasil diperbarui");setShowEdit(false);resetForm();loadData();}
      else showToast("error",d.error||"Gagal memperbarui");
    }catch(err){showToast("error",String(err));}finally{setSaving(false);}
  };

  const handleDelete=async()=>{
    if(!deleteTx)return;setSaving(true);
    try{
      const r=await fetch(`/api/transactions/${deleteTx.id}`,{method:"DELETE"});
      const d=await r.json();
      if(d.success){showToast("success","Transaksi berhasil dihapus");setShowDelete(false);setDeleteTx(null);loadData();}
      else showToast("error",d.error||"Gagal menghapus");
    }catch{showToast("error","Terjadi kesalahan");}finally{setSaving(false);}
  };

  const resetForm=()=>{setForm({category_id:"",type:"income",amount:"",transaction_date:new Date().toISOString().split("T")[0],note:"",admin_notes:"",attachment:""});setFile(null);setEditTx(null);};

  const openEdit=(t:Transaction)=>{
    setEditTx(t);
    setForm({category_id:t.category_id?String(t.category_id):"",type:t.type,amount:formatNum(String(Math.round(t.amount))),transaction_date:new Date(t.transaction_date).toISOString().split("T")[0],note:t.note||"",admin_notes:t.admin_notes||"",attachment:t.attachment||""});
    setFile(null);setShowEdit(true);
  };

  const formFields=(
    <>
      <div className="form-group"><label className="form-label">Kategori</label><select className="form-select" value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">-- Pilih Kategori --</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Jenis</label><select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select></div>
        <div className="form-group"><label className="form-label">Jumlah</label><input className="form-input" value={form.amount} onChange={e=>setForm({...form,amount:formatNum(e.target.value)})} placeholder="contoh: 1.000.000" required/></div>
      </div>
      <div className="form-group"><label className="form-label">Tanggal</label><input className="form-input" type="date" value={form.transaction_date} onChange={e=>setForm({...form,transaction_date:e.target.value})} required/></div>
      <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" rows={2} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div>
      <div className="form-group"><label className="form-label">Bukti Transaksi</label><input className="form-input" type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><p className="form-help">Maks 5MB. Format: JPG, PNG, WEBP, PDF.</p>{form.attachment&&!file&&<p className="form-help">File saat ini: {form.attachment}</p>}</div>
      <div className="form-group"><label className="form-label">Admin Notes</label><textarea className="form-textarea" rows={2} value={form.admin_notes} onChange={e=>setForm({...form,admin_notes:e.target.value})} placeholder="Catatan internal"/><p className="form-help">Hanya tampil di halaman transaksi, tidak di laporan.</p></div>
    </>
  );

  return(
    <div>
      <div className="page-header">
        <h1 className="page-title">Daftar Transaksi</h1>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div className="search-box"><Search size={16}/><input className="form-input" placeholder="Cari catatan, kategori..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{paddingLeft:36}}/></div>
          <select className="form-select" style={{width:100}} value={limit} onChange={e=>{setLimit(Number(e.target.value));setPage(1);}}>{[10,25,50,100].map(l=><option key={l} value={l}>{l} baris</option>)}</select>
          <select className="form-select" style={{width:130}} value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}}><option value="">Semua Jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select>
          <button className="btn btn-success" onClick={()=>{resetForm();setShowAdd(true);}}><Plus size={16}/>Tambah</button>
        </div>
      </div>

      {search&&<div style={{background:"var(--info-light)",padding:"8px 14px",borderRadius:"var(--radius-sm)",marginBottom:12,fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Menampilkan <strong>{total}</strong> hasil untuk &quot;<strong>{search}</strong>&quot;</span><button className="btn btn-sm btn-secondary" onClick={()=>setSearch("")}><X size={14}/>Hapus</button></div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{width:isMobile?55:85,padding:isMobile?"6px 4px":undefined}}>Tanggal</th>
              {!isMobile&&<th style={{width:60}}>Jenis</th>}
              <th style={{padding:isMobile?"6px 4px":undefined}}>Kategori</th>
              <th style={{textAlign:"right",width:isMobile?60:100,padding:isMobile?"6px 4px":undefined}}>Jumlah</th>
              <th style={{padding:isMobile?"6px 4px":undefined}}>Catatan</th>
              {!isMobile&&<th>Admin Notes</th>}
              {!isMobile&&<th style={{width:50}}>Bukti</th>}
              <th style={{width:isMobile?55:80,padding:isMobile?"6px 4px":undefined}}>Aksi</th>
            </tr></thead>
            <tbody>
              {loading?<tr><td colSpan={isMobile?5:8} style={{textAlign:"center",padding:32}}>Memuat...</td></tr>:
               txns.length===0?<tr><td colSpan={isMobile?5:8} className="text-muted" style={{textAlign:"center",padding:32}}>Tidak ada transaksi.</td></tr>:
               txns.map(t=>(
                <tr key={t.id}>
                  <td style={{whiteSpace:"nowrap",padding:isMobile?"6px 4px":undefined}}>{isMobile?new Date(t.transaction_date).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"}):new Date(t.transaction_date).toLocaleDateString("id-ID")}</td>
                  {!isMobile&&<td><span className={`badge ${t.type==="income"?"badge-income":"badge-expense"}`}>{t.type==="income"?"Masuk":"Keluar"}</span></td>}
                  <td style={{padding:isMobile?"6px 4px":undefined}}>{isMobile&&<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",marginRight:4,verticalAlign:"middle",background:t.type==="income"?"var(--success)":"var(--danger)"}}></span>}{t.category_name}</td>
                  <td className={`text-amount ${t.type==="income"?"text-income":"text-expense"}`} style={{textAlign:"right",padding:isMobile?"6px 4px":undefined}}>{isMobile?formatRupiahShort(t.amount):formatRupiah(t.amount)}</td>
                  <td style={{color:"var(--text-secondary)",padding:isMobile?"6px 4px":undefined}}>{t.note||"-"}</td>
                  {!isMobile&&<td style={{color:"var(--text-muted)"}}>{t.admin_notes||"-"}</td>}
                  {!isMobile&&<td style={{textAlign:"center"}}>{t.attachment?<a href={`/uploads/bukti/${t.attachment}`} target="_blank" rel="noreferrer" title="Klik untuk memperbesar"><img src={`/uploads/bukti/${t.attachment}`} alt="Bukti" style={{width:36,height:36,objectFit:"cover",borderRadius:"var(--radius-sm)",border:"1px solid var(--border-color)"}} /></a>:<span className="text-muted">-</span>}</td>}
                  <td style={{whiteSpace:"nowrap",padding:isMobile?"6px 2px":undefined}}><button className="btn btn-sm btn-secondary btn-icon" onClick={()=>openEdit(t)} title="Edit"><Pencil size={14}/></button>{" "}<button className="btn btn-sm btn-danger btn-icon" onClick={()=>{setDeleteTx(t);setShowDelete(true);}} title="Hapus"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages>1&&<div className="pagination"><button className="page-btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>«</button>{Array.from({length:Math.min(7,totalPages)},(_,i)=>{const s=Math.max(1,page-3);const p=s+i;if(p>totalPages)return null;return<button key={p} className={`page-btn ${p===page?"page-btn-active":""}`} onClick={()=>setPage(p)}>{p}</button>;})}<button className="page-btn" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>»</button></div>}
        <div className="text-muted" style={{textAlign:"center",marginTop:8}}>Total: {total} transaksi</div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={()=>setShowAdd(false)} title="Tambah Transaksi" size="lg" footer={<><button className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Batal</button><button className="btn btn-primary" onClick={()=>(document.getElementById("addForm") as HTMLFormElement)?.requestSubmit()} disabled={saving}>{saving?"Menyimpan...":"Simpan"}</button></>}>
        <form id="addForm" onSubmit={handleAdd}>{formFields}</form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={()=>setShowEdit(false)} title="Edit Transaksi" size="lg" footer={<><button className="btn btn-secondary" onClick={()=>setShowEdit(false)}>Batal</button><button className="btn btn-primary" onClick={()=>(document.getElementById("editForm") as HTMLFormElement)?.requestSubmit()} disabled={saving}>{saving?"Menyimpan...":"Simpan Perubahan"}</button></>}>
        <form id="editForm" onSubmit={handleEdit}>{formFields}</form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={showDelete} onClose={()=>setShowDelete(false)} title="Konfirmasi Hapus" size="sm" footer={<><button className="btn btn-secondary" onClick={()=>setShowDelete(false)}>Batal</button><button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving?"Menghapus...":"Hapus"}</button></>}>
        <div style={{textAlign:"center",padding:"16px 0"}}><Trash2 size={48} color="var(--danger)" style={{marginBottom:12}}/><p style={{fontSize:16,fontWeight:600}}>Yakin ingin menghapus transaksi ini?</p><p className="text-muted">Tindakan ini tidak dapat dibatalkan.</p></div>
      </Modal>
    </div>
  );
}
