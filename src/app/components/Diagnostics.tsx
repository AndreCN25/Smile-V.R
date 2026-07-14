import { useState, useEffect, useCallback } from "react";
import { getErrorLogs, clearErrorLogs, ErrorLog } from "../../services/api";
import {
  ShieldAlert, RefreshCw, Trash2, Wifi, WifiOff, Server, Clock,
  AlertTriangle, CheckCircle2, XCircle, Info, Search, X, Activity
} from "lucide-react";

function getStatusColor(status: number): { bg: string; text: string; label: string } {
  if (status === 0)  return { bg: "#FEF2F2", text: "#DC2626", label: "Sin Conexión" };
  if (status < 400)  return { bg: "#F0FDF4", text: "#16A34A", label: `${status} OK` };
  if (status < 500)  return { bg: "#FFFBEB", text: "#D97706", label: `${status} Cliente` };
  return             { bg: "#FEF2F2", text: "#DC2626", label: `${status} Servidor` };
}

function getStatusIcon(status: number) {
  if (status === 0)  return WifiOff;
  if (status < 400)  return CheckCircle2;
  if (status < 500)  return AlertTriangle;
  return             XCircle;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return iso; }
}

type FilterType = "todos" | "conexion" | "cliente" | "servidor";

export function Diagnostics() {
  const [logs, setLogs]           = useState<ErrorLog[]>([]);
  const [filter, setFilter]       = useState<FilterType>("todos");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<ErrorLog | null>(null);
  const [checking, setChecking]   = useState(false);
  const [serverOk, setServerOk]   = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const loadLogs = useCallback(() => {
    setLogs(getErrorLogs());
  }, []);

  useEffect(() => {
    loadLogs();
    checkServer();
  }, []);

  async function checkServer() {
    setChecking(true);
    try {
      const res = await fetch("http://localhost:5019/api/patients", { signal: AbortSignal.timeout(5000) });
      setServerOk(res.ok || res.status < 500);
    } catch {
      setServerOk(false);
    } finally {
      setChecking(false);
      setLastCheck(new Date().toISOString());
    }
  }

  function handleClear() {
    clearErrorLogs();
    setLogs([]);
    setSelected(null);
  }

  const filtered = logs.filter(log => {
    const matchFilter =
      filter === "todos"    ? true :
      filter === "conexion" ? log.status === 0 :
      filter === "cliente"  ? (log.status >= 400 && log.status < 500) :
      filter === "servidor" ? log.status >= 500 : true;
    const matchSearch = search === "" ||
      log.endpoint.toLowerCase().includes(search.toLowerCase()) ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.method.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    todos:    logs.length,
    conexion: logs.filter(l => l.status === 0).length,
    cliente:  logs.filter(l => l.status >= 400 && l.status < 500).length,
    servidor: logs.filter(l => l.status >= 500).length,
  };

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: "todos",    label: "Todos",        count: counts.todos },
    { id: "conexion", label: "Sin conexión", count: counts.conexion },
    { id: "cliente",  label: "4xx Cliente",  count: counts.cliente },
    { id: "servidor", label: "5xx Servidor", count: counts.servidor },
  ];

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── LEFT PANEL ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #DC2626 0%, #7C3AED 100%)" }}>
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight" style={{ color: "var(--foreground)" }}>
                  Registro de Errores
                </h1>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Historial de errores del sistema en tiempo real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Server status badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                style={{
                  background: serverOk === null ? "var(--muted)" : serverOk ? "#F0FDF4" : "#FEF2F2",
                  borderColor: serverOk === null ? "var(--border)" : serverOk ? "#86EFAC" : "#FECACA",
                  color: serverOk === null ? "var(--muted-foreground)" : serverOk ? "#16A34A" : "#DC2626"
                }}>
                {serverOk === null ? <Wifi className="w-3.5 h-3.5" /> :
                 serverOk ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                 <WifiOff className="w-3.5 h-3.5" />}
                {serverOk === null ? "Verificando..." : serverOk ? "Servidor Conectado" : "Servidor Caído"}
              </div>

              <button onClick={() => { checkServer(); loadLogs(); }}
                disabled={checking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                Actualizar
              </button>

              {logs.length > 0 && (
                <button onClick={handleClear}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: "#FEF2F2", color: "#DC2626" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Total", value: counts.todos, icon: Activity, color: "#7C3AED", bg: "#EDE9FE" },
              { label: "Sin conexión", value: counts.conexion, icon: WifiOff, color: "#DC2626", bg: "#FEF2F2" },
              { label: "Error cliente", value: counts.cliente, icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB" },
              { label: "Error servidor", value: counts.servidor, icon: Server, color: "#DC2626", bg: "#FEF2F2" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-2xl border"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                  <Icon className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {lastCheck && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
              <Clock className="w-3 h-3" />
              Última verificación: {formatDate(lastCheck)}
            </p>
          )}
        </div>

        {/* Filter + Search bar */}
        <div className="px-6 pb-3 shrink-0 flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: filter === f.id ? "var(--primary)" : "var(--muted)",
                  color: filter === f.id ? "#fff" : "var(--muted-foreground)"
                }}>
                {f.label}
                <span className="px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: filter === f.id ? "rgba(255,255,255,0.2)" : "var(--border)", fontSize: "10px" }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por endpoint, método o mensaje..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none transition-all"
              style={{ borderColor: "var(--border)", background: "var(--muted)", color: "var(--foreground)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--muted)" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "#16A34A" }} />
              </div>
              <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                {logs.length === 0 ? "¡Sin errores registrados!" : "Sin resultados para este filtro"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                {logs.length === 0
                  ? "El sistema está funcionando correctamente."
                  : "Intenta cambiar el filtro o la búsqueda."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(log => {
                const sc = getStatusColor(log.status);
                const StatusIcon = getStatusIcon(log.status);
                const isSelected = selected?.id === log.id;
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelected(isSelected ? null : log)}
                    className="w-full text-left p-4 rounded-2xl border transition-all hover:shadow-sm"
                    style={{
                      borderColor: isSelected ? sc.text : "var(--border)",
                      background: isSelected ? sc.bg + "55" : "var(--card)",
                      outline: isSelected ? `2px solid ${sc.text}33` : "none"
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: sc.bg }}>
                        <StatusIcon className="w-4.5 h-4.5" style={{ color: sc.text }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: sc.bg, color: sc.text }}>
                            {sc.label}
                          </span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                            {log.method}
                          </span>
                          <span className="text-xs font-mono truncate" style={{ color: "var(--primary)" }}>
                            {log.endpoint}
                          </span>
                        </div>
                        <p className="text-xs mt-1 truncate" style={{ color: "var(--muted-foreground)" }}>
                          {log.message}
                        </p>
                      </div>
                      <p className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
                        {formatDate(log.timestamp)}
                      </p>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span style={{ color: "var(--muted-foreground)" }}>Código HTTP</span>
                            <p className="font-bold mt-0.5" style={{ color: sc.text }}>{log.status || "Sin respuesta"}</p>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted-foreground)" }}>Método</span>
                            <p className="font-bold mt-0.5 font-mono" style={{ color: "var(--foreground)" }}>{log.method}</p>
                          </div>
                          <div className="col-span-2">
                            <span style={{ color: "var(--muted-foreground)" }}>Endpoint</span>
                            <p className="font-mono font-semibold mt-0.5 break-all" style={{ color: "var(--primary)" }}>{log.endpoint}</p>
                          </div>
                          <div className="col-span-2">
                            <span style={{ color: "var(--muted-foreground)" }}>Mensaje de error</span>
                            <p className="mt-0.5 leading-relaxed" style={{ color: "var(--foreground)" }}>{log.message}</p>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted-foreground)" }}>Fecha y hora</span>
                            <p className="font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>{formatDate(log.timestamp)}</p>
                          </div>
                        </div>

                        {/* Help suggestion */}
                        <div className="flex items-start gap-2 mt-3 p-3 rounded-xl"
                          style={{ background: "var(--muted)" }}>
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)" }} />
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {log.status === 0
                              ? "El servidor no responde. Verifica que el backend esté corriendo con 'dotnet run'."
                              : log.status >= 500
                              ? "Error interno del servidor. Revisa los logs de C# en la consola del backend."
                              : log.status === 404
                              ? "El endpoint no existe. Verifica que el controlador esté correctamente registrado."
                              : log.status === 400
                              ? "Los datos enviados no son válidos. Revisa los campos del formulario."
                              : "Error inesperado. Revisa la consola del navegador para más detalles."}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
