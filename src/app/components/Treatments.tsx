import { useState, useMemo } from "react";
import { Plus, Search, X, Edit2, Trash2, Stethoscope, Clock, DollarSign, CheckCircle, ChevronRight, Tag, FileText, User } from "lucide-react";

import { getTreatments, createTreatment, updateTreatment, deleteTreatment, getPatients, createAppointment, getDoctors } from "../../services/api";

interface Treatment {
  id: string; name: string; category: string; duration: number;
  price: number; description: string; materials: string; active: boolean;
}

const categories = ["Preventiva","Restauradora","Estética","Ortodoncia","Cirugía oral","Endodoncia","Implantes","Diagnóstico"];

const catColors: Record<string, { color: string; bg: string }> = {
  Preventiva:    { color:"#059669", bg:"#ECFDF5" },
  Restauradora:  { color:"#0C7A7A", bg:"#E3F2F2" },
  Estética:      { color:"#7C3AED", bg:"#EDE9FE" },
  Ortodoncia:    { color:"#D97706", bg:"#FFFBEB" },
  "Cirugía oral":{ color:"#DC2626", bg:"#FEF2F2" },
  Endodoncia:    { color:"#D97706", bg:"#FEF3C7" },
  Implantes:     { color:"#0369A1", bg:"#E0F2FE" },
  Diagnóstico:   { color:"#6B7280", bg:"#F3F4F6" },
};

const emptyForm: Omit<Treatment,"id"> = { name:"", category:categories[0], duration:60, price:0, description:"", materials:"", active:true };

function initials(name: string) {
  return name.split(" ").slice(0,2).map((w)=>w[0]?.toUpperCase()??"").join("");
}

export function Treatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Treatment | null>(null);
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("todas");
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<Omit<Treatment,"id">>(emptyForm);
  const [delConfirm, setDel]        = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [toast, setToast]           = useState("");
  const [applyModal, setApplyModal] = useState<Treatment | null>(null);
  const [patients, setPatients]     = useState<any[]>([]);
  const [applyPatientId, setApplyPatientId] = useState("");
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [formPatientId, setFormPatientId] = useState("");

  useState(() => {
    Promise.all([getTreatments(), getPatients(), getDoctors()]).then(([data, pats, docs]) => {
      setTreatments(data || []);
      if (data && data.length > 0) setSelected(data[0]);
      setPatients(pats || []);
      setDoctorsList(docs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  });

  const filtered = useMemo(() => treatments.filter((t) => {
    const ms = t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === "todas" || t.category === filterCat;
    return ms && mc;
  }), [treatments, search, filterCat]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function select(t: Treatment) { setSelected(t); setShowMobileDetail(true); }

  function openCreate() { setForm(emptyForm); setEditingId(null); setFormPatientId(""); setShowForm(true); }
  function openEdit(t: Treatment) {
    const { id, ...rest } = t; setForm(rest); setEditingId(t.id); setShowForm(true);
  }
  async function save() {
    if (!form.name) return;
    if (!editingId && !formPatientId) {
      showToast("Debes seleccionar un paciente para registrar el tratamiento.");
      return;
    }
    try {
      if (editingId !== null) {
        const updated = await updateTreatment(editingId, form);
        setTreatments(treatments.map((t) => t.id === editingId ? { ...t, ...updated } : t));
        setSelected(updated);
        showToast("Tratamiento actualizado ✓");
      } else {
        const nt = await createTreatment(form);
        setTreatments([nt, ...treatments]);
        setSelected(nt);
        if (formPatientId) {
          const firstDoc = doctorsList.length > 0 ? doctorsList[0].id : null;
          try {
            await createAppointment({
              patientId: formPatientId,
              doctorId: firstDoc,
              date: new Date().toISOString().slice(0, 10),
              time: new Date().toTimeString().slice(0, 5),
              duration: nt.duration,
              procedure: nt.name,
              status: "completada",
              notes: "Registrado desde nuevo tratamiento",
              cost: nt.price
            });
            showToast("Tratamiento agregado y aplicado al paciente ✓");
          } catch (e) {
             console.error("Error applying to patient", e);
             showToast("Tratamiento agregado, pero hubo error al aplicar al paciente");
          }
        } else {
          showToast("Tratamiento agregado ✓");
        }
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
      showToast("Error al guardar");
    }
  }
  async function toggleActive(id: string) {
    const t = treatments.find((x) => x.id === id);
    if (!t) return;
    try {
      const updated = await updateTreatment(id, { active: !t.active });
      setTreatments(treatments.map((x) => x.id === id ? { ...x, ...updated } : x));
      setDel(null);
    } catch (e) { console.error(e); }
  }

  async function applyToPatient() {
    if (!applyModal || !applyPatientId) return;
    try {
      await createAppointment({
        patientId: applyPatientId,
        doctorId: doctorsList.length > 0 ? doctorsList[0].id : null,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        duration: applyModal.duration,
        procedure: applyModal.name,
        status: "completada",
        notes: "Aplicado desde catálogo de tratamientos",
        cost: applyModal.price
      });
      showToast("Tratamiento aplicado e ingreso registrado ✓");
      setApplyModal(null);
      setApplyPatientId("");
    } catch (e) {
      console.error(e);
      showToast("Error al aplicar el tratamiento");
    }
  }
  async function del(id: string) {
    try {
      await deleteTreatment(id);
      const rem = treatments.filter((t) => t.id !== id);
      setTreatments(rem);
      setSelected(rem[0] || null);
      setDel(null);
      setShowMobileDetail(false);
      showToast("Tratamiento eliminado");
    } catch (e) {
      console.error(e);
      showToast("Error al eliminar");
    }
  }

  const cc = selected ? (catColors[selected.category] || { color:"var(--primary)", bg:"var(--secondary)" }) : null;

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily:"'DM Sans', sans-serif" }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold" style={{ background:"#ECFDF5", color:"#059669", border:"1px solid #D1FAE5" }}>
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      {/* ── LEFT: Lista ───────────────────────────────── */}
      <div className={`flex flex-col border-r bg-card ${showMobileDetail?"hidden md:flex":"flex"} md:w-80 lg:w-96 shrink-0 h-full`} style={{ borderColor:"var(--border)" }}>
        <div className="px-4 pt-4 pb-3 border-b space-y-3" style={{ borderColor:"var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>Tratamientos</h2>
              <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{filtered.length} de {treatments.length}</p>
            </div>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
            <input type="text" placeholder="Buscar tratamiento…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
          </div>
          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {["todas", ...categories].map((c) => (
              <button key={c} onClick={() => setFilterCat(c)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all"
                style={{ background:filterCat===c?"var(--primary)":"transparent", color:filterCat===c?"#fff":"var(--muted-foreground)", borderColor:filterCat===c?"var(--primary)":"var(--border)" }}>
                {c==="todas"?"Todas":c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor:"var(--border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color:"var(--muted-foreground)" }}>Cargando tratamientos...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Stethoscope className="w-12 h-12 mb-3 opacity-20" style={{ color:"var(--muted-foreground)" }} />
              <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>Sin resultados</p>
              <p className="text-xs mt-1" style={{ color:"var(--muted-foreground)" }}>Intenta buscar con otros términos.</p>
            </div>
          ) : filtered.map((t) => {
            const tcc = catColors[t.category] || { color:"var(--primary)", bg:"var(--secondary)" };
            const isSelected = selected?.id === t.id;
            return (
              <button key={t.id} onClick={() => select(t)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ background:isSelected?"var(--secondary)":"transparent", opacity:t.active?1:0.65 }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background="var(--muted)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background="transparent"; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: isSelected ? tcc.bg : "var(--muted)" }}>
                  <Stethoscope className="w-5 h-5" style={{ color: isSelected ? tcc.color : "var(--muted-foreground)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color:"var(--foreground)" }}>{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background:tcc.bg, color:tcc.color }}>{t.category}</span>
                    {!t.active && <span className="text-xs" style={{ color:"var(--muted-foreground)" }}>Inactivo</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color:"var(--primary)" }}>${t.price.toLocaleString()}</p>
                  <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>{t.duration}min</p>
                </div>
                {isSelected && <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background:"var(--primary)" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Detalle ───────────────────────────── */}
      <div className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-background ${showMobileDetail?"flex":"hidden md:flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background:"var(--secondary)" }}>
              <Stethoscope className="w-10 h-10" style={{ color:"var(--primary)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg" style={{ color:"var(--foreground)" }}>Selecciona un tratamiento</p>
              <p className="text-sm mt-1" style={{ color:"var(--muted-foreground)" }}>El detalle aparecerá aquí</p>
              <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 mx-auto" style={{ background:"var(--primary)", color:"#fff" }}>
                <Plus className="w-4 h-4" /> Nuevo tratamiento
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 border-b px-5 md:px-7 py-5" style={{ borderColor:"var(--border)", background:"var(--card)" }}>
              <button className="flex items-center gap-1.5 text-sm font-semibold mb-4 md:hidden" style={{ color:"var(--primary)" }} onClick={() => setShowMobileDetail(false)}>
                <ChevronRight className="w-4 h-4 rotate-180" /> Tratamientos
              </button>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 hidden sm:flex" style={{ background:cc!.bg }}>
                  <Stethoscope className="w-8 h-8" style={{ color:cc!.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:cc!.bg, color:cc!.color }}>{selected.category}</span>
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:selected.active?"#DCFCE7":"var(--muted)", color:selected.active?"#166534":"var(--muted-foreground)" }}>
                          {selected.active?"Activo":"Inactivo"}
                        </span>
                      </div>
                      <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.25rem", lineHeight:1.2 }}>{selected.name}</h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setApplyModal(selected)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors" style={{ borderColor:"var(--primary)", background:"var(--secondary)", color:"var(--primary)" }}>
                        <User className="w-4 h-4" /> Aplicar a Paciente
                      </button>
                      <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors" style={{ borderColor:"var(--border)", color:"var(--foreground)" }}>
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <button onClick={() => setDel(selected.id)} className="p-2.5 rounded-xl hover:bg-red-50 transition-colors border" style={{ borderColor:"var(--border)" }}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ background:"var(--secondary)", color:"var(--primary)" }}>
                      <DollarSign className="w-4 h-4" />${selected.price.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ background:"var(--muted)", color:"var(--foreground)" }}>
                      <Clock className="w-4 h-4" style={{ color:"var(--primary)" }} />{selected.duration} minutos
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 md:px-7 py-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color:"var(--foreground)" }}>
                    <FileText className="w-4 h-4" style={{ color:"var(--primary)" }} /> Descripción
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color:"var(--foreground)" }}>
                    {selected.description || <span style={{ color:"var(--muted-foreground)" }}>Sin descripción.</span>}
                  </p>
                </div>
                <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color:"var(--foreground)" }}>
                    <Tag className="w-4 h-4" style={{ color:"var(--primary)" }} /> Materiales utilizados
                  </h3>
                  {selected.materials ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.materials.split(",").map((m) => (
                        <span key={m} className="px-2.5 py-1 rounded-xl text-sm" style={{ background:"var(--muted)", color:"var(--foreground)" }}>{m.trim()}</span>
                      ))}
                    </div>
                  ) : <p className="text-sm" style={{ color:"var(--muted-foreground)" }}>Sin materiales registrados.</p>}
                </div>
              </div>

              {/* Toggle active */}
              <div className="rounded-2xl border p-5 flex items-center justify-between" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                <div>
                  <p className="font-semibold" style={{ color:"var(--foreground)" }}>Estado del tratamiento</p>
                  <p className="text-sm mt-0.5" style={{ color:"var(--muted-foreground)" }}>
                    {selected.active ? "Visible en el catálogo y disponible para citas" : "Oculto del catálogo — no aparece en nuevas citas"}
                  </p>
                </div>
                <button onClick={() => toggleActive(selected.id)}
                  className="w-12 h-7 rounded-full relative transition-colors shrink-0"
                  style={{ background:selected.active?"var(--primary)":"#CBD5E1" }}>
                  <span className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all" style={{ left:selected.active?"calc(100% - 1.5rem)":"0.25rem" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Form modal ──────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-black/50">
          <div className="bg-card w-full md:max-w-xl rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10" style={{ borderColor:"var(--border)" }}>
              <div>
                <h3 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>{editingId?"Editar tratamiento":"Nuevo tratamiento"}</h3>
                <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>Completa los campos requeridos *</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-5 h-5" style={{ color:"var(--muted-foreground)" }} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {!editingId && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Paciente (Requerido) *</label>
                  {patients.length === 0 ? (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold">
                      No hay pacientes registrados. Registre un paciente primero.
                    </div>
                  ) : (
                    <select value={formPatientId} onChange={e => setFormPatientId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:!formPatientId?"#DC2626":"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                      <option value="">Seleccionar paciente...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              )}
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Nombre del tratamiento *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})}
                  placeholder="Ej. Limpieza dental (profilaxis)"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
              {/* Categoría + Duración */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({...form,category:e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Duración</label>
                  <select value={form.duration} onChange={(e) => setForm({...form,duration:+e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                    {[15,30,45,60,90,120,180].map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              {/* Precio */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Precio ($) *</label>
                <input type="number" min="0" value={form.price} onChange={(e) => setForm({...form,price:+e.target.value})}
                  placeholder="Ej. 800"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} rows={3}
                  placeholder="Ej. Remoción de placa y sarro. Incluye pulido y fluorización."
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
              {/* Materiales */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Materiales utilizados</label>
                <input type="text" value={form.materials} onChange={(e) => setForm({...form,materials:e.target.value})}
                  placeholder="Ej. Resina, adhesivo, ácido grabador"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
              {/* Activo */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background:"var(--muted)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>Tratamiento activo</p>
                  <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>Se mostrará en el catálogo</p>
                </div>
                <button onClick={() => setForm({...form,active:!form.active})}
                  className="w-12 h-7 rounded-full relative transition-colors"
                  style={{ background:form.active?"var(--primary)":"#CBD5E1" }}>
                  <span className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all" style={{ left:form.active?"calc(100% - 1.5rem)":"0.25rem" }} />
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border text-sm font-bold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
                <button onClick={save} disabled={!editingId && (!formPatientId || patients.length === 0)} className="flex-1 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity" style={{ background:"var(--primary)", color:"#fff", opacity: (!editingId && (!formPatientId || patients.length === 0)) ? 0.5 : 1 }}>
                  {editingId?"Guardar cambios":"Agregar tratamiento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>¿Eliminar tratamiento?</h3>
            <p className="text-sm mb-5" style={{ color:"var(--muted-foreground)" }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDel(null)} className="flex-1 py-3 rounded-xl border text-sm font-bold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
              <button onClick={() => del(delConfirm)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply to Patient Modal */}
      {applyModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6">
            <h3 className="font-bold mb-1" style={{ color:"var(--foreground)", fontSize:"1.1rem" }}>Aplicar Tratamiento</h3>
            <p className="text-sm mb-5" style={{ color:"var(--muted-foreground)" }}>
              Se registrará {applyModal.name} como completado por ${applyModal.price.toLocaleString()}.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Seleccionar Paciente *</label>
              <select value={applyPatientId} onChange={e => setApplyPatientId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                <option value="">Selecciona...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setApplyModal(null)} className="flex-1 py-3 rounded-xl border text-sm font-bold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
              <button onClick={applyToPatient} disabled={!applyPatientId} className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity" style={{ background:"var(--primary)", color:"#fff", opacity: applyPatientId ? 1 : 0.5 }}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
