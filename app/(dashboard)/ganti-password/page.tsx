"use client";
import{useState}from"react";
import{KeyRound}from"lucide-react";
import{useToast}from"@/components/ui/toast";

export default function GantiPasswordPage(){
  const{showToast}=useToast();
  const[form,setForm]=useState({current_password:"",new_password:"",confirm:""});
  const[saving,setSaving]=useState(false);

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(form.new_password!==form.confirm){showToast("error","Konfirmasi password tidak cocok");return;}
    setSaving(true);
    try{
      const r=await fetch("/api/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({current_password:form.current_password,new_password:form.new_password})});
      const d=await r.json();
      if(d.success){showToast("success","Password berhasil diubah");setForm({current_password:"",new_password:"",confirm:""});}
      else showToast("error",d.error);
    }catch{showToast("error","Gagal mengubah password");}finally{setSaving(false);}
  };

  return(
    <div>
      <h1 className="page-title" style={{marginBottom:20}}>Ganti Password</h1>
      <div className="card" style={{maxWidth:480}}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Password Lama</label><input className="form-input" type="password" value={form.current_password} onChange={e=>setForm({...form,current_password:e.target.value})} required/></div>
          <div className="form-group"><label className="form-label">Password Baru</label><input className="form-input" type="password" value={form.new_password} onChange={e=>setForm({...form,new_password:e.target.value})} required minLength={6}/></div>
          <div className="form-group"><label className="form-label">Konfirmasi Password Baru</label><input className="form-input" type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} required/></div>
          <button className="btn btn-primary" disabled={saving}><KeyRound size={16}/>{saving?"Menyimpan...":"Ubah Password"}</button>
        </form>
      </div>
    </div>
  );
}
