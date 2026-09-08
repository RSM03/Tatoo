import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callEdenAI, calculateQuote, analyzeTattooHealingVision, generateChatSummary, compressContext, type ChatMessage } from '@/lib/edenai';

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

    // 2. If chat not resolved yet, attempt to resolve or create via artist / client profiles
    if (!chat) {
      // Resolve Artist
      let resolvedArtistId = (artistId && isUUID(artistId)) ? artistId : null;
      let resolvedStudioId = (studioId && isUUID(studioId)) ? studioId : null;

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
        if (foundArtist) artist = foundArtist;
      }

      if (!resolvedStudioId && artist?.studio_id) {
        resolvedStudioId = artist.studio_id;
      }

      // Resolve Client
      let resolvedClientId = null;
      if (clientProfileId && isUUID(clientProfileId)) {
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

      // If we have both client and artist, look up or create chat row
      if (resolvedClientId && resolvedArtistId && resolvedStudioId) {
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
    }

    // Default artist & client fallbacks for prompts
    const artistName = artist?.display_name || 'El Tatuador';
    const clientName = client?.profiles?.full_name || 'Cliente';

    // 3. Prepare incoming user message
    const incomingMessage: any = {
      chat_id: actualChatId,
      sender_role: senderRole,
      content: content || (imageUrl ? 'Foto adjunta' : ''),
      image_url: imageUrl || null
    };

    // 4. Healing photo vision analysis
    let healingResult: any = null;
    if (imageUrl && senderRole === 'client') {
      const defaultTemplates = {
        normal: {
          es: "El tatuaje muestra una evolución normal de cicatrización. Sigue lavándolo 2-3 veces al día con jabón neutro y aplicando una fina capa de crema.",
          en: "The tattoo shows normal healthy healing. Keep washing it 2-3 times daily with mild soap and applying a thin ointment layer."
        },
        redness_mild: {
          es: "Se aprecia un enrojecimiento moderado habitual durante los primeros días. Evita el roce con ropa ajustada y no tomes el sol ni te bañes en piscinas.",
          en: "Mild redness is common in the first few days. Avoid tight clothing friction, direct sun, and swimming pools."
        },
        alert_infection: {
          es: "⚠️ ¡Atención! La imagen muestra posibles indicios de supuración o inflamación excesiva. Lava suavemente con jabón neutro y contacta urgentemente con el estudio o acude a un centro médico.",
          en: "⚠️ Healing Alert! The image shows possible signs of abnormal discharge or excessive inflammation. Wash gently and contact the studio or a healthcare center immediately."
        }
      };

      healingResult = await analyzeTattooHealingVision({
        imageUrl,
        artistTemplates: artist?.healing_templates || defaultTemplates,
        lang: lang as 'es' | 'en'
      });

      incomingMessage.healing_status = healingResult.healing_status;
      incomingMessage.healing_metadata = healingResult;
    }

    // Save incoming message if actualChatId exists
    let savedUserMsg: any = {
      id: 'msg-' + Date.now(),
      sender_role: senderRole,
      content: incomingMessage.content,
      image_url: incomingMessage.image_url,
      healing_status: incomingMessage.healing_status,
      healing_metadata: incomingMessage.healing_metadata,
      created_at: new Date().toISOString()
    };

    if (actualChatId) {
      const { data: dbUserMsg } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: actualChatId,
          sender_role: incomingMessage.sender_role,
          content: incomingMessage.content,
          image_url: incomingMessage.image_url,
          healing_status: incomingMessage.healing_status,
          healing_metadata: incomingMessage.healing_metadata
        })
        .select()
        .maybeSingle();

      if (dbUserMsg) savedUserMsg = dbUserMsg;
    }

    // 5. Human intervention handling
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

    // 6. Healing Vision Immediate Feedback
    if (healingResult) {
      const aiReplyContent = `${healingResult.suggested_action}\n\n*${healingResult.analysis_text}*`;

      let savedAiMsg: any = {
        id: 'ai-' + Date.now(),
        sender_role: 'ai_assistant',
        content: aiReplyContent,
        healing_status: healingResult.healing_status,
        healing_metadata: healingResult,
        created_at: new Date().toISOString()
      };

      if (actualChatId) {
        const { data: dbAiMsg } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: actualChatId,
            sender_role: 'ai_assistant',
            content: aiReplyContent,
            healing_status: healingResult.healing_status,
            healing_metadata: healingResult
          })
          .select()
          .maybeSingle();

        if (dbAiMsg) savedAiMsg = dbAiMsg;

        const newBadge = healingResult.healing_status === 'alert_infection' ? 'takeover' : 'healing_check';
        await supabase
          .from('chats')
          .update({
            status_badge: newBadge,
            ai_summary: `[Curación] ${healingResult.healing_status}: ${healingResult.analysis_text.slice(0, 60)}...`,
            updated_at: new Date().toISOString()
          })
          .eq('id', actualChatId);
      }

      return NextResponse.json({
        success: true,
        chat,
        message: savedUserMsg,
        aiResponse: savedAiMsg
      });
    }

    // 7. Budget Calculation if size mentioned
    const pricingRules = artist?.pricing_rules || {
      minimum_fee: 60,
      hourly_rate: 80,
      size_rates: {
        small: { max_cm: 5, base_price: 60 },
        medium: { max_cm: 15, base_price: 140 },
        large: { max_cm: 25, base_price: 260 },
        xlarge: { max_cm: 999, base_price: 450 }
      },
      color_multiplier: 1.25,
      complex_placement_multiplier: 1.15
    };

    const sizeMatch = (content || '').match(/(\d{1,3})\s*(?:cm|centimetros|centímetros)/i);
    let quoteData: any = null;

    if (sizeMatch) {
      const parsedCm = parseInt(sizeMatch[1], 10);
      const isColor = /color|rojo|azul|verde|acuarela|amarillo/i.test(content);
      const isComplex = /costilla|cuello|mano|dedo|pecho|clavicula|pie|tobillo|rodilla/i.test(content);

      quoteData = calculateQuote(pricingRules, {
        size_cm: parsedCm,
        is_color: isColor,
        is_complex_placement: isComplex,
        lang: lang as 'es' | 'en'
      });
    }

    // 8. Retrieve message history for context
    let historyMessages: ChatMessage[] = [];
    if (actualChatId) {
      const { data: dbHistory } = await supabase
        .from('chat_messages')
        .select('sender_role, content, created_at')
        .eq('chat_id', actualChatId)
        .order('created_at', { ascending: true })
        .limit(12);

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

    // 9. Prompt Eden AI Assistant
    const systemPrompt = `Eres el Asistente Virtual Inteligente del estudio de tatuajes para el artista ${artistName}.
Tu objetivo es responder con estilo auténtico de estudio de tatuajes, cercano, profesional y moderno al cliente (${clientName}).
Tus funciones son:
1. Resolver dudas sobre estilos de tatuaje (Blackwork, Fineline, Realismo, Neo-traditional, etc.), higiene, preparación previa y cuidados posteriores.
2. Calcular presupuestos aproximados siguiendo las directrices del tatuador cuando el cliente dé medidas o detalles.
${quoteData ? `NOTA CLAVE DE PRESUPUESTO: El sistema ha calculado un presupuesto estimado de ${quoteData.estimated_min}€ a ${quoteData.estimated_max}€ para una pieza de ${quoteData.size_cm}cm. Incluye este rango en tu respuesta y añade SIEMPRE que es una estimación sujeta a confirmación en el estudio.` : ''}
3. Recordar que las citas (tanto consultas de diseño gratuitas como sesiones de aguja) se pueden solicitar directamente en el calendario de la web.
4. Responder en ${lang === 'en' ? 'Inglés' : 'Español'}.
5. Mantener las respuestas ágiles (2 a 3 párrafos), con tono acogedor de tatuador profesional.`;

    const aiResponseText = await callEdenAI({
      messages: compressed,
      instructions: systemPrompt,
      temperature: 0.6
    });

    // 10. Save AI message
    let savedAiMsg: any = {
      id: 'ai-' + Date.now(),
      sender_role: 'ai_assistant',
      content: aiResponseText,
      quote_data: quoteData || null,
      created_at: new Date().toISOString()
    };

    if (actualChatId) {
      const { data: dbAiMsg } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: actualChatId,
          sender_role: 'ai_assistant',
          content: aiResponseText,
          quote_data: quoteData || null
        })
        .select()
        .maybeSingle();

      if (dbAiMsg) savedAiMsg = dbAiMsg;

      const updatedHistory: ChatMessage[] = [...compressed, { role: 'assistant', content: aiResponseText }];
      const chatSummary = await generateChatSummary(updatedHistory, lang as 'es' | 'en');

      await supabase
        .from('chats')
        .update({
          ai_summary: chatSummary,
          status_badge: quoteData ? 'quoting' : 'booking',
          updated_at: new Date().toISOString()
        })
        .eq('id', actualChatId);
    }

    return NextResponse.json({
      success: true,
      chat: chat || { id: actualChatId || 'session-chat', ai_enabled: true },
      message: savedUserMsg,
      aiResponse: savedAiMsg,
      quote: quoteData
    });

  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({
      success: true,
      message: {
        id: 'msg-' + Date.now(),
        sender_role: 'client',
        content: req.body ? 'Mensaje recibido' : 'Mensaje',
        created_at: new Date().toISOString()
      },
      aiResponse: {
        id: 'ai-' + Date.now(),
        sender_role: 'ai_assistant',
        content: '¡Hola! Gracias por escribir al estudio. En este momento hemos registrado tu consulta y el tatuador o nuestro asistente te responderá enseguida. Si deseas pedir cita o consultar presupuesto por centímetros (ej. "15 cm"), indícanoslo.',
        created_at: new Date().toISOString()
      }
    });
  }
}
