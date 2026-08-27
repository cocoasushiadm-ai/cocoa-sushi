/**
 * whatsapp.ts
 * Integración con WhatsApp Business Cloud API (Meta).
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Variables de entorno requeridas:
 *   WHATSAPP_API_TOKEN         — Bearer token de Meta
 *   WHATSAPP_PHONE_NUMBER_ID   — ID del número de WhatsApp Business
 */

const WA_API = 'https://graph.facebook.com/v19.0'

interface WASendResult { success: boolean; message_id?: string; error?: string }

/** Normaliza teléfono costarricense a formato internacional sin + */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('506')) return digits
  if (digits.length === 8) return '506' + digits
  return digits
}

/** Genera el mensaje de confirmación */
export function buildConfirmationMessage(r: {
  customer_name: string
  reservation_code: string
  date: string           // "15 de agosto de 2026"
  time: string           // "7:00 PM"
  party_size: number
  location: string
  table_code: string
}): string {
  return `Hola, ${r.customer_name} 👋

Tu reservación en *Cocoa Sushi* ha sido confirmada ✅

📅 *Fecha:* ${r.date}
🕐 *Hora:* ${r.time}
👥 *Personas:* ${r.party_size}
📍 *Ubicación:* ${r.location === 'terraza' ? 'Terraza' : 'Salón'}
🍣 *Mesa:* ${r.table_code}

🔖 *Código de reserva:*
${r.reservation_code}

Te esperamos en Cocoa Sushi.

Si necesitás cancelar o modificar tu reservación, comunicate con nosotros.

¡Gracias por elegirnos! ❤️`
}

/** Envía un mensaje de texto via WhatsApp Cloud API */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<WASendResult> {
  const token    = process.env.WHATSAPP_API_TOKEN
  const phoneId  = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) {
    console.warn('[WhatsApp] Credenciales no configuradas — mensaje no enviado')
    return { success: false, error: 'WhatsApp no configurado' }
  }

  try {
    const res = await fetch(`${WA_API}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(phone),
        type: 'text',
        text: { body: message },
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? 'Error desconocido')

    return { success: true, message_id: data.messages?.[0]?.id }
  } catch (err: any) {
    console.error('[WhatsApp] Error al enviar:', err.message)
    return { success: false, error: err.message }
  }
}

/** Genera enlace de WhatsApp con mensaje prellenado (alternativa sin API) */
export function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = normalizePhone(phone)
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
