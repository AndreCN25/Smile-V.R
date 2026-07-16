import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, User } from "lucide-react";
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from "../../services/api";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  active: boolean;
}

export function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [editDoctorId, setEditDoctorId] = useState<string | null>(null);
  const [doctorForm, setDoctorForm] = useState<Omit<Doctor,"id">>({ name:"", specialty:"", phone:"", email:"", active:true });
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [isCreatingDoctor, setIsCreatingDoctor] = useState(false);

  useEffect(() => {
    getDoctors().then(docs => {
      if (docs) setDoctors(docs);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  function openEditDoctor(d: Doctor) {
    const { id, ...rest } = d; 
    setDoctorForm(rest); 
    setEditDoctorId(d.id); 
    setIsCreatingDoctor(false); 
    setShowDoctorModal(true);
  }

  function openCreateDoctor() {
    setDoctorForm({ name:"", specialty:"", phone:"", email:"", active:true }); 
    setEditDoctorId(null); 
    setIsCreatingDoctor(true); 
    setShowDoctorModal(true);
  }

  async function saveDoctor() {
    if (!doctorForm.name) return;
    try {
      if (editDoctorId !== null) {
        const updated = await updateDoctor(editDoctorId, doctorForm);
        setDoctors(doctors.map((d) => d.id === editDoctorId ? { ...d, ...updated } : d));
      } else {
        const nd = await createDoctor(doctorForm);
        setDoctors([...doctors, nd]);
      }
      setShowDoctorModal(false);
    } catch (e: any) {
      console.error(e);
      alert("Error al guardar doctor: " + (e.message || String(e)));
    }
  }

  async function handleDeleteDoctor(id: string) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este doctor?")) return;
    try {
      await deleteDoctor(id);
      setDoctors(doctors.filter((d) => d.id !== id));
    } catch (e: any) {
      console.error(e);
      alert("Error al eliminar doctor: " + (e.message || String(e)));
    }
  }

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 rounded-full border-t-transparent animate-spin" style={{ borderColor: "var(--primary) transparent transparent transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="px-4 md:px-8 py-6 border-b shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card" style={{ borderColor: "var(--border)" }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Doctores</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>Gestiona el personal médico de la clínica.</p>
        </div>
        <button onClick={openCreateDoctor} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "#fff" }}>
          <Plus className="w-4 h-4" />
          <span>Agregar doctor</span>
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o especialidad..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all" 
              style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--input-background)" }} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((d) => (
            <div key={d.id} className="bg-card rounded-2xl border p-5 flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: "var(--border)", opacity: d.active ? 1 : 0.65 }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ background: "var(--secondary)", color: "var(--primary)" }}>
                  {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>{d.name}</p>
                    {!d.active && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>Inactivo</span>}
                  </div>
                  <p className="text-xs truncate font-medium" style={{ color: "var(--muted-foreground)" }}>{d.specialty || "Sin especialidad"}</p>
                </div>
              </div>
              
              <div className="mt-auto space-y-2 mb-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold w-14" style={{ color: "var(--muted-foreground)" }}>Tel:</span>
                  <span style={{ color: "var(--foreground)" }}>{d.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold w-14" style={{ color: "var(--muted-foreground)" }}>Correo:</span>
                  <span className="truncate" style={{ color: "var(--foreground)" }}>{d.email || "—"}</span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEditDoctor(d)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:bg-muted transition-colors" style={{ color: "var(--foreground)", border: "1px solid var(--border)" }}>
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => handleDeleteDoctor(d.id)} className="w-10 flex items-center justify-center rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors shrink-0" style={{ color: "#DC2626", border: "1px solid #FCA5A5" }} title="Eliminar doctor">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filteredDoctors.length === 0 && (
            <div className="col-span-full py-12 text-center flex flex-col items-center justify-center bg-card rounded-2xl border border-dashed" style={{ borderColor: "var(--border)" }}>
              <User className="w-10 h-10 mb-3 opacity-20" style={{ color: "var(--foreground)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>No se encontraron doctores</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{search ? "Intenta con otra búsqueda" : "Agrega un nuevo doctor para comenzar"}</p>
            </div>
          )}
        </div>
      </main>

      {/* Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full md:max-w-md rounded-2xl shadow-2xl border animate-in fade-in zoom-in-95 duration-200" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-bold" style={{ color: "var(--foreground)" }}>{isCreatingDoctor ? "Nuevo doctor" : "Editar doctor"}</h3>
              <button onClick={() => setShowDoctorModal(false)} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: "Nombre completo", key: "name", type: "text", placeholder: "Dr. Juan Pérez" },
                { label: "Especialidad", key: "specialty", type: "text", placeholder: "Ortodoncia" },
                { label: "Teléfono", key: "phone", type: "tel", placeholder: "+52 999-000-0000" },
                { label: "Correo", key: "email", type: "email", placeholder: "correo@ejemplo.com" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--foreground)" }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={(doctorForm as any)[key]} onChange={(e) => setDoctorForm({ ...doctorForm, [key]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all" style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--input-background)" }} />
                </div>
              ))}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--muted)" }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Doctor activo</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Los doctores inactivos no pueden ser asignados a citas</p>
                </div>
                <button onClick={() => setDoctorForm({ ...doctorForm, active: !doctorForm.active })}
                  className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                  style={{ background: doctorForm.active ? "var(--primary)" : "var(--muted-foreground)" }}>
                  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: doctorForm.active ? "calc(100% - 1.375rem)" : "0.125rem" }} />
                </button>
              </div>
              <button onClick={saveDoctor} disabled={!doctorForm.name} className="w-full py-3 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-all mt-6 disabled:opacity-50" style={{ background: "var(--primary)", color: "#fff" }}>
                Guardar doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
