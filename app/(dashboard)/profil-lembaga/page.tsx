"use client";
import{useEffect,useState}from"react";
import{Save,Upload}from"lucide-react";
import{useToast}from"@/components/ui/toast";

export default function ProfilLembagaPage(){
  const{showToast}=useToast();
  const[form,setForm]=useState({name:"",subtitle:"",address:"",logo_path:""});
  const[file,setFile]=useState<File|null>(null);
  const[preview,setPreview]=useState("");
  const[saving,setSaving]=useState(false);

  useEffect(()=>{
    fetch("/api/organization").then(r=>r.json()).then(d=>{
      if(d.organization){setForm({name:d.organization.name||"",subtitle:d.organization.subtitle||"",address:d.organization.address||"",logo_path:d.organization.logo_path||""});
      if(d.organization.logo_path)setPreview(d.organization.logo_path.startsWith("/")?d.organization.logo_path:`/uploads/${d.organization.logo_path.replace("public/uploads/","")}`);}
    });
  },[]);

  const handleSave=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);
    try{
      let logoPath=form.logo_path;
      if(file){
        const fd=new FormData();fd.append("file",file);fd.append("type","logo");
        const r=await fetch("/api/upload",{method:"POST",body:fd});
        const d=await r.json();
        if(d.success)logoPath=d.path;
      }
      const r=await fetch("/api/organization",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,logo_path:logoPath})});
      const d=await r.json();
      if(d.success)showToast("success","Profil berhasil disimpan");else showToast("error",d.error);
    }catch{showToast("error","Gagal menyimpan");}finally{setSaving(false);}
  };

  return(
    <div>
      <h1 className="page-title" style={{marginBottom:20}}>Profil Lembaga</h1>
      <div className="card" style={{maxWidth:640}}>
        <form onSubmit={handleSave}>
          <div className="form-group"><label className="form-label">Nama Lembaga</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
          <div className="form-group"><label className="form-label">Subtitle</label><input className="form-input" value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})} placeholder="Deskripsi singkat"/></div>
          <div className="form-group"><label className="form-label">Alamat</label><textarea className="form-textarea" rows={3} value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div>
          <div className="form-group"><label className="form-label">Logo</label>
            {preview&&<div style={{marginBottom:8}}><img src={preview} alt="Logo" style={{maxHeight:80,borderRadius:"var(--radius-sm)",border:"1px solid var(--border-color)"}}/></div>}
            <input className="form-input" type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f);setPreview(URL.createObjectURL(f));}}}/>
            <p className="form-help">Format: JPG, PNG. Maks 5MB.</p>
          </div>
          <button className="btn btn-primary" disabled={saving}><Save size={16}/>{saving?"Menyimpan...":"Simpan"}</button>
        </form>
      </div>
    </div>
  );
}
