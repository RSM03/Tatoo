import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, newDate, newTime, reason } = body;

    if (!appointmentId || !newDate || !newTime) {
      return NextResponse.json({ error: 'appointmentId, newDate y newTime son requeridos.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: targetApp, error: fetchErr } = await supabase
      .from('appointments')
      .select('*, artists(display_name)')
      .eq('id', appointmentId)
      .maybeSingle();

    if (fetchErr || !targetApp) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    const newStart = new Date(`${newDate}T${newTime}:00`);
    if (isNaN(newStart.getTime())) {
      return NextResponse.json({ error: 'Fecha u hora inválida.' }, { status: 400 });
    }

    const origDurationMs = new Date(targetApp.end_time).getTime() - new Date(targetApp.start_time).getTime();
    const durationMs = origDurationMs > 0 ? origDurationMs : (targetApp.appointment_type === 'design_consultation' ? 45 * 60 * 1000 : 180 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Collision check
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('artist_id', targetApp.artist_id)
      .neq('id', targetApp.id)
      .neq('status', 'cancelled')
      .lt('start_time', newEnd.toISOString())
      .gt('end_time', newStart.toISOString());

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({
        error: 'El horario seleccionado ya está ocupado en la agenda del artista. Por favor, selecciona otro día u hora.'
      }, { status: 409 });
    }

    const reasonText = reason ? ` (Reprogramada: ${reason})` : ' (Reprogramada por cliente)';
    const { data: updatedApp, error: updateErr } = await supabase
      .from('appointments')
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        status: 'confirmed',
        description: (targetApp.description || '') + reasonText,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        studios (id, name, address),
        artists (id, display_name),
        consent_forms (id, signed_at)
      `)
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, appointment: updatedApp });
  } catch (err: any) {
    console.error('[Reschedule Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Error al reprogramar cita.' }, { status: 500 });
  }
}
