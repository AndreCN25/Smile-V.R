import { useState, useEffect } from "react";
import { Plus, X, Edit2, Save, Trash2, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import { getSchedules, updateSchedule, getBlockedDates, createBlockedDate, deleteBlockedDate } from "../../services/api";

type ScheduleTab = "semana" | "horarios" | "bloqueados";

interface Slot { start: string; end: string; }
interface DaySchedule { open: boolean; slots: Slot[]; }

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const DAY_SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

const initialSchedule: Record<string, DaySchedule> = {
  Lunes:     { open: true,  slots: [{ start:"09:00",end:"14:00" },{ start:"15:00",end:"19:00" }] },
  Martes:    { open: true,  slots: [{ start:"09:00",end:"14:00" },{ start:"15:00",end:"19:00" }] },
  Miércoles: { open: true,  slots: [{ start:"09:00",end:"14:00" },{ start:"15:00",end:"18:00" }] },
  Jueves:    { open: true,  slots: [{ start:"09:00",end:"14:00" },{ start:"15:00",end:"19:00" }] },
  Viernes:   { open: true,  slots: [{ start:"09:00",end:"14:00" }] },
  Sábado:    { open: true,  slots: [{ start:"09:00",end:"13:00" }] },
  Domingo:   { open: false, slots: [] },
};

interface BlockedDate {
  id: string; date: string; reason: string; allDay: boolean; startTime?: string; endTime?: string;
}

const MOCK_WEEK: Record<string, { time: string; patient: string; procedure: string; color: string }[]> = {
  Lunes:    [], Martes:   [], Miércoles:[], Jueves:   [], Viernes:  [], Sábado:   [], Domingo:  [],
};

function getWeekDates(offset = 0) {
  const today = new Date();
  const mon   = new Date(today);
  mon.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + offset * 7);
  return DAYS.map((_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}

export function Schedule() {
  const [tab, setTab]         = useState<ScheduleTab>("semana");
  const [schedule, setSchedule] = useState(initialSchedule);
  const [blocked, setBlocked]   = useState<BlockedDate[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ date:"", reason:"", allDay:true, startTime:"09:00", endTime:"12:00" });
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const dbScheds = await getSchedules();
      if (dbScheds.length > 0) {
        const newSched = { ...initialSchedule };
        dbScheds.forEach((s: any) => {
          if (newSched[s.day]) {
            newSched[s.day] = { open: s.open, slots: typeof s.slots === 'string' ? JSON.parse(s.slots) : s.slots };
          }
        });
        setSchedule(newSched);
      }
      
      const dbBlocked = await getBlockedDates();
      setBlocked(dbBlocked);
    } catch (e) {
      console.error(e);
      showToast("Error al cargar datos");
    }
  }

  const weekDates = getWeekDates(weekOffset);
  const monthLabel = new Date(weekDates[0]).toLocaleDateString("es-MX",{ month:"long", year:"numeric" });

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }
  function addSlot(day: string)   { setSchedule((s) => ({ ...s, [day]: { ...s[day], slots: [...s[day].slots, { start:"09:00", end:"17:00" }] } })); }
  function removeSlot(day: string, idx: number) { setSchedule((s) => ({ ...s, [day]: { ...s[day], slots: s[day].slots.filter((_,i)=>i!==idx) } })); }
  function updateSlot(day: string, idx: number, field: "start"|"end", val: string) {
    setSchedule((s) => { const slots=[...s[day].slots]; slots[idx]={...slots[idx],[field]:val}; return { ...s, [day]: { ...s[day], slots } }; });
  }
  function toggleOpen(day: string) { setSchedule((s) => ({ ...s, [day]: { ...s[day], open: !s[day].open } })); }
  
  async function saveSchedule() {
    try {
      for (const day of DAYS) {
        await updateSchedule(day, { open: schedule[day].open, slots: schedule[day].slots });
      }
      showToast("Horario guardado correctamente ✓");
    } catch (e) {
      console.error(e);
      showToast("Error al guardar horario");
    }
  }
  
  async function addBlocked() {
    if (!blockForm.date || !blockForm.reason) return;
    try {
      const res = await createBlockedDate(blockForm);
      setBlocked([...blocked, res]);
      setShowBlockModal(false);
      setBlockForm({ date:"", reason:"", allDay:true, startTime:"09:00", endTime:"12:00" });
      showToast("Fecha bloqueada ✓");
    } catch (e) { console.error(e); showToast("Error al bloquear fecha"); }
  }

  async function removeBlocked(id: string) {
    try {
      await deleteBlockedDate(id);
      setBlocked(blocked.filter((bd) => bd.id !== id));
      showToast("Fecha desbloqueada ✓");
    } catch (e) { console.error(e); showToast("Error al desbloquear"); }
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium" style={{ background:"#ECFDF5", color:"#059669", border:"1px solid #D1FAE5" }}>
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-card rounded-2xl border p-1 gap-1" style={{ borderColor:"var(--border)" }}>
        {(["semana","horarios","bloqueados"] as ScheduleTab[]).map((v) => (
          <button key={v} onClick={() => setTab(v)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
            style={{ background: tab===v ? "var(--primary)" : "transparent", color: tab===v ? "#fff" : "var(--muted-foreground)" }}>
            {v === "semana" ? "Vista semanal" : v === "horarios" ? "Horarios" : "Días bloqueados"}
          </button>
        ))}
      </div>

      {/* ── SEMANA ─── */}
      {tab === "semana" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset((o)=>o-1)} className="p-2 rounded-xl border hover:bg-muted transition-colors" style={{ borderColor:"var(--border)" }}>
              <ChevronLeft className="w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
            </button>
            <p className="text-sm font-semibold capitalize" style={{ color:"var(--foreground)" }}>
              {weekDates[0].toLocaleDateString("es-MX",{day:"numeric",month:"short"})} — {weekDates[6].toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})}
            </p>
            <button onClick={() => setWeekOffset((o)=>o+1)} className="p-2 rounded-xl border hover:bg-muted transition-colors" style={{ borderColor:"var(--border)" }}>
              <ChevronRight className="w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day, i) => {
              const date = weekDates[i];
              const isToday = date.toDateString() === new Date().toDateString();
              const ds = schedule[day];
              const appts = MOCK_WEEK[day] || [];
              return (
                <div key={day} className="rounded-xl overflow-hidden border" style={{ borderColor: isToday ? "var(--primary)" : "var(--border)", boxShadow: isToday ? "0 0 0 2px var(--primary)" : undefined }}>
                  <div className="text-center py-2 px-1" style={{ background: isToday ? "var(--primary)" : ds.open ? "var(--muted)" : "#F9FAFB" }}>
                    <p className="text-xs font-bold" style={{ color: isToday ? "#fff" : "var(--muted-foreground)" }}>{DAY_SHORT[i]}</p>
                    <p style={{ fontSize:"1rem", fontWeight:800, color: isToday ? "#fff" : "var(--foreground)" }}>{date.getDate()}</p>
                  </div>
                  <div className="p-1 min-h-[80px] space-y-1" style={{ background: ds.open ? "var(--card)" : "var(--muted)" }}>
                    {!ds.open
                      ? <p className="text-xs text-center py-3" style={{ color:"var(--muted-foreground)" }}>Cerrado</p>
                      : appts.length === 0
                        ? <p className="text-xs text-center py-3" style={{ color:"var(--muted-foreground)", opacity:0.4 }}>Sin citas</p>
                        : appts.map((a, j) => (
                          <div key={j} className="rounded-lg p-1 text-center" style={{ background: a.color + "18", borderLeft:`2px solid ${a.color}` }}>
                            <p style={{ fontSize:"9px", fontWeight:700, color: a.color }}>{a.time}</p>
                            <p className="truncate" style={{ fontSize:"8px", color:"var(--foreground)" }}>{a.patient.split(" ")[0]}</p>
                          </div>
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HORARIOS ─── */}
      {tab === "horarios" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold" style={{ color:"var(--foreground)" }}>Horarios de atención</p>
            <button onClick={saveSchedule} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 shadow-sm" style={{ background:"var(--primary)", color:"#fff" }}>
              <Save className="w-4 h-4" /> Guardar cambios
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {DAYS.map((day) => {
              const ds = schedule[day];
              return (
                <div key={day} className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: ds.open ? "var(--border)" : "var(--border)" }}>
                  <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: ds.open ? "var(--secondary)" : "var(--muted)" }}>
                    <button onClick={() => toggleOpen(day)}
                      className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                      style={{ background: ds.open ? "var(--primary)" : "#CBD5E1" }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all" style={{ left: ds.open ? "calc(100% - 1.375rem)" : "0.125rem" }} />
                    </button>
                    <div className="flex-1">
                      <span className="font-bold text-base" style={{ color: ds.open ? "var(--primary)" : "var(--muted-foreground)" }}>{day}</span>
                    </div>
                  </div>
                  {ds.open && (
                    <div className="px-4 py-3 space-y-3">
                      <div className="space-y-2">
                        {ds.slots.length === 0 && <p className="text-sm text-center py-2" style={{ color:"var(--muted-foreground)" }}>Sin turnos</p>}
                        {ds.slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background:"var(--muted)" }}>
                            <div className="flex gap-1 flex-1">
                              <input type="time" value={slot.start} onChange={(e) => updateSlot(day, idx, "start", e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border text-sm outline-none font-mono" style={{ borderColor:"var(--border)", background:"var(--card)" }} />
                              <span className="px-1 text-muted-foreground">-</span>
                              <input type="time" value={slot.end} onChange={(e) => updateSlot(day, idx, "end", e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border text-sm outline-none font-mono" style={{ borderColor:"var(--border)", background:"var(--card)" }} />
                            </div>
                            <button onClick={() => removeSlot(day, idx)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addSlot(day)} className="px-3 py-1.5 rounded-xl text-sm font-semibold border" style={{ borderColor:"var(--primary)", color:"var(--primary)" }}>+ Turno</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl sticky bottom-4" style={{ background:"var(--primary)", color:"#fff" }}>
            <Save className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium flex-1">Recuerda guardar los cambios</p>
            <button onClick={saveSchedule} className="px-4 py-1.5 rounded-xl text-sm font-bold" style={{ background:"#fff", color:"var(--primary)" }}>Guardar</button>
          </div>
        </div>
      )}

      {/* ── BLOQUEADOS ─── */}
      {tab === "bloqueados" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color:"var(--muted-foreground)" }}>Días sin atención</p>
            <button onClick={() => setShowBlockModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
              <Plus className="w-3.5 h-3.5" /> Bloquear fecha
            </button>
          </div>
          {blocked.length === 0 && (
            <div className="text-center py-16"><p className="text-sm text-muted-foreground">No hay fechas bloqueadas</p></div>
          )}
          {blocked.map((b) => (
            <div key={b.id} className="bg-card rounded-2xl border p-4 flex items-start gap-3" style={{ borderColor:"var(--border)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>{b.reason}</p>
                <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>{b.date}</p>
              </div>
              <button onClick={() => removeBlocked(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Block modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Bloquear fecha</h3>
            <input type="date" value={blockForm.date} onChange={(e) => setBlockForm({...blockForm,date:e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
            <input type="text" value={blockForm.reason} onChange={(e) => setBlockForm({...blockForm,reason:e.target.value})} placeholder="Motivo" className="w-full px-3 py-2 border rounded-xl" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowBlockModal(false)} className="flex-1 py-2 border rounded-xl">Cancelar</button>
              <button onClick={addBlocked} className="flex-1 py-2 bg-red-600 text-white rounded-xl">Bloquear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

