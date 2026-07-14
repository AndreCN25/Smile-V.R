import { supabase } from "../config/supabase";
import { DB_CONFIG } from "../config/database";

export interface ErrorLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: number;
  message: string;
}

function logError(endpoint: string, method: string, message: string) {
  try {
    const logs = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
    const newLog: ErrorLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 0,
      message
    };
    localStorage.setItem('app_error_logs', JSON.stringify([newLog, ...logs].slice(0, 100)));
  } catch (e) {}
}

export function getErrorLogs(): ErrorLog[] {
  try { return JSON.parse(localStorage.getItem('app_error_logs') || '[]'); } catch { return []; }
}
export function clearErrorLogs() { localStorage.removeItem('app_error_logs'); }

// ── LOGIN ──────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (email === DB_CONFIG.adminEmail && password === DB_CONFIG.adminPassword) return { ok: true };
  try {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
    if (data && !error) return { ok: true };
  } catch (e: any) { logError("users", "LOGIN", e.message); }
  return { ok: false, error: "Correo o contraseña incorrectos." };
}

export async function updateUserPassword(email: string, newPassword: string) {
  const { data, error } = await supabase.from('users').update({ password: newPassword }).eq('email', email).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function registerUser(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // Check if user already exists
    const { data: existing } = await supabase.from('users').select('id').eq('email', email);
    if (existing && existing.length > 0) {
      return { ok: false, error: "Este correo ya está registrado." };
    }
    const { data, error } = await supabase.from('users').insert([{ email, password, role: 'admin' }]).select().single();
    if (error) return { ok: false, error: error.message };
    if (data) return { ok: true };
    return { ok: false, error: "No se pudo crear la cuenta." };
  } catch (e: any) {
    logError("users", "REGISTER", e.message);
    return { ok: false, error: "Error al registrar: " + e.message };
  }
}

export async function deleteUserAccount(email: string) {
  try {
    const { error } = await supabase.from('users').delete().eq('email', email);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    logError("users", "DELETE", e.message);
    return { ok: false, error: e.message };
  }
}

// ── PACIENTES ──────────────────────────────────────────────
export async function getPatients() {
  const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPatient(patient: any) {
  const { id, ...payload } = patient;
  if (payload.dob === "") payload.dob = null;
  const { data, error } = await supabase.from('patients').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePatient(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  if (payload.dob === "") payload.dob = null;
  const { data, error } = await supabase.from('patients').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePatient(id: string) {
  const { error } = await supabase.from('patients').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── DOCTORES ───────────────────────────────────────────────
export async function getDoctors() {
  const { data, error } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createDoctor(doctor: any) {
  const { id, ...payload } = doctor;
  const { data, error } = await supabase.from('doctors').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDoctor(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  const { data, error } = await supabase.from('doctors').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDoctor(id: string) {
  const { error } = await supabase.from('doctors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── CITAS ──────────────────────────────────────────────────
export async function getAppointments() {
  const { data, error } = await supabase.from('appointments').select('*, patient:patients(name), doctor:doctors(name)').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPatientAppointments(patientId: string) {
  const { data, error } = await supabase.from('appointments').select('*, doctor:doctors(name)').eq('patientId', patientId).order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAppointment(appt: any) {
  const { id, patient, doctor, ...payload } = appt;
  const { data, error } = await supabase.from('appointments').insert([payload]).select('*, patient:patients(name), doctor:doctors(name)').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAppointment(id: string, updates: any) {
  const { id: _, patient, doctor, ...payload } = updates;
  const { data, error } = await supabase.from('appointments').update(payload).eq('id', id).select('*, patient:patients(name), doctor:doctors(name)').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── TRATAMIENTOS (CATÁLOGO) ────────────────────────────────
export async function getTreatments() {
  const { data, error } = await supabase.from('treatments').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createTreatment(t: any) {
  const { id, ...payload } = t;
  const { data, error } = await supabase.from('treatments').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTreatment(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  const { data, error } = await supabase.from('treatments').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTreatment(id: string) {
  const { error } = await supabase.from('treatments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── PROMOCIONES ────────────────────────────────────────────
export async function getPromotions() {
  const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPromotion(p: any) {
  const { id, ...payload } = p;
  const { data, error } = await supabase.from('promotions').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePromotion(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  const { data, error } = await supabase.from('promotions').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePromotion(id: string) {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── SETTINGS ───────────────────────────────────────────────
export async function getSettings() {
  const { data, error } = await supabase.from('clinicsettings').select('*').limit(1);
  if (error) throw new Error(error.message);
  return (data && data.length > 0) ? data[0] : null;
}

export async function updateSettings(id: string | null, updates: any) {
  const { id: _, ...payload } = updates;
  if (!id) {
    const { data, error } = await supabase.from('clinicsettings').insert([payload]).select().single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase.from('clinicsettings').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
}

// ── AGENDA (HORARIOS Y BLOQUEOS) ───────────────────────────
export async function getSchedules() {
  const { data, error } = await supabase.from('schedules').select('*');
  if (error) throw new Error(error.message);
  return data || [];
}
export async function updateSchedule(day: string, payload: any) {
  const { data, error } = await supabase.from('schedules').update(payload).eq('day', day).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function getBlockedDates() {
  const { data, error } = await supabase.from('blocked_dates').select('*').order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function createBlockedDate(payload: any) {
  const { id, ...dataToInsert } = payload;
  const { data, error } = await supabase.from('blocked_dates').insert([dataToInsert]).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteBlockedDate(id: string) {
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
