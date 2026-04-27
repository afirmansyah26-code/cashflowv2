"use client";
import{useEffect,useState}from"react";
import{Plus,Pencil,Trash2}from"lucide-react";
import Modal from"@/components/ui/modal";
import{useToast}from"@/components/ui/toast";

interface Cat{id:number;name:string;}

export default function KategoriPage(){
  const{showToast}=useToast();
  const[cats,setCats]=useState<Cat[]>([]);
  const[loading,setLoading]=useState(true);
  const[showModal,setShowModal]=useState(false);
  const[showDelete,setShowDelete]=useState(false);
  const[editCat,setEditCat]=useState<Cat|null>(null);
  const[deleteCat,setDeleteCat]=useState<Cat|null>(null);
  const[name,setName]=useState("");
  const[saving,setSaving]=useState(false);

  const load=()=>{setLoading(true);fetch("/api/categories").then(r=>r.json()).then(d=>setCats(d.categories||[])).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);

  const handleSave=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);
    try{
      const url=editCat?`/api/categories/${editCat.id}`:"/api/categories";
      const method=editCat?"PUT":"POST";
      const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
      const d=await r.json();
      if(d.success){showToast("success",editCat?"Kategori diperbarui":"Kategori ditambahkan");setShowModal(false);setName("");setEditCat(null);load();}
      else showToast("error",d.error);
    }catch{showToast("error","Gagal menyimpan");}finally{setSaving(false);}
  };

  const handleDelete=async()=>{
    if(!deleteCat)return;setSaving(true);
    try{const r=await fetch(`/api/categories/${deleteCat.id}`,{method:"DELETE"});const d=await r.json();
      if(d.success){showToast("success","Kategori dihapus");setShowDelete(false);load();}else showToast("error",d.error);
    }catch{showToast("error","Gagal menghapus");}finally{setSaving(false);}
  };

  return(
    <div>
      <div className="page-header"><h1 className="page-title">Kategori</h1><button className="btn btn-success" onClick={()=>{setEditCat(null);setName("");setShowModal(true);}}><Plus size={16}/>Tambah</button></div>
      <div className="card">
        <div className="table-wrap"><table><thead><tr><th>No</th><th>Nama Kategori</th><th>Aksi</th></tr></thead><tbody>
          {loading?<tr><td colSpan={3} style={{textAlign:"center",padding:32}}>Memuat...</td></tr>:
           cats.length===0?<tr><td colSpan={3} className="text-muted" style={{textAlign:"center",padding:32}}>Belum ada kategori</td></tr>:
           cats.map((c,i)=><tr key={c.id}><td>{i+1}</td><td>{c.name}</td><td style={{whiteSpace:"nowrap"}}><button className="btn btn-sm btn-secondary btn-icon" onClick={()=>{setEditCat(c);setName(c.name);setShowModal(true);}}><Pencil size={14}/></button>{" "}<button className="btn btn-sm btn-danger btn-icon" onClick={()=>{setDeleteCat(c);setShowDelete(true);}}><Trash2 size={14}/></button></td></tr>)}
        </tbody></table></div>
      </div>
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title={editCat?"Edit Kategori":"Tambah Kategori"} size="sm" footer={<><button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Batal</button><button className="btn btn-primary" onClick={()=>(document.getElementById("catForm") as HTMLFormElement)?.requestSubmit()} disabled={saving}>{saving?"Menyimpan...":"Simpan"}</button></>}><form id="catForm" onSubmit={handleSave}><div className="form-group"><label className="form-label">Nama Kategori</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} required autoFocus/></div></form></Modal>
      <Modal isOpen={showDelete} onClose={()=>setShowDelete(false)} title="Hapus Kategori" size="sm" footer={<><button className="btn btn-secondary" onClick={()=>setShowDelete(false)}>Batal</button><button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving?"Menghapus...":"Hapus"}</button></>}><div style={{textAlign:"center",padding:16}}><Trash2 size={48} color="var(--danger)"/><p style={{marginTop:12,fontWeight:600}}>Hapus kategori &quot;{deleteCat?.name}&quot;?</p><p className="text-muted">Transaksi terkait juga akan terpengaruh.</p></div></Modal>
    </div>
  );
}
