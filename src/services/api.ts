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
  timeout: 4000,
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
      const token = localStorage.getItem("token");
      if (token && !token.startsWith("ghpages-")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<{ ok: boolean; token?: string; user?: any; error?: string }> {
  const normEmail = email.trim().toLowerCase();

  // 1. Try .NET API first
  try {
    const res = await api.post("/auth/login", { email: normEmail, password });
    return { ok: true, token: res.data.token, user: res.data.user };
  } catch (e: any) {
    logError("auth/login", "POST", e.message);

    // 2. Developer bypass fallback (Works on GitHub Pages, Netlify, Vercel, Localhost)
    if (normEmail === "andrecn643@gmail.com" && password === "19750120") {
      const devUser = {
        id: "dev-001",
        email: "andrecn643@gmail.com",
        name: "Developer",
        role: "Developer",
        active: true
      };
      return { ok: true, token: "ghpages-dev-token", user: devUser };
    }

    // 3. Supabase direct check for legacy users when .NET API is offline / unreachable
    try {
      const { data: supaUsers } = await supabase.from("Users").select("*").ilike("Email", normEmail);
      if (supaUsers && supaUsers.length > 0) {
        const su = supaUsers[0];
        if (su.Active === false) {
          return { ok: false, error: "Tu cuenta ha sido desactivada." };
        }
        const userObj = {
          id: su.Id || su.id,
          email: su.Email || su.email,
          name: su.Name || su.name || "Administrador",
          role: su.Role || su.role || "Administrador",
          active: su.Active ?? true
        };
        return { ok: true, token: "ghpages-supa-token", user: userObj };
      }
    } catch (err) {}

    const errorMsg = e.response?.data?.error || "Correo o contraseña incorrectos.";
    return { ok: false, error: errorMsg };
  }
}

export async function validateToken(): Promise<any | null> {
  const token = localStorage.getItem("token");
  if (token && token.startsWith("ghpages-")) {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch {}
    }
    return { id: "dev-001", email: "andrecn643@gmail.com", name: "Developer", role: "Developer", active: true };
  }

  try {
    const res = await api.get("/auth/validate");
    return res.data;
  } catch (e) {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch {}
    }
    return null;
  }
}

// Helper to attempt API first, fallback to Supabase if API is offline
async function tryApiOrSupabase<T>(apiFn: () => Promise<T>, supaFn: () => Promise<T>): Promise<T> {
  try {
    return await apiFn();
  } catch (e: any) {
    if (!e.response || e.code === "ERR_NETWORK" || e.code === "ECONNABORTED" || e.message?.includes("Network Error")) {
      return await supaFn();
    }
    throw e;
  }
}

// ── USER MANAGEMENT ───────────────────────────────────────
export async function getUsers() {
  return tryApiOrSupabase(
    async () => (await api.get("/users")).data,
    async () => {
      const { data } = await supabase.from('Users').select('*');
      return (data || []).map(u => ({
        id: u.Id || u.id,
        email: u.Email || u.email,
        name: u.Name || u.name,
        role: u.Role || u.role || 'Administrador',
        active: u.Active ?? true
      }));
    }
  );
}

export async function createUser(data: any) {
  return tryApiOrSupabase(
    async () => (await api.post("/users", data)).data,
    async () => {
      const payload = {
        Id: crypto.randomUUID(),
        Email: data.email,
        PasswordHash: data.password,
        Name: data.name,
        Role: data.role || 'Administrador',
        Active: true
      };
      const { data: created, error } = await supabase.from('Users').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return created;
    }
  );
}

export async function updateUser(id: string, data: any) {
  return tryApiOrSupabase(
    async () => (await api.put(`/users/${id}`, data)).data,
    async () => {
      const { data: updated, error } = await supabase.from('Users').update({ Name: data.name, Email: data.email, Role: data.role }).eq('Id', id).select().single();
      if (error) throw new Error(error.message);
      return updated;
    }
  );
}

export async function deleteUser(id: string) {
  return tryApiOrSupabase(
    async () => { await api.delete(`/users/${id}`); },
    async () => {
      const { error } = await supabase.from('Users').delete().eq('Id', id);
      if (error) throw new Error(error.message);
    }
  );
}

export async function toggleUserActive(id: string) {
  return tryApiOrSupabase(
    async () => (await api.put(`/users/${id}/toggle-active`)).data,
    async () => {
      const { data: current } = await supabase.from('Users').select('Active').eq('Id', id).single();
      const newActive = !(current?.Active ?? true);
      const { data: updated, error } = await supabase.from('Users').update({ Active: newActive }).eq('Id', id).select().single();
      if (error) throw new Error(error.message);
      return updated;
    }
  );
}

export async function updateUserPassword(email: string, newPassword: string) {
  return tryApiOrSupabase(
    async () => {
      const users = (await api.get("/users")).data;
      const user = users.find((u: any) => u.email === email);
      if (user) {
        await api.put(`/users/${user.id}/reset-password`, { newPassword });
      }
    },
    async () => {
      const { error } = await supabase.from('Users').update({ PasswordHash: newPassword }).eq('Email', email);
      if (error) throw new Error(error.message);
    }
  );
}

export async function resetUserPassword(id: string, newPassword: string) {
  return tryApiOrSupabase(
    async () => { await api.put(`/users/${id}/reset-password`, { newPassword }); },
    async () => {
      const { error } = await supabase.from('Users').update({ PasswordHash: newPassword }).eq('Id', id);
      if (error) throw new Error(error.message);
    }
  );
}

// ── PACIENTES ──────────────────────────────────────────────
export async function getPatients() {
  return tryApiOrSupabase(
    async () => (await api.get("/patients")).data,
    async () => {
      const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map((p: any) => ({
        ...p,
        totalVisits: p.totalVisits ?? p.total_visits ?? 0,
        lastVisit: p.lastVisit ?? p.last_visit ?? "",
      }));
    }
  );
}

export async function createPatient(patient: any) {
  return tryApiOrSupabase(
    async () => {
      const { id, ...payload } = patient;
      if (payload.dob === "") payload.dob = null;
      return (await api.post("/patients", payload)).data;
    },
    async () => {
      const { id, ...payload } = patient;
      const dbPayload = {
        ...payload,
        total_visits: payload.totalVisits ?? 0,
        last_visit: payload.lastVisit ?? null
      };
      const { data, error } = await supabase.from('patients').insert([dbPayload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function updatePatient(id: string, updates: any) {
  return tryApiOrSupabase(
    async () => {
      const { id: _, ...payload } = updates;
      if (payload.dob === "") payload.dob = null;
      return (await api.put(`/patients/${id}`, payload)).data;
    },
    async () => {
      const { id: _, ...payload } = updates;
      const dbPayload: any = { ...payload };
      if (payload.totalVisits !== undefined) {
        dbPayload.total_visits = payload.totalVisits;
      }
      if (payload.lastVisit !== undefined) {
        dbPayload.last_visit = payload.lastVisit;
      }
      const { data, error } = await supabase.from('patients').update(dbPayload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function deletePatient(id: string) {
  return tryApiOrSupabase(
    async () => { await api.delete(`/patients/${id}`); },
    async () => {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  );
}

// ── DOCTORES ───────────────────────────────────────────────
export async function getDoctors() {
  return tryApiOrSupabase(
    async () => (await api.get("/doctors")).data,
    async () => {
      const { data, error } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
  );
}

export async function createDoctor(doctor: any) {
  return tryApiOrSupabase(
    async () => {
      const { id, ...payload } = doctor;
      return (await api.post("/doctors", payload)).data;
    },
    async () => {
      const { id, ...payload } = doctor;
      const { data, error } = await supabase.from('doctors').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function updateDoctor(id: string, updates: any) {
  return tryApiOrSupabase(
    async () => {
      const { id: _, ...payload } = updates;
      return (await api.put(`/doctors/${id}`, payload)).data;
    },
    async () => {
      const { id: _, ...payload } = updates;
      const { data, error } = await supabase.from('doctors').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function deleteDoctor(id: string) {
  return tryApiOrSupabase(
    async () => { await api.delete(`/doctors/${id}`); },
    async () => {
      const { error } = await supabase.from('doctors').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  );
}

// ── CITAS ──────────────────────────────────────────────────
export async function getAppointments() {
  return tryApiOrSupabase(
    async () => (await api.get("/appointments")).data,
    async () => {
      const { data, error } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
  );
}

export async function getPatientAppointments(patientId: string) {
  return tryApiOrSupabase(
    async () => (await api.get(`/appointments?patientId=${patientId}`)).data,
    async () => {
      const { data, error } = await supabase.from('appointments').select('*').eq('patientId', patientId);
      if (error) throw new Error(error.message);
      return data || [];
    }
  );
}

export async function createAppointment(appt: any) {
  return tryApiOrSupabase(
    async () => {
      const { id, patient, doctor, ...payload } = appt;
      return (await api.post("/appointments", payload)).data;
    },
    async () => {
      const { id, patient, doctor, ...payload } = appt;
      const { data, error } = await supabase.from('appointments').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function updateAppointment(id: string, updates: any) {
  return tryApiOrSupabase(
    async () => {
      const { id: _, patient, doctor, ...payload } = updates;
      return (await api.put(`/appointments/${id}`, payload)).data;
    },
    async () => {
      const { id: _, patient, doctor, ...payload } = updates;
      const { data, error } = await supabase.from('appointments').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function deleteAppointment(id: string) {
  return tryApiOrSupabase(
    async () => { await api.delete(`/appointments/${id}`); },
    async () => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  );
}

// ── TRATAMIENTOS (CATÁLOGO) ────────────────────────────────
export async function getTreatments() {
  return tryApiOrSupabase(
    async () => (await api.get("/treatments")).data,
    async () => {
      const { data, error } = await supabase.from('treatments').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    }
  );
}

export async function createTreatment(t: any) {
  return tryApiOrSupabase(
    async () => {
      const { id, ...payload } = t;
      return (await api.post("/treatments", payload)).data;
    },
    async () => {
      const { id, ...payload } = t;
      const { data, error } = await supabase.from('treatments').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function updateTreatment(id: string, updates: any) {
  return tryApiOrSupabase(
    async () => {
      const { id: _, ...payload } = updates;
      return (await api.put(`/treatments/${id}`, payload)).data;
    },
    async () => {
      const { id: _, ...payload } = updates;
      const { data, error } = await supabase.from('treatments').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function deleteTreatment(id: string) {
  return tryApiOrSupabase(
    async () => { await api.delete(`/treatments/${id}`); },
    async () => {
      const { error } = await supabase.from('treatments').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  );
}

// ── PROMOCIONES ────────────────────────────────────────────
export async function getPromotions() {
  return tryApiOrSupabase(
    async () => (await api.get("/promotions")).data,
    async () => {
      const { data, error } = await supabase.from('promotions').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    }
  );
}

export async function createPromotion(p: any) {
  return tryApiOrSupabase(
    async () => {
      const { id, ...payload } = p;
      return (await api.post("/promotions", payload)).data;
    },
    async () => {
      const { id, ...payload } = p;
      const { data, error } = await supabase.from('promotions').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function updatePromotion(id: string, updates: any) {
  return tryApiOrSupabase(
    async () => {
      const { id: _, ...payload } = updates;
      return (await api.put(`/promotions/${id}`, payload)).data;
    },
    async () => {
      const { id: _, ...payload } = updates;
      const { data, error } = await supabase.from('promotions').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  );
}

export async function deletePromotion(id: string) {
  return tryApiOrSupabase(
    async () => { await api.delete(`/promotions/${id}`); },
    async () => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  );
}

// ── SETTINGS ───────────────────────────────────────────────
export async function getSettings() {
  return tryApiOrSupabase(
    async () => {
      const res = await api.get("/clinicsettings");
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : res.data;
    },
    async () => {
      const { data, error } = await supabase.from('clinic_settings').select('*').limit(1);
      if (error) return null;
      return data && data.length > 0 ? data[0] : null;
    }
  );
}

export async function updateSettings(id: string | null, updates: any) {
  return tryApiOrSupabase(
    async () => {
      const { id: _, ...payload } = updates;
      if (!id) return (await api.post("/clinicsettings", payload)).data;
      return (await api.put(`/clinicsettings/${id}`, payload)).data;
    },
    async () => {
      const { id: _, ...payload } = updates;
      if (!id) {
        const { data, error } = await supabase.from('clinic_settings').insert([payload]).select().single();
        if (error) throw new Error(error.message);
        return data;
      } else {
        const { data, error } = await supabase.from('clinic_settings').update(payload).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data;
      }
    }
  );
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
  const { data, error } = await supabase.from('blocked_dates').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBlockedDate(id: string) {
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
