import { useState, useMemo } from "react";
import { Plus, Search, X, Edit2, Trash2, Tag, CheckCircle, ChevronRight, Copy, Calendar, Users, Percent } from "lucide-react";

import { getPromotions, createPromotion, updatePromotion, deletePromotion } from "../../services/api";

interface Promotion {
  id: string; title: string; description: string;
  discount: number; discount_type: "percent" | "fixed";
  procedures: string[]; start_date: string; end_date: string;
  active: boolean; usage_limit: number; usage_count: number;
  code: string; target_audience: string;
}

const allProcedures = ["Limpieza dental","Blanqueamiento","Ortodoncia","Empaste","Extracción","Implante dental","Radiografía","Consulta general","Endodoncia","Corona dental"];
const audiences     = ["Todos los pacientes","Nuevos pacientes","Pacientes existentes","Familias","Adultos 18-45","Adultos mayores","Niños"];

const emptyForm: Omit<Promotion,"id"|"usage_count"> = {
  title:"", description:"", discount:10, discount_type:"percent", procedures:[], start_date:"", end_date:"", active:true, usage_limit:50, code:"", target_audience:"Todos los pacientes",
};

function daysLeft(end: string) {
  const diff = new Date(end+"T23:59").getTime() - Date.now();
  return Math.ceil(diff / (1000*60*60*24));
}
function fmtDate(d: string) {
  return new Date(d+"T00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"});
}

export function Promotions() {
  const [promos, setPromos]       = useState<Promotion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Promotion | null>(null);
  const [search, setSearch]       = useState("");
  const [filterActive, setFilter] = useState<string>("todos");
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<Omit<Promotion,"id"|"usage_count">>(emptyForm);
  const [delConfirm, setDel]      = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [toast, setToast]         = useState("");
  const [copied, setCopied]       = useState(false);

  useState(() => {
    getPromotions().then(data => {
      setPromos(data || []);
      if (data && data.length > 0) setSelected(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  });

  const filtered = useMemo(() => promos.filter((p) => {
    const ms = p.title.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const mf = filterActive==="todos" || (filterActive==="activa"?p.active:!p.active);
    return ms && mf;
  }), [promos, search, filterActive]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function select(p: Promotion) { setSelected(p); setShowMobileDetail(true); }

  function openCreate() { setForm(emptyForm); setEditingId(null); setShowForm(true); }
  function openEdit(p: Promotion) {
    const { id, usage_count, ...rest } = p; setForm(rest); setEditingId(p.id); setShowForm(true);
  }
  async function save() {
    if (!form.title || !form.start_date || !form.end_date) return;
    try {
      if (editingId !== null) {
        const updated = await updatePromotion(editingId, form);
        setPromos(promos.map((p) => p.id === editingId ? { ...p, ...updated } : p));
        setSelected(updated);
        showToast("Promoción actualizada ✓");
      } else {
        const np = await createPromotion(form);
        setPromos([np, ...promos]);
        setSelected(np);
        showToast("Promoción creada ✓");
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
      showToast("Error al guardar");
    }
  }
  async function toggleActive(id: string) {
    const p = promos.find((x) => x.id === id);
    if (!p) return;
    try {
      const updated = await updatePromotion(id, { active: !p.active });
      setPromos(promos.map((x) => x.id === id ? { ...x, ...updated } : x));
      setSelected(updated);
    } catch (e) { console.error(e); }
  }
  async function del(id: string) {
    try {
      await deletePromotion(id);
      const rem = promos.filter((p) => p.id !== id);
      setPromos(rem);
      setSelected(rem[0] || null);
      setDel(null);
      setShowMobileDetail(false);
      showToast("Promoción eliminada");
    } catch (e) {
      console.error(e);
      showToast("Error al eliminar");
    }
  }
  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  }
  function toggleProc(proc: string) {
    setForm((f) => ({ ...f, procedures: f.procedures.includes(proc) ? f.procedures.filter((p)=>p!==proc) : [...f.procedures, proc] }));
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily:"'DM Sans', sans-serif" }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold" style={{ background:"#ECFDF5", color:"#059669", border:"1px solid #D1FAE5" }}>
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      {/* ── LEFT ──────────────────────────────────────── */}
      <div className={`flex flex-col border-r bg-card ${showMobileDetail?"hidden md:flex":"flex"} md:w-80 lg:w-96 shrink-0 h-full`} style={{ borderColor:"var(--border)" }}>
        <div className="px-4 pt-4 pb-3 border-b space-y-3" style={{ borderColor:"var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>Promociones</h2>
              <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{promos.filter((p)=>p.active).length} activas · {filtered.length} mostradas</p>
            </div>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
              <Plus className="w-4 h-4" /> Nueva
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
            <input type="text" placeholder="Título o código…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
          </div>
          <div className="flex gap-1.5">
            {["todos","activa","inactiva"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all"
                style={{ background:filterActive===f?"var(--primary)":"transparent", color:filterActive===f?"#fff":"var(--muted-foreground)", borderColor:filterActive===f?"var(--primary)":"var(--border)" }}>
                {f==="todos"?"Todas":f==="activa"?"Activas":"Inactivas"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor:"var(--border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color:"var(--muted-foreground)" }}>Cargando promociones...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Tag className="w-12 h-12 mb-3 opacity-20" style={{ color:"var(--muted-foreground)" }} />
              <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>Sin promociones</p>
            </div>
          ) : (filtered.map((p) => {
            const isSelected = selected?.id === p.id;
            return (
              <button key={p.id} onClick={() => select(p)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ background:isSelected?"var(--secondary)":"transparent" }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background="var(--muted)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background="transparent"; }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold truncate" style={{ color:"var(--foreground)" }}>{p.title}</p>
                    <div className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0" style={{ background:p.active?"#ECFDF5":"#FEF2F2", color:p.active?"#059669":"#DC2626" }}>
                      {p.active?"ACTIVA":"INACTIVA"}
                    </div>
                  </div>
                  <p className="text-xs truncate" style={{ color:"var(--muted-foreground)" }}>{p.code}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold" style={{ color:"var(--muted-foreground)" }}>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {fmtDate(p.end_date)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {p.usage_count}/{p.usage_limit}</span>
                  </div>
                </div>
              </button>
            );
          }))}
        </div>
      </div>

      {/* ── RIGHT: Detalle ───────────────────────────── */}
      <div className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-background ${showMobileDetail?"flex":"hidden md:flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background:"var(--secondary)" }}>
              <Tag className="w-10 h-10" style={{ color:"var(--primary)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg" style={{ color:"var(--foreground)" }}>Selecciona una promoción</p>
              <p className="text-sm mt-1" style={{ color:"var(--muted-foreground)" }}>El detalle aparecerá aquí</p>
              <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 mx-auto" style={{ background:"var(--primary)", color:"#fff" }}>
                <Plus className="w-4 h-4" /> Nueva promoción
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 border-b px-5 md:px-7 py-5" style={{ borderColor:"var(--border)", background:"var(--card)" }}>
              <button className="flex items-center gap-1.5 text-sm font-semibold mb-4 md:hidden" style={{ color:"var(--primary)" }} onClick={() => setShowMobileDetail(false)}>
                <ChevronRight className="w-4 h-4 rotate-180" /> Promociones
              </button>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:selected.active?"#DCFCE7":"var(--muted)", color:selected.active?"#166534":"var(--muted-foreground)" }}>
                      {selected.active?"Activa":"Inactiva"}
                    </span>
                    {daysLeft(selected.end_date) < 7 && daysLeft(selected.end_date) > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:"#FEF2F2", color:"#DC2626" }}>
                        ⚠ Vence en {daysLeft(selected.end_date)}d
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.25rem", lineHeight:1.2 }}>{selected.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background:"var(--secondary)" }}>
                      <span className="font-mono font-bold text-base" style={{ color:"var(--primary)" }}>{selected.code}</span>
                      <button onClick={() => copyCode(selected.code)} className="p-1 rounded hover:opacity-70">
                        {copied ? <CheckCircle className="w-4 h-4" style={{ color:"#059669" }} /> : <Copy className="w-4 h-4" style={{ color:"var(--primary)" }} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors" style={{ borderColor:"var(--border)", color:"var(--foreground)" }}>
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={() => setDel(selected.id)} className="p-2.5 rounded-xl hover:bg-red-50 transition-colors border" style={{ borderColor:"var(--border)" }}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 md:px-7 py-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg" style={{ background:"var(--primary)", color:"white" }}>
                      {selected.discount_type==="percent" ? `${selected.discount}%` : `$${selected.discount}`}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color:"var(--foreground)" }}>Descuento aplicado</p>
                      <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>{selected.discount_type==="percent"?"Porcentaje":"Monto fijo"}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                  <p className="text-sm leading-relaxed" style={{ color:"var(--foreground)" }}>{selected.description || <span style={{ color:"var(--muted-foreground)" }}>Sin descripción.</span>}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label:"Usos realizados", value:`${selected.usage_count} / ${selected.usage_limit}`, icon:Users,    color:"var(--primary)", bg:"var(--secondary)" },
                  { label:"Inicio",           value:fmtDate(selected.start_date),                        icon:Calendar, color:"#059669",        bg:"#ECFDF5" },
                  { label:"Vencimiento",      value:fmtDate(selected.end_date),                          icon:Calendar, color: daysLeft(selected.end_date)<7?"#DC2626":"#D97706", bg:daysLeft(selected.end_date)<7?"#FEF2F2":"#FFFBEB" },
                ].map(({ label, value, icon:Icon, color, bg }) => (
                  <div key={label} className="rounded-2xl border p-4" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background:bg }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <p className="font-bold text-sm" style={{ color:"var(--foreground)" }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Usage progress */}
              <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm" style={{ color:"var(--foreground)" }}>Uso de la promoción</p>
                  <span className="text-sm font-bold" style={{ color:"var(--primary)" }}>
                    {Math.round((selected.usage_count / selected.usage_limit) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full" style={{ background:"var(--muted)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width:`${Math.min((selected.usage_count/selected.usage_limit)*100,100)}%`, background:(selected.usage_count/selected.usage_limit)>=0.8?"#F59E0B":"var(--primary)" }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs" style={{ color:"var(--muted-foreground)" }}>{selected.usage_count} usados</span>
                  <span className="text-xs" style={{ color:"var(--muted-foreground)" }}>{selected.usage_limit - selected.usage_count} disponibles</span>
                </div>
              </div>

              {/* Details */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"var(--border)" }}>
                {[
                  { label:"Audiencia objetivo",  value:selected.target_audience },
                  { label:"Aplica a",            value:selected.procedures.length?selected.procedures.join(", "):"Todos los procedimientos" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start px-5 py-4 border-b last:border-0" style={{ borderColor:"var(--border)", background:"var(--card)" }}>
                    <span className="text-sm" style={{ color:"var(--muted-foreground)" }}>{label}</span>
                    <span className="text-sm font-semibold text-right max-w-[60%]" style={{ color:"var(--foreground)" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Toggle active */}
              <div className="rounded-2xl border p-5 flex items-center justify-between" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                <div>
                  <p className="font-semibold" style={{ color:"var(--foreground)" }}>Estado de la promoción</p>
                  <p className="text-sm mt-0.5" style={{ color:"var(--muted-foreground)" }}>
                    {selected.active ? "Los pacientes pueden usar este código" : "El código está desactivado"}
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
                <h3 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>{editingId?"Editar promoción":"Nueva promoción"}</h3>
                <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>Completa los campos requeridos *</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-5 h-5" style={{ color:"var(--muted-foreground)" }} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Nombre de la promoción *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({...form,title:e.target.value})}
                  placeholder="Ej. Verano Brillante 2026"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} rows={3}
                  placeholder="Ej. Blanqueamiento dental profesional a precio especial este verano."
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Código promocional</label>
                <input type="text" value={form.code} onChange={(e) => setForm({...form,code:e.target.value.toUpperCase().replace(/\s/g,"")})}
                  placeholder="Ej. VERANO30"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none font-mono tracking-widest" style={{ borderColor:"var(--border)", color:"var(--primary)", background:"var(--input-background)" }} />
              </div>
              {/* Tipo + Valor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Tipo de descuento</label>
                  <div className="flex rounded-xl border overflow-hidden" style={{ borderColor:"var(--border)" }}>
                    {(["percent","fixed"] as const).map((t) => (
                      <button key={t} onClick={() => setForm({...form,discount_type:t})}
                        className="flex-1 py-3 text-sm font-semibold transition-all"
                        style={{ background:form.discount_type===t?"var(--primary)":"var(--input-background)", color:form.discount_type===t?"#fff":"var(--muted-foreground)" }}>
                        {t==="percent"?"% Porcentaje":"$ Fijo"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Valor *</label>
                  <input type="number" min="1" max={form.discount_type==="percent"?100:undefined} value={form.discount} onChange={(e) => setForm({...form,discount:+e.target.value})}
                    placeholder="Ej. 30"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
              </div>
              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Fecha inicio *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({...form,start_date:e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Fecha fin *</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({...form,end_date:e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
              </div>
              {/* Límite + Audiencia */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Límite de usos</label>
                  <input type="number" min="1" value={form.usage_limit} onChange={(e) => setForm({...form,usage_limit:+e.target.value})}
                    placeholder="Ej. 50"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Audiencia objetivo</label>
                  <select value={form.target_audience} onChange={(e) => setForm({...form,target_audience:e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                    {audiences.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              {/* Procedimientos */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:"var(--foreground)" }}>Procedimientos aplicables</label>
                <div className="flex flex-wrap gap-2">
                  {allProcedures.map((proc) => {
                    const sel = form.procedures.includes(proc);
                    return (
                      <button key={proc} onClick={() => toggleProc(proc)}
                        className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-all"
                        style={{ background:sel?"var(--primary)":"var(--input-background)", color:sel?"#fff":"var(--muted-foreground)", borderColor:sel?"var(--primary)":"var(--border)" }}>
                        {proc}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mt-2" style={{ color:"var(--muted-foreground)" }}>Sin selección = aplica a todos los procedimientos</p>
              </div>
              {/* Activo */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background:"var(--muted)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>Promoción activa</p>
                  <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>Los pacientes podrán usar el código</p>
                </div>
                <button onClick={() => setForm({...form,active:!form.active})}
                  className="w-12 h-7 rounded-full relative transition-colors"
                  style={{ background:form.active?"var(--primary)":"#CBD5E1" }}>
                  <span className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all" style={{ left:form.active?"calc(100% - 1.5rem)":"0.25rem" }} />
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border text-sm font-bold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
                <button onClick={save} className="flex-1 py-3 rounded-xl text-sm font-bold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
                  {editingId?"Guardar cambios":"Crear promoción"}
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
            <h3 className="font-bold mb-2" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>¿Eliminar promoción?</h3>
            <p className="text-sm mb-5" style={{ color:"var(--muted-foreground)" }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDel(null)} className="flex-1 py-3 rounded-xl border text-sm font-bold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
              <button onClick={() => del(delConfirm)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
