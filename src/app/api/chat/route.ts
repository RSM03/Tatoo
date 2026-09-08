import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callEdenAI, generateChatSummary, compressContext, type ChatMessage } from '@/lib/edenai';
import { executeAiTool, detectToolIntent, AI_TOOLS, ToolExecutionContext } from '@/lib/ai-tools';

export const dynamic = 'force-dynamic';

const isUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chatId,
      content,
      imageUrl,
      senderRole = 'client',
      lang = 'es',
      artistId,
      studioId,
      clientProfileId
    } = body;

    if (!content && !imageUrl) {
      return NextResponse.json({ error: 'El contenido o la imagen son obligatorios.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let chat: any = null;
    let actualChatId: string | null = null;
    let artist: any = null;
    let client: any = null;

    // 1. Try to fetch existing chat if chatId is a valid UUID
    if (chatId && isUUID(chatId)) {
      const { data: existingChat } = await supabase
        .from('chats')
        .select(`
          id,
          ai_enabled,
          artist_id,
          studio_id,
          client_id,
          artists (
            id,
            display_name,
            pricing_rules,
            healing_templates
          ),
          clients (
            id,
            profile_id,
            profiles (full_name)
          )
        `)
        .eq('id', chatId)
        .maybeSingle();

      if (existingChat) {
        chat = existingChat;
        actualChatId = existingChat.id;
        artist = (existingChat as any).artists;
        client = (existingChat as any).clients;
      }
    }

    // 2. If chat not resolved, resolve artist & client and fetch/create dedicated 1:1 chat
    let resolvedArtistId = (artistId && isUUID(artistId)) ? artistId : (chat?.artist_id || null);
    let resolvedStudioId = (studioId && isUUID(studioId)) ? studioId : (chat?.studio_id || null);
    let resolvedClientId = chat?.client_id || null;

    if (!resolvedArtistId) {
      const { data: defaultArtist } = await supabase
        .from('artists')
        .select('id, studio_id, display_name, pricing_rules, healing_templates')
        .limit(1)
        .maybeSingle();

      if (defaultArtist) {
        resolvedArtistId = defaultArtist.id;
        resolvedStudioId = resolvedStudioId || defaultArtist.studio_id;
        artist = defaultArtist;
      }
    } else if (!artist) {
      const { data: foundArtist } = await supabase
        .from('artists')
        .select('id, studio_id, display_name, pricing_rules, healing_templates')
        .eq('id', resolvedArtistId)
        .maybeSingle();
      if (foundArtist) {
        artist = foundArtist;
        resolvedStudioId = resolvedStudioId || foundArtist.studio_id;
      }
    }

    if (!resolvedStudioId && artist?.studio_id) {
      resolvedStudioId = artist.studio_id;
    }

    // Resolve client
    if (!resolvedClientId && clientProfileId && isUUID(clientProfileId)) {
      const { data: clientRec } = await supabase
        .from('clients')
        .select('id, profile_id, profiles(full_name)')
        .eq('profile_id', clientProfileId)
        .maybeSingle();

      if (clientRec) {
        resolvedClientId = clientRec.id;
        client = clientRec;
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ profile_id: clientProfileId })
          .select('id, profile_id')
          .maybeSingle();
        if (newClient) resolvedClientId = newClient.id;
      }
    }

    // Ensure 1:1 dedicated chat row
    if (!chat && resolvedClientId && resolvedArtistId && resolvedStudioId) {
      let { data: existingChat } = await supabase
        .from('chats')
        .select('*')
        .eq('client_id', resolvedClientId)
        .eq('artist_id', resolvedArtistId)
        .maybeSingle();

      if (!existingChat) {
        const { data: newChat } = await supabase
          .from('chats')
          .insert({
            studio_id: resolvedStudioId,
            artist_id: resolvedArtistId,
            client_id: resolvedClientId,
            ai_enabled: true,
            status_badge: 'quoting'
          })
          .select()
          .maybeSingle();
        existingChat = newChat;
      }

      if (existingChat) {
        chat = existingChat;
        actualChatId = existingChat.id;
      }
    }

    const artistName = artist?.display_name || 'El Tatuador';
    const clientName = client?.profiles?.full_name || 'Cliente';

    // 3. Save incoming user message
    let savedUserMsg: any = {
      id: 'msg-' + Date.now(),
      sender_role: senderRole,
      content: content || (imageUrl ? 'Foto adjunta' : ''),
      image_url: imageUrl || null,
      created_at: new Date().toISOString()
    };

    if (actualChatId) {
      const { data: dbUserMsg } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: actualChatId,
          sender_role: senderRole,
          content: savedUserMsg.content,
          image_url: savedUserMsg.image_url
        })
        .select()
        .maybeSingle();

      if (dbUserMsg) savedUserMsg = dbUserMsg;
    }

    // 4. Human intervention
    if (senderRole === 'artist' && actualChatId) {
      await supabase
        .from('chats')
        .update({
          ai_enabled: false,
          status_badge: 'takeover',
          updated_at: new Date().toISOString()
        })
        .eq('id', actualChatId);

      return NextResponse.json({ success: true, message: savedUserMsg, chat });
    }

    if (chat && chat.ai_enabled === false) {
      return NextResponse.json({
        success: true,
        message: savedUserMsg,
        chat,
        aiPaused: true,
        info: 'El tatuador ha intervenido en este chat. La IA está en pausa temporal.'
      });
    }

    // 5. Tool Context & Execution
    const toolContext: ToolExecutionContext = {
      studioId: resolvedStudioId || chat?.studio_id || '',
      artistId: resolvedArtistId || chat?.artist_id || '',
      clientId: resolvedClientId || chat?.client_id,
      clientProfileId,
      chatId: actualChatId,
      artistPricingRules: artist?.pricing_rules,
      artistHealingTemplates: artist?.healing_templates,
      artistName,
      lang: lang as 'es' | 'en'
    };

    // Check if deterministic tool intent is detected
    let toolDecision = detectToolIntent(content || '', imageUrl);
    let toolResult: any = null;

    if (toolDecision) {
      toolResult = await executeAiTool(toolDecision.tool, toolDecision.arguments, toolContext);
    }

    // 6. Retrieve History for conversational context
    let historyMessages: ChatMessage[] = [];
    if (actualChatId) {
      const { data: dbHistory } = await supabase
        .from('chat_messages')
        .select('sender_role, content, created_at')
        .eq('chat_id', actualChatId)
        .order('created_at', { ascending: true })
        .limit(10);

      if (dbHistory) {
        historyMessages = dbHistory.map(m => ({
          role: m.sender_role === 'ai_assistant' ? 'assistant' : (m.sender_role === 'client' ? 'user' : 'assistant'),
          content: m.content
        }));
      }
    }

    if (historyMessages.length === 0) {
      historyMessages = [{ role: 'user', content: content || 'Hola' }];
    }

    const compressed = compressContext(historyMessages);

    // 7. System Prompt with Tools JSON knowledge & Artist Identity
    const toolsJsonSchema = JSON.stringify(AI_TOOLS, null, 2);
    const systemPrompt = `Eres el Asistente Virtual Oficial con Inteligencia Artificial de ${artistName} en el estudio de tatuajes.
Tu misión es atender con máxima cordialidad, profesionalidad y agilidad al cliente (${clientName}).

HERRAMIENTAS DISPONIBLES (JSON SCHEMA):
${toolsJsonSchema}

INSTRUCCIONES CLAVE:
1. Si una herramienta ya se ha ejecutado (${toolDecision ? `Ejecutada con éxito: ${toolDecision.tool}` : 'ninguna aún'}), utiliza su resultado directamente para responder de forma acogedora.
${toolResult?.createdAppointment ? `¡IMPORTANTE! Se ha reservado la cita con éxito para el cliente: ${toolResult.displayText}. Confirma los detalles amablemente y recuérdale que se preparará la ficha y el consentimiento informado.` : ''}
${toolResult?.quoteData ? `¡IMPORTANTE! El presupuesto oficial estimado es: ${toolResult.quoteData.estimated_min}€ - ${toolResult.quoteData.estimated_max}€. Menciónalo claramente avisando de que es orientativo hasta ver el detalle final.` : ''}
${toolResult?.healingData ? `¡IMPORTANTE! El diagnóstico de curación es: ${toolResult.healingData.analysis_text}. ${toolResult.healingData.suggested_action}. Transmite calma e instrucciones claras.` : ''}

2. Si el cliente pide agendar una cita (día, hora o boceto) y no se ejecutó previamente, invoca la herramienta book_appointment o confirma los detalles para cerrarla.
3. Si el cliente solicita hablar con una persona o con ${artistName}, pon la IA en pausa e indícale que el tatuador le contestará en breve.
4. Recuerda ser transparente: ${artistName} tiene acceso y supervisa esta conversación en todo momento.
5. Responde en ${lang === 'en' ? 'Inglés' : 'Español'} de forma concisa y cercana (2 a 3 párrafos cortos).`;

    let finalReplyText = '';

    if (toolResult && toolResult.displayText && (toolDecision?.tool === 'book_appointment' || toolDecision?.tool === 'analyze_healing')) {
      finalReplyText = toolResult.displayText;
    } else {
      finalReplyText = await callEdenAI({
        messages: compressed,
        instructions: systemPrompt,
        temperature: 0.6
      });
    }

    // 8. Save AI response message
    let savedAiMsg: any = {
      id: 'ai-' + Date.now(),
      sender_role: 'ai_assistant',
      content: finalReplyText,
      quote_data: toolResult?.quoteData || null,
      healing_status: toolResult?.healingData?.healing_status || null,
      healing_metadata: toolResult?.healingData || null,
      created_at: new Date().toISOString()
    };

    if (actualChatId) {
      const { data: dbAiMsg } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: actualChatId,
          sender_role: 'ai_assistant',
          content: finalReplyText,
          quote_data: toolResult?.quoteData || null,
          healing_status: toolResult?.healingData?.healing_status || null,
          healing_metadata: toolResult?.healingData || null
        })
        .select()
        .maybeSingle();

      if (dbAiMsg) savedAiMsg = dbAiMsg;

      // Update badge & summary
      let newBadge = 'quoting';
      if (toolResult?.createdAppointment) newBadge = 'booking';
      if (toolResult?.healingData) newBadge = toolResult.healingData.healing_status === 'alert_infection' ? 'takeover' : 'healing_check';
      if (toolDecision?.tool === 'request_human_takeover') newBadge = 'takeover';

      const updatedHistory: ChatMessage[] = [...compressed, { role: 'assistant', content: finalReplyText }];
      const chatSummary = await generateChatSummary(updatedHistory, lang as 'es' | 'en');

      await supabase
        .from('chats')
        .update({
          ai_summary: chatSummary,
          status_badge: newBadge,
          updated_at: new Date().toISOString()
        })
        .eq('id', actualChatId);
    }

    return NextResponse.json({
      success: true,
      chat: chat || { id: actualChatId || 'session-chat', ai_enabled: true },
      message: savedUserMsg,
      aiResponse: savedAiMsg,
      toolExecuted: toolDecision?.tool || null,
      createdAppointment: toolResult?.createdAppointment || null,
      quote: toolResult?.quoteData || null,
      healing: toolResult?.healingData || null
    });

  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({
      success: true,
      message: {
        id: 'msg-' + Date.now(),
        sender_role: 'client',
        content: 'Mensaje recibido',
        created_at: new Date().toISOString()
      },
      aiResponse: {
        id: 'ai-' + Date.now(),
        sender_role: 'ai_assistant',
        content: '¡Hola! He recibido tu mensaje. Como asistente del tatuador puedo agendar tu cita, calcular tu presupuesto por centímetros o revisar fotos de curación. ¿En qué te ayudo hoy?',
        created_at: new Date().toISOString()
      }
    });
  }
}
