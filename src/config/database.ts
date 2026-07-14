/**
 * ============================================================
 *  CONFIGURACIÓN DE BASE DE DATOS
 *  Smile V.R
 * ============================================================
 *
 *  Para conectar a una base de datos real:
 *
 *  1. Cambia `mode` de "local" a "api"
 *  2. Escribe la URL de tu servidor backend en `apiBaseUrl`
 *  3. Implementa las funciones en src/services/api.ts
 *
 *  Ejemplo con backend local:
 *    apiBaseUrl: "http://localhost:3001/api"
 *
 *  Ejemplo con Supabase:
 *    apiBaseUrl: "https://xyzabc.supabase.co/rest/v1"
 *
 * ============================================================
 */

export const DB_CONFIG = {
  /** "local" = datos en memoria (sin persistencia)
   *  "api"   = conectado a backend real               */
  mode: "api" as "local" | "api",

  /** URL base del API REST cuando mode === "api" */
  apiBaseUrl: "http://localhost:3001/api",

  // ── Credenciales de administrador (modo local) ────────────
  // ⚠️  En producción con backend real, elimina estas líneas
  //     y maneja la autenticación desde el servidor.
  adminEmail: "andrecn643@gmail.com",
  get adminPassword(): string {
    return localStorage.getItem("adminPassword") || "19750120";
  },

  // ── Nombre del consultorio ────────────────────────────────
  clinicName: "Smile V.R",
};
