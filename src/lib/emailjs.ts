/**
 * ==============================================================================
 * 📧 EMAILJS DISPATCHER
 * Manages appointment reminders (48h), monthly portfolio newsletters,
 * and 4-month re-engagement emails.
 * ==============================================================================
 */

export interface EmailReminderParams {
  toEmail: string;
  clientName: string;
  artistName: string;
  studioName: string;
  appointmentType: string;
  dateStr: string;
  timeStr: string;
  studioAddress: string;
  consentSigned: boolean;
  consentLink?: string;
}

export interface EmailNewsletterParams {
  toEmail: string;
  clientName: string;
  artistName: string;
  studioName: string;
  recentWorksCount: number;
  recentWorksSummary: string;
  galleryLink: string;
}

export interface EmailReengagementParams {
  toEmail: string;
  clientName: string;
  artistName: string;
  studioName: string;
  discountCode: string;
  discountPercent: number;
  bookingLink: string;
  customMessage?: string;
}

/**
 * Dispatches an email via EmailJS REST API
 */
async function sendEmailViaRest(serviceId: string, templateId: string, publicKey: string, templateParams: Record<string, any>) {
  if (!serviceId || !templateId || !publicKey) {
    console.warn('[EmailJS] Missing credentials. Simulated email dispatch:', templateParams);
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[EmailJS] Delivery error:', res.status, err);
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[EmailJS] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 1. 48-Hour Appointment Reminder
 */
export async function sendAppointmentReminder(params: EmailReminderParams) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_REMINDER || '';
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

  const templateParams = {
    to_email: params.toEmail,
    client_name: params.clientName,
    artist_name: params.artistName,
    studio_name: params.studioName,
    appointment_type: params.appointmentType,
    appointment_date: params.dateStr,
    appointment_time: params.timeStr,
    studio_address: params.studioAddress,
    consent_status: params.consentSigned ? 'Consentimiento firmado correctamente ✅' : '⚠️ Recuerda firmar tu consentimiento antes de acudir',
    consent_url: params.consentLink || 'https://tatoo.app/dashboard',
  };

  return sendEmailViaRest(serviceId, templateId, publicKey, templateParams);
}

/**
 * 2. Monthly Share Newsletter to active clients
 */
export async function sendMonthlyNewsletter(params: EmailNewsletterParams) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_NEWSLETTER || '';
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

  const templateParams = {
    to_email: params.toEmail,
    client_name: params.clientName,
    artist_name: params.artistName,
    studio_name: params.studioName,
    works_count: params.recentWorksCount,
    works_summary: params.recentWorksSummary,
    gallery_link: params.galleryLink,
  };

  return sendEmailViaRest(serviceId, templateId, publicKey, templateParams);
}

/**
 * 3. 4-Month Inactivity Re-engagement Email
 */
export async function sendReengagementEmail(params: EmailReengagementParams) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_REENGAGEMENT || '';
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

  const templateParams = {
    to_email: params.toEmail,
    client_name: params.clientName,
    artist_name: params.artistName,
    studio_name: params.studioName,
    discount_code: params.discountCode,
    discount_percent: `${params.discountPercent}%`,
    booking_link: params.bookingLink,
    custom_message: params.customMessage || `¡Hola ${params.clientName}! Ya han pasado 4 meses desde tu última sesión de tatuaje. Nos encantaría verte de nuevo.`,
  };

  return sendEmailViaRest(serviceId, templateId, publicKey, templateParams);
}
