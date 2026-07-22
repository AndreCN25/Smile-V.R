import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, AlertCircle } from "lucide-react";
import { getSettings, loginUser } from "../../services/api";

interface LoginProps {
  onLogin: (user: { id: string; email: string; name: string; role: string }) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [clinicName, setClinicName] = useState(localStorage.getItem("clinicName") || "Creando Sonrisas Yucatecas");
  const [clinicLogo, setClinicLogo] = useState(localStorage.getItem("clinicLogo") || "");
  const [clinicSlogan, setClinicSlogan] = useState(localStorage.getItem("clinicSlogan") || "Yucatecas");

  useEffect(() => {
    getSettings()
      .then((settings) => {
        if (settings) {
          const name = settings.name || "Creando Sonrisas Yucatecas";
          const logo = settings.logoUrl || "";
          const slogan = settings.slogan || "";
          
          localStorage.setItem("clinicName", name);
          localStorage.setItem("clinicLogo", logo);
          localStorage.setItem("clinicSlogan", slogan);
          
          setClinicName(name);
          setClinicLogo(logo);
          setClinicSlogan(slogan);
        }
      })
      .catch((err) => console.error("Error loading settings in Login", err));
  }, []);

  const displayTitle = clinicName === "Creando Sonrisas Yucatecas" ? "Creando Sonrisas" : clinicName;
  const displaySlogan = clinicName === "Creando Sonrisas Yucatecas" ? "Yucatecas" : clinicSlogan;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    try {
      const res = await loginUser(email, password);
      if (res.ok && res.token && res.user) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        localStorage.setItem("adminEmail", res.user.email);
        localStorage.setItem("adminName", res.user.name);
        localStorage.setItem("adminRole", res.user.role);
        setLoading(false);
        onLogin(res.user);
      } else {
        setLoading(false);
        setError(res.error || "Correo o contraseña incorrectos.");
      }
    } catch (err) {
      setLoading(false);
      setError("Correo o contraseña incorrectos.");
    }
  }

  const inputStyle = { borderColor: "var(--border)", color: "var(--foreground)", background: "var(--input-background)" };
  const focusHandler = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(12,122,122,0.1)"; };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0C2F3A 0%, #0C7A7A 60%, #17B8A6 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ background: "#17B8A6" }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ background: "#17B8A6" }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-5" style={{ background: "#fff" }} />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.2)" }}>
            {clinicLogo ? (
              <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover rounded-[22px]" />
            ) : (
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C9 2 7 4 7 7c0 2 1 4 2 5.5L8 20c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2l-1-7.5c1-1.5 2-3.5 2-5.5 0-3-2-5-5-5z"/>
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">{displayTitle}</h1>
          {displaySlogan && <p className="text-white/70 text-sm mt-1 font-medium tracking-wide">{displaySlogan}</p>}
        </div>

        <div className="rounded-3xl p-7 shadow-2xl" style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}>
          <h2 className="font-semibold mb-1" style={{ color: "var(--foreground)", fontSize: "1.1rem" }}>Iniciar sesión</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Correo electrónico</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@csy.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5">
                  {showPass ? <EyeOff className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2026 Smile V.R. · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
