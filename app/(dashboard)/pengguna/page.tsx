"use client";
import{useEffect,useState}from"react";
import{Plus,Pencil,Trash2}from"lucide-react";
import Modal from"@/components/ui/modal";
import{useToast}from"@/components/ui/toast";

interface User{id:number;username:string;role:string;created_at:string;}

export default function PenggunaPage(){
  const{showToast}=useToast();
  const[users,setUsers]=useState<User[]>([]);
  const[loading,setLoading]=useState(true);
  const[showModal,setShowModal]=useState(false);
  const[showDelete,setShowDelete]=useState(false);
  const[editUser,setEditUser]=useState<User|null>(null);
  const[deleteUser,setDeleteUser]=useState<User|null>(null);
  const[form,setForm]=useState({username:"",password:"",role:"staf"});
  const[saving,setSaving]=useState(false);

  const load=()=>{fetch("/api/users").then(r=>r.json()).then(d=>setUsers(d.users||[])).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);

  const handleSave=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);
    try{
      const url=editUser?`/api/users/${editUser.id}`:"/api/users";
      const method=editUser?"PUT":"POST";
      const body=editUser?{username:form.username,role:form.role,...(form.password?{password:form.password}:{})}:form;
      const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(d.success){showToast("success",editUser?"User diperbarui":"User ditambahkan");setShowModal(false);load();}else showToast("error",d.error);
    }catch{showToast("error","Gagal menyimpan");}finally{setSaving(false);}
  };

  const handleDelete=async()=>{
    if(!deleteUser)return;setSaving(true);
    try{const r=await fetch(`/api/users/${deleteUser.id}`,{method:"DELETE"});const d=await r.json();
      if(d.success){showToast("success","User dihapus");setShowDelete(false);load();}else showToast("error",d.error);
    }catch{showToast("error","Gagal menghapus");}finally{setSaving(false);}
  };

  return(
    <div>
      <div className="page-header"><h1 className="page-title">Pengguna</h1><button className="btn btn-success" onClick={()=>{setEditUser(null);setForm({username:"",password:"",role:"staf"});setShowModal(true);}}><Plus size={16}/>Tambah</button></div>
      <div className="card">
        <div className="table-wrap"><table><thead><tr><th>No</th><th>Username</th><th>Role</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>
          {loading?<tr><td colSpan={5} style={{textAlign:"center",padding:32}}>Memuat...</td></tr>:
           users.map((u,i)=><tr key={u.id}><td>{i+1}</td><td style={{fontWeight:600}}>{u.username}</td><td><span className="badge" style={{background:u.role==="admin"?"var(--accent-light)":"var(--success-light)",color:u.role==="admin"?"var(--accent)":"var(--success)"}}>{u.role}</span></td><td className="text-muted">{new Date(u.created_at).toLocaleDateString("id-ID")}</td><td style={{whiteSpace:"nowrap"}}><button className="btn btn-sm btn-secondary btn-icon" onClick={()=>{setEditUser(u);setForm({username:u.username,password:"",role:u.role});setShowModal(true);}}><Pencil size={14}/></button>{" "}<button className="btn btn-sm btn-danger btn-icon" onClick={()=>{setDeleteUser(u);setShowDelete(true);}}><Trash2 size={14}/></button></td></tr>)}
        </tbody></table></div>
      </div>
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title={editUser?"Edit User":"Tambah User"} size="sm" footer={<><button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Batal</button><button className="btn btn-primary" onClick={()=>(document.getElementById("userForm") as HTMLFormElement)?.requestSubmit()} disabled={saving}>{saving?"Menyimpan...":"Simpan"}</button></>}>
        <form id="userForm" onSubmit={handleSave}>
          <div className="form-group"><label className="form-label">Username</label><input className="form-input" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required/></div>
          <div className="form-group"><label className="form-label">Password{editUser?" (kosongkan jika tidak diubah)":""}</label><input className="form-input" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} {...(!editUser?{required:true}:{})}/></div>
          <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="admin">Admin</option><option value="staf">Staf</option></select></div>
        </form>
      </Modal>
      <Modal isOpen={showDelete} onClose={()=>setShowDelete(false)} title="Hapus User" size="sm" footer={<><button className="btn btn-secondary" onClick={()=>setShowDelete(false)}>Batal</button><button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button></>}><div style={{textAlign:"center",padding:16}}><Trash2 size={48} color="var(--danger)"/><p style={{marginTop:12,fontWeight:600}}>Hapus user &quot;{deleteUser?.username}&quot;?</p></div></Modal>
    </div>
  );
}
