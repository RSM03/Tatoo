import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callEdenAI, calculateQuote, analyzeTattooHealingVision, generateChatSummary, compressContext, type ChatMessage } from '@/lib/edenai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, content, imageUrl, senderRole = 'client', lang = 'es' } = body;

    if (!chatId || (!content && !imageUrl)) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios (chatId, contenido o imagen).' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch chat metadata and associated artist configuration
    const { data: chat, error: chatErr } = await supabase
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
      .single();

    if (chatErr || !chat) {
      return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 });
    }

    const artist = (chat as any).artists;
    const client = (chat as any).clients;
    const artistName = artist?.display_name || 'El Tatuador';
    const clientName = client?.profiles?.full_name || 'Cliente';

    // 2. Save incoming message to database
    const incomingMessage: any = {
      chat_id: chatId,
      sender_role: senderRole,
      content: content || (imageUrl ? 'Foto adjunta' : ''),
      image_url: imageUrl || null
    };

    // If it's a tattoo healing photo sent by the client, analyze it with Vision
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

    const { data: savedUserMsg, error: saveErr } = await supabase
      .from('chat_messages')
      .insert(incomingMessage)
      .select()
      .single();

    if (saveErr) {
      console.error('Error saving user message:', saveErr);
      return NextResponse.json({ error: 'Error al guardar el mensaje.' }, { status: 500 });
    }

    // 3. Check if human takeover is active
    // If the artist sends a message, or ai_enabled is false, do not trigger AI reply
    if (senderRole === 'artist') {
      // Artist intervened: auto-switch to human mode
      await supabase
        .from('chats')
        .update({
          ai_enabled: false,
          status_badge: 'takeover',
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      return NextResponse.json({ success: true, message: savedUserMsg });
    }

    if (!chat.ai_enabled) {
      // AI is paused by artist: wait for human response
      return NextResponse.json({
        success: true,
        message: savedUserMsg,
        aiPaused: true,
        info: 'El tatuador ha intervenido en este chat. La IA está en pausa temporal.'
      });
    }

    // 4. If image had healing analysis, respond immediately with the artist's verified advice
    if (healingResult) {
      const aiReplyContent = `${healingResult.suggested_action}\n\n*${healingResult.analysis_text}*`;
      
      const { data: aiMsg } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_role: 'ai_assistant',
          content: aiReplyContent,
          healing_status: healingResult.healing_status,
          healing_metadata: healingResult
        })
        .select()
        .single();

      // Update badge if an infection alert was detected
      const newBadge = healingResult.healing_status === 'alert_infection' ? 'takeover' : 'healing_check';
      await supabase.from('chats').update({
        status_badge: newBadge,
        ai_summary: `[Curación] ${healingResult.healing_status}: ${healingResult.analysis_text.slice(0, 60)}...`,
        updated_at: new Date().toISOString()
      }).eq('id', chatId);

      return NextResponse.json({
        success: true,
        message: savedUserMsg,
        aiResponse: aiMsg
      });
    }

    // 5. Conversational & Budget Estimation Engine
    // Check if user is asking for a quote with size info (e.g. "15 cm", "10x10")
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

    const sizeMatch = content.match(/(\d{1,3})\s*(?:cm|centimetros|centímetros)/i);
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

    // Retrieve recent conversation history for Eden AI context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('sender_role, content, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(16);

    const formattedMessages: ChatMessage[] = (history || []).map(m => ({
      role: m.sender_role === 'ai_assistant' ? 'assistant' : (m.sender_role === 'client' ? 'user' : 'assistant'),
      content: m.content
    }));

    const compressed = compressContext(formattedMessages);

    // System prompt with artist-specific persona and instructions
    const systemPrompt = `Eres el Asistente Virtual Inteligente del estudio de tatuajes para el artista ${artistName}.
Tu objetivo es responder de manera amable, profesional, moderna y cercana al cliente (${clientName}).
Tus funciones son:
1. Responder dudas sobre estilos de tatuaje, preparación antes de la cita y cuidados de cicatrización.
2. Calcular presupuestos aproximados siguiendo las reglas del artista cuando el cliente especifique medidas.
${quoteData ? `NOTA CLAVE: El sistema ha calculado un presupuesto estimado de ${quoteData.estimated_min}€ a ${quoteData.estimated_max}€ para ${quoteData.size_cm}cm. Incluye este rango en tu respuesta y añade SIEMPRE el aviso de que es un precio aproximado sujeto a revisión en persona.` : ''}
3. Recordar que las citas se pueden reservar directamente en la pestaña del calendario.
4. Responde en el idioma ${lang === 'en' ? 'Inglés' : 'Español'}.
5. Mantén tus respuestas claras, concisas (2 a 4 párrafos cortos) y sin inventar precios fuera de las reglas.`;

    const aiResponseText = await callEdenAI({
      messages: compressed,
      instructions: systemPrompt,
      temperature: 0.6
    });

    // 6. Save AI assistant message
    const { data: savedAiMsg } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_role: 'ai_assistant',
        content: aiResponseText,
        quote_data: quoteData || null
      })
      .select()
      .single();

    // 7. Generate automatic 1-line summary for artist inbox
    const updatedHistory: ChatMessage[] = [...compressed, { role: 'assistant', content: aiResponseText }];
    const chatSummary = await generateChatSummary(updatedHistory, lang as 'es' | 'en');

    await supabase
      .from('chats')
      .update({
        ai_summary: chatSummary,
        status_badge: quoteData ? 'quoting' : 'booking',
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId);

    return NextResponse.json({
      success: true,
      message: savedUserMsg,
      aiResponse: savedAiMsg,
      quote: quoteData,
      summary: chatSummary
    });

  } catch (err: any) {
    console.error('Chat API Fatal Error:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
