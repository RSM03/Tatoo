import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAppointmentReminder } from '@/lib/emailjs';

export const dynamic = 'force-dynamic';

/**
 * Dispatches 48-hour appointment reminders via EmailJS
 * Triggered daily by Vercel Cron or Supabase webhook
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Look for appointments scheduled between 46 and 50 hours from now
    const now = new Date();
    const windowStart = new Date(now.getTime() + 46 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 50 * 60 * 60 * 1000).toISOString();

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_type,
        start_time,
        status,
        reminder_48h_sent,
        walk_in_name,
        walk_in_email,
        studios (name, address),
        artists (display_name),
        clients (
          id,
          profile_id,
          profiles (full_name, email)
        ),
        consent_forms (id)
      `)
      .gte('start_time', windowStart)
      .lte('start_time', windowEnd)
      .eq('reminder_48h_sent', false)
      .neq('status', 'cancelled');

    if (error) throw error;

    let dispatchedCount = 0;

    for (const app of (appointments || [])) {
      const clientEmail = (app as any).clients?.profiles?.email || app.walk_in_email;
      const clientName = (app as any).clients?.profiles?.full_name || app.walk_in_name || 'Cliente';
      const artistName = (app as any).artists?.display_name || 'Tatuador';
      const studioName = (app as any).studios?.name || 'Estudio';
      const studioAddress = (app as any).studios?.address || 'Estudio';
      const startDate = new Date(app.start_time);
      const consentSigned = (app as any).consent_forms?.length > 0;

      if (!clientEmail) continue;

      const dateStr = startDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      await sendAppointmentReminder({
        toEmail: clientEmail,
        clientName,
        artistName,
        studioName,
        appointmentType: app.appointment_type === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje',
        dateStr,
        timeStr,
        studioAddress,
        consentSigned,
        consentLink: `https://tatoo.app/dashboard/consent?appointment_id=${app.id}`
      });

      // Mark reminder as sent
      await supabase
        .from('appointments')
        .update({ reminder_48h_sent: true })
        .eq('id', app.id);

      dispatchedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Enviados ${dispatchedCount} recordatorios de 48h.`,
      dispatched: dispatchedCount
    });
  } catch (err: any) {
    console.error('[Cron Reminder 48h Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
