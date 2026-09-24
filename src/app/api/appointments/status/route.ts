import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, status, durationHours, appointmentType } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId es requerido.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch existing appointment
    const { data: targetApp, error: fetchErr } = await supabase
      .from('appointments')
      .select('*, artists(display_name)')
      .eq('id', appointmentId)
      .maybeSingle();

    if (fetchErr || !targetApp) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updatePayload.status = status;
    }

    if (appointmentType) {
      updatePayload.appointment_type = appointmentType;
    }

    // If duration changed, recompute end_time and verify collision
    if (durationHours && Number(durationHours) > 0) {
      const startDt = new Date(targetApp.start_time);
      const newEndDt = new Date(startDt.getTime() + Number(durationHours) * 60 * 60 * 1000);

      // Collision check excluding this appointment
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id, start_time, end_time')
        .eq('artist_id', targetApp.artist_id)
        .neq('id', targetApp.id)
        .neq('status', 'cancelled')
        .lt('start_time', newEndDt.toISOString())
        .gt('end_time', startDt.toISOString());

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({
          error: 'No se puede ampliar la duración: se solaparía con otra cita ya reservada del artista.',
          conflict: true
        }, { status: 409 });
      }

      updatePayload.end_time = newEndDt.toISOString();
    }

    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', appointmentId)
      .select(`
        *,
        studios (id, name, address),
        artists (id, display_name),
        clients (id, dni_nie, profiles (full_name, email, phone)),
        consent_forms (id, signed_at, full_name, dni_nie, signature_data_url, signer_ip, signer_user_agent, medical_disclaimers)
      `)
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: status === 'confirmed' ? 'Cita confirmada con éxito por el tatuador.' : 'Cita actualizada.',
      appointment: updated
    });
  } catch (err: any) {
    console.error('[Appointment Status Update Error]:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar cita.' }, { status: 500 });
  }
}
