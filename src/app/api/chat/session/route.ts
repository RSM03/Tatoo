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
