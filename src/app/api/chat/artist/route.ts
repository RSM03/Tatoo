import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callEdenAIWithTools, type ChatMessage } from '@/lib/edenai';
import { toLocalIsoDate, parseRelativeDate } from '@/lib/ai-tools';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artistId, content, studioId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'El mensaje es obligatorio.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch artist & studio details
    let artist: any = null;
    if (artistId) {
      const { data } = await supabase
        .from('artists')
        .select(`
          id,
          display_name,
          specialties,
          hourly_rate,
          minimum_fee,
          pricing_rules,
          studio_id,
          studios (id, name, address)
        `)
        .eq('id', artistId)
        .maybeSingle();
      artist = data;
    }

    if (!artist) {
      const { data } = await supabase
        .from('artists')
        .select('id, display_name, specialties, hourly_rate, minimum_fee, pricing_rules, studio_id, studios(id, name, address)')
        .limit(1)
        .maybeSingle();
      artist = data;
    }

    const artistName = artist?.display_name || 'Tatuador';
    const studioName = artist?.studios?.name || 'Estudio';

    // 2. Fetch artist's active appointments for context
    const now = new Date();
    const todayIso = toLocalIsoDate(now);

    const { data: upcomingApps } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        description,
        appointment_type,
        start_time,
        end_time,
        status,
        client_id,
        clients (id, profile_id, dni_nie, profiles(full_name, phone)),
        consent_forms (id, full_name, dni_nie, signed_at)
      `)
      .eq('artist_id', artist?.id)
      .gte('start_time', `${todayIso}T00:00:00`)
      .order('start_time', { ascending: true })
      .limit(20);

    const appsList = upcomingApps || [];

    // Pre-format appointments text for the prompt
    const agendaText = appsList.length > 0
      ? appsList.map(a => {
          const clientName = (a as any).clients?.profiles?.full_name || 'Cliente';
          const hasConsent = (a as any).consent_forms && (a as any).consent_forms.length > 0;
          const start = new Date(a.start_time).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          return `- [${a.status.toUpperCase()}] ${start}: ${a.title || 'Cita'} con ${clientName}. Tipo: ${a.appointment_type}. Consentimiento: ${hasConsent ? '✓ Firmado' : '❌ Pendiente'}. (ID: ${a.id.slice(0, 8)})`;
        }).join('\n')
      : 'No tienes citas agendadas a partir de hoy.';

    // 3. Define Artist Copilot Tools
    const ARTIST_TOOLS = [
      {
        type: 'function',
        function: {
          name: 'get_artist_agenda',
          description: 'Consulta las citas y huecos de la agenda del tatuador para hoy, una fecha concreta o los próximos días.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Fecha a consultar (ej: hoy, mañana, YYYY-MM-DD)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'block_break_time',
          description: 'Bloquea un espacio de tiempo en el calendario del tatuador para descanso, comida, gestión personal o vacaciones.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Fecha del bloqueo en formato YYYY-MM-DD o lenguaje natural (hoy, mañana)' },
              start_time: { type: 'string', description: 'Hora de inicio en formato HH:MM (ej: 14:00)' },
              duration_hours: { type: 'number', description: 'Horas de duración del bloqueo (ej: 1, 2, 4)' },
              reason: { type: 'string', description: 'Motivo del bloqueo (ej: Descanso / Comida, Asuntos personales)' }
            },
            required: ['date', 'start_time']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'cancel_or_reschedule_appointment',
          description: 'Cancela o reprograma una cita de la agenda del tatuador.',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['cancel', 'reschedule'], description: 'Acción a realizar' },
              appointment_id: { type: 'string', description: 'ID o fragmento del ID de la cita' },
              new_date: { type: 'string', description: 'Nueva fecha si se reprograma' },
              new_time: { type: 'string', description: 'Nueva hora si se reprograma' },
              reason: { type: 'string', description: 'Motivo' }
            },
            required: ['action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_client_consents',
          description: 'Comprueba el estado de firmas de consentimientos informados legales de los clientes para las citas del tatuador.',
          parameters: {
            type: 'object',
            properties: {
              client_name: { type: 'string', description: 'Nombre o parte del nombre del cliente' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_app_faq',
          description: 'Responde dudas del tatuador sobre el uso y configuración de la app (tarifas, consentimientos, descargas en PDF, suscripción de 50€/mes con Stripe, mapa, flashes, etc.).',
          parameters: {
            type: 'object',
            properties: {
              topic: { type: 'string', enum: ['rates_pricing', 'consent_legal_pdf', 'stripe_subscription', 'calendar_breaks', 'shares_flashes', 'general'] }
            },
            required: ['topic']
          }
        }
      }
    ];

    const systemPrompt = `Eres el Asistente Virtual Personal y Copilot Inteligente de ${artistName} en ${studioName}.
Tu objetivo es ayudar al tatuador a gestionar su día a día de forma ultra ágil y responder cualquier duda sobre la plataforma.

DATOS DEL TATUADOR:
- Nombre: ${artistName}
- Estudio: ${studioName}
- Tarifa mínima base: ${artist?.minimum_fee || 60}€
- Tarifa por hora: ${artist?.hourly_rate || 80}€
- Fecha y hora actual: ${now.toLocaleString('es-ES')}

CITAS REALES REGISTRADAS EN TU AGENDA (A PARTIR DE HOY):
${agendaText}

REGLAS CRÍTICAS:
1. Sé conciso, profesional, dinámico y muy útil para el tatuador.
2. Puedes consultar citas, bloquear descansos, cancelar citas y verificar quién ha firmado el consentimiento.
3. Puedes resolver CUALQUIER duda sobre cómo usar la app:
   - Configuración de tarifas (pestaña 'Presupuestos').
   - Consentimiento informado (cómo se firma con el dedo/ratón y cómo se descarga en PDF oficial de 1 página con firma nítida).
   - Suscripción para estudios con Stripe (50€/mes con tarjeta, acceso para todos los tatuadores, gestión en el portal de Stripe).
   - Subida de diseños flashes con descuento (pestaña 'Galería y newsletter').
   - Ubicación del estudio en el mapa interactivo CARTO.
4. REGLA DE COMPRENSIÓN: Si no entiendes lo que el tatuador solicita, díselo claramente ("Disculpa, no he entendido qué deseas hacer...") y dale sugerencias directas. NUNCA respondas con un saludo inicial ni mensaje genérico de bienvenida.`;

    const workingMessages: ChatMessage[] = [
      { role: 'user', content: content.trim() }
    ];

    const firstCall = await callEdenAIWithTools({
      messages: workingMessages,
      instructions: systemPrompt,
      tools: ARTIST_TOOLS,
      temperature: 0.4
    });

    let replyText = '';
    let toolResultData: any = null;

    if (firstCall.tool_calls && firstCall.tool_calls.length > 0) {
      // Record assistant tool calls in conversation
      workingMessages.push({
        role: 'assistant',
        content: firstCall.content || null,
        tool_calls: firstCall.tool_calls
      });

      for (const tc of firstCall.tool_calls) {
        const fnName = tc.function.name;
        let args: any = {};
        try {
          args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : (tc.function.arguments || {});
        } catch {
          args = {};
        }

        let executionOutput: any = {};

        if (fnName === 'get_artist_agenda') {
          executionOutput = {
            agenda: agendaText,
            total_upcoming: appsList.length,
            requested_date: args.date || 'hoy'
          };
        } else if (fnName === 'block_break_time') {
          const targetDate = parseRelativeDate(args.date || 'hoy', now);
          const startTime = args.start_time || '14:00';
          const durationHours = args.duration_hours || 1;
          const startIso = new Date(`${targetDate}T${startTime}:00`).toISOString();
          const endIso = new Date(new Date(startIso).getTime() + durationHours * 3600000).toISOString();

          const { data: newBlock, error: blockErr } = await supabase
            .from('appointments')
            .insert({
              artist_id: artist.id,
              studio_id: artist.studio_id,
              title: `🔒 ${args.reason || 'Descanso / No disponible'}`,
              appointment_type: 'break',
              start_time: startIso,
              end_time: endIso,
              status: 'confirmed'
            })
            .select()
            .maybeSingle();

          if (blockErr) {
            executionOutput = { success: false, error: blockErr.message };
          } else {
            executionOutput = {
              success: true,
              date: targetDate,
              start_time: startTime,
              duration_hours: durationHours,
              reason: args.reason || 'Descanso',
              block_id: newBlock?.id
            };
            toolResultData = { newBlock };
          }
        } else if (fnName === 'check_client_consents') {
          const queryName = (args.client_name || '').toLowerCase();
          const matching = appsList.filter(a => {
            const clientName = (a as any).clients?.profiles?.full_name?.toLowerCase() || '';
            return !queryName || clientName.includes(queryName);
          });

          const consentsStatus = matching.map(a => {
            const name = (a as any).clients?.profiles?.full_name || 'Cliente';
            const signed = (a as any).consent_forms && (a as any).consent_forms.length > 0;
            const time = new Date(a.start_time).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            return {
              client_name: name,
              appointment_time: time,
              is_signed: signed,
              status: signed ? 'firmado_valido' : 'pendiente_firma'
            };
          });

          executionOutput = {
            total_checked: matching.length,
            records: consentsStatus
          };
        } else if (fnName === 'cancel_or_reschedule_appointment') {
          const action = args.action || 'cancel';
          const queryId = (args.appointment_id || '').toLowerCase();
          const targetApp = appsList.find(a => a.id.toLowerCase().includes(queryId) || (a.id.slice(0, 8) === queryId));

          if (!targetApp) {
            executionOutput = { success: false, error: 'No se encontró la cita solicitada en la agenda.' };
          } else if (action === 'cancel') {
            await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', targetApp.id);
            executionOutput = { success: true, action: 'cancelled', appointment_id: targetApp.id, title: targetApp.title };
          } else {
            const newDate = parseRelativeDate(args.new_date || 'mañana', now);
            const newTime = args.new_time || '11:00';
            const startIso = new Date(`${newDate}T${newTime}:00`).toISOString();
            const endIso = new Date(new Date(startIso).getTime() + 2 * 3600000).toISOString();
            await supabase.from('appointments').update({ start_time: startIso, end_time: endIso, status: 'confirmed' }).eq('id', targetApp.id);
            executionOutput = { success: true, action: 'rescheduled', appointment_id: targetApp.id, new_date: newDate, new_time: newTime };
          }
        } else if (fnName === 'get_app_faq') {
          executionOutput = {
            topic: args.topic || 'general',
            rates_pricing: `Tarifa mínima: ${artist?.minimum_fee || 60}€, precio/hora: ${artist?.hourly_rate || 80}€/h. Se configuran en la pestaña Presupuestos.`,
            consent_legal_pdf: 'Consentimiento con firma digital procesada a tinta oscura (#0f172a). Descarga/impresión limpia en 1 sola página A4 sin páginas en blanco.',
            stripe_subscription: 'Suscripción para estudios a 50€/mes con Stripe para acceso total ilimitado a todos los tatuadores del estudio.',
            calendar_breaks: 'Los descansos y comidas bloquean la disponibilidad pública de la agenda.',
            shares_flashes: 'Subida de flashes y diseños disponibles en la pestaña Galería y newsletter con envío automático mensual.'
          };
        }

        workingMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: fnName,
          content: JSON.stringify(executionOutput)
        });
      }

      // Second Turn: LLM formulates the final conversational message based on tool output
      const secondCall = await callEdenAIWithTools({
        messages: workingMessages,
        instructions: systemPrompt,
        tools: ARTIST_TOOLS,
        temperature: 0.4
      });

      replyText = secondCall.content || 'He procesado la gestión de tu agenda correctamente.';
    } else if (firstCall.content) {
      replyText = firstCall.content;
    } else {
      replyText = `Disculpa, no he terminado de entender tu solicitud. Como tu asistente de tatuador puedo ayudarte a:\n\n` +
        `• 📅 **Consultar tus citas de hoy o de la semana**\n` +
        `• 🔒 **Bloquear horas para descansos o comidas** (ej: "bloquea mañana de 14 a 15h")\n` +
        `• 📋 **Verificar qué clientes han firmado el consentimiento**\n` +
        `• ❓ **Resolver dudas sobre la app** (tarifas, PDF de consentimiento, suscripción de 50€/mes con Stripe, etc.)\n\n` +
        `¿Podrías especificar qué necesitas?`;
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      data: toolResultData
    });
  } catch (err: any) {
    console.error('[Artist Chat API] Error:', err);
    return NextResponse.json({
      success: true,
      reply: 'Disculpa, ha ocurrido un error temporal al procesar tu solicitud. Por favor, reformula tu consulta o dime si deseas consultar tu agenda o bloquear un horario.'
    });
  }
}
