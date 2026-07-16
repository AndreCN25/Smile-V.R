-- ============================================================
--  SUPABASE EDGE FUNCTION: Recordatorio de Citas (Opción B)
--  Smile V.R — Clínica Dental
-- ============================================================
--
--  Este archivo contiene la guía y el código para configurar
--  un recordatorio automático diario vía WhatsApp usando
--  Supabase Edge Functions + Cron.
--
--  PASOS PARA CONFIGURAR:
--
--  1. Instala el CLI de Supabase:
--     npm install supabase -g
--
--  2. Inicializa funciones en tu proyecto:
--     supabase functions new send-appointment-reminders
--
--  3. Copia el código TypeScript (abajo) en:
--     supabase/functions/send-appointment-reminders/index.ts
--
--  4. Configura las variables de entorno en Supabase Dashboard:
--     - WHATSAPP_PHONE_NUMBER_ID = tu Phone Number ID de Meta
--     - WHATSAPP_ACCESS_TOKEN = tu Access Token de Meta
--
--  5. Despliega la función:
--     supabase functions deploy send-appointment-reminders
--
--  6. Configura el cron job en SQL Editor de Supabase:
--     (ejecuta el SQL que está al final de este archivo)
--
-- ============================================================

-- ┌──────────────────────────────────────────────────────────────────┐
-- │  CÓDIGO DE LA EDGE FUNCTION (TypeScript / Deno)                  │
-- │  Archivo: supabase/functions/send-appointment-reminders/index.ts │
-- └──────────────────────────────────────────────────────────────────┘
--
-- import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
-- import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
--
-- const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
-- const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
-- const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
-- const WA_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
--
-- serve(async (_req) => {
--   const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
--
--   // Obtener la fecha de mañana
--   const tomorrow = new Date()
--   tomorrow.setDate(tomorrow.getDate() + 1)
--   const tomorrowStr = tomorrow.toISOString().slice(0, 10)
--
--   // Buscar citas de mañana que estén confirmadas o pendientes
--   const { data: appointments, error } = await supabase
--     .from('appointments')
--     .select('*, patient:patients(name, phone)')
--     .eq('date', tomorrowStr)
--     .in('status', ['confirmada', 'pendiente'])
--
--   if (error) {
--     console.error('Error fetching appointments:', error)
--     return new Response(JSON.stringify({ error: error.message }), { status: 500 })
--   }
--
--   let sent = 0
--   let errors = 0
--
--   for (const appt of appointments || []) {
--     const patientName = appt.patient?.name
--     const patientPhone = appt.patient?.phone
--
--     if (!patientName || !patientPhone) continue
--
--     // Normalizar teléfono
--     let phone = patientPhone.replace(/[^\d+]/g, '')
--     if (phone.startsWith('+')) phone = phone.substring(1)
--     if (!phone.startsWith('52')) phone = '52' + phone
--
--     const message = `Hola ${patientName}, se le informa que el día de mañana su cita será a las ${appt.time} hrs. ¡Lo esperamos!`
--
--     try {
--       const res = await fetch(
--         `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`,
--         {
--           method: 'POST',
--           headers: {
--             'Authorization': `Bearer ${WA_TOKEN}`,
--             'Content-Type': 'application/json',
--           },
--           body: JSON.stringify({
--             messaging_product: 'whatsapp',
--             to: phone,
--             type: 'text',
--             text: { body: message },
--           }),
--         }
--       )
--
--       if (res.ok) {
--         sent++
--         console.log(`✅ Reminder sent to ${patientName} (${phone})`)
--       } else {
--         errors++
--         const errData = await res.json().catch(() => ({}))
--         console.error(`❌ Failed for ${patientName}:`, errData?.error?.message || res.status)
--       }
--     } catch (e) {
--       errors++
--       console.error(`❌ Network error for ${patientName}:`, e.message)
--     }
--
--     // Delay entre mensajes para evitar rate limiting
--     await new Promise(r => setTimeout(r, 500))
--   }
--
--   return new Response(
--     JSON.stringify({
--       success: true,
--       date: tomorrowStr,
--       total: appointments?.length || 0,
--       sent,
--       errors,
--     }),
--     { headers: { 'Content-Type': 'application/json' } }
--   )
-- })


-- ┌──────────────────────────────────────────────────────────┐
-- │  CONFIGURAR CRON JOB EN SUPABASE                         │
-- │  Ejecuta esto en SQL Editor de Supabase Dashboard        │
-- └──────────────────────────────────────────────────────────┘

-- Habilitar la extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear el cron job que se ejecuta todos los días a las 8:00 PM (hora del servidor UTC)
-- Esto equivale a ~2:00 PM hora de México (CST/UTC-6)
-- Ajusta la hora según tu zona horaria
SELECT cron.schedule(
  'send-daily-reminders',           -- nombre del job
  '0 20 * * *',                      -- cron: todos los días a las 20:00 UTC (2PM CST)
  $$
  SELECT
    net.http_post(
      url := 'https://zjumdvozzdbwmjvsotzk.supabase.co/functions/v1/send-appointment-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Para ver los jobs programados:
-- SELECT * FROM cron.job;

-- Para eliminar el job:
-- SELECT cron.unschedule('send-daily-reminders');

-- Para ver el historial de ejecuciones:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
