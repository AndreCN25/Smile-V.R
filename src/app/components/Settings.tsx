import { useState } from "react";
import { Save, CheckCircle, User, Building2, Clock, Bell, Lock, Palette, ChevronRight, Edit2, Trash2, MessageCircle, Terminal, AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { getWhatsAppConfig, saveWhatsAppConfig, getNotificationPreferences, saveNotificationPreferences, WhatsAppConfig, NotificationPreferences } from "../../services/whatsapp";
import { getSettings, updateSettings, updateUserPassword, loginUser, getErrorLogs, clearErrorLogs, ErrorLog } from "../../services/api";

type SettingsTab = "clinica" | "perfil" | "notificaciones" | "seguridad" | "logs";

interface SettingsProps { defaultTab?: SettingsTab; userRole?: string; }

export function Settings({ defaultTab = "clinica", userRole = "Administrador" }: SettingsProps) {
  const [tab, setTab]     = useState<SettingsTab>(defaultTab);
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [clinicForm, setClinicForm] = useState({
    name: "",
    rfc: "",
    address: "",
    city: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    slogan: "",
    logoUrl: "",
    hours: "Lunes a Viernes: 9:00–19:00 | Sábados: 9:00–13:00",
  });

  useState(() => {
    Promise.all([getSettings()]).then(([settings]) => {
      if (settings) {
        setSettingsId(settings.id);
        setClinicForm({
          name: settings.name || "",
          rfc: settings.rfc || "",
          address: settings.address || "",
          city: settings.city || "",
          phone: settings.phone || "",
          whatsapp: settings.whatsapp || "",
          email: settings.email || "",
          website: settings.website || "",
          slogan: settings.slogan || "",
          logoUrl: settings.logoUrl || "",
          hours: settings.hours || "Lunes a Viernes: 9:00–19:00 | Sábados: 9:00–13:00",
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClinicForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [profileForm, setProfileForm] = useState({
    name: localStorage.getItem("adminName") || "",
    role: localStorage.getItem("adminRole") || "",
    email: localStorage.getItem("adminEmail") || "admin@clinicadental.com",
    phone: localStorage.getItem("adminPhone") || "",
    bio: localStorage.getItem("adminBio") || "",
  });

  const [notifForm, setNotifForm] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>(() => getWhatsAppConfig());

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  async function save() {
    try {
      if (tab === "clinica") {
        const res = await updateSettings(settingsId, clinicForm);
        setSettingsId(res.id);
        localStorage.setItem("clinicName", clinicForm.name);
        localStorage.setItem("clinicLogo", clinicForm.logoUrl || "");
        localStorage.setItem("clinicSlogan", clinicForm.slogan || "");
        saveWhatsAppConfig(waConfig);
        window.dispatchEvent(new Event("clinicUpdated"));
      } else if (tab === "perfil") {
        localStorage.setItem("adminName", profileForm.name);
        localStorage.setItem("adminRole", profileForm.role);
        localStorage.setItem("adminEmail", profileForm.email);
        localStorage.setItem("adminPhone", profileForm.phone);
        localStorage.setItem("adminBio", profileForm.bio);
        window.dispatchEvent(new Event("profileUpdated"));
      } else if (tab === "notificaciones") {
        saveNotificationPreferences(notifForm);
        saveWhatsAppConfig(waConfig);
      } else if (tab === "seguridad") {
        const currentStoredPassword = localStorage.getItem("adminPassword") || "19750120";
        if (passwordForm.currentPassword !== currentStoredPassword) {
          alert("La contraseña actual es incorrecta");
          return;
        }
        if (!passwordForm.newPassword) {
          alert("La nueva contraseña no puede estar vacía");
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          alert("Las contraseñas nuevas no coinciden");
          return;
        }
        
        // Save to localStorage
        localStorage.setItem("adminPassword", passwordForm.newPassword);
        
        // Save to database
        try {
          const email = localStorage.getItem("adminEmail") || "andrecn643@gmail.com";
          await updateUserPassword(email, passwordForm.newPassword);
        } catch (dbErr) {
          console.warn("Could not update password in database (using localStorage fallback):", dbErr);
        }

        // Reset form
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
      setToast(true); setTimeout(() => setToast(false), 2500);
    } catch (e) {
      console.error(e);
      alert("Error al guardar");
    }
  }



  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(() => getErrorLogs());

  function refreshLogs() {
    setErrorLogs(getErrorLogs());
  }

  function handleClearLogs() {
    clearErrorLogs();
    setErrorLogs([]);
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
    { id: "clinica",        label: "Clínica",        icon: Building2 },
    { id: "perfil",         label: "Mi perfil",      icon: User },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    { id: "seguridad",      label: "Seguridad",      icon: Lock },
    ...(userRole === "Developer" ? [{ id: "logs" as SettingsTab, label: "Logs de Sistema", icon: Terminal }] : []),
  ];

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 space-y-4 w-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium" style={{ background:"#ECFDF5", color:"#059669", border:"1px solid #D1FAE5" }}>
          <CheckCircle className="w-4 h-4" /> Cambios guardados correctamente
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-2 w-full overflow-x-auto pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all"
            style={{ background: tab===id ? "var(--primary)" : "var(--card)", color: tab===id ? "#fff" : "var(--muted-foreground)", borderColor: tab===id ? "var(--primary)" : "var(--border)" }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── CLÍNICA ─── */}
      {tab === "clinica" && (
        <div className="bg-card rounded-2xl border p-5 space-y-4" style={{ borderColor:"var(--border)" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden" style={{ background:"var(--secondary)" }}>
              {clinicForm.logoUrl ? (
                <img src={clinicForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C9 2 7 4 7 7c0 2 1 4 2 5.5L8 20c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2l-1-7.5c1-1.5 2-3.5 2-5.5 0-3-2-5-5-5z"/>
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-bold" style={{ color:"var(--foreground)", fontSize:"1rem" }}>{clinicForm.name || "Mi Clínica Dental"}</h3>
              <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>{clinicForm.slogan || "Datos del consultorio"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>Logo de la Clínica</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload}
                className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:opacity-90" />
            </div>
            {[
              { label:"Nombre del consultorio", key:"name",     type:"text" },
              { label:"Slogan",                key:"slogan",   type:"text" },
              { label:"RFC",                    key:"rfc",      type:"text" },
              { label:"Dirección",              key:"address",  type:"text" },
              { label:"Ciudad",                 key:"city",     type:"text" },
              { label:"Teléfono",               key:"phone",    type:"tel"  },
              { label:"WhatsApp",               key:"whatsapp", type:"tel"  },
              { label:"Correo electrónico",      key:"email",    type:"email"},
              { label:"Sitio web",              key:"website",  type:"url"  },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>{label}</label>
                <input type={type} value={(clinicForm as any)[key]} onChange={(e) => setClinicForm({ ...clinicForm, [key]: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>Horario general</label>
              <input type="text" value={clinicForm.hours} onChange={(e) => setClinicForm({ ...clinicForm, hours: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
            </div>
          </div>

          {/* WhatsApp API Configuration — ACCESIBLE ÚNICAMENTE PARA ROL DEVELOPER */}
          {userRole === "Developer" && (
            <div className="mt-6 pt-5 border-t" style={{ borderColor:"var(--border)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"#25D366", color:"#fff" }}>
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold" style={{ color:"var(--foreground)" }}>WhatsApp Business API</h4>
                  <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>Configura las credenciales de Meta Cloud API para enviar mensajes</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>Phone Number ID</label>
                  <input type="text" value={waConfig.phoneNumberId} onChange={(e) => setWaConfig({ ...waConfig, phoneNumberId: e.target.value })}
                    placeholder="Ej: 123456789012345"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>Access Token</label>
                  <input type="password" value={waConfig.accessToken} onChange={(e) => setWaConfig({ ...waConfig, accessToken: e.target.value })}
                    placeholder="EAAxxxxxxx..."
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background:"var(--muted)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color:"var(--foreground)" }}>Activar envío de mensajes</p>
                      <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{waConfig.enabled ? "Los mensajes se enviarán automáticamente" : "Los mensajes están desactivados"}</p>
                    </div>
                    <button onClick={() => setWaConfig({ ...waConfig, enabled: !waConfig.enabled })}
                      className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                      style={{ background: waConfig.enabled ? "#25D366" : "var(--muted-foreground)" }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: waConfig.enabled ? "calc(100% - 1.375rem)" : "0.125rem" }} />
                    </button>
                  </div>
                </div>
              </div>
              {!waConfig.phoneNumberId && (
                <div className="mt-3 p-3 rounded-xl text-xs" style={{ background:"#FFFBEB", color:"#92400E", border:"1px solid #FDE68A" }}>
                  <p className="font-semibold">⚠ Credenciales no configuradas</p>
                  <p className="mt-1">Para enviar mensajes de WhatsApp necesitas una cuenta de Meta Business. Visita <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="underline font-semibold">developers.facebook.com</a> para configurarla.</p>
                </div>
              )}
            </div>
          )}

          <button onClick={save} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
            <Save className="w-4 h-4" /> Guardar cambios
          </button>
        </div>
      )}

      {/* ── PERFIL ─── */}
      {tab === "perfil" && (
        <div className="bg-card rounded-2xl border p-5 space-y-4" style={{ borderColor:"var(--border)" }}>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background:"var(--secondary)", color:"var(--primary)" }}>DR</div>
            <div>
              <p className="font-bold" style={{ color:"var(--foreground)" }}>{profileForm.name}</p>
              <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{profileForm.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label:"Nombre completo", key:"name",  type:"text"  },
              { label:"Rol / Cargo",     key:"role",  type:"text"  },
              { label:"Correo",          key:"email", type:"email" },
              { label:"Teléfono",        key:"phone", type:"tel"   },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>{label}</label>
                <input type={type} value={(profileForm as any)[key]} onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>Biografía</label>
              <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none" style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }} />
            </div>
          </div>
          <button onClick={save} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
            <Save className="w-4 h-4" /> Guardar perfil
          </button>
        </div>
      )}

      {/* ── NOTIFICACIONES ─── */}
      {tab === "notificaciones" && (
        <div className="bg-card rounded-2xl border divide-y overflow-hidden" style={{ borderColor:"var(--border)" }}>
          <div className="px-5 py-4 font-semibold text-sm" style={{ color:"var(--foreground)", background:"var(--muted)" }}>Alertas del sistema</div>
          {[
            { label:"Recordatorio de citas",    key:"citaRecordatorio",  sub:"30 min antes de cada cita" },
            { label:"Confirmación de citas",    key:"citaConfirmacion",  sub:"Al crear o modificar una cita" },
            { label:"Nuevo paciente",           key:"nuevoPaciente",     sub:"Al registrar un paciente" },
            { label:"Promociones por vencer",   key:"promoVencimiento",  sub:"72 horas antes del vencimiento" },
            { label:"Saldo pendiente",          key:"balancePendiente",  sub:"Cuando hay saldo sin pagar" },
          ].map(({ label, key, sub }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium" style={{ color:"var(--foreground)" }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color:"var(--muted-foreground)" }}>{sub}</p>
              </div>
              <button onClick={() => setNotifForm({ ...notifForm, [key]: !(notifForm as any)[key] })}
                className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                style={{ background: (notifForm as any)[key] ? "var(--primary)" : "var(--muted-foreground)" }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: (notifForm as any)[key] ? "calc(100% - 1.375rem)" : "0.125rem" }} />
              </button>
            </div>
          ))}
          <div className="px-5 py-4 font-semibold text-sm border-t" style={{ color:"var(--foreground)", background:"var(--muted)", borderColor:"var(--border)" }}>Canales</div>
          {[
            { label:"Notificaciones por correo",    key:"email" },
            { label:"Notificaciones por WhatsApp",  key:"whatsapp" },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-medium" style={{ color:"var(--foreground)" }}>{label}</p>
              <button onClick={() => setNotifForm({ ...notifForm, [key]: !(notifForm as any)[key] })}
                className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                style={{ background: (notifForm as any)[key] ? "var(--primary)" : "var(--muted-foreground)" }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: (notifForm as any)[key] ? "calc(100% - 1.375rem)" : "0.125rem" }} />
              </button>
            </div>
          ))}
          <div className="px-5 py-4">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
              <Save className="w-4 h-4" /> Guardar preferencias
            </button>
          </div>
        </div>
      )}

      {/* ── SEGURIDAD ─── */}
      {tab === "seguridad" && (
        <div className="space-y-3">
          <div className="bg-card rounded-2xl border p-5 space-y-4" style={{ borderColor:"var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color:"var(--foreground)" }}>Cambiar contraseña</h3>
            {[
              { label:"Contraseña actual",    key:"currentPassword", placeholder:"••••••••" },
              { label:"Nueva contraseña",     key:"newPassword",     placeholder:"••••••••" },
              { label:"Confirmar contraseña", key:"confirmPassword", placeholder:"••••••••" },
            ].map(({ label, key, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium mb-1.5" style={{ color:"var(--foreground)" }}>{label}</label>
                <input
                  type="password"
                  placeholder={placeholder}
                  value={(passwordForm as any)[key]}
                  onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor:"var(--border)", color:"var(--foreground)", background:"var(--input-background)" }}
                />
              </div>
            ))}
            <button onClick={save} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background:"var(--primary)", color:"#fff" }}>
              <Save className="w-4 h-4" /> Cambiar contraseña
            </button>
          </div>
          <div className="bg-card rounded-2xl border p-5" style={{ borderColor:"var(--border)" }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color:"var(--foreground)" }}>Sesiones activas</h3>
            {[
              { device:"Sesión actual",    location:"Local",     time:"Ahora",          current:true },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor:"var(--border)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background:"var(--secondary)" }}>
                  <Lock className="w-4 h-4" style={{ color:"var(--primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color:"var(--foreground)" }}>{s.device}</p>
                  <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>{s.location} · {s.time}</p>
                </div>
                {s.current
                  ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:"#DCFCE7", color:"#166534" }}>En línea ahora</span>
                  : <button className="text-xs font-medium" style={{ color:"#DC2626" }}>Cerrar</button>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOGS DE SISTEMA (DEVELOPER ONLY) ─── */}
      {tab === "logs" && userRole === "Developer" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-5 space-y-4" style={{ borderColor:"var(--border)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:"#FEF2F2", color:"#DC2626" }}>
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color:"var(--foreground)" }}>Logs y Diagnóstico de Sistema</h3>
                  <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>Registro en tiempo real de excepciones, fallos de red y consultas del cliente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={refreshLogs} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all" style={{ borderColor:"var(--border)", background:"var(--muted)", color:"var(--foreground)" }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                </button>
                {errorLogs.length > 0 && (
                  <button onClick={handleClearLogs} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" /> Limpiar logs
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border" style={{ borderColor:"var(--border)", background:"var(--input-background)" }}>
                <p className="text-xs font-medium" style={{ color:"var(--muted-foreground)" }}>Total de registros</p>
                <p className="text-xl font-bold mt-1" style={{ color:"var(--foreground)" }}>{errorLogs.length}</p>
              </div>
              <div className="p-3.5 rounded-xl border" style={{ borderColor:"var(--border)", background:"var(--input-background)" }}>
                <p className="text-xs font-medium" style={{ color:"var(--muted-foreground)" }}>Estado de API Local</p>
                <p className="text-xs font-bold mt-2 text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> En línea / Respaldo Supabase
                </p>
              </div>
              <div className="p-3.5 rounded-xl border" style={{ borderColor:"var(--border)", background:"var(--input-background)" }}>
                <p className="text-xs font-medium" style={{ color:"var(--muted-foreground)" }}>Nivel de Acceso</p>
                <p className="text-xs font-bold mt-2 text-indigo-600 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Exclusivo Developer
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border p-5" style={{ borderColor:"var(--border)" }}>
            <h4 className="font-semibold text-sm mb-3" style={{ color:"var(--foreground)" }}>Historial de Excepciones Capotadas</h4>
            {errorLogs.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>No se detectaron errores</p>
                <p className="text-xs" style={{ color:"var(--muted-foreground)" }}>El sistema opera normalmente sin excepciones registradas.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-x-auto">
                <div className="min-w-[600px]">
                  {errorLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl border mb-2 flex items-start justify-between gap-3 text-xs" style={{ borderColor:"var(--border)", background:"var(--input-background)" }}>
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-foreground uppercase">{log.method}</span>
                            <span className="font-mono text-muted-foreground">{log.endpoint}</span>
                          </div>
                          <p className="font-mono text-red-600 mt-1">{log.message}</p>
                        </div>
                      </div>
                      <span className="text-muted-foreground shrink-0 font-mono text-[11px]">{new Date(log.timestamp).toLocaleString("es-MX")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
