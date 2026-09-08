import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendReengagementEmail } from '@/lib/emailjs';

export const dynamic = 'force-dynamic';

/**
 * 4-Month Inactivity Re-engagement Dispatcher
 * Sends re-activation emails with promo discounts to clients without visits for 120 days
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const fourMonthsAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Find appointments completed before 4 months ago
    const { data: pastAppointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        client_id,
        artist_id,
        studio_id,
        end_time,
        studios (name, email_templates),
        artists (display_name),
        clients (
          id,
          profile_id,
          profiles (full_name, email)
        )
      `)
      .lte('end_time', fourMonthsAgo)
      .eq('status', 'completed')
      .order('end_time', { ascending: false });

    if (error) throw error;

    let sentCount = 0;
    const processedClients = new Set<string>();

    for (const app of (pastAppointments || [])) {
      if (!app.client_id || processedClients.has(app.client_id)) continue;

      // 2. Verify that this client does NOT have any recent or future appointments
      const { data: futureOrRecent } = await supabase
        .from('appointments')
        .select('id')
        .eq('client_id', app.client_id)
        .gte('end_time', fourMonthsAgo)
        .neq('status', 'cancelled')
        .limit(1);

      if (futureOrRecent && futureOrRecent.length > 0) {
        // Client has had a more recent appointment or has an upcoming one
        continue;
      }

      processedClients.add(app.client_id);

      const clientEmail = (app as any).clients?.profiles?.email;
      const clientName = (app as any).clients?.profiles?.full_name || 'Cliente';
      const artistName = (app as any).artists?.display_name || 'Tatuador';
      const studio = (app as any).studios;
      const studioName = studio?.name || 'Estudio de Tatuajes';
      const templates = studio?.email_templates || {};

      if (!clientEmail) continue;

      await sendReengagementEmail({
        toEmail: clientEmail,
        clientName,
        artistName,
        studioName,
        discountCode: templates.discount_code || 'TATOO4M',
        discountPercent: templates.discount_percent || 10,
        bookingLink: `https://tatoo.app/dashboard/booking?artist_id=${app.artist_id}`,
        customMessage: templates.reengagement_body
      });

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Enviados ${sentCount} correos de reactivación (4 meses sin cita).`,
      sentCount
    });
  } catch (err: any) {
    console.error('[Cron 4 Months Re-engagement Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
