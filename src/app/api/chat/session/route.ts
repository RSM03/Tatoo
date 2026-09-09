import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientProfileId, artistId, studioId } = body;

    const supabase = createAdminClient();

    // 1. Get or create artist
    let resolvedArtistId = artistId;
    let resolvedStudioId = studioId;

    if (!resolvedArtistId) {
      const { data: defaultArtist } = await supabase.from('artists').select('id, studio_id, display_name').limit(1).maybeSingle();
      if (defaultArtist) {
        resolvedArtistId = defaultArtist.id;
        if (!resolvedStudioId) resolvedStudioId = defaultArtist.studio_id;
      }
    }

    if (!resolvedStudioId && resolvedArtistId) {
      const { data: art } = await supabase.from('artists').select('studio_id').eq('id', resolvedArtistId).maybeSingle();
      if (art) resolvedStudioId = art.studio_id;
    }

    if (!resolvedStudioId) {
      const { data: defaultStudio } = await supabase.from('studios').select('id').limit(1).maybeSingle();
      if (defaultStudio) resolvedStudioId = defaultStudio.id;
    }

    // 2. Get or create client
    let resolvedClientId = null;
    const isUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

    if (clientProfileId && isUUID(clientProfileId)) {
      const { data: clientRec } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', clientProfileId)
        .maybeSingle();

      if (clientRec) {
        resolvedClientId = clientRec.id;
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ profile_id: clientProfileId })
          .select('id')
          .single();
        if (newClient) resolvedClientId = newClient.id;
      }
    }

    // If client is still null (e.g. mock user or not logged in), return mock session
    if (!resolvedClientId || !resolvedArtistId || !resolvedStudioId) {
      return NextResponse.json({
        success: true,
        chat: {
          id: 'session-' + (clientProfileId || 'guest'),
          ai_enabled: true,
          status_badge: 'quoting',
          artist_id: resolvedArtistId || 'default-artist',
          studio_id: resolvedStudioId || 'default-studio'
        },
        messages: []
      });
    }

    // 3. Find or create chat
    let { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('client_id', resolvedClientId)
      .eq('artist_id', resolvedArtistId)
      .maybeSingle();

    if (!chat) {
      const { data: newChat, error: createChatErr } = await supabase
        .from('chats')
        .insert({
          studio_id: resolvedStudioId,
          artist_id: resolvedArtistId,
          client_id: resolvedClientId,
          ai_enabled: true,
          status_badge: 'quoting'
        })
        .select()
        .single();

      if (!createChatErr && newChat) {
        chat = newChat;
      }
    }

    // 4. Load messages for this chat
    let messages: any[] = [];
    if (chat) {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });
      messages = msgs || [];
    }

    // 5. If chat has no messages, send the official AI assistant welcome message
    if (messages.length === 0) {
      let artistDisplayName = 'el tatuador';
      if (resolvedArtistId) {
        const { data: artRec } = await supabase
          .from('artists')
          .select('display_name')
          .eq('id', resolvedArtistId)
          .maybeSingle();
        if (artRec?.display_name) artistDisplayName = artRec.display_name;
      }

      const welcomeContent = `¡Hola! 👋 Soy el Asistente Virtual Oficial con Inteligencia Artificial de **${artistDisplayName}**.

Estoy aquí para ayudarte en todo lo que necesites en tiempo real:
- 🗓️ **Consultar disponibilidad y agendar citas**: Consulta huecos libres en directo para *Consulta de Diseño* o *Sesión de Tatuaje* y resérvalos con un solo clic.
- 💰 **Calcular presupuestos estimados**: Cuéntame tu idea, tamaño en cm, zona del cuerpo y si es a color o blanco/negro.
- 🔄 **Gestionar tus citas**: Puedes ver tus citas agendadas, cambiarlas de fecha/hora o cancelarlas en cualquier momento.
- 📷 **Revisión de cicatrización**: Si te acabas de tatuar, sube una foto de tu piel y analizaré cómo evoluciona la curación.

⚠️ **Transparencia**: **${artistDisplayName}** tiene acceso completo y supervisa este chat en directo, pudiendo intervenir personalmente en la conversación cuando lo necesites.

¿En qué te puedo ayudar hoy?`;

      if (chat?.id) {
        const { data: insertedWelcome } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: chat.id,
            sender_role: 'ai_assistant',
            content: welcomeContent
          })
          .select()
          .maybeSingle();

        if (insertedWelcome) {
          messages = [insertedWelcome];
        } else {
          messages = [{
            id: 'welcome-' + Date.now(),
            chat_id: chat.id,
            sender_role: 'ai_assistant',
            content: welcomeContent,
            created_at: new Date().toISOString()
          }];
        }
      } else {
        messages = [{
          id: 'welcome-' + Date.now(),
          sender_role: 'ai_assistant',
          content: welcomeContent,
          created_at: new Date().toISOString()
        }];
      }
    }

    return NextResponse.json({
      success: true,
      chat: chat || {
        id: 'session-' + (clientProfileId || 'guest'),
        ai_enabled: true,
        status_badge: 'quoting',
        artist_id: resolvedArtistId,
        studio_id: resolvedStudioId
      },
      messages
    });
  } catch (err: any) {
    console.error('Error initializing chat session:', err);
    return NextResponse.json({
      success: true,
      chat: { id: 'fallback-session', ai_enabled: true, status_badge: 'quoting' },
      messages: []
    });
  }
}
