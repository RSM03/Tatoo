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
      start_time: startTime,
      end_time: endTime,
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
