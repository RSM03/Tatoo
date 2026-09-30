import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artistId, studioId, reassignToArtistId } = body;

    if (!artistId || !studioId) {
      return NextResponse.json({ error: 'artistId y studioId son obligatorios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Verify artist exists and belongs to the studio
    const { data: artist, error: artistErr } = await supabase
      .from('artists')
      .select('id, display_name, studio_id, studios(id, name)')
      .eq('id', artistId)
      .eq('studio_id', studioId)
      .maybeSingle();

    if (artistErr || !artist) {
      return NextResponse.json({ error: 'Tatuador no encontrado en el estudio especificado' }, { status: 404 });
    }

    const artistName = artist.display_name || 'el tatuador';
    const studioName = (artist as any)?.studios?.name || 'el estudio';

    // 2. Fetch target replacement artist if reassign requested
    let replacementArtist: any = null;
    if (reassignToArtistId && reassignToArtistId !== artistId) {
      const { data: rep } = await supabase
        .from('artists')
        .select('id, display_name, studio_id')
        .eq('id', reassignToArtistId)
        .eq('studio_id', studioId)
        .maybeSingle();
      if (rep) replacementArtist = rep;
    }

    // 3. Fetch all chats for this artist
    const { data: artistChats } = await supabase
      .from('chats')
      .select('id, client_id')
      .eq('artist_id', artistId);

    const chatsList = artistChats || [];

    // 4. Fetch upcoming active appointments
    const nowIso = new Date().toISOString();
    const { data: upcomingApps } = await supabase
      .from('appointments')
      .select('id, client_id, start_time, title, status')
      .eq('artist_id', artistId)
      .gte('start_time', nowIso)
      .neq('status', 'cancelled');

    const appsList = upcomingApps || [];

    // 5. Execute coverage protection
    if (replacementArtist) {
      // Reassign appointments to replacement artist so clients are not left stranded
      if (appsList.length > 0) {
        await supabase
          .from('appointments')
          .update({
            artist_id: replacementArtist.id,
            updated_at: new Date().toISOString()
          })
          .eq('artist_id', artistId)
          .gte('start_time', nowIso);
      }

      // Reassign chats and send notification message
      for (const ch of chatsList) {
        await supabase
          .from('chat_messages')
          .insert({
            chat_id: ch.id,
            sender_role: 'ai_assistant',
            content: `ℹ️ **Aviso importante de ${studioName}:** La atención de este canal y tus citas agendadas han sido reasignadas al tatuador **${replacementArtist.display_name}** para garantizar tu cobertura continua. Puedes escribir por aquí para cualquier duda.`
          });

        await supabase
          .from('chats')
          .update({
            artist_id: replacementArtist.id,
            status_badge: 'quoting',
            ai_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', ch.id);
      }
    } else {
      // Manual closure of all chats and cancellation of pending appointments
      if (appsList.length > 0) {
        await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('artist_id', artistId)
          .gte('start_time', nowIso);
      }

      // Close all chats manually and inform clients
      for (const ch of chatsList) {
        await supabase
          .from('chat_messages')
          .insert({
            chat_id: ch.id,
            sender_role: 'ai_assistant',
            content: `🔒 **Aviso de ${studioName}:** Este canal de conversación ha quedado cerrado debido a la desvinculación de ${artistName} del estudio. Si tenías una cita futura, ha quedado anulada en la agenda para que no haya cargos. Para consultar disponibilidad con otro artista del estudio, ponte en contacto con la recepción.`
          });

        await supabase
          .from('chats')
          .update({
            ai_enabled: false,
            status_badge: 'closed',
            updated_at: new Date().toISOString()
          })
          .eq('id', ch.id);
      }
    }

    // 6. Clean up secondary records (shares)
    await supabase.from('shares').delete().eq('artist_id', artistId);

    // 7. Delete the artist record
    const { error: deleteErr } = await supabase
      .from('artists')
      .delete()
      .eq('id', artistId);

    if (deleteErr) {
      throw deleteErr;
    }

    return NextResponse.json({
      success: true,
      deletedArtistId: artistId,
      closedChatsCount: chatsList.length,
      processedAppointmentsCount: appsList.length,
      reassignedTo: replacementArtist ? replacementArtist.display_name : null
    });

  } catch (err: any) {
    console.error('[API artists/delete] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar tatuador con cobertura' }, { status: 500 });
  }
}
