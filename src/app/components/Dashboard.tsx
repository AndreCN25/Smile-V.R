import { useState, useEffect, useRef } from "react";
import { Calendar, Users, TrendingUp, Clock, CheckCircle2, AlertCircle, XCircle, ChevronRight, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { getAppointments, getPatients } from "../../services/api";
import { checkAndSendReminders } from "../../services/whatsapp";

const statusCfg: Record<string, any> = {
  confirmada: { label: "Confirmada", color: "#0C7A7A", bg: "#E3F2F2", Icon: CheckCircle2 },
  completada: { label: "Completada", color: "#059669", bg: "#ECFDF5", Icon: CheckCircle2 },
  en_curso:   { label: "En curso",   color: "#0C7A7A", bg: "#E3F2F2", Icon: Clock },
  pendiente:  { label: "Pendiente",  color: "#D97706", bg: "#FFFBEB", Icon: AlertCircle },
  cancelada:  { label: "Cancelada",  color: "#DC2626", bg: "#FEF2F2", Icon: XCircle },
};

interface DashboardProps {
  onNavigate: (s: any) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [appts, setAppts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const reminderChecked = useRef(false);

  useState(() => {
    Promise.all([getAppointments(), getPatients()]).then(([a, p]) => {
      if (a) setAppts(a);
      if (p) { setPatients(p); setPatientsCount(p.length); }
      setLoading(false);
    }).catch(() => setLoading(false));
  });

  // Check and send reminders for tomorrow's appointments (runs once on load)
  useEffect(() => {
    if (!reminderChecked.current && appts.length > 0 && patients.length > 0) {
      reminderChecked.current = true;
      checkAndSendReminders(appts, patients).then(({ sent, errors }) => {
        if (sent > 0) console.log(`📱 Dashboard: ${sent} recordatorio(s) enviado(s)`);
      });
    }
  }, [appts, patients]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppts = appts.filter(a => a.date === todayStr);
  const pendingAppts = appts.filter(a => a.status === 'pendiente').length;
  
  // Calculate revenue for the current month
  const currMonth = new Date().getMonth();
  const currYear = new Date().getFullYear();
  const revenueThisMonth = appts.filter(a => {
    const d = new Date(a.date+"T00:00");
    return d.getMonth() === currMonth && d.getFullYear() === currYear && a.status === 'completada';
  }).reduce((sum, a) => sum + (a.cost || 0), 0);

  // Group by month for chart (last 6 months)
  const revenueData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currYear, currMonth - i, 1);
    const monthAppts = appts.filter(a => {
      const ad = new Date(a.date+"T00:00");
      return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
    });
    revenueData.push({
      mes: d.toLocaleDateString('es-MX', { month: 'short' }),
      ingresos: monthAppts.filter(a => a.status === 'completada').reduce((s, a) => s + (a.cost || 0), 0),
      citas: monthAppts.length
    });
  }

  const today = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 space-y-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-5 md:p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(130deg, #0C2F3A 0%, #0C7A7A 55%, #17B8A6 100%)" }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-white/70 text-sm capitalize">{today}</p>
            <h2 className="text-white mt-1" style={{ fontSize: "1.3rem", fontWeight: 700 }}>Bienvenido al sistema 👋</h2>
            <p className="text-white/70 text-sm mt-1">{todayAppts.length === 0 ? "Aún no hay citas programadas para hoy" : `Tienes ${todayAppts.length} cita${todayAppts.length!==1?'s':''} hoy`}</p>
          </div>
          <button
            onClick={() => onNavigate("appointments")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold self-start md:self-auto transition-opacity hover:opacity-90"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            Ver citas <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute -right-2 bottom-0 w-24 h-24 rounded-full opacity-10 bg-white" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Citas hoy",        value: todayAppts.length.toString(),  sub: todayAppts.length===0 ? "Sin citas hoy" : "Ver citas de hoy",         icon: Calendar,   color: "var(--primary)", bg: "var(--secondary)",  nav: "appointments" },
          { label: "Pacientes",        value: patientsCount.toString(),  sub: patientsCount===0 ? "Sin pacientes aún" : "Total registrados",     icon: Users,      color: "#7C3AED",        bg: "#EDE9FE",           nav: "patients"     },
          { label: "Ingresos (mes)",    value: `$${revenueThisMonth.toLocaleString()}`, sub: "Mes actual",      icon: TrendingUp, color: "#059669",        bg: "#ECFDF5",           nav: "reports"      },
          { label: "Citas pendientes",  value: pendingAppts.toString(),  sub: "Por confirmar o atender",   icon: Clock,      color: "#D97706",        bg: "#FFFBEB",           nav: "appointments" },
        ].map(({ label, value, sub, icon: Icon, color, bg, nav }) => (
          <button key={label} onClick={() => onNavigate(nav)}
            className="bg-card rounded-2xl p-4 border text-left hover:shadow-md transition-all group"
            style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
            </div>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
            <p className="text-xs mt-1 font-semibold" style={{ color }}>{sub}</p>
          </button>
        ))}
      </div>

      {/* Charts + Today's appointments */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Revenue chart */}
        <div className="md:col-span-3 bg-card rounded-2xl border p-4 md:p-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>Ingresos del año</h3>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Sin datos aún · Los ingresos aparecerán conforme registres citas</p>
            </div>
            <button onClick={() => onNavigate("reports")} className="text-xs font-semibold hover:underline" style={{ color: "var(--primary)" }}>Ver reportes</button>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Ingresos"]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: 12 }} />
                <Area type="monotone" dataKey="ingresos" stroke="var(--primary)" strokeWidth={2.5} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: "var(--primary)" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[170px]" style={{ color: "var(--muted-foreground)" }}>
              <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Sin datos de ingresos todavía</p>
              <p className="text-xs mt-1 opacity-70">Los datos aparecerán al registrar citas completadas</p>
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-card rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Citas de hoy</h3>
            <button onClick={() => onNavigate("appointments")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Ver todas</button>
          </div>
          <div className="flex-1 flex flex-col p-4">
            {todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Calendar className="w-12 h-12 mb-3 opacity-20" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sin citas para hoy</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Disfruta tu día o agenda una nueva cita.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppts.map((a) => {
                  const st = statusCfg[a.status] || statusCfg.pendiente;
                  return (
                    <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl border hover:shadow-md transition-shadow cursor-pointer bg-white" style={{ borderColor: "var(--border)" }}>
                      <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border" style={{ background: "var(--secondary)", borderColor: "rgba(12,122,122,0.1)" }}>
                        <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>{a.time}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: "var(--foreground)" }}>{a.patient?.name || a.patient}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>{a.procedure}</p>
                      </div>
                      <div className="px-2 py-1 rounded-lg flex items-center gap-1.5 shrink-0" style={{ background: st.bg, color: st.color }}>
                        <st.Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold hidden sm:inline">{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly citas + Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3">
            <h3 className="font-semibold mb-1 text-sm" style={{ color: "var(--foreground)" }}>Citas por día (esta semana)</h3>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Lun – Sáb · Semana actual y próximas</p>
          </div>
          {(() => {
            // Build grouped weekly data: today through next 6 days
            const now = new Date();
            const dayNames = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
            const days: {label:string; dateStr:string; isToday:boolean; appts:any[]}[] = [];
            for (let i = 0; i < 7; i++) {
              const d = new Date(now);
              d.setDate(d.getDate() + i);
              const dateStr = d.toISOString().slice(0,10);
              const dayAppts = appts
                .filter(a => a.date === dateStr && a.status !== "cancelada")
                .sort((a,b) => a.time.localeCompare(b.time));
              days.push({
                label: i === 0 ? "Hoy" : i === 1 ? "Mañana" : dayNames[d.getDay()],
                dateStr,
                isToday: i === 0,
                appts: dayAppts,
              });
            }
            const hasAny = days.some(d => d.appts.length > 0);
            if (!hasAny) {
              return (
                <div className="flex flex-col items-center justify-center py-10 px-4" style={{ color: "var(--muted-foreground)" }}>
                  <Calendar className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Sin citas esta semana</p>
                  <p className="text-xs mt-1 opacity-70">Las citas aparecerán aquí conforme se agenden</p>
                </div>
              );
            }
            return (
              <div className="divide-y max-h-[320px] overflow-y-auto" style={{ borderColor: "var(--border)" }}>
                {days.map((day) => (
                  <div key={day.dateStr}>
                    {/* Day header */}
                    <div className="flex items-center gap-2 px-4 md:px-5 py-2.5 sticky top-0 z-10" style={{ background: day.isToday ? "var(--secondary)" : "var(--muted)" }}>
                      <span className={`text-xs font-bold ${day.isToday ? '' : ''}`} style={{ color: day.isToday ? "var(--primary)" : "var(--foreground)" }}>
                        {day.label}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {new Date(day.dateStr+"T00:00").toLocaleDateString("es-MX", { day:"numeric", month:"short" })}
                      </span>
                      {day.appts.length > 0 && (
                        <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: day.isToday ? "var(--primary)" : "var(--border)", color: day.isToday ? "#fff" : "var(--muted-foreground)" }}>
                          {day.appts.length}
                        </span>
                      )}
                    </div>
                    {/* Appointments for this day */}
                    {day.appts.length === 0 ? (
                      <div className="px-4 md:px-5 py-3">
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Sin citas</p>
                      </div>
                    ) : (
                      day.appts.map((a: any) => {
                        const st = statusCfg[a.status] || statusCfg.pendiente;
                        return (
                          <div key={a.id} className="flex items-center gap-3 px-4 md:px-5 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onNavigate("appointments")}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} />
                            <span className="text-xs font-bold w-12 shrink-0" style={{ color: "var(--primary)" }}>{a.time}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{a.patient?.name || "Paciente"}</p>
                              <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{a.procedure}</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold mb-3 text-sm" style={{ color: "var(--foreground)" }}>Acceso rápido</h3>
          <div className="space-y-2">
            {[
              { label: "Nueva cita",        nav: "appointments", color: "var(--primary)", bg: "var(--secondary)" },
              { label: "Nuevo paciente",     nav: "patients",     color: "#7C3AED",        bg: "#EDE9FE" },
              { label: "Ver promociones",    nav: "promotions",   color: "#D97706",        bg: "#FFFBEB" },
              { label: "Horario de la clínica",    nav: "schedule",     color: "#059669",        bg: "#ECFDF5" },
            ].map(({ label, nav, color, bg }) => (
              <button key={label} onClick={() => onNavigate(nav)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
                style={{ background: bg, color }}>
                <span>{label}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
