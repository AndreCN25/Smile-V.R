/**
 * ============================================================
 *  SERVICIO DE WHATSAPP — Meta Cloud API
 *  Smile V.R — Clínica Dental
 * ============================================================
 *
 *  Este servicio envía mensajes de WhatsApp a los pacientes
 *  cuando se confirma, cancela o recuerda una cita.
 *
 *  REQUISITOS:
 *  1. Cuenta en Meta for Developers (developers.facebook.com)
 *  2. App de WhatsApp Business configurada
 *  3. Phone Number ID + Access Token permanente
 *  4. Configurar credenciales en Ajustes > Clínica > WhatsApp API
 *
 * ============================================================
 */

// ── Types ──────────────────────────────────────────────────
export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  enabled: boolean;
}

export interface NotificationPreferences {
  citaRecordatorio: boolean;
  citaConfirmacion: boolean;
  nuevoPaciente: boolean;
  promoVencimiento: boolean;
  balancePendiente: boolean;
  email: boolean;
  whatsapp: boolean;
}

// ── Storage keys ───────────────────────────────────────────
const WA_CONFIG_KEY = "whatsapp_config";
const NOTIF_PREFS_KEY = "notification_preferences";
const REMINDERS_SENT_KEY = "whatsapp_reminders_sent";

// ── Config helpers ─────────────────────────────────────────
export function getWhatsAppConfig(): WhatsAppConfig {
  try {
    const stored = localStorage.getItem(WA_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { phoneNumberId: "", accessToken: "", enabled: false };
}

export function saveWhatsAppConfig(config: WhatsAppConfig): void {
  localStorage.setItem(WA_CONFIG_KEY, JSON.stringify(config));
}

export function getNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(NOTIF_PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    citaRecordatorio: true,
    citaConfirmacion: true,
    nuevoPaciente: true,
    promoVencimiento: true,
    balancePendiente: false,
    email: true,
    whatsapp: true,
  };
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

// ── Phone number formatting ────────────────────────────────
/**
 * Normaliza un número de teléfono al formato requerido por WhatsApp API.
 * Elimina espacios, guiones, paréntesis y asegura que tenga el prefijo +52.
 * Retorna solo dígitos (sin el +) para la API.
 * Ejemplo: "+52 999-123-4567" → "529991234567"
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  // Remover todo excepto dígitos y el signo +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Si empieza con +, quitar el +
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Si no empieza con 52, agregar 52
  if (!cleaned.startsWith("52")) {
    cleaned = "52" + cleaned;
  }

  return cleaned;
}

/**
 * Asegura que un número tenga el prefijo +52 para mostrar en la UI.
 * Si el usuario escribe solo los dígitos, le pone +52 delante.
 */
export function ensurePhonePrefix(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+52")) return phone;
  if (cleaned.startsWith("52") && cleaned.length > 2) return "+" + cleaned;
  if (cleaned.startsWith("+")) return phone;
  return "+52" + cleaned;
}

// ── WhatsApp API calls ─────────────────────────────────────
/**
 * Envía un mensaje de texto plano vía WhatsApp Business API.
 * Retorna { ok: true } si se envió, o { ok: false, error: string } si falló.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const config = getWhatsAppConfig();
  const prefs = getNotificationPreferences();

  // Verificar que WhatsApp esté habilitado
  if (!config.enabled) {
    console.log("📱 WhatsApp deshabilitado en configuración");
    return { ok: false, error: "WhatsApp está deshabilitado" };
  }

  if (!prefs.whatsapp) {
    console.log("📱 Canal WhatsApp desactivado en notificaciones");
    return { ok: false, error: "Canal WhatsApp desactivado en notificaciones" };
  }

  // Verificar credenciales
  if (!config.phoneNumberId || !config.accessToken) {
    console.warn("⚠️ Credenciales de WhatsApp no configuradas. Ve a Configuración > Clínica > WhatsApp API");
    return { ok: false, error: "Credenciales de WhatsApp no configuradas" };
  }

  const normalizedPhone = normalizePhoneForWhatsApp(phone);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      console.error("❌ Error enviando WhatsApp:", errorMsg);
      return { ok: false, error: errorMsg };
    }

    console.log(`✅ Mensaje WhatsApp enviado a ${normalizedPhone}`);
    return { ok: true };
  } catch (e: any) {
    console.error("❌ Error de red al enviar WhatsApp:", e.message);
    return { ok: false, error: e.message || "Error de red" };
  }
}

// ── Message templates ──────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00");
    return date.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Envía mensaje de CONFIRMACIÓN de cita.
 */
export async function sendAppointmentConfirmation(
  patientName: string,
  patientPhone: string,
  date: string,
  time: string
): Promise<{ ok: boolean; error?: string }> {
  const prefs = getNotificationPreferences();
  if (!prefs.citaConfirmacion) {
    console.log("📱 Notificación de confirmación desactivada");
    return { ok: false, error: "Notificación de confirmación desactivada" };
  }

  const formattedDate = formatDate(date);
  const message = `Hola ${patientName}, se le informa que su cita ha sido confirmada para el día ${formattedDate} a las ${time} hrs. ¡Lo esperamos!`;

  return sendWhatsAppMessage(patientPhone, message);
}

/**
 * Envía mensaje de CANCELACIÓN de cita.
 */
export async function sendAppointmentCancellation(
  patientName: string,
  patientPhone: string,
  date: string,
  time: string
): Promise<{ ok: boolean; error?: string }> {
  const prefs = getNotificationPreferences();
  if (!prefs.citaConfirmacion) {
    console.log("📱 Notificación de confirmación/cancelación desactivada");
    return { ok: false, error: "Notificación desactivada" };
  }

  const formattedDate = formatDate(date);
  const message = `Hola ${patientName}, se le informa que su cita programada para el día ${formattedDate} a las ${time} hrs ha sido cancelada. Para reagendar, comuníquese con nosotros.`;

  return sendWhatsAppMessage(patientPhone, message);
}

/**
 * Envía mensaje de RECORDATORIO (1 día antes).
 */
export async function sendAppointmentReminder(
  patientName: string,
  patientPhone: string,
  time: string
): Promise<{ ok: boolean; error?: string }> {
  const prefs = getNotificationPreferences();
  if (!prefs.citaRecordatorio) {
    console.log("📱 Notificación de recordatorio desactivada");
    return { ok: false, error: "Notificación de recordatorio desactivada" };
  }

  const message = `Hola ${patientName}, se le informa que el día de mañana su cita será a las ${time} hrs. ¡Lo esperamos!`;

  return sendWhatsAppMessage(patientPhone, message);
}

// ── Reminder tracking ──────────────────────────────────────
function getSentReminders(): string[] {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_SENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function markReminderSent(appointmentId: string): void {
  const sent = getSentReminders();
  if (!sent.includes(appointmentId)) {
    sent.push(appointmentId);
    // Keep only the last 500 entries to prevent localStorage bloat
    localStorage.setItem(REMINDERS_SENT_KEY, JSON.stringify(sent.slice(-500)));
  }
}

/**
 * Revisa citas de mañana y envía recordatorios a las que no se han enviado aún.
 * Se llama desde el Dashboard al cargar o con un intervalo periódico.
 */
export async function checkAndSendReminders(
  appointments: any[],
  patients: any[]
): Promise<{ sent: number; errors: number }> {
  const prefs = getNotificationPreferences();
  if (!prefs.citaRecordatorio || !prefs.whatsapp) {
    return { sent: 0, errors: 0 };
  }

  const config = getWhatsAppConfig();
  if (!config.enabled || !config.phoneNumberId || !config.accessToken) {
    return { sent: 0, errors: 0 };
  }

  // Get tomorrow's date string
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Filter appointments for tomorrow that are confirmed or pending
  const tomorrowAppts = appointments.filter(
    (a) =>
      a.date === tomorrowStr &&
      (a.status === "confirmada" || a.status === "pendiente")
  );

  const sentReminders = getSentReminders();
  let sent = 0;
  let errors = 0;

  for (const appt of tomorrowAppts) {
    // Skip if already sent
    if (sentReminders.includes(appt.id)) continue;

    // Find the patient
    const patient = patients.find((p) => p.id === appt.patientId);
    if (!patient || !patient.phone) continue;

    const result = await sendAppointmentReminder(
      patient.name,
      patient.phone,
      appt.time
    );

    if (result.ok) {
      markReminderSent(appt.id);
      sent++;
    } else {
      errors++;
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  if (sent > 0) {
    console.log(`📱 ${sent} recordatorio(s) enviado(s) para citas de mañana`);
  }

  return { sent, errors };
}
