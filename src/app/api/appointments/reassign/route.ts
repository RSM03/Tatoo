import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, newArtistId, reason } = body;

    if (!appointmentId || !newArtistId) {
      return NextResponse.json({ error: 'appointmentId y newArtistId son obligatorios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch appointment
    const { data: appointment, error: appErr } = await supabase
      .from('appointments')
      .select('*, artists(id, display_name, studio_id)')
      .eq('id', appointmentId)
      .maybeSingle();

    if (appErr || !appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // 2. Fetch new artist and verify same studio
    const studioId = appointment.studio_id || (appointment as any).artists?.studio_id;

    const { data: newArtist, error: artErr } = await supabase
      .from('artists')
      .select('id, display_name, studio_id')
      .eq('id', newArtistId)
      .maybeSingle();

    if (artErr || !newArtist) {
      return NextResponse.json({ error: 'El tatuador de destino no existe' }, { status: 404 });
    }

    if (studioId && newArtist.studio_id && studioId !== newArtist.studio_id) {
      return NextResponse.json({ error: 'El tatuador de destino no pertenece al mismo estudio' }, { status: 400 });
    }

    const oldArtistName = (appointment as any).artists?.display_name || 'el tatuador anterior';
    const newArtistName = newArtist.display_name || 'el nuevo tatuador';

    // 3. Update appointment artist_id
    const { data: updatedAppointment, error: updateErr } = await supabase
      .from('appointments')
      .update({
        artist_id: newArtistId,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        artists (id, display_name),
        clients (id, dni_nie, profiles (full_name, email, phone)),
        consent_forms (*)
      `)
      .single();

    if (updateErr) {
      throw updateErr;
    }

    // 4. If appointment has a client, notify in their chat if exists
    if (appointment.client_id) {
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('client_id', appointment.client_id)
        .eq('artist_id', appointment.artist_id)
        .maybeSingle();

      if (existingChat) {
        const appointmentDate = new Date(appointment.start_time).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });

        await supabase
          .from('chat_messages')
          .insert({
            chat_id: existingChat.id,
            sender_role: 'ai_assistant',
            content: `📅 **Cita Reasignada en el Estudio:**\n\nTu cita programada para el **${appointmentDate}** ha sido transferida de **${oldArtistName}** a **${newArtistName}**${reason ? ` (Motivo: ${reason})` : ''}.\n\nTu reserva y horario se mantienen exactamente igual en la agenda del estudio.`
          });
      }
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      reassignedFrom: oldArtistName,
      reassignedTo: newArtistName
    });

  } catch (err: any) {
    console.error('[API appointments/reassign] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al reasignar cita' }, { status: 500 });
  }
}
