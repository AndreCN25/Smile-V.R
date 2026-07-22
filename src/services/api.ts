import axios from "axios";
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

// ── AXIOS INSTANCE ───────────────────────────────────────────
const api = axios.create({
  baseURL: DB_CONFIG.apiBaseUrl + "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<{ ok: boolean; token?: string; user?: any; error?: string }> {
  try {
    const res = await api.post("/auth/login", { email, password });
    return { ok: true, token: res.data.token, user: res.data.user };
  } catch (e: any) {
    logError("auth/login", "POST", e.message);
    const errorMsg = e.response?.data?.error || "Correo o contraseña incorrectos.";
    return { ok: false, error: errorMsg };
  }
}

export async function validateToken(): Promise<any | null> {
  try {
    const res = await api.get("/auth/validate");
    return res.data;
  } catch (e) {
    return null;
  }
}

// ── USER MANAGEMENT ───────────────────────────────────────
export async function getUsers() {
  const res = await api.get("/users");
  return res.data;
}

export async function createUser(data: any) {
  const res = await api.post("/users", data);
  return res.data;
}

export async function updateUser(id: string, data: any) {
  const res = await api.put(`/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`);
}

export async function toggleUserActive(id: string) {
  const res = await api.put(`/users/${id}/toggle-active`);
  return res.data;
}

export async function updateUserPassword(email: string, newPassword: string) {
  const res = await api.get("/users");
  const users = res.data;
  const user = users.find((u: any) => u.email === email);
  if (user) {
    await api.put(`/users/${user.id}/reset-password`, { newPassword });
  } else {
    throw new Error("User not found");
  }
}

export async function resetUserPassword(id: string, newPassword: string) {
  await api.put(`/users/${id}/reset-password`, { newPassword });
}

// ── PACIENTES ──────────────────────────────────────────────
export async function getPatients() {
  const res = await api.get("/patients");
  return res.data;
}

export async function createPatient(patient: any) {
  const { id, ...payload } = patient;
  if (payload.dob === "") payload.dob = null;
  const res = await api.post("/patients", payload);
  return res.data;
}

export async function updatePatient(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  if (payload.dob === "") payload.dob = null;
  const res = await api.put(`/patients/${id}`, payload);
  return res.data;
}

export async function deletePatient(id: string) {
  await api.delete(`/patients/${id}`);
}

// ── DOCTORES ───────────────────────────────────────────────
export async function getDoctors() {
  const res = await api.get("/doctors");
  return res.data;
}

export async function createDoctor(doctor: any) {
  const { id, ...payload } = doctor;
  const res = await api.post("/doctors", payload);
  return res.data;
}

export async function updateDoctor(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  const res = await api.put(`/doctors/${id}`, payload);
  return res.data;
}

export async function deleteDoctor(id: string) {
  await api.delete(`/doctors/${id}`);
}

// ── CITAS ──────────────────────────────────────────────────
export async function getAppointments() {
  const res = await api.get("/appointments");
  return res.data;
}

export async function getPatientAppointments(patientId: string) {
  const res = await api.get(`/appointments?patientId=${patientId}`);
  return res.data;
}

export async function createAppointment(appt: any) {
  const { id, patient, doctor, ...payload } = appt;
  const res = await api.post("/appointments", payload);
  return res.data;
}

export async function updateAppointment(id: string, updates: any) {
  const { id: _, patient, doctor, ...payload } = updates;
  const res = await api.put(`/appointments/${id}`, payload);
  return res.data;
}

export async function deleteAppointment(id: string) {
  await api.delete(`/appointments/${id}`);
}

// ── TRATAMIENTOS (CATÁLOGO) ────────────────────────────────
export async function getTreatments() {
  const res = await api.get("/treatments");
  return res.data;
}

export async function createTreatment(t: any) {
  const { id, ...payload } = t;
  const res = await api.post("/treatments", payload);
  return res.data;
}

export async function updateTreatment(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  const res = await api.put(`/treatments/${id}`, payload);
  return res.data;
}

export async function deleteTreatment(id: string) {
  await api.delete(`/treatments/${id}`);
}

// ── PROMOCIONES ────────────────────────────────────────────
export async function getPromotions() {
  const res = await api.get("/promotions");
  return res.data;
}

export async function createPromotion(p: any) {
  const { id, ...payload } = p;
  const res = await api.post("/promotions", payload);
  return res.data;
}

export async function updatePromotion(id: string, updates: any) {
  const { id: _, ...payload } = updates;
  const res = await api.put(`/promotions/${id}`, payload);
  return res.data;
}

export async function deletePromotion(id: string) {
  await api.delete(`/promotions/${id}`);
}

// ── SETTINGS ───────────────────────────────────────────────
export async function getSettings() {
  const res = await api.get("/clinicsettings");
  // Assuming backend returns an array or single object
  return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : res.data;
}

export async function updateSettings(id: string | null, updates: any) {
  const { id: _, ...payload } = updates;
  if (!id) {
    const res = await api.post("/clinicsettings", payload);
    return res.data;
  } else {
    const res = await api.put(`/clinicsettings/${id}`, payload);
    return res.data;
  }
}

// ── AGENDA (HORARIOS Y BLOQUEOS) ───────────────────────────
// Schedules and BlockedDates endpoints do NOT exist in the backend. Keep using Supabase for those.
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
  const { data, error } = await supabase.from('blocked_dates').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteBlockedDate(id: string) {
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
