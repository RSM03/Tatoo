import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studioId,
      artistId,
      clientId,
      walkInName,
      walkInPhone,
      walkInEmail,
      appointmentType = 'tattoo_session',
      title,
      description,
      startTime,
      endTime,
      status = 'confirmed'
    } = body;

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'La fecha y hora de inicio y fin son obligatorias.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify studioId or artistId
    let resolvedArtistId = artistId;
    let resolvedStudioId = studioId;

    if (!resolvedArtistId) {
      const { data: defaultArtist } = await supabase.from('artists').select('id, studio_id').limit(1).maybeSingle();
      resolvedArtistId = defaultArtist?.id;
      if (!resolvedStudioId) resolvedStudioId = defaultArtist?.studio_id;
    }

    if (!resolvedStudioId && resolvedArtistId) {
      const { data: art } = await supabase.from('artists').select('studio_id').eq('id', resolvedArtistId).maybeSingle();
      resolvedStudioId = art?.studio_id;
    }

    if (!resolvedStudioId) {
      const { data: defaultStudio } = await supabase.from('studios').select('id').limit(1).maybeSingle();
      resolvedStudioId = defaultStudio?.id;
    }

    // Ensure start_time and end_time are valid
    const startDt = new Date(startTime);
    let endDt = new Date(endTime);

    if (isNaN(startDt.getTime())) {
      return NextResponse.json({ error: 'La fecha u hora de inicio no es válida.' }, { status: 400 });
    }

    if (isNaN(endDt.getTime()) || endDt <= startDt) {
      // Auto-fallback duration based on appointment type
      const defaultDurationHours = appointmentType === 'design_consultation' ? 0.75 : 2.5;
      endDt = new Date(startDt.getTime() + defaultDurationHours * 60 * 60 * 1000);
    }

    // STRICT COLLISION CHECK: Prevent overlapping appointments for this artist
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, title')
      .eq('artist_id', resolvedArtistId)
      .neq('status', 'cancelled')
      .lt('start_time', endDt.toISOString())
      .gt('end_time', startDt.toISOString());

    if (conflicts && conflicts.length > 0) {
      const confStart = new Date(conflicts[0].start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const confEnd = new Date(conflicts[0].end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return NextResponse.json({
        error: `El tatuador ya tiene una cita reservada en este intervalo (${confStart} - ${confEnd}). No se permiten citas solapadas. Por favor, selecciona otro horario.`,
        conflict: true,
        conflictingAppointment: conflicts[0]
      }, { status: 409 });
    }

    const newRecord: any = {
      studio_id: resolvedStudioId,
      artist_id: resolvedArtistId,
      client_id: clientId || null,
      walk_in_name: walkInName || null,
      walk_in_phone: walkInPhone || null,
      walk_in_email: walkInEmail || null,
      appointment_type: appointmentType,
      title: title || (appointmentType === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje'),
      description: description || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      status
    };

    const { data: created, error } = await supabase
      .from('appointments')
      .insert(newRecord)
      .select(`
        *,
        studios (id, name, address),
        artists (id, display_name),
        clients (id, dni_nie, profiles (full_name, email, phone)),
        consent_forms (id, signed_at)
      `)
      .single();

    if (error) {
      console.error('[Appointments API Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, appointment: created });
  } catch (err: any) {
    console.error('[Appointments API Fatal]:', err);
    return NextResponse.json({ error: err.message || 'Error al guardar cita.' }, { status: 500 });
  }
}
