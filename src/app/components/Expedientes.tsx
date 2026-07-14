import { useState, useMemo, useEffect } from "react";
import {
  Search, X, User, Phone, Mail, MapPin, Calendar, FileText,
  Heart, AlertTriangle, CreditCard, Clock, ChevronRight,
  Stethoscope, Activity, Shield, Printer
} from "lucide-react";
import { getPatients, getPatientAppointments } from "../../services/api";

function calcAge(dob: string) {
  if (!dob) return "—";
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) + " años";
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

type ExpTab = "resumen" | "clinico" | "historial" | "financiero";

export function Expedientes() {
  const [patients, setPatients]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab]               = useState<ExpTab>("resumen");
  const [showMobile, setShowMobile] = useState(false);

  // Load patients
  useEffect(() => {
    getPatients().then(data => {
      setPatients(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    patients.filter((p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    ), [patients, search]);

  async function selectPatient(p: any) {
    setSelected({ ...p, treatments: [] });
    setTab("resumen");
    setShowMobile(true);
    setLoadingDetail(true);
    try {
      const appts = await getPatientAppointments(p.id);
      const completed = appts
        .filter((a: any) => a.status === "completada")
        .map((a: any) => ({
          id: a.id,
          procedure: a.procedure,
          doctor: a.doctor?.name || "Doctor asignado",
          date: a.date,
          cost: a.cost || 0,
          notes: a.notes,
          time: a.time,
        }));
      setSelected((prev: any) => ({ ...prev, treatments: completed }));
    } catch (e) {
      console.error("Error loading patient appointments", e);
    }
    setLoadingDetail(false);
  }

  const totalPaid = selected?.treatments?.reduce((a: number, t: any) => a + t.cost, 0) ?? 0;

  const tabs: { id: ExpTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: "resumen",    label: "Resumen",           icon: User },
    { id: "clinico",    label: "Datos clínicos",    icon: Stethoscope },
    { id: "historial",  label: "Historial",         icon: Activity },
    { id: "financiero", label: "Estado de cuenta",  icon: CreditCard },
  ];

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── LEFT: Lista de pacientes ───────────────────────── */}
      <div className={`flex flex-col border-r bg-card ${showMobile ? "hidden md:flex" : "flex"} md:w-80 lg:w-96 shrink-0 h-full`}
        style={{ borderColor: "var(--border)" }}>
        
        {/* Header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--secondary)" }}>
              <FileText className="w-4.5 h-4.5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: "var(--foreground)", fontSize: "1.05rem" }}>Expedientes</h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{patients.length} pacientes registrados</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="Buscar paciente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--input-background)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Cargando expedientes...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <User className="w-12 h-12" style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Sin resultados</p>
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
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: isSelected ? "var(--primary)" : "var(--muted)", color: isSelected ? "#fff" : "var(--muted-foreground)" }}
                >
                  {initials(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{p.name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {calcAge(p.dob)} · {p.city || "Sin ciudad"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {p.allergies && p.allergies !== "Ninguna" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: "#FEF2F2", color: "#DC2626" }}>⚠ Alergia</span>
                    )}
                    {p.balance > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: "#FFFBEB", color: "#D97706" }}>$ Saldo</span>
                    )}
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.totalVisits || 0} visitas</span>
                  </div>
                </div>
                {isSelected && <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: "var(--primary)" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Expediente completo ──────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background ${showMobile ? "flex" : "hidden md:flex"}`}>
        {!selected ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: "var(--secondary)" }}>
              <FileText className="w-12 h-12" style={{ color: "var(--primary)", opacity: 0.7 }} />
            </div>
            <div className="text-center max-w-xs">
              <p className="font-bold text-lg" style={{ color: "var(--foreground)" }}>Selecciona un paciente</p>
              <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>
                Elige un paciente de la lista para ver su expediente clínico completo
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Header del paciente ── */}
            <div className="shrink-0 border-b" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--primary) 0%, #0f8f8f 100%)" }}>
              <div className="px-6 py-5">
                {/* Mobile back */}
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold mb-4 md:hidden text-white/80 hover:text-white"
                  onClick={() => setShowMobile(false)}
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Expedientes
                </button>

                <div className="flex items-start gap-5">
                  {/* Avatar grande */}
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-bold shrink-0 hidden sm:flex"
                    style={{ background: "rgba(255,255,255,0.2)", color: "#fff", backdropFilter: "blur(8px)" }}
                  >
                    {initials(selected.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-white" style={{ fontSize: "1.4rem", lineHeight: 1.2 }}>{selected.name}</h2>
                        <p className="text-sm mt-1 text-white/70">
                          {selected.gender === "F" ? "Femenino" : "Masculino"} · {calcAge(selected.dob)} · {selected.city || "Sin ciudad"}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                            Tipo {selected.bloodType}
                          </span>
                          {selected.allergies && selected.allergies !== "Ninguna" && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                              ⚠ {selected.allergies}
                            </span>
                          )}
                          {selected.balance > 0 && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#FFFBEB", color: "#D97706" }}>
                              Saldo: ${selected.balance.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0"
                        style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: "Total visitas",  value: selected.totalVisits || 0,         icon: Calendar,  color: "#fff" },
                    { label: "Total pagado",   value: `$${totalPaid.toLocaleString()}`,   icon: CreditCard, color: "#fff" },
                    { label: "Última visita",  value: selected.lastVisit
                        ? new Date(selected.lastVisit + "T00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })
                        : "—",                                                             icon: Clock,     color: "#fff" },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="p-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                      <Icon className="w-4.5 h-4.5 shrink-0 text-white/70" />
                      <div>
                        <p className="font-bold text-white" style={{ fontSize: "1rem", lineHeight: 1 }}>{value}</p>
                        <p className="text-xs text-white/60 mt-0.5">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex px-4 gap-1 pb-0">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all"
                    style={{
                      color: tab === id ? "#fff" : "rgba(255,255,255,0.55)",
                      borderBottomColor: tab === id ? "#fff" : "transparent",
                      background: "transparent",
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* RESUMEN */}
              {tab === "resumen" && (
                <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
                  {/* Identificación */}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                    <div className="px-5 py-3 font-bold text-sm border-b flex items-center gap-2" style={{ color: "var(--foreground)", background: "var(--muted)", borderColor: "var(--border)" }}>
                      <User className="w-4 h-4" style={{ color: "var(--primary)" }} /> Identificación
                    </div>
                    {[
                      { label: "Nombre completo",   value: selected.name },
                      { label: "Fecha de nac.",     value: selected.dob ? new Date(selected.dob + "T00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                      { label: "Edad",              value: calcAge(selected.dob) },
                      { label: "Sexo",              value: selected.gender === "F" ? "Femenino" : "Masculino" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center px-5 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Contacto */}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                    <div className="px-5 py-3 font-bold text-sm border-b flex items-center gap-2" style={{ color: "var(--foreground)", background: "var(--muted)", borderColor: "var(--border)" }}>
                      <Phone className="w-4 h-4" style={{ color: "var(--primary)" }} /> Contacto
                    </div>
                    {[
                      { icon: Phone,  label: "Teléfono",  value: selected.phone || "—" },
                      { icon: Mail,   label: "Correo",    value: selected.email || "—" },
                      { icon: MapPin, label: "Dirección", value: selected.address ? `${selected.address}, ${selected.city}` : selected.city || "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 px-5 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
                        <div className="min-w-0">
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Emergencia */}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                    <div className="px-5 py-3 font-bold text-sm border-b flex items-center gap-2" style={{ color: "var(--foreground)", background: "var(--muted)", borderColor: "var(--border)" }}>
                      <Shield className="w-4 h-4" style={{ color: "#DC2626" }} /> Contacto de emergencia
                    </div>
                    <div className="px-5 py-4 space-y-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{selected.emergencyContact || "No registrado"}</p>
                      {selected.emergencyPhone && (
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{selected.emergencyPhone}</p>
                      )}
                    </div>
                  </div>

                  {/* Notas */}
                  {selected.notes && (
                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <div className="px-5 py-3 font-bold text-sm border-b flex items-center gap-2" style={{ color: "var(--foreground)", background: "var(--muted)", borderColor: "var(--border)" }}>
                        <FileText className="w-4 h-4" style={{ color: "var(--primary)" }} /> Notas clínicas
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{selected.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DATOS CLÍNICOS */}
              {tab === "clinico" && (
                <div className="max-w-2xl space-y-4">
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                    <div className="px-5 py-3 font-bold text-sm border-b flex items-center gap-2" style={{ color: "var(--foreground)", background: "var(--muted)", borderColor: "var(--border)" }}>
                      <Heart className="w-4 h-4" style={{ color: "#DC2626" }} /> Información médica
                    </div>
                    {[
                      { label: "Tipo de sangre",       value: selected.bloodType,          badge: true, badgeColor: "#DC2626", badgeBg: "#FEF2F2" },
                      { label: "Alergias conocidas",   value: selected.allergies || "Ninguna", badge: selected.allergies && selected.allergies !== "Ninguna", badgeColor: "#DC2626", badgeBg: "#FEF2F2" },
                      { label: "Condiciones médicas",  value: selected.medicalConditions || "Ninguna", badge: false, badgeColor: "#D97706", badgeBg: "#FFFBEB" },
                    ].map(({ label, value, badge, badgeColor, badgeBg }) => (
                      <div key={label} className="flex items-center justify-between px-5 py-4 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-2">
                          {label === "Tipo de sangre" && <Heart className="w-4 h-4" style={{ color: "#DC2626" }} />}
                          {label === "Alergias conocidas" && <AlertTriangle className="w-4 h-4" style={{ color: badge ? "#DC2626" : "var(--muted-foreground)" }} />}
                          {label === "Condiciones médicas" && <Stethoscope className="w-4 h-4" style={{ color: "var(--primary)" }} />}
                          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                        </div>
                        {badge ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: badgeBg, color: badgeColor }}>{value}</span>
                        ) : (
                          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{value}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Notas clínicas */}
                  {selected.notes && (
                    <div className="p-5 rounded-2xl border-l-4" style={{ background: "var(--secondary)", borderLeftColor: "var(--primary)", border: "1px solid var(--border)" }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--primary)" }}>Observaciones del doctor</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{selected.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* HISTORIAL */}
              {tab === "historial" && (
                <div className="max-w-2xl space-y-3">
                  {loadingDetail ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
                      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Cargando historial...</p>
                    </div>
                  ) : selected.treatments && selected.treatments.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                          {selected.treatments.length} procedimiento{selected.treatments.length !== 1 ? "s" : ""} registrado{selected.treatments.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {selected.treatments.map((t: any, i: number) => (
                        <div key={t.id || i} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--primary)" }} />
                                <p className="font-bold" style={{ color: "var(--foreground)", fontSize: "1rem" }}>{t.procedure}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: "var(--secondary)", color: "var(--primary)" }}>
                                  {t.doctor}
                                </span>
                                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                  {t.date ? new Date(t.date + "T00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "—"}
                                </span>
                                {t.time && <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>· {t.time}</span>}
                              </div>
                              {t.notes && (
                                <p className="text-sm mt-2 p-3 rounded-xl" style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}>{t.notes}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold" style={{ color: "var(--primary)", fontSize: "1.1rem" }}>${t.cost.toLocaleString()}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#ECFDF5", color: "#059669" }}>Completada</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-4 rounded-2xl font-bold" style={{ background: "var(--secondary)" }}>
                        <span style={{ color: "var(--primary)" }}>Total acumulado en procedimientos</span>
                        <span style={{ color: "var(--primary)", fontSize: "1.1rem" }}>${totalPaid.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Activity className="w-14 h-14" style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
                      <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>Sin historial registrado</p>
                      <p className="text-sm text-center max-w-xs" style={{ color: "var(--muted-foreground)" }}>
                        Los procedimientos aparecerán aquí conforme se completen las citas del paciente
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FINANCIERO */}
              {tab === "financiero" && (
                <div className="max-w-lg space-y-4">
                  {/* Balance hero */}
                  <div
                    className="p-6 rounded-2xl text-center"
                    style={{
                      background: selected.balance > 0 ? "#FFFBEB" : "var(--secondary)",
                      border: `1px solid ${selected.balance > 0 ? "#FDE68A" : "var(--border)"}`,
                    }}
                  >
                    <p className="text-sm font-medium mb-1" style={{ color: selected.balance > 0 ? "#D97706" : "var(--muted-foreground)" }}>
                      {selected.balance > 0 ? "Saldo pendiente de pago" : "Cuenta al corriente ✓"}
                    </p>
                    <p style={{ fontSize: "3rem", fontWeight: 800, color: selected.balance > 0 ? "#D97706" : "var(--primary)", lineHeight: 1 }}>
                      ${(selected.balance || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Resumen */}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                    <div className="px-5 py-3 font-bold text-sm border-b flex items-center gap-2" style={{ color: "var(--foreground)", background: "var(--muted)", borderColor: "var(--border)" }}>
                      <CreditCard className="w-4 h-4" style={{ color: "var(--primary)" }} /> Resumen financiero
                    </div>
                    {[
                      { label: "Total de visitas",    value: selected.totalVisits || 0 },
                      { label: "Total facturado",     value: `$${totalPaid.toLocaleString()}` },
                      { label: "Saldo pendiente",     value: `$${(selected.balance || 0).toLocaleString()}`, highlight: selected.balance > 0 },
                      { label: "Total pagado",        value: `$${Math.max(0, totalPaid - (selected.balance || 0)).toLocaleString()}` },
                      { label: "Última visita",       value: selected.lastVisit
                          ? new Date(selected.lastVisit + "T00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
                          : "—" },
                    ].map(({ label, value, highlight }) => (
                      <div key={label} className="flex justify-between items-center px-5 py-4 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                        <span className="text-sm font-bold" style={{ color: highlight ? "#D97706" : "var(--foreground)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
