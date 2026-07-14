import { useState, useEffect } from "react";
import {
  LayoutDashboard, Calendar, Users, Tag, BarChart2, Clock, Menu, X,
  ChevronRight, Bell, LogOut, Settings, Stethoscope, User,
  CheckCircle2, AlertCircle, Info, CreditCard, Star, ChevronLeft, Trash2, FileText,
  ShieldAlert
} from "lucide-react";
import { getAppointments, getSettings } from "../../services/api";

export type Section = "dashboard" | "appointments" | "patients" | "expedientes" | "treatments" | "promotions" | "reports" | "schedule" | "settings";

const navItems: { id: Section; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: "dashboard",    label: "Inicio",           icon: LayoutDashboard },
  { id: "appointments", label: "Citas",             icon: Calendar },
  { id: "patients",     label: "Pacientes",         icon: Users },
  { id: "expedientes",  label: "Expedientes",       icon: FileText },
  { id: "treatments",   label: "Tratamientos",      icon: Stethoscope },
  { id: "promotions",   label: "Promociones",       icon: Tag },
  { id: "reports",      label: "Reportes",          icon: BarChart2 },
  { id: "schedule",     label: "Horario de la Clínica",   icon: Clock },
];

const mobileNav: { id: Section; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: "dashboard",    label: "Inicio",    icon: LayoutDashboard },
  { id: "appointments", label: "Citas",     icon: Calendar },
  { id: "patients",     label: "Pacientes", icon: Users },
  { id: "promotions",   label: "Promo.",    icon: Tag },
  { id: "reports",      label: "Reportes",  icon: BarChart2 },
];

/* ── Notifications data ─────────────────────────────────── */
type NotifCategory = "cita" | "paciente" | "promo" | "pago" | "sistema";

interface Notification {
  id: number;
  category: NotifCategory;
  title: string;
  body: string;
  detail: string;
  time: string;
  read: boolean;
}

const allNotifications: Notification[] = [];

const categoryConfig: Record<NotifCategory, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; bg: string; label: string }> = {
  cita:     { icon: Calendar,     color: "#0C7A7A", bg: "#E3F2F2", label: "Cita" },
  paciente: { icon: Users,        color: "#7C3AED", bg: "#EDE9FE", label: "Paciente" },
  promo:    { icon: Tag,          color: "#D97706", bg: "#FFFBEB", label: "Promoción" },
  pago:     { icon: CreditCard,   color: "#059669", bg: "#ECFDF5", label: "Pago" },
  sistema:  { icon: Info,         color: "#6B7280", bg: "#F3F4F6", label: "Sistema" },
};

/* ── Component ─────────────────────────────────────────── */
interface LayoutProps {
  active: Section;
  onNavigate: (s: Section) => void;
  onLogout: () => void;
  onEditProfile: () => void;
  children: React.ReactNode;
}

export function Layout({ active, onNavigate, onLogout, onEditProfile, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [notifDetail, setNotifDetail] = useState<Notification | null>(null);
  const [notifs, setNotifs]           = useState<Notification[]>(allNotifications);
  const [notifFilter, setNotifFilter] = useState<"todas" | "no_leidas">("todas");
  const [adminName, setAdminName] = useState("Administrador");
  const [clinicName, setClinicName] = useState("Clínica Dental");
  const [clinicLogo, setClinicLogo] = useState(localStorage.getItem("clinicLogo") || "");
  const [clinicSlogan, setClinicSlogan] = useState(localStorage.getItem("clinicSlogan") || "");

  useEffect(() => {
    setAdminName(localStorage.getItem("adminName") || "Administrador");
    setClinicName(localStorage.getItem("clinicName") || "Clínica Dental");
    setClinicLogo(localStorage.getItem("clinicLogo") || "");
    setClinicSlogan(localStorage.getItem("clinicSlogan") || "");

    // Fetch from database on load
    getSettings().then((settings) => {
      if (settings) {
        localStorage.setItem("clinicName", settings.name || "Clínica Dental");
        localStorage.setItem("clinicLogo", settings.logoUrl || "");
        localStorage.setItem("clinicSlogan", settings.slogan || "");
        setClinicName(settings.name || "Clínica Dental");
        setClinicLogo(settings.logoUrl || "");
        setClinicSlogan(settings.slogan || "");
      }
    }).catch(err => console.error("Error loading settings in Layout", err));

    // Fetch today's appointments for notifications
    getAppointments().then((appts) => {
      if (appts) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayAppts = appts.filter((a: any) => a.date === todayStr);
        if (todayAppts.length > 0) {
          const newNotifs: Notification[] = todayAppts.map((a: any, index: number) => ({
            id: Date.now() + index,
            category: "cita",
            title: `Cita hoy: ${a.patient?.name || a.patient || "Paciente"}`,
            body: `Procedimiento: ${a.procedure || "Consulta general"} a las ${a.time}`,
            detail: `Cita programada con el doctor a las ${a.time}.`,
            time: `Hoy, ${a.time}`,
            read: false
          }));
          setNotifs(prev => [...newNotifs, ...prev]);
        }
      }
    }).catch(err => console.error("Error loading appointments for notifications", err));

    const profileListener = () => setAdminName(localStorage.getItem("adminName") || "Administrador");
    const clinicListener = () => {
      setClinicName(localStorage.getItem("clinicName") || "Clínica Dental");
      setClinicLogo(localStorage.getItem("clinicLogo") || "");
      setClinicSlogan(localStorage.getItem("clinicSlogan") || "");
    };
    window.addEventListener("profileUpdated", profileListener);
    window.addEventListener("clinicUpdated", clinicListener);
    return () => {
      window.removeEventListener("profileUpdated", profileListener);
      window.removeEventListener("clinicUpdated", clinicListener);
    };
  }, []);

  function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AD";
  }

  const activeLabel = navItems.find((n) => n.id === active)?.label ?? "";
  const unread      = notifs.filter((n) => !n.read).length;

  const visibleNotifs = notifFilter === "no_leidas"
    ? notifs.filter((n) => !n.read)
    : notifs;

  function markRead(id: number) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }
  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }
  function deleteNotif(id: number) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    if (notifDetail?.id === id) setNotifDetail(null);
  }
  function openDetail(n: Notification) {
    markRead(n.id);
    setNotifDetail(n);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Desktop Sidebar ────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-full shadow-xl" style={{ background: "var(--sidebar)" }}>
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--sidebar-primary)" }}>
            {clinicLogo ? (
              <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--sidebar-primary-foreground)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C9 2 7 4 7 7c0 2 1 4 2 5.5L8 20c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2l-1-7.5c1-1.5 2-3.5 2-5.5 0-3-2-5-5-5z"/>
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate" style={{ color: "var(--sidebar-foreground)" }}>{clinicName}</p>
            {clinicSlogan && <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{clinicSlogan}</p>}
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Menú principal</p>
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = id === active;
            return (
              <button key={id} onClick={() => onNavigate(id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all duration-150"
                style={{ background: isActive ? "var(--sidebar-accent)" : "transparent", color: isActive ? "var(--sidebar-accent-foreground)" : "rgba(255,255,255,0.6)" }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.9)"; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; } }}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="text-sm font-medium flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            );
          })}
          <div className="border-t mt-3 pt-3" style={{ borderColor: "var(--sidebar-border)" }}>
            <button onClick={() => onNavigate("settings")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all"
              style={{ background: active === "settings" ? "var(--sidebar-accent)" : "transparent", color: active === "settings" ? "var(--sidebar-accent-foreground)" : "rgba(255,255,255,0.6)" }}
              onMouseEnter={(e) => { if (active !== "settings") { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.9)"; } }}
              onMouseLeave={(e) => { if (active !== "settings") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; } }}
            >
              <Settings className="w-4.5 h-4.5 shrink-0" />
              <span className="text-sm font-medium">Configuración</span>
            </button>
          </div>
        </nav>

        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <button onClick={onEditProfile} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 hover:opacity-80 transition-opacity" style={{ background: "var(--sidebar-primary)", color: "var(--sidebar-primary-foreground)" }}>
              {getInitials(adminName)}
            </button>
            <div className="flex-1 min-w-0">
              <button onClick={onEditProfile} className="text-xs font-semibold leading-none truncate block hover:underline" style={{ color: "var(--sidebar-foreground)" }}>{adminName}</button>
              <p className="text-xs mt-1 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>Administrador</p>
            </div>
            <button onClick={onLogout} className="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Cerrar sesión">
              <LogOut className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ─────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-2xl" style={{ background: "var(--sidebar)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--sidebar-primary)" }}>
                  {clinicLogo ? (
                    <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sidebar-primary-foreground)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C9 2 7 4 7 7c0 2 1 4 2 5.5L8 20c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2l-1-7.5c1-1.5 2-3.5 2-5.5 0-3-2-5-5-5z"/>
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight truncate" style={{ color: "var(--sidebar-foreground)" }}>{clinicName}</p>
                  {clinicSlogan && <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{clinicSlogan}</p>}
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5">
                <X className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
              {[...navItems, { id: "settings" as Section, label: "Configuración", icon: Settings }].map(({ id, label, icon: Icon }) => {
                const isActive = id === active;
                return (
                  <button key={id} onClick={() => { onNavigate(id); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left"
                    style={{ background: isActive ? "var(--sidebar-accent)" : "transparent", color: isActive ? "var(--sidebar-accent-foreground)" : "rgba(255,255,255,0.7)" }}>
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
              <button onClick={() => { onEditProfile(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                <User className="w-4.5 h-4.5" />
                <span className="text-sm font-medium">Editar perfil</span>
              </button>
              <button onClick={() => { onLogout(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full" style={{ color: "rgba(255,255,255,0.6)" }}>
                <LogOut className="w-4.5 h-4.5" />
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b bg-card shrink-0 relative z-30" style={{ borderColor: "var(--border)" }}>
          <button className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" style={{ color: "var(--foreground)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>{activeLabel}</h1>
            <p className="text-xs mt-0.5 hidden md:block" style={{ color: "var(--muted-foreground)" }}>{clinicName}</p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setNotifDetail(null); }}
                className="relative p-2 rounded-xl hover:bg-muted transition-colors"
                title="Notificaciones"
              >
                <Bell className="w-4.5 h-4.5" style={{ color: "var(--muted-foreground)" }} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white px-1"
                    style={{ background: "#DC2626", fontSize: "10px", fontWeight: 700 }}>
                    {unread}
                  </span>
                )}
              </button>
            </div>

            {/* Profile avatar */}
            <button
              onClick={onEditProfile}
              className="w-8 h-8 rounded-full items-center justify-center text-xs font-bold hidden md:flex hover:ring-2 transition-all"
              style={{ background: "var(--secondary)", color: "var(--primary)", ringColor: "var(--primary)" }}
              title="Editar perfil"
            >
              {getInitials(adminName)}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" onClick={() => { notifOpen && setNotifOpen(false); }}>
          {children}
        </main>
      </div>

      {/* ── Notification panel ─────────────────────────── */}
      {notifOpen && (
        <div className="fixed inset-0 z-40 md:inset-auto md:top-14 md:right-4 md:w-96 flex flex-col" style={{ maxHeight: "calc(100vh - 4.5rem)" }}>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/40 md:hidden" onClick={() => setNotifOpen(false)} />

          {/* Panel */}
          <div className="relative flex flex-col bg-card rounded-2xl shadow-2xl border overflow-hidden mx-4 my-4 md:mx-0 md:my-0" style={{ borderColor: "var(--border)", maxHeight: "85vh" }}>

            {!notifDetail ? (
              /* ── Lista ── */
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm" style={{ color: "var(--foreground)" }}>Notificaciones</h3>
                    {unread > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#FEF2F2", color: "#DC2626" }}>{unread} nuevas</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs font-semibold hover:underline mr-2" style={{ color: "var(--primary)" }}>
                        Marcar todas como leídas
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                      <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                    </button>
                  </div>
                </div>

                {/* Filter pills */}
                <div className="flex gap-2 px-4 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
                  {(["todas", "no_leidas"] as const).map((f) => (
                    <button key={f} onClick={() => setNotifFilter(f)}
                      className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                      style={{ background: notifFilter === f ? "var(--primary)" : "var(--muted)", color: notifFilter === f ? "#fff" : "var(--muted-foreground)" }}>
                      {f === "todas" ? "Todas" : "No leídas"}
                    </button>
                  ))}
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 divide-y" style={{ borderColor: "var(--border)" }}>
                  {visibleNotifs.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Sin notificaciones</p>
                    </div>
                  ) : visibleNotifs.map((n) => {
                    const cfg = categoryConfig[n.category];
                    const CatIcon = cfg.icon;
                    return (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group relative"
                        style={{ background: n.read ? "transparent" : "rgba(12,122,122,0.03)" }}
                        onClick={() => openDetail(n)}
                      >
                        {/* Category icon */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                          <CatIcon className="w-4.5 h-4.5" style={{ color: cfg.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{n.title}</p>
                            {!n.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#DC2626" }} />}
                          </div>
                          <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>{n.body}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{n.time}</span>
                          </div>
                        </div>

                        {/* Delete on hover */}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shrink-0 self-center"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>

                        <ChevronRight className="w-3.5 h-3.5 shrink-0 self-center" style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ── Detalle ── */
              <>
                <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => setNotifDetail(null)} className="p-1.5 rounded-lg hover:bg-muted">
                    <ChevronLeft className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                  </button>
                  <h3 className="font-bold text-sm flex-1" style={{ color: "var(--foreground)" }}>Detalle</h3>
                  <button onClick={() => { deleteNotif(notifDetail.id); setNotifOpen(false); }} className="p-1.5 rounded-lg hover:bg-red-50" title="Eliminar">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                  <button onClick={() => setNotifOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                    <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  {/* Category badge */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg = categoryConfig[notifDetail.category];
                      const CatIcon = cfg.icon;
                      return (
                        <>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                            <CatIcon className="w-5 h-5" style={{ color: cfg.color }} />
                          </div>
                          <div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{notifDetail.time}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <h4 className="font-bold" style={{ color: "var(--foreground)", fontSize: "1rem" }}>{notifDetail.title}</h4>
                    <p className="text-sm mt-0.5 font-medium" style={{ color: "var(--muted-foreground)" }}>{notifDetail.body}</p>
                  </div>

                  <div className="p-4 rounded-2xl" style={{ background: "var(--muted)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{notifDetail.detail}</p>
                  </div>

                  <button
                    onClick={() => { setNotifOpen(false); setNotifDetail(null); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "var(--primary)", color: "#fff" }}
                  >
                    Entendido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ──────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-card z-40 flex" style={{ borderColor: "var(--border)" }}>
        {mobileNav.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button key={id} onClick={() => onNavigate(id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors"
              style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "var(--primary)" }} />}
              </div>
              <span style={{ fontSize: "9px", fontWeight: isActive ? 700 : 400 }}>{label}</span>
            </button>
          );
        })}
        <button onClick={() => setMobileOpen(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1" style={{ color: "var(--muted-foreground)" }}>
          <Menu className="w-5 h-5" />
          <span style={{ fontSize: "9px" }}>Más</span>
        </button>
      </nav>
    </div>
  );
}
