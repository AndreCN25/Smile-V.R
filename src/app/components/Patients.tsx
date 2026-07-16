import { useState, useMemo } from "react";
import {
  Plus, Search, X, Edit2, Trash2, Phone, Mail, MapPin,
  Calendar, User, FileText, AlertTriangle, ChevronRight,
  Heart, CreditCard, Clock, CheckCircle
} from "lucide-react";
import { Patient } from "../data/patients";
import { getPatients, createPatient, updatePatient, deletePatient, getPatientAppointments } from "../../services/api";
import { ensurePhonePrefix } from "../../services/whatsapp";

const bloodTypes = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

const emptyForm: Omit<Patient,"id"|"treatments"> = {
  name:"", dob:"", gender:"F", phone:"+52", email:"", address:"", city:"Mérida, Yuc.",
  bloodType:"O+", allergies:"Ninguna", medicalConditions:"Ninguna",
  emergencyContact:"", emergencyPhone:"", lastVisit:"", totalVisits:0, balance:0, notes:"", active:true,
};

function calcAge(dob: string) {
  if (!dob) return "—";
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25*24*3600*1000)) + " años";
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase();
}

/* ── Component ─────────────────────────────────────────── */
export function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]         = useState<Omit<Patient,"id"|"treatments">>(emptyForm);
  const [delConfirm, setDel]    = useState<string|null>(null);
  const [detailTab, setDetailTab] = useState<"info"|"historial"|"cuenta">("info");
  const [toast, setToast]       = useState("");
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<"abonar" | "cargar">("abonar");

  // Fetch initial data
  useState(() => {
    getPatients().then(data => {
      setPatients(data || []);
      if (data && data.length > 0) {
        selectPatient(data[0]);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  });

  const filtered = useMemo(() =>
    patients.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
    ), [patients, search]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function selectPatient(p: Patient) {
    setSelected(p);
    setShowMobileDetail(true);
    setLoading(true);
    try {
      const appts = await getPatientAppointments(p.id);
      const completed = appts.filter((a: any) => a.status === 'completada').map((a: any) => ({
        procedure: a.procedure,
        doctor: a.doctor?.name || "Dr. asignado",
        date: a.date,
        cost: a.cost || 0,
        notes: a.notes
      }));
      setSelected((prev: any) => ({ ...prev, treatments: completed }));
    } catch (e) {
      console.error("Error loading patient appointments", e);
    }
    setLoading(false);
  }

  function openCreate() {
    setForm(emptyForm); setEditingId(null); setShowForm(true);
  }
  function openEdit(p: Patient) {
    const { id, treatments, ...rest } = p;
    setForm(rest); setEditingId(p.id); setShowForm(true);
  }
  async function save() {
    if (!form.name || !form.phone || !form.dob) {
      showToast("Por favor, llena Nombre, Teléfono y Fecha de Nacimiento.");
      return;
    }
    try {
      if (editingId !== null) {
        const updated = await updatePatient(editingId, form);
        setPatients(patients.map((p) => p.id === editingId ? { ...p, ...updated } : p));
        setSelected({ ...selected, ...updated });
        showToast("Paciente actualizado ✓");
      } else {
        const np = await createPatient({ ...form, id: undefined }); // DB generates UUID
        setPatients([np, ...patients]);
        setSelected(np);
        showToast("Paciente registrado ✓");
      }
      setShowForm(false);
    } catch (e: any) {
      console.error(e);
      showToast((e.message || String(e)) || "Error al guardar");
    }
  }

  async function updatePatientBalance() {
    if (!selected) return;
    try {
      const diff = paymentType === "abonar" ? -Math.abs(paymentAmount) : Math.abs(paymentAmount);
      const newBalance = Math.max(0, (selected.balance || 0) + diff);
      const updated = await updatePatient(selected.id, { balance: newBalance });
      setPatients(patients.map(p => p.id === selected.id ? { ...p, balance: newBalance } : p));
      setSelected({ ...selected, balance: newBalance });
      setPaymentModal(false);
      setPaymentAmount(0);
      showToast("Saldo actualizado ✓");
    } catch (e) { console.error(e); showToast("Error al actualizar saldo"); }
  }

  async function del(id: string) {
    try {
      await deletePatient(id);
      const remaining = patients.filter((p) => p.id !== id);
      setPatients(remaining);
      if (remaining.length > 0) setSelected(remaining[0]);
      setDel(null);
      showToast("Paciente eliminado");
    } catch (e) {
      console.error(e);
      showToast("Error al eliminar");
    }
  }

  const totalPaid = selected?.treatments?.reduce((a: any, t: any) => a + t.cost, 0) ?? 0;

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold" style={{ background:"#ECFDF5", color:"#059669", border:"1px solid #D1FAE5" }}>
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      {/* ── LEFT: Lista de pacientes ────────────────────── */}
      <div className={`flex flex-col border-r bg-card ${showMobileDetail ? "hidden md:flex" : "flex"} md:w-80 lg:w-96 shrink-0 h-full`} style={{ borderColor:"var(--border)" }}>
        {/* Header lista */}
        <div className="px-4 py-4 border-b" style={{ borderColor:"var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>Pacientes</h2>
              <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{filtered.length} de {patients.length}</p>
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background:"var(--primary)", color:"#fff" }}>
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="Nombre, teléfono o correo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color:"var(--muted-foreground)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor:"var(--border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color:"var(--muted-foreground)" }}>Cargando pacientes...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <User className="w-12 h-12" style={{ color:"var(--muted-foreground)", opacity:0.4 }} />
              <p className="text-sm" style={{ color:"var(--muted-foreground)" }}>Sin resultados</p>
              <button onClick={() => setSearch("")} className="text-xs font-semibold" style={{ color:"var(--primary)" }}>Limpiar búsqueda</button>
            </div>
          ) : filtered.map((p) => {
            const isSelected = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ background: isSelected ? "var(--secondary)" : "transparent" }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--muted)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors"
                  style={{ background: isSelected ? "var(--primary)" : "var(--muted)", color: isSelected ? "#fff" : "var(--muted-foreground)" }}>
                  {initials(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color:"var(--foreground)" }}>{p.name}</p>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color:"var(--muted-foreground)" }}>{calcAge(p.dob)} · {p.city}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.allergies !== "Ninguna" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background:"#FEF2F2", color:"#DC2626" }}>⚠ Alergia</span>
                    )}
                    {p.balance > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background:"#FFFBEB", color:"#D97706" }}>$ Saldo</span>
                    )}
                    <span className="text-xs" style={{ color:"var(--muted-foreground)" }}>{p.totalVisits} visitas</span>
                  </div>
                </div>
                {isSelected && <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background:"var(--primary)" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Detalle del paciente ─────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background ${showMobileDetail ? "flex" : "hidden md:flex"}`}>
        {!selected ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background:"var(--secondary)" }}>
              <User className="w-10 h-10" style={{ color:"var(--primary)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{ color:"var(--foreground)" }}>Selecciona un paciente</p>
              <p className="text-sm mt-1" style={{ color:"var(--muted-foreground)" }}>El expediente aparecerá aquí</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Profile header ── */}
            <div className="shrink-0 border-b px-6 py-5" style={{ borderColor:"var(--border)", background:"var(--card)" }}>
              {/* Mobile back */}
              <button className="flex items-center gap-1.5 text-sm font-semibold mb-4 md:hidden" style={{ color:"var(--primary)" }} onClick={() => setShowMobileDetail(false)}>
                <ChevronRight className="w-4 h-4 rotate-180" /> Pacientes
              </button>

              <div className="flex items-start gap-5">
                {/* Big avatar */}
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-bold shrink-0 hidden sm:flex" style={{ background:"var(--secondary)", color:"var(--primary)" }}>
                  {initials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.3rem", lineHeight:1.2 }}>{selected.name}</h2>
                      <p className="text-sm mt-1" style={{ color:"var(--muted-foreground)" }}>
                        {selected.gender === "F" ? "Femenino" : "Masculino"} · {calcAge(selected.dob)} · {selected.city}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:"var(--secondary)", color:"var(--primary)" }}>
                          Tipo {selected.bloodType}
                        </span>
                        {selected.allergies !== "Ninguna" && (
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:"#FEF2F2", color:"#DC2626" }}>
                            ⚠ {selected.allergies}
                          </span>
                        )}
                        {selected.medicalConditions !== "Ninguna" && (
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:"#FFFBEB", color:"#D97706" }}>
                            {selected.medicalConditions}
                          </span>
                        )}
                        {selected.balance > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:"#FEF3C7", color:"#D97706" }}>
                            Saldo: ${selected.balance.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openEdit(selected)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors"
                        style={{ borderColor:"var(--border)", color:"var(--foreground)" }}>
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button onClick={() => setDel(selected.id)} className="p-2 rounded-xl hover:bg-red-50 transition-colors border" style={{ borderColor:"var(--border)" }}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { label:"Total visitas",  value: selected.totalVisits,                                                  color:"var(--primary)", bg:"var(--secondary)", icon:Calendar },
                  { label:"Total pagado",   value:`$${totalPaid.toLocaleString()}`,                                       color:"#059669",        bg:"#ECFDF5",          icon:CreditCard },
                  { label:"Última visita",  value: selected.lastVisit ? new Date(selected.lastVisit+"T00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"}) : "—", color:"#7C3AED", bg:"#EDE9FE", icon:Clock },
                ].map(({ label, value, color, bg, icon:Icon }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background:bg }}>
                    <Icon className="w-5 h-5 shrink-0" style={{ color }} />
                    <div>
                      <p className="font-bold" style={{ color, fontSize:"1rem", lineHeight:1 }}>{value}</p>
                      <p className="text-xs mt-0.5" style={{ color }}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="shrink-0 px-6 py-3 border-b flex gap-2" style={{ borderColor:"var(--border)", background:"var(--card)" }}>
              {(["info","historial","cuenta"] as const).map((t) => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize"
                  style={{ background: detailTab===t ? "var(--primary)" : "var(--muted)", color: detailTab===t ? "#fff" : "var(--muted-foreground)" }}>
                  {t === "info" ? "Información" : t === "historial" ? "Historial clínico" : "Cuenta y saldo"}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* INFO */}
              {detailTab === "info" && (
                <div className="grid md:grid-cols-2 gap-5 max-w-3xl">
                  {/* Contacto */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color:"var(--muted-foreground)" }}>Contacto</h3>
                    {[
                      { icon:Phone,   label:"Teléfono",  value:selected.phone },
                      { icon:Mail,    label:"Correo",     value:selected.email || "—" },
                      { icon:MapPin,  label:"Dirección",  value:`${selected.address}, ${selected.city}` },
                      { icon:Calendar,label:"Nacimiento", value:selected.dob ? new Date(selected.dob+"T00:00").toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"}) : "—" },
                    ].map(({ icon:Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 p-4 rounded-2xl" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"var(--secondary)" }}>
                          <Icon className="w-4.5 h-4.5" style={{ color:"var(--primary)" }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color:"var(--muted-foreground)" }}>{label}</p>
                          <p className="text-sm font-semibold mt-0.5" style={{ color:"var(--foreground)" }}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Médico */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color:"var(--muted-foreground)" }}>Información médica</h3>
                    {[
                      { icon:Heart,        label:"Tipo de sangre",      value:selected.bloodType,          color:"#DC2626", bg:"#FEF2F2" },
                      { icon:AlertTriangle, label:"Alergias",            value:selected.allergies,          color: selected.allergies==="Ninguna" ? "var(--primary)" : "#DC2626", bg: selected.allergies==="Ninguna" ? "var(--secondary)" : "#FEF2F2" },
                      { icon:FileText,     label:"Condiciones médicas",  value:selected.medicalConditions,  color:"#D97706", bg:"#FFFBEB" },
                    ].map(({ icon:Icon, label, value, color, bg }) => (
                      <div key={label} className="flex items-start gap-3 p-4 rounded-2xl" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:bg }}>
                          <Icon className="w-4.5 h-4.5" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color:"var(--muted-foreground)" }}>{label}</p>
                          <p className="text-sm font-semibold mt-0.5" style={{ color:"var(--foreground)" }}>{value}</p>
                        </div>
                      </div>
                    ))}

                    {/* Emergencia */}
                    <div className="p-4 rounded-2xl" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
                      <p className="text-xs font-medium mb-2" style={{ color:"var(--muted-foreground)" }}>Contacto de emergencia</p>
                      <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>{selected.emergencyContact || "—"}</p>
                      {selected.emergencyPhone && <p className="text-xs mt-1" style={{ color:"var(--muted-foreground)" }}>{selected.emergencyPhone}</p>}
                    </div>

                    {selected.notes && (
                      <div className="p-4 rounded-2xl border-l-4" style={{ background:"var(--secondary)", borderLeftColor:"var(--primary)" }}>
                        <p className="text-xs font-medium mb-1" style={{ color:"var(--primary)" }}>Notas clínicas</p>
                        <p className="text-sm" style={{ color:"var(--foreground)" }}>{selected.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HISTORIAL */}
              {detailTab === "historial" && (
                <div className="max-w-2xl space-y-3">
                  {selected.treatments && selected.treatments.length > 0 ? (
                    <>
                      {selected.treatments.map((t: any, i: number) => (
                        <div key={i} className="p-5 rounded-2xl border" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-bold" style={{ color:"var(--foreground)", fontSize:"1rem" }}>{t.procedure}</p>
                              <p className="text-sm mt-1" style={{ color:"var(--muted-foreground)" }}>
                                {t.doctor} · {new Date(t.date+"T00:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}
                              </p>
                              {t.notes && <p className="text-sm mt-2 p-2 rounded-lg" style={{ color:"var(--muted-foreground)", background:"var(--muted)" }}>{t.notes}</p>}
                            </div>
                            <p className="font-bold shrink-0" style={{ color:"var(--primary)", fontSize:"1.1rem" }}>${t.cost.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-4 rounded-2xl font-bold" style={{ background:"var(--secondary)" }}>
                        <span style={{ color:"var(--primary)" }}>Total acumulado</span>
                        <span style={{ color:"var(--primary)", fontSize:"1.1rem" }}>${totalPaid.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <FileText className="w-14 h-14" style={{ color:"var(--muted-foreground)", opacity:0.3 }} />
                      <p className="font-semibold" style={{ color:"var(--muted-foreground)" }}>Sin historial registrado</p>
                      <p className="text-sm" style={{ color:"var(--muted-foreground)" }}>Los tratamientos se agregarán aquí conforme se realicen</p>
                    </div>
                  )}
                </div>
              )}

              {/* CUENTA */}
              {detailTab === "cuenta" && (
                <div className="max-w-lg space-y-4">
                  {/* Balance hero */}
                  <div className="p-6 rounded-2xl text-center" style={{ background: selected.balance>0 ? "#FFFBEB" : "var(--secondary)", border:`1px solid ${selected.balance>0 ? "#FDE68A" : "var(--border)"}` }}>
                    <p className="text-sm font-medium mb-1" style={{ color: selected.balance>0 ? "#D97706" : "var(--muted-foreground)" }}>
                      {selected.balance>0 ? "Saldo pendiente de pago" : "Cuenta al corriente"}
                    </p>
                    <p style={{ fontSize:"2.5rem", fontWeight:800, color: selected.balance>0 ? "#D97706" : "var(--primary)", lineHeight:1 }}>
                      ${selected.balance.toLocaleString()}
                    </p>
                    {selected.balance>0 && (
                      <button onClick={() => setPaymentModal(true)} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background:"#D97706", color:"#fff" }}>
                        Registrar pago
                      </button>
                    )}
                    {selected.balance<=0 && (
                      <button onClick={() => setPaymentModal(true)} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background:"var(--muted)", color:"var(--foreground)", border: "1px solid var(--border)" }}>
                        Modificar saldo
                      </button>
                    )}
                  </div>

                  {/* Resumen */}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"var(--border)" }}>
                    <div className="px-5 py-3 font-semibold text-sm border-b" style={{ color:"var(--foreground)", background:"var(--muted)", borderColor:"var(--border)" }}>
                      Resumen financiero
                    </div>
                    {[
                      { label:"Total de visitas",         value: selected.totalVisits },
                      { label:"Total facturado",          value:`$${totalPaid.toLocaleString()}` },
                      { label:"Saldo pendiente",          value:`$${selected.balance.toLocaleString()}` },
                      { label:"Total pagado",             value:`$${(totalPaid - selected.balance).toLocaleString()}` },
                      { label:"Última visita",            value: selected.lastVisit ? new Date(selected.lastVisit+"T00:00").toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"}) : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center px-5 py-4 border-b last:border-0" style={{ borderColor:"var(--border)" }}>
                        <span className="text-sm" style={{ color:"var(--muted-foreground)" }}>{label}</span>
                        <span className="text-sm font-bold" style={{ color:"var(--foreground)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Form modal ─────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-black/50">
          <div className="bg-card w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10" style={{ borderColor:"var(--border)" }}>
              <div>
                <h3 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>{editingId ? "Editar paciente" : "Nuevo paciente"}</h3>
                <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>Completa los campos requeridos *</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-5 h-5" style={{ color:"var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personales */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:"var(--muted-foreground)" }}>Datos personales</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Nombre completo *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} placeholder="Ej. Ana García López"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Fecha de nacimiento</label>
                    <input type="date" value={form.dob} onChange={(e) => setForm({...form,dob:e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Sexo</label>
                    <div className="flex gap-2">
                      {(["F","M"] as const).map((g) => (
                        <button key={g} onClick={() => setForm({...form,gender:g})}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
                          style={{ background:form.gender===g ? "var(--primary)" : "var(--input-background)", color:form.gender===g ? "#fff" : "var(--muted-foreground)", borderColor:form.gender===g ? "var(--primary)" : "var(--border)" }}>
                          {g==="F" ? "Femenino" : "Masculino"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Teléfono (WhatsApp) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color:"var(--muted-foreground)" }}>+52</span>
                      <input type="tel" value={form.phone.replace(/^\+52\s?/, '')} onChange={(e) => setForm({...form,phone:"+52" + e.target.value.replace(/^\+52\s?/, '')})} onBlur={() => setForm(f => ({...f, phone: ensurePhonePrefix(f.phone)}))} placeholder="999-000-0000"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Correo electrónico</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})} placeholder="correo@ejemplo.com"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Dirección</label>
                    <input type="text" value={form.address} onChange={(e) => setForm({...form,address:e.target.value})} placeholder="Calle, número"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Ciudad</label>
                    <input type="text" value={form.city} onChange={(e) => setForm({...form,city:e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                </div>
              </div>

              {/* Médico */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:"var(--muted-foreground)" }}>Información médica</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Tipo de sangre</label>
                    <select value={form.bloodType} onChange={(e) => setForm({...form,bloodType:e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}>
                      {bloodTypes.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Condiciones médicas</label>
                    <input type="text" value={form.medicalConditions} onChange={(e) => setForm({...form,medicalConditions:e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Alergias conocidas</label>
                    <input type="text" value={form.allergies} onChange={(e) => setForm({...form,allergies:e.target.value})} placeholder="Penicilina, látex, aspirina…"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                </div>
              </div>

              {/* Emergencia */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:"var(--muted-foreground)" }}>Contacto de emergencia</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Nombre</label>
                    <input type="text" value={form.emergencyContact} onChange={(e) => setForm({...form,emergencyContact:e.target.value})}
                      placeholder="Ej. Juan Pérez García"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Teléfono</label>
                    <input type="tel" value={form.emergencyPhone} onChange={(e) => setForm({...form,emergencyPhone:e.target.value})} onBlur={() => { if (form.emergencyPhone) setForm(f => ({...f, emergencyPhone: ensurePhonePrefix(f.emergencyPhone)})); }}
                      placeholder="+52 999-000-0000"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5" style={{ color:"var(--foreground)" }}>Notas clínicas</label>
                    <textarea value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})} rows={3} placeholder="Observaciones importantes…"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
                <button onClick={save} className="flex-1 py-3 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
                  {editingId ? "Guardar cambios" : "Registrar paciente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────── */}
      {delConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2" style={{ color:"var(--foreground)", fontSize:"1.05rem" }}>¿Eliminar paciente?</h3>
            <p className="text-sm mb-5" style={{ color:"var(--muted-foreground)" }}>Se eliminará el expediente completo. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDel(null)} className="flex-1 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
              <button onClick={() => del(delConfirm)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h3 className="font-bold mb-1" style={{ color:"var(--foreground)", fontSize:"1.1rem" }}>Modificar Saldo</h3>
            <p className="text-sm mb-5" style={{ color:"var(--muted-foreground)" }}>Paciente: {selected.name}</p>
            
            <div className="flex bg-muted p-1 rounded-xl mb-4">
              <button onClick={() => setPaymentType("abonar")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${paymentType==="abonar"?"bg-card shadow-sm text-green-600":"text-muted-foreground"}`}>Abonar (Pagar)</button>
              <button onClick={() => setPaymentType("cargar")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${paymentType==="cargar"?"bg-card shadow-sm text-red-500":"text-muted-foreground"}`}>Cargar (Deuda)</button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2" style={{ color:"var(--foreground)" }}>Monto ($)</label>
              <input type="number" min="0" value={paymentAmount || ""} onChange={e => setPaymentAmount(+e.target.value)}
                placeholder="Ej. 500"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setPaymentModal(false); setPaymentAmount(0); }} className="flex-1 py-3 rounded-xl border text-sm font-bold" style={{ borderColor:"var(--border)", color:"var(--muted-foreground)" }}>Cancelar</button>
              <button onClick={updatePatientBalance} disabled={!paymentAmount} className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity" style={{ background:"var(--primary)", color:"#fff", opacity: paymentAmount ? 1 : 0.5 }}>Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
