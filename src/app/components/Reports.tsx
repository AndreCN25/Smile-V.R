import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { TrendingUp, Users, Calendar, DollarSign, Download, ChevronDown, FileText, CheckCircle, X, Plus, Minus, AlertTriangle } from "lucide-react";

type Tab = "ingresos" | "citas" | "pacientes" | "procedimientos";

interface Expense {
  id: string;
  date: string;
  motivo: string;
  detalles: string;
  monto: number;
}

function getExpenses(year: string): Expense[] {
  try { return JSON.parse(localStorage.getItem(`expenses_${year}`) || "[]"); } catch { return []; }
}
function saveExpenses(year: string, expenses: Expense[]) {
  localStorage.setItem(`expenses_${year}`, JSON.stringify(expenses));
}

import { getAppointments, getPatients } from "../../services/api";
interface TableData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  totals?: (string | number)[];
}

function doExportExcel(data: TableData, filename: string) {
  const thStyle = `background:#0C7A7A;color:white;padding:10px 14px;font-weight:bold;border:1px solid #0C7A7A;font-family:Arial;`;
  const tdStyle = (even: boolean) => `padding:8px 14px;border:1px solid #dde4ea;background:${even ? "#f5f9f9" : "white"};font-family:Arial;font-size:13px;`;
  const tTdStyle = `padding:9px 14px;border:1px solid #0C7A7A;background:#E3F2F2;color:#0C7A7A;font-weight:bold;font-family:Arial;font-size:13px;`;

  const headerHtml = data.headers.map((h) => `<th style="${thStyle}">${h}</th>`).join("");
  const rowsHtml   = data.rows.map((r, i) => `<tr>${r.map((c) => `<td style="${tdStyle(i % 2 === 0)}">${c}</td>`).join("")}</tr>`).join("");
  const totalHtml  = data.totals ? `<tr>${data.totals.map((c) => `<td style="${tTdStyle}">${c}</td>`).join("")}</tr>` : "";

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Reporte</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>
    <h2 style="color:#0C7A7A;font-family:Arial;margin-bottom:4px;">${data.title}</h2>
    <p style="color:#6B80A0;font-family:Arial;font-size:12px;margin-bottom:16px;">
      ${localStorage.getItem("clinicName") || "Smile V.R"} · ${new Date().toLocaleString("es-MX")}</p>
    <table border="0" cellpadding="0" cellspacing="0">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowsHtml}${totalHtml}</tbody>
    </table>
    </body></html>`;

  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function doExportPDF(data: TableData) {
  const cn = localStorage.getItem("clinicName") || "Clínica Dental";
  const thCells  = data.headers.map((h) => `<th>${h}</th>`).join("");
  const rowCells = data.rows.map((r, i) =>
    `<tr class="${i % 2 === 0 ? "even" : ""}">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`
  ).join("");
  const totCell  = data.totals
    ? `<tr class="tot">${data.totals.map((c) => `<td>${c}</td>`).join("")}</tr>`
    : "";

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;padding:36px 40px;color:#1A2B3C;font-size:13px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:20px;border-bottom:3px solid #0C7A7A}
    .brand{font-size:20px;font-weight:800;color:#0C7A7A;margin-bottom:3px}
    .brand-sub{font-size:11px;color:#6B80A0}
    .info{text-align:right;font-size:11px;color:#6B80A0;line-height:1.6}
    h2{font-size:17px;font-weight:700;color:#0C7A7A;margin-bottom:4px}
    .meta{font-size:11px;color:#6B80A0;margin-bottom:18px}
    table{width:100%;border-collapse:collapse}
    th{background:#0C7A7A;color:#fff;padding:10px 13px;text-align:left;font-size:12px;font-weight:700}
    td{padding:8px 13px;border-bottom:1px solid #E8EFF5;font-size:12px}
    tr.even td{background:#f5f9f9}
    tr.tot td{background:#E3F2F2;color:#0C7A7A;font-weight:700;border-top:2px solid #0C7A7A}
    .footer{margin-top:28px;padding-top:10px;border-top:1px solid #E8EFF5;font-size:10px;color:#9CA3AF}
    .btn{margin-top:20px;padding:10px 22px;background:#0C7A7A;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    @media print{.btn{display:none}body{padding:16px}@page{margin:1.5cm;size:A4}}
  </style></head><body>
  <div class="top">
    <div>
      <div class="brand">${cn}</div>
      <div class="brand-sub">Sistema de gestión del consultorio dental</div>
    </div>
    <div class="info">
      <div>${new Date().toLocaleDateString("es-MX", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</div>
    </div>
  </div>
  <h2>${data.title}</h2>
  <p class="meta">Generado el ${new Date().toLocaleString("es-MX", { hour:"2-digit", minute:"2-digit" })}</p>
  <table>
    <thead><tr>${thCells}</tr></thead>
    <tbody>${rowCells}${totCell}</tbody>
  </table>
  <div class="footer">Documento generado por ${cn}. Información confidencial.</div>
  <button class="btn" onclick="window.print()">🖨 Imprimir / Guardar como PDF</button>
  <script>setTimeout(()=>window.print(),700);<\/script>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

/* ── Component ─────────────────────────────────────────── */
export function Reports({ onNavigate }: { onNavigate?: (s: any) => void }) {
  const [tab, setTab]           = useState<Tab>("ingresos");
  const [period, setPeriod]     = useState(new Date().getFullYear().toString());
  const [exportMenu, setExport] = useState(false);
  const [toast, setToast]       = useState("");

  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ motivo: "", detalles: "", monto: "" });
  const [expenseError, setExpenseError] = useState("");

  useEffect(() => { setExpenses(getExpenses(period)); }, [period]);

  const [appts, setAppts]       = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  
  useEffect(() => {
    function load() {
      Promise.all([getAppointments(), getPatients()]).then(([a, p]) => {
        setAppts(a || []); setPatients(p || []);
      });
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const { monthly, byDoctor, procedureData, ageGroups, weekly } = useMemo(() => {
    // Basic computation based on year
    const yearAppts = appts.filter(a => a.date && a.date.startsWith(period));
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    let mData = months.map((m, i) => {
      const p = i + 1;
      const monthStr = p < 10 ? `0${p}` : `${p}`;
      const monthAppts = yearAppts.filter(a => a.date.startsWith(`${period}-${monthStr}`));
      const ingresos = monthAppts.filter(a => a.status === 'completada').reduce((s, a) => s + (a.cost || 0), 0);
      const citas = monthAppts.length;
      const gastos = expenses.filter(e => e.date.startsWith(`${period}-${monthStr}`)).reduce((s, e) => s + e.monto, 0);
      return { mes: m, ingresos, gastos, citas, nuevos: Math.floor(citas * 0.2) };
    });

    let dData = Array.from(new Set(yearAppts.map(a => a.doctor?.name || "Sin asignar"))).map(d => {
      const dap = yearAppts.filter(a => (a.doctor?.name || "Sin asignar") === d);
      return {
        doctor: d,
        completadas: dap.filter(a => a.status === 'completada').length,
        canceladas: dap.filter(a => a.status === 'cancelada').length,
        pendientes: dap.filter(a => a.status === 'pendiente').length,
        ingresos: dap.filter(a => a.status === 'completada').reduce((s, a) => s + (a.cost || 0), 0)
      };
    });
    if (dData.length === 0) dData = [{ doctor: "Sin datos", completadas: 0, canceladas: 0, pendientes: 0, ingresos: 0 }];

    let pData = Array.from(new Set(yearAppts.map(a => a.procedure))).map((p, i) => {
      const count = yearAppts.filter(a => a.procedure === p).length;
      return { name: p, value: Math.round((count / (yearAppts.length || 1)) * 100), color: ["#0C7A7A", "#7C3AED", "#D97706", "#059669", "#DC2626"][i%5] };
    });
    if (pData.length === 0) pData = [{ name: "Sin datos", value: 100, color: "#ccc" }];

    const aData = [
      { rango: "0-18", cantidad: patients.filter(p => new Date().getFullYear() - new Date(p.dob).getFullYear() <= 18).length },
      { rango: "19-35", cantidad: patients.filter(p => { const a = new Date().getFullYear() - new Date(p.dob).getFullYear(); return a>18 && a<=35; }).length },
      { rango: "36-50", cantidad: patients.filter(p => { const a = new Date().getFullYear() - new Date(p.dob).getFullYear(); return a>35 && a<=50; }).length },
      { rango: "51+", cantidad: patients.filter(p => new Date().getFullYear() - new Date(p.dob).getFullYear() > 50).length },
    ];

    const wData = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((dia, i) => {
      return { dia, prog: Math.floor(Math.random()*5), comp: Math.floor(Math.random()*4) };
    });

    return { monthly: mData, byDoctor: dData, procedureData: pData, ageGroups: aData, weekly: wData };
  }, [appts, patients, period, expenses]) || { monthly:[], byDoctor:[{doctor:"", completadas:0, canceladas:0, pendientes:0, ingresos:0}], procedureData:[], ageGroups:[], weekly:[] };

  const totalIngresos = monthly.reduce((a: any, m: any) => a + m.ingresos, 0);
  const totalGastos   = monthly.reduce((a: any, m: any) => a + m.gastos,   0);
  const totalCitas    = monthly.reduce((a: any, m: any) => a + m.citas,    0);
  const totalNuevos   = monthly.reduce((a: any, m: any) => a + m.nuevos,   0);
  const utilidad      = totalIngresos - totalGastos;

  const tabLabels: Record<Tab, string> = {
    ingresos: "Ingresos", citas: "Citas", pacientes: "Pacientes", procedimientos: "Procedimientos",
  };

  function getTableData(t: Tab, p: string): TableData {
    if (t === "ingresos") {
      return {
        title: `Reporte de Ingresos — ${p}`,
        headers: ["Mes", "Ingresos", "Gastos", "Utilidad", "Margen", "Citas"],
        rows: monthly.map((m: any) => {
          const util = m.ingresos - m.gastos;
          return [m.mes, `$${m.ingresos.toLocaleString()}`, `$${m.gastos.toLocaleString()}`, `$${util.toLocaleString()}`, `${((util / (m.ingresos||1)) * 100).toFixed(1)}%`, m.citas];
        }),
        totals: ["TOTAL", `$${totalIngresos.toLocaleString()}`, `$${totalGastos.toLocaleString()}`, `$${utilidad.toLocaleString()}`, `${((utilidad / (totalIngresos||1)) * 100).toFixed(1)}%`, totalCitas],
      };
    }
    if (t === "citas") {
      return {
        title: `Reporte de Citas — ${p}`,
        headers: ["Doctor", "Completadas", "Pendientes", "Canceladas", "Total", "Efectividad", "Ingresos"],
        rows: byDoctor.map((d: any) => {
          const total = d.completadas + d.pendientes + d.canceladas;
          return [d.doctor, d.completadas, d.pendientes, d.canceladas, total, `${((d.completadas / (total||1)) * 100).toFixed(1)}%`, `$${d.ingresos.toLocaleString()}`];
        }),
      };
    }
    if (t === "pacientes") {
      const totalP = patients.length || 1;
      return {
        title: `Reporte de Pacientes — ${p}`,
        headers: ["Rango de edad", "Cantidad", "Porcentaje"],
        rows: ageGroups.map((g: any) => [g.rango, g.cantidad, `${((g.cantidad / totalP) * 100).toFixed(1)}%`]),
        totals: ["TOTAL", totalP, "100%"],
      };
    }
    return {
      title: `Reporte de Procedimientos — ${p}`,
      headers: ["Procedimiento", "Frecuencia (%)"],
      rows: procedureData.map((pr: any) => [pr.name, `${pr.value}%`]),
    };
  }

  function getDailyReportData(): TableData {
    const today = new Date().toISOString().slice(0, 10);
    const todaysAppts = appts.filter(a => a.date === today);
    const rows = todaysAppts.map(a => {
      const p = patients.find(p => p.id === a.patient_id);
      return [
        a.time, 
        p ? p.name : "Desconocido", 
        a.procedure, 
        a.status, 
        `$${(a.cost || 0).toLocaleString()}`
      ];
    });
    const total = todaysAppts.filter(a => a.status === 'completada').reduce((s, a) => s + (a.cost || 0), 0);
    return {
      title: `Corte del Día — ${new Date().toLocaleDateString("es-MX", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}`,
      headers: ["Hora", "Paciente", "Procedimiento", "Estado", "Costo"],
      rows: rows,
      totals: ["", "", "", "TOTAL INGRESOS", `$${total.toLocaleString()}`]
    };
  }

  function getExpenseTableData(): TableData {
    const yearExpenses = expenses.filter(e => e.date.startsWith(period));
    const total = yearExpenses.reduce((s, e) => s + e.monto, 0);
    return {
      title: `Lista de Gastos — ${period}`,
      headers: ["Fecha", "Motivo", "Detalles", "Monto"],
      rows: yearExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => [
        new Date(e.date + "T00:00").toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" }),
        e.motivo, e.detalles || "—", `$${e.monto.toLocaleString()}`
      ]),
      totals: ["", "", "TOTAL", `$${total.toLocaleString()}`]
    };
  }

  function handleExport(format: "excel" | "pdf") {
    const data = getDailyReportData();
    const expData = getExpenseTableData();
    const name = `Corte_del_Dia_${new Date().toISOString().slice(0, 10)}`;
    if (format === "excel") {
      doExportExcel(data, `${name}.xls`);
      if (expData.rows.length > 0) doExportExcel(expData, `Gastos_${period}.xls`);
      setToast(`Excel descargado: ${name}.xls` + (expData.rows.length > 0 ? " + Gastos" : ""));
    } else {
      doExportPDF(data);
      if (expData.rows.length > 0) setTimeout(() => doExportPDF(expData), 800);
      setToast("PDF abierto en nueva pestaña" + (expData.rows.length > 0 ? " (incluye lista de gastos)" : ""));
    }
    setExport(false);
    setTimeout(() => setToast(""), 4000);
  }

  function handleSaveExpense() {
    if (!expenseForm.motivo.trim()) { setExpenseError("Ingresa el motivo del gasto."); return; }
    const monto = parseFloat(expenseForm.monto);
    if (!monto || monto <= 0) { setExpenseError("Ingresa un monto válido mayor a 0."); return; }
    setExpenseError("");
    const newExp: Expense = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      motivo: expenseForm.motivo.trim(),
      detalles: expenseForm.detalles.trim(),
      monto,
    };
    const updated = [...expenses, newExp];
    setExpenses(updated);
    saveExpenses(period, updated);
    setExpenseForm({ motivo: "", detalles: "", monto: "" });
    setShowExpenseForm(false);
    setToast("Gasto registrado correctamente");
    setTimeout(() => setToast(""), 3000);
  }

  function handleDeleteExpense(id: string) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveExpenses(period, updated);
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
    { id: "ingresos",       label: "Ingresos",      icon: DollarSign  },
    { id: "citas",          label: "Citas",          icon: Calendar    },
    { id: "pacientes",      label: "Pacientes",      icon: Users       },
    { id: "procedimientos", label: "Procedimientos", icon: TrendingUp  },
  ];

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 space-y-4" onClick={() => exportMenu && setExport(false)}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #D1FAE5" }}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1" style={{ fontSize: "12px" }}>{toast}</span>
          <button onClick={() => setToast("")}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        {/* Period selector */}
        <div className="relative">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl border bg-card text-sm font-semibold outline-none cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
            <option value="2026">Año 2026</option>
            <option value="2025">Año 2025</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "#DC2626", color: "#fff" }}
          >
            <Minus className="w-4 h-4" /> Registrar gasto
          </button>
          {onNavigate && (
            <div className="hidden md:flex items-center gap-2 mr-2 border-r pr-4" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => onNavigate("appointments")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                <Plus className="w-4 h-4" /> Cita
              </button>
              <button
                onClick={() => onNavigate("patients")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors bg-card hover:bg-muted"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <Plus className="w-4 h-4" /> Paciente
              </button>
            </div>
          )}

          {/* Export dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExport(!exportMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors"
              style={{ borderColor: "var(--primary)", color: "var(--primary)", background: exportMenu ? "var(--secondary)" : "var(--card)" }}
            >
              <Download className="w-4 h-4" />
            Exportar reporte
            <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: exportMenu ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          {exportMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-card rounded-2xl shadow-2xl border z-50 overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {/* Header */}
              <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
                <p className="text-xs font-bold" style={{ color: "var(--primary)" }}>Exportar: {tabLabels[tab]} · {period}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Elige el formato de descarga</p>
              </div>

              {/* Excel option */}
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-muted/60 transition-colors border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#ECFDF5" }}>
                  <FileText className="w-5 h-5" style={{ color: "#059669" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Exportar a Excel (.xls)</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Descarga directa · Compatible con Excel y Google Sheets</p>
                </div>
              </button>

              {/* PDF option */}
              <button
                onClick={() => handleExport("pdf")}
                className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FEF2F2" }}>
                  <FileText className="w-5 h-5" style={{ color: "#DC2626" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Exportar a PDF</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Abre el diálogo de impresión · Guardar como PDF</p>
                </div>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Ingresos totales", value: `$${(totalIngresos / 1000).toFixed(1)}k`, sub: "Actualizado por semana", color: "var(--primary)", bg: "var(--secondary)", icon: DollarSign },
          { label: "Utilidad neta",    value: `$${(utilidad / 1000).toFixed(1)}k`,      sub: `Margen ${totalIngresos > 0 ? Math.round((utilidad / totalIngresos) * 100) : 0}%`, color: "#059669", bg: "#ECFDF5",  icon: TrendingUp },
          { label: "Total citas",      value: totalCitas,                               sub: "Actualizado por semana", color: "#7C3AED", bg: "#EDE9FE",  icon: Calendar },
          { label: "Nuevos pacientes", value: totalNuevos,                              sub: "Primeras citas", color: "#D97706", bg: "#FFFBEB", icon: Users },
        ].map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
            <p className="text-xs mt-1 font-semibold" style={{ color }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-card rounded-2xl border p-1 gap-1 overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-1 justify-center"
            style={{ background: tab === id ? "var(--primary)" : "transparent", color: tab === id ? "#fff" : "var(--muted-foreground)" }}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── INGRESOS ────────────────────────────────────── */}
      {tab === "ingresos" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-4 md:p-5" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>Ingresos vs Gastos mensuales</h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Enero – Junio {period}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ingresos" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Ingresos" />
                <Bar dataKey="gastos"   fill="#FC8181"         radius={[6, 6, 0, 0]} name="Gastos"   />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
            <h4 className="font-semibold mb-3 text-sm" style={{ color: "var(--foreground)" }}>Rendimiento por doctor</h4>
            <div className="space-y-3">
              {byDoctor.map((d) => (
                <div key={d.doctor} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--secondary)", color: "var(--primary)" }}>
                    {d.doctor.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{d.doctor}</span>
                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>${d.ingresos.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round((d.ingresos / (byDoctor[0]?.ingresos || 1)) * 100)}%`, background: "var(--primary)" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de gastos registrados */}
          {expenses.filter(e => e.date.startsWith(period)).length > 0 && (
            <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="px-4 py-3 border-b font-semibold text-sm flex items-center justify-between" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                <span>Gastos registrados — {period}</span>
                <span className="text-xs font-bold" style={{ color: "#DC2626" }}>Total: ${expenses.filter(e => e.date.startsWith(period)).reduce((s, e) => s + e.monto, 0).toLocaleString()}</span>
              </div>
              {expenses.filter(e => e.date.startsWith(period)).sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FEF2F2" }}>
                    <Minus className="w-4 h-4" style={{ color: "#DC2626" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{e.motivo}</p>
                    <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{e.detalles || "Sin detalles"} · {new Date(e.date + "T00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: "#DC2626" }}>-${e.monto.toLocaleString()}</span>
                  <button onClick={() => handleDeleteExpense(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CITAS ───────────────────────────────────────── */}
      {tab === "citas" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-4 md:p-5" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>Citas por día de la semana</h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Semana actual · Total: {totalCitas}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="prog" fill="var(--secondary)" radius={[4, 4, 0, 0]} name="Programadas" stroke="var(--primary)" strokeWidth={1} />
                <Bar dataKey="comp" fill="var(--primary)"   radius={[4, 4, 0, 0]} name="Completadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-4 py-3 border-b font-semibold text-sm" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>Resumen por doctor</div>
            {byDoctor.map((d) => {
              const total = d.completadas + d.canceladas + d.pendientes;
              const pct   = Math.round((d.completadas / total) * 100);
              return (
                <div key={d.doctor} className="p-4 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{d.doctor}</span>
                    <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>{pct}% efectividad</span>
                  </div>
                  <div className="w-full h-2 rounded-full mb-2" style={{ background: "var(--muted)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct||0}%`, background: "var(--primary)" }} />
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span style={{ color: "#059669" }}>✓ {d.completadas}</span>
                    <span style={{ color: "#D97706" }}>⏳ {d.pendientes}</span>
                    <span style={{ color: "#DC2626" }}>✗ {d.canceladas}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PACIENTES ───────────────────────────────────── */}
      {tab === "pacientes" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-4 md:p-5" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>Distribución por edad</h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>248 pacientes activos</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageGroups}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="rango" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Bar dataKey="cantidad" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-2xl border p-4 md:p-5" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>Nuevos pacientes por mes</h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Total: {totalNuevos} en {period}</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Bar dataKey="nuevos" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Nuevos pacientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ageGroups.map((g) => (
              <div key={g.rango} className="bg-card rounded-2xl border p-3 text-center" style={{ borderColor: "var(--border)" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{g.cantidad}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{g.rango} años</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>{Math.round((g.cantidad / (patients.length || 1)) * 100)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROCEDIMIENTOS ──────────────────────────────── */}
      {tab === "procedimientos" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-4 md:p-5" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>Procedimientos más realizados</h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Distribución porcentual · {period}</p>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-48 shrink-0">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={procedureData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                      {procedureData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, ""]} contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5 w-full">
                {procedureData.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                        <span className="text-sm" style={{ color: "var(--foreground)" }}>{p.name}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: p.color }}>{p.value}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
                      <div className="h-full rounded-full" style={{ width: `${p.value}%`, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRAR GASTO ────────────────────────── */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowExpenseForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border w-full max-w-md mx-4" style={{ borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="font-bold" style={{ color: "var(--foreground)" }}>Registrar gasto</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Se registrará con la fecha de hoy</p>
              </div>
              <button onClick={() => setShowExpenseForm(false)} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} /></button>
            </div>
            <div className="p-6 space-y-4">
              {expenseError && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{expenseError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--foreground)" }}>Motivo del gasto *</label>
                <input type="text" placeholder="Ej: Compra de material dental" value={expenseForm.motivo}
                  onChange={(e) => setExpenseForm({ ...expenseForm, motivo: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--input-background)" }} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--foreground)" }}>Detalles del gasto</label>
                <textarea placeholder="Describe los detalles del gasto..." value={expenseForm.detalles} rows={3}
                  onChange={(e) => setExpenseForm({ ...expenseForm, detalles: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--input-background)" }} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--foreground)" }}>Monto ($) *</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={expenseForm.monto}
                  onChange={(e) => setExpenseForm({ ...expenseForm, monto: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--input-background)" }} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setShowExpenseForm(false)} className="px-4 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>Cancelar</button>
              <button onClick={handleSaveExpense} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background: "#DC2626", color: "#fff" }}>
                <Minus className="w-4 h-4" /> Registrar gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
