import { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus, Search, X, Edit2, Trash2, Calendar, Clock,
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  XCircle, User, FileText, DollarSign, Stethoscope, AlertTriangle
} from "lucide-react";
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, getPatients, getDoctors } from "../../services/api";
import { sendAppointmentConfirmation, sendAppointmentCancellation, getNotificationPreferences } from "../../services/whatsapp";

/* ── Types ─────────────────────────────────────────────── */
type Status = "pendiente" | "completada" | "cancelada" | "en_curso" | "confirmada";

interface Appointment {
  id: string; patientId: string; doctorId: string;
  date: string; time: string; duration: number; procedure: string;
  status: Status; notes: string; cost: number;
  patient?: { name: string };
  doctor?: { name: string };
}

const statusCfg: Record<Status, { label: string; color: string; bg: string; border: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  pendiente:  { label:"Pendiente",  color:"#D97706", bg:"#FFFBEB", border:"#FDE68A", Icon:AlertCircle  },
  confirmada: { label:"Confirmada", color:"#0C7A7A", bg:"#E3F2F2", border:"#A7D7D7", Icon:CheckCircle2 },
  en_curso:   { label:"En curso",   color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD", Icon:Clock        },
  completada: { label:"Completada", color:"#059669", bg:"#ECFDF5", border:"#6EE7B7", Icon:CheckCircle2 },
  cancelada:  { label:"Cancelada",  color:"#DC2626", bg:"#FEF2F2", border:"#FCA5A5", Icon:XCircle      },
};

const procedures = ["Limpieza dental","Extracción","Ortodoncia","Empaste","Blanqueamiento","Implante dental","Radiografía","Consulta general","Endodoncia","Corona dental","Puente dental","Carilla dental"];
function makeEmpty(doctors: any[] = []): Omit<Appointment,"id"|"patient"|"doctor"> {
  return { patientId:"", doctorId: doctors.length ? doctors[0].id : "", date:new Date().toISOString().slice(0,10), time:"09:00", duration:60, procedure:"", status:"pendiente", notes:"", cost:0 };
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDay(y: number, m: number) { const d = new Date(y,m,1).getDay(); return d===0?6:d-1; }
function fmtDate(d: string) { return new Date(d+"T00:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"}); }

/* ── Patient search dropdown ───────────────────────────── */
function PatientSelector({ value, patients, onChange }: { value: string; patients: any[]; onChange: (id: string) => void }) {
  const [query, setQuery]         = useState("");
  const [open, setOpen]           = useState(false);
  const [touched, setTouched]     = useState(false);
  const ref                       = useRef<HTMLDivElement>(null);
  const isValid                   = patients.some((p) => p.id === value);

  useEffect(() => { 
    if (value) {
      const p = patients.find(x => x.id === value);
      if (p) setQuery(p.name);
    } else setQuery("");
  }, [value, patients]);
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const results = patients.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
        <input
          type="text"
          value={query}
          placeholder="Buscar paciente registrado…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(""); setTouched(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
          style={{
            borderColor: touched && !isValid && query ? "#DC2626" : isValid ? "var(--primary)" : "var(--border)",
            color:"var(--foreground)", background:"var(--input-background)",
            boxShadow: isValid ? "0 0 0 3px rgba(12,122,122,0.1)" : touched && !isValid && query ? "0 0 0 3px rgba(220,38,38,0.1)" : "none",
          }}
        />
        {query && (
          <button onClick={() => { setQuery(""); onChange(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5" style={{ color:"var(--muted-foreground)" }} />
          </button>
        )}
      </div>

      {/* Validation message */}
      {touched && query && !isValid && (
        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color:"#DC2626" }}>
          <AlertTriangle className="w-3 h-3" /> Paciente no encontrado. Solo puedes agendar con pacientes registrados.
        </p>
      )}
      {isValid && (
        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color:"#059669" }}>
          <CheckCircle2 className="w-3 h-3" /> Paciente seleccionado correctamente
        </p>
      )}

      {/* Dropdown */}
      {open && query.length >= 1 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card rounded-2xl shadow-2xl border overflow-hidden max-h-64 overflow-y-auto" style={{ borderColor:"var(--border)" }}>
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <User className="w-8 h-8 mx-auto mb-2" style={{ color:"var(--muted-foreground)", opacity:0.4 }} />
              <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>Sin resultados</p>
              <p className="text-xs mt-1" style={{ color:"var(--muted-foreground)" }}>Ve a Pacientes para registrar uno nuevo</p>
            </div>
          ) : results.map((p) => {
            const age = Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25*24*3600*1000));
            return (
              <button key={p.id} onClick={() => { setQuery(p.name); onChange(p.id); setOpen(false); setTouched(true); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b last:border-0"
                style={{ borderColor:"var(--border)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background:"var(--secondary)", color:"var(--primary)" }}>
                  {p.name.split(" ").map((n)=>n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color:"var(--foreground)" }}>{p.name}</p>
                  <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{age} años · {p.phone}</p>
                </div>
                {p.allergies !== "Ninguna" && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md shrink-0" style={{ background:"#FEF2F2", color:"#DC2626" }}>⚠ Alergia</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────── */
export function Appointments() {
  const [appts, setAppts]         = useState<Appointment[]>([]);
  const [patients, setPatients]   = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState<string>("todos");
  const [filterDate, setFilterDate] = useState("");
  const [selected, setSelected]   = useState<Appointment | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]           = useState<Omit<Appointment,"id"|"patient"|"doctor">>(makeEmpty());
  const [delConfirm, setDel]      = useState<number|null>(null);
  const [viewMode, setViewMode]   = useState<"list"|"calendar">("list");
  const [calMonth, setCalMonth]   = useState(() => { const d = new Date(); return { year:d.getFullYear(), month:d.getMonth() }; });
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [formError, setFormError] = useState("");
  const [waToast, setWaToast] = useState<{show:boolean;ok:boolean;msg:string}>({show:false,ok:false,msg:""});

  useEffect(() => {
    Promise.all([getAppointments(), getPatients(), getDoctors()]).then(([apts, pats, docs]) => {
      if (apts) { setAppts(apts); if (apts.length) setSelected(apts[0]); }
      if (pats) setPatients(pats);
      if (docs) { setDoctorsList(docs); if (!form.doctorId && docs.length) setForm({...form, doctorId: docs[0].id}); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => appts.filter((a) => {
    const pName = a.patient?.name || "";
    const ms  = pName.toLowerCase().includes(search.toLowerCase()) || a.procedure.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === "todos" || a.status === filterStatus;
    const md  = !filterDate || a.date === filterDate;
    return ms && mst && md;
  }), [appts, search, filterStatus, filterDate]);

  function selectAppt(a: Appointment) { setSelected(a); setShowMobileDetail(true); }

  function openCreate() { setForm(makeEmpty(doctorsList)); setEditingId(null); setFormError(""); setShowForm(true); }
  function openEdit(a: Appointment) { const { id, ...r } = a; setForm(r); setEditingId(a.id); setFormError(""); setShowForm(true); }

  async function save() {
    if (!form.patientId) { setFormError("Debes seleccionar un paciente registrado."); return; }
    if (!form.date || !form.time || !form.procedure) { setFormError("Completa todos los campos obligatorios."); return; }

    const now = new Date();
    const [year, month, day] = form.date.split("-").map(Number);
    const [hours, minutes] = form.time.split(":").map(Number);
    const selectedDateTime = new Date(year, month - 1, day, hours, minutes);
    if (selectedDateTime < now) {
      setFormError("No puedes agendar una cita en una fecha u hora que ya pasó.");
      return;
    }

    setFormError("");
    try {
      if (editingId !== null) {
        const updated = await updateAppointment(editingId, form);
        const newAppts = appts.map((a) => a.id === editingId ? { ...a, ...updated } : a);
        setAppts(newAppts);
        // refresh selected
        const sel = newAppts.find((a) => a.id === editingId);
        if (sel) setSelected(sel);
      } else {
        const na = await createAppointment(form);
        const p = patients.find(x => x.id === na.patientId);
        const d = doctorsList.find(x => x.id === na.doctorId);
        const newAp = { ...na, patient: { name: p?.name }, doctor: { name: d?.name } };
        setAppts([newAp, ...appts]);
        setSelected(newAp);
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
      setFormError("Error al guardar");
    }
  }

  async function del(id: string) {
    try {
      await deleteAppointment(id);
      const rem = appts.filter((a) => a.id !== id);
      setAppts(rem);
      setSelected(rem.length ? rem[0] : null);
      setDel(null);
    } catch (e) { console.error(e); }
  }

  async function changeStatus(id: string, status: Status) {
    try {
      const updated = await updateAppointment(id, { status });
      const newAppts = appts.map((a) => a.id === id ? { ...a, status } : a);
      setAppts(newAppts);
      const sel = newAppts.find((a) => a.id === id);
      if (sel) setSelected(sel);

      // Send WhatsApp message on confirm or cancel
      if (status === "confirmada" || status === "cancelada") {
        const appt = appts.find((a) => a.id === id);
        if (appt) {
          const patient = patients.find((p) => p.id === appt.patientId);
          if (patient && patient.phone) {
            const result = status === "confirmada"
              ? await sendAppointmentConfirmation(patient.name, patient.phone, appt.date, appt.time)
              : await sendAppointmentCancellation(patient.name, patient.phone, appt.date, appt.time);
            
            if (result.ok) {
              setWaToast({show:true, ok:true, msg:`Mensaje de ${status === "confirmada" ? "confirmación" : "cancelación"} enviado a ${patient.name}`});
            } else {
              setWaToast({show:true, ok:false, msg: result.error || "No se pudo enviar el mensaje"});
            }
            setTimeout(() => setWaToast({show:false,ok:false,msg:""}), 4000);
          }
        }
      }
    } catch (e) { console.error(e); }
  }

  /* Calendar helpers */
  const calAppts = appts.filter((a) => { const d = new Date(a.date+"T00:00"); return d.getFullYear()===calMonth.year && d.getMonth()===calMonth.month; });
  const dayAppts = (day: number) => calAppts.filter((a) => new Date(a.date+"T00:00").getDate()===day);
  const daysInMo = getDaysInMonth(calMonth.year, calMonth.month);
  const firstDay = getFirstDay(calMonth.year, calMonth.month);
  const monthLbl = new Date(calMonth.year, calMonth.month).toLocaleDateString("es-MX",{month:"long",year:"numeric"});

  const selPatient = selected ? patients.find((p) => p.id === selected.patientId) : null;

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily:"'DM Sans', sans-serif" }}>

      {/* WhatsApp toast */}
      {waToast.show && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-sm animate-in slide-in-from-right" style={{ background: waToast.ok ? "#ECFDF5" : "#FEF2F2", color: waToast.ok ? "#059669" : "#DC2626", border: `1px solid ${waToast.ok ? "#D1FAE5" : "#FCA5A5"}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.665 0-3.228-.5-4.528-1.358l-.325-.192-2.87.852.852-2.87-.192-.325A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
          <span>{waToast.msg}</span>
        </div>
      )}

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <div className={`flex flex-col border-r bg-card ${showMobileDetail ? "hidden md:flex" : "flex"} md:w-80 lg:w-96 shrink-0 h-full`} style={{ borderColor:"var(--border)" }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b space-y-3" style={{ borderColor:"var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>Citas</h2>
              <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{filtered.length} resultado{filtered.length!==1?"s":""}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex bg-muted rounded-xl p-0.5 gap-0.5">
                {(["list","calendar"] as const).map((v) => (
                  <button key={v} onClick={() => setViewMode(v)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background:viewMode===v?"var(--card)":"transparent", color:viewMode===v?"var(--primary)":"var(--muted-foreground)", boxShadow:viewMode===v?"0 1px 3px rgba(0,0,0,0.1)":"none" }}>
                    {v==="list"?"Lista":"Cal."}
                  </button>
                ))}
              </div>
              <button onClick={openCreate}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
                style={{ background:"var(--primary)", color:"#fff" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
            <input type="text" placeholder="Paciente o procedimiento…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} title="Filtrar por fecha"
              className="flex-1 px-2 py-2 rounded-xl border text-xs outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
            <select value={filterStatus} onChange={(e) => setFilter(e.target.value)}
              className="flex-1 px-2 py-2 rounded-xl border text-xs outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
              <option value="todos">Todos</option>
              {Object.entries(statusCfg).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(filterDate || filterStatus !== "todos") && (
              <button onClick={() => { setFilterDate(""); setFilter("todos"); }} className="px-2.5 py-2 rounded-xl hover:bg-muted transition-colors" title="Limpiar filtros">
                <X className="w-3.5 h-3.5" style={{ color:"var(--muted-foreground)" }} />
              </button>
            )}
          </div>
        </div>

        {/* List / Calendar */}
        {viewMode === "list" ? (
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor:"var(--border)" }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <Calendar className="w-12 h-12" style={{ color:"var(--muted-foreground)", opacity:0.3 }} />
                <p className="text-sm" style={{ color:"var(--muted-foreground)" }}>Sin resultados</p>
              </div>
            ) : filtered.map((a) => {
              const cfg = statusCfg[a.status];
              const StatusIcon = cfg.Icon;
              const isSelected = selected?.id === a.id;
              return (
                <button key={a.id} onClick={() => selectAppt(a)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors"
                  style={{ background:isSelected?"var(--secondary)":"transparent" }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background="var(--muted)"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background="transparent"; }}>
                  <div className="shrink-0 text-center w-11 pt-0.5">
                    <p className="text-sm font-bold" style={{ color: isSelected?"var(--primary)":"var(--foreground)" }}>{a.time}</p>
                    <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>{a.duration}m</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color:"var(--foreground)" }}>{a.patient?.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color:"var(--muted-foreground)" }}>{a.procedure}</p>
                    <p className="text-xs mt-1" style={{ color:"var(--muted-foreground)" }}>{fmtDate(a.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusIcon className="w-3.5 h-3.5" style={{ color:cfg.color }} />
                    {isSelected && <div className="w-1.5 h-8 rounded-full" style={{ background:"var(--primary)" }} />}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Calendar view */
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor:"var(--border)" }}>
              <button onClick={() => setCalMonth((m) => { const d=new Date(m.year,m.month-1); return{year:d.getFullYear(),month:d.getMonth()}; })} className="p-1.5 rounded-lg hover:bg-muted">
                <ChevronLeft className="w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
              </button>
              <p className="text-sm font-bold capitalize" style={{ color:"var(--foreground)" }}>{monthLbl}</p>
              <button onClick={() => setCalMonth((m) => { const d=new Date(m.year,m.month+1); return{year:d.getFullYear(),month:d.getMonth()}; })} className="p-1.5 rounded-lg hover:bg-muted">
                <ChevronRight className="w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
              </button>
            </div>
            <div className="grid grid-cols-7 px-1 pt-1">
              {["L","M","X","J","V","S","D"].map((d) => (
                <div key={d} className="text-center py-1.5 text-xs font-bold" style={{ color:"var(--muted-foreground)" }}>{d}</div>
              ))}
              {Array.from({length:firstDay}).map((_,i) => <div key={`e${i}`} className="h-10" />)}
              {Array.from({length:daysInMo}).map((_,i) => {
                const day = i+1;
                const da  = dayAppts(day);
                const today = new Date(); const isToday = today.getDate()===day && today.getMonth()===calMonth.month && today.getFullYear()===calMonth.year;
                return (
                  <div key={day} className="flex flex-col items-center pt-1 pb-2 cursor-pointer rounded-xl hover:bg-muted transition-colors"
                    onClick={() => { if (da.length) { selectAppt(da[0]); setFilterDate(`${calMonth.year}-${String(calMonth.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`); setViewMode("list"); } }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background:isToday?"var(--primary)":"transparent", color:isToday?"#fff":"var(--foreground)" }}>
                      {day}
                    </span>
                    {da.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {da.slice(0,3).map((a,j) => <div key={j} className="w-1.5 h-1.5 rounded-full" style={{ background:statusCfg[a.status].color }} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Detail ─────────────────────────── */}
      <div className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-background ${showMobileDetail?"flex":"hidden md:flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background:"var(--secondary)" }}>
              <Calendar className="w-10 h-10" style={{ color:"var(--primary)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg" style={{ color:"var(--foreground)" }}>Selecciona una cita</p>
              <p className="text-sm mt-1" style={{ color:"var(--muted-foreground)" }}>El detalle aparecerá aquí</p>
              <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 mx-auto" style={{ background:"var(--primary)", color:"#fff" }}>
                <Plus className="w-4 h-4" /> Nueva cita
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div className="shrink-0 border-b px-5 md:px-7 py-5" style={{ borderColor:"var(--border)", background:"var(--card)" }}>
              {/* Mobile back */}
              <button className="flex items-center gap-1.5 text-sm font-semibold mb-4 md:hidden" style={{ color:"var(--primary)" }} onClick={() => setShowMobileDetail(false)}>
                <ChevronRight className="w-4 h-4 rotate-180" /> Citas
              </button>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-3">
                    {(() => { const cfg=statusCfg[selected.status]; const SI=cfg.Icon; return (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold" style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
                        <SI className="w-3.5 h-3.5" />{cfg.label}
                      </span>
                    ); })()}
                    <span className="text-sm" style={{ color:"var(--muted-foreground)" }}>{selected.duration} min</span>
                  </div>

                  <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.3rem", lineHeight:1.2 }}>{selected.patient?.name}</h2>
                  <p className="text-base mt-1 font-medium" style={{ color:"var(--muted-foreground)" }}>{selected.procedure}</p>

                  {/* Quick info pills */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium" style={{ background:"var(--muted)", color:"var(--foreground)" }}>
                      <Calendar className="w-4 h-4" style={{ color:"var(--primary)" }} />
                      {new Date(selected.date+"T00:00").toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium" style={{ background:"var(--muted)", color:"var(--foreground)" }}>
                      <Clock className="w-4 h-4" style={{ color:"var(--primary)" }} />
                      {selected.time} hrs
                    </span>
                    <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium" style={{ background:"var(--muted)", color:"var(--foreground)" }}>
                      <User className="w-4 h-4" style={{ color:"var(--primary)" }} />
                      {selected.doctor?.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium" style={{ background:"var(--secondary)", color:"var(--primary)" }}>
                      <DollarSign className="w-4 h-4" />
                      ${selected.cost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(selected)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors"
                    style={{ borderColor:"var(--border)", color:"var(--foreground)" }}>
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={() => setDel(selected.id)} className="p-2.5 rounded-xl hover:bg-red-50 transition-colors border" style={{ borderColor:"var(--border)" }}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto px-5 md:px-7 py-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Left: Notes + status change */}
                <div className="space-y-4">
                  {/* Notes */}
                  <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color:"var(--foreground)" }}>
                      <FileText className="w-4 h-4" style={{ color:"var(--primary)" }} /> Notas de la cita
                    </h3>
                    {selected.notes ? (
                      <p className="text-sm leading-relaxed" style={{ color:"var(--foreground)" }}>{selected.notes}</p>
                    ) : (
                      <p className="text-sm" style={{ color:"var(--muted-foreground)" }}>Sin notas adicionales.</p>
                    )}
                  </div>

                  {/* Change status */}
                  <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                    <h3 className="font-bold text-sm mb-3" style={{ color:"var(--foreground)" }}>Cambiar estado</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(statusCfg) as Status[]).map((s) => {
                        const cfg = statusCfg[s];
                        const SI  = cfg.Icon;
                        const isActive = selected.status === s;
                        return (
                          <button key={s} onClick={() => changeStatus(selected.id, s)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                            style={{ background:isActive?cfg.bg:"var(--input-background)", color:isActive?cfg.color:"var(--muted-foreground)", borderColor:isActive?cfg.border:"var(--border)", opacity:isActive?1:0.85 }}>
                            <SI className="w-3.5 h-3.5" />{cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Patient info */}
                <div className="rounded-2xl border p-5" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color:"var(--foreground)" }}>
                    <User className="w-4 h-4" style={{ color:"var(--primary)" }} /> Datos del paciente
                  </h3>
                  {selPatient ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold" style={{ background:"var(--secondary)", color:"var(--primary)" }}>
                          {selPatient.name.split(" ").map((n)=>n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color:"var(--foreground)" }}>{selPatient.name}</p>
                          <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>
                            {selPatient.gender==="F"?"Femenino":"Masculino"} · Tipo {selPatient.bloodType}
                          </p>
                        </div>
                      </div>
                      {[
                        { label:"Teléfono",  value:selPatient.phone },
                        { label:"Ciudad",    value:selPatient.city  },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b" style={{ borderColor:"var(--border)" }}>
                          <span className="text-sm" style={{ color:"var(--muted-foreground)" }}>{label}</span>
                          <span className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>{value}</span>
                        </div>
                      ))}
                      {selPatient.allergies !== "Ninguna" && (
                        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background:"#FEF2F2" }}>
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color:"#DC2626" }} />
                          <div>
                            <p className="text-xs font-bold" style={{ color:"#DC2626" }}>Alergias conocidas</p>
                            <p className="text-sm mt-0.5" style={{ color:"#DC2626" }}>{selPatient.allergies}</p>
                          </div>
                        </div>
                      )}
                      {selPatient.medicalConditions !== "Ninguna" && (
                        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background:"#FFFBEB" }}>
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color:"#D97706" }} />
                          <div>
                            <p className="text-xs font-bold" style={{ color:"#D97706" }}>Condición médica</p>
                            <p className="text-sm mt-0.5" style={{ color:"#D97706" }}>{selPatient.medicalConditions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color:"var(--muted-foreground)" }}>Paciente no encontrado en el sistema.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Form modal ─────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-black/50">
          <div className="bg-card w-full md:max-w-xl rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10" style={{ borderColor:"var(--border)" }}>
              <div>
                <h3 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>
                  {editingId ? "Editar cita" : "Nueva cita"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>
                  Solo puedes agendar con pacientes registrados
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-5 h-5" style={{ color:"var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Patient selector */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>
                  Paciente registrado *
                </label>
                <PatientSelector
                  value={form.patientId}
                  patients={patients}
                  onChange={(id) => setForm({ ...form, patientId: id })}
                />
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background:"#FEF2F2", color:"#DC2626", border:"1px solid #FCA5A5" }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              {/* Date / Time / Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Fecha *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({...form,date:e.target.value})}
                    min={new Date().toLocaleDateString("en-CA", {timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone})}
                    className="w-full px-3 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Hora *</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({...form,time:e.target.value})}
                    min={form.date === new Date().toLocaleDateString("en-CA", {timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone}) ? `${String(new Date().getHours()).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}` : undefined}
                    className="w-full px-3 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Duración</label>
                  <select value={form.duration} onChange={(e) => setForm({...form,duration:+e.target.value})}
                    className="w-full px-3 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                    {[15,30,45,60,90,120,180].map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>

              {/* Procedure / Doctor / Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Procedimiento *</label>
                  <select value={form.procedure} onChange={(e) => setForm({...form,procedure:e.target.value})}
                    className="w-full px-3 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                    <option value="">Seleccionar...</option>
                    {procedures.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Doctor *</label>
                  <select value={form.doctorId} onChange={(e) => setForm({...form,doctorId:e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                    {doctorsList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Costo ($)</label>
                  <input type="number" min="0" value={form.cost} onChange={(e) => setForm({...form,cost:+e.target.value})}
                    className="w-full px-3 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Estado</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(statusCfg) as Status[]).map((s) => {
                    const cfg = statusCfg[s]; const SI = cfg.Icon;
                    return (
                      <button key={s} type="button" onClick={() => setForm({...form,status:s})}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                        style={{ background:form.status===s?cfg.bg:"var(--input-background)", color:form.status===s?cfg.color:"var(--muted-foreground)", borderColor:form.status===s?cfg.border:"var(--border)" }}>
                        <SI className="w-3.5 h-3.5" />{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Notas adicionales</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})} rows={3}
                  placeholder="Observaciones, indicaciones especiales…"
                  className="w-full px-3 py-3 rounded-xl border text-sm outline-none resize-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border text-sm font-bold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
                <button onClick={save} className="flex-1 py-3 rounded-xl text-sm font-bold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
                  {editingId ? "Guardar cambios" : "Crear cita"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold mb-2" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>¿Eliminar cita?</h3>
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
