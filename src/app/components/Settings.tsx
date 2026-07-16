import { useState } from "react";
import { Save, CheckCircle, User, Building2, Clock, Bell, Lock, Palette, ChevronRight, Edit2, Trash2, MessageCircle } from "lucide-react";
import { getWhatsAppConfig, saveWhatsAppConfig, getNotificationPreferences, saveNotificationPreferences, WhatsAppConfig, NotificationPreferences } from "../../services/whatsapp";

import { getSettings, updateSettings, updateUserPassword, deleteUserAccount, loginUser } from "../../services/api";

type SettingsTab = "clinica" | "perfil" | "notificaciones" | "seguridad";

interface SettingsProps { defaultTab?: SettingsTab; }

export function Settings({ defaultTab = "clinica" }: SettingsProps) {
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

  async function handleDeleteAccount() {
    const email = localStorage.getItem("adminEmail") || profileForm.email;
    if (!email || email === "admin@clinicadental.com") {
      alert("No se puede determinar la cuenta actual. Asegúrate de haber iniciado sesión correctamente.");
      return;
    }

    const p = window.prompt("Ingresa tu contraseña actual para confirmar la eliminación de tu cuenta:");
    if (p === null || p.trim() === "") return;

    // Verify password - check localStorage first, then try DB login
    const storedPassword = localStorage.getItem("adminPassword");
    let passwordValid = false;

    if (storedPassword && p === storedPassword) {
      passwordValid = true;
    } else {
      // Try verifying against DB
      try {
        const res = await loginUser(email, p);
        if (res.ok) passwordValid = true;
      } catch (_) {}
    }

    if (!passwordValid) {
      alert("Contraseña incorrecta. No se pudo eliminar la cuenta.");
      return;
    }

    if (!window.confirm("¿ESTÁS TOTALMENTE SEGURO?\n\nEsta acción eliminará tu cuenta permanentemente y perderás el acceso. No se puede deshacer.")) return;

    const res = await deleteUserAccount(email);
    if (res.ok) {
      // Clear all session data
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminPassword");
      localStorage.removeItem("adminName");
      localStorage.removeItem("adminRole");
      localStorage.removeItem("adminPhone");
      localStorage.removeItem("adminBio");
      alert("Tu cuenta ha sido eliminada exitosamente.");
      window.location.reload();
    } else {
      alert("Error al eliminar la cuenta: " + (res.error || "Error desconocido"));
    }
  }



  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
    { id: "clinica",        label: "Clínica",        icon: Building2 },
    { id: "perfil",         label: "Mi perfil",      icon: User },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    { id: "seguridad",      label: "Seguridad",      icon: Lock },
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

          {/* WhatsApp API Configuration */}
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
          
          <div className="bg-red-50 rounded-2xl border p-5 mt-4" style={{ borderColor:"#FECACA" }}>
            <h3 className="font-semibold text-sm mb-2 text-red-600">Zona de peligro</h3>
            <p className="text-xs text-red-500 mb-4">Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar seguro antes de continuar.</p>
            <button onClick={handleDeleteAccount} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 bg-red-600 text-white transition-all hover:bg-red-700">
              <Trash2 className="w-4 h-4" /> Eliminar cuenta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
