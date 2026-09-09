import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'chatId es requerido.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Delete all chat messages belonging to this chat
    const { error: delError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('chat_id', chatId);

    if (delError) throw delError;

    // 2. Fetch artist display name for this chat
    const { data: chatData } = await supabase
      .from('chats')
      .select('id, artist_id, artists(display_name)')
      .eq('id', chatId)
      .maybeSingle();

    const artistDisplayName = (chatData?.artists as any)?.display_name || 'el tatuador';

    // 3. Insert fresh initial greeting from the AI assistant
    const welcomeContent = `¡Hola de nuevo! 👋 He reiniciado la conversación. Soy el Asistente Virtual Oficial con Inteligencia Artificial de **${artistDisplayName}**.

Estoy aquí para ayudarte en todo lo que necesites en tiempo real:
- 🗓️ **Consultar disponibilidad y agendar citas**: Consulta huecos libres en directo para *Consulta de Diseño* o *Sesión de Tatuaje* y resérvalos con un solo clic.
- 💰 **Calcular presupuestos estimados**: Cuéntame tu idea, tamaño en cm, zona del cuerpo y si es a color o blanco/negro.
- 🔄 **Gestionar tus citas**: Puedes ver tus citas agendadas, cambiarlas de fecha/hora o cancelarlas en cualquier momento.
- 📷 **Revisión de cicatrización**: Si te acabas de tatuar, sube una foto de tu piel y analizaré cómo evoluciona la curación.

⚠️ **Transparencia**: **${artistDisplayName}** tiene acceso completo y supervisa este chat en directo, pudiendo intervenir personalmente en la conversación cuando lo necesites.

¿En qué te puedo ayudar hoy?`;

    const { data: initialMsg } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_role: 'ai_assistant',
        content: welcomeContent
      })
      .select()
      .maybeSingle();

    // 4. Reset AI summary and status badge
    await supabase
      .from('chats')
      .update({
        ai_summary: 'Conversación reiniciada',
        status_badge: 'quoting',
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId);

    return NextResponse.json({
      success: true,
      message: 'Conversación reiniciada correctamente.',
      initialMessage: initialMsg
    });
  } catch (err: any) {
    console.error('[Clear Chat Error]:', err);
    return NextResponse.json({ error: err.message || 'Error al limpiar la conversación.' }, { status: 500 });
  }
}
