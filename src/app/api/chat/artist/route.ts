import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callEdenAIWithTools, type ChatMessage } from '@/lib/edenai';
import { toLocalIsoDate, parseRelativeDate, createDateInTimezone, formatMadridTime, formatMadridDate, parseExplicitTimeDetails } from '@/lib/ai-tools';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artistId, content, studioId, history } = body;

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

    // Precompute upcoming 7 days in the current year
    const calendarWeekReference = [0, 1, 2, 3, 4, 5, 6, 7].map(dayOffset => {
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      const iso = toLocalIsoDate(d);
      const weekdayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
      const label = dayOffset === 0 ? 'Hoy' : (dayOffset === 1 ? 'Mañana' : `Este ${weekdayName}`);
      return `- ${label}: ${iso}`;
    }).join('\n');

    // 3. Define Artist Copilot Tools
    const ARTIST_TOOLS = [
      {
        type: 'function',
        function: {
          name: 'create_artist_appointment',
          description: 'Crea y agenda formalmente una nueva cita de tatuaje o consulta en la agenda del tatuador para mañana, hoy o una fecha y hora específicas.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Fecha de la cita (ej: mañana, hoy, este viernes, YYYY-MM-DD)' },
              start_time: { type: 'string', description: 'Hora de inicio en formato HH:MM (ej: 11:00, 16:30). Por defecto 11:00.' },
              duration_hours: { type: 'number', description: 'Duración en horas de la sesión (ej: 1, 2, 2.5, 4). Por defecto 2.5 horas.' },
              client_name: { type: 'string', description: 'Nombre del cliente (ej: Pedro, Lucía) o "Cliente" si no se especifica.' },
              client_phone: { type: 'string', description: 'Teléfono de contacto opcional.' },
              appointment_type: { type: 'string', enum: ['tattoo_session', 'design_consultation', 'touch_up'], description: 'Tipo de cita. Por defecto "tattoo_session".' },
              description: { type: 'string', description: 'Descripción o temática del tatuaje si se menciona (ej: "Lobo en antebrazo", "Lettering").' }
            },
            required: ['date']
          }
        }
      },
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
          name: 'delete_appointment_or_break',
          description: 'Elimina o borra definitivamente y por completo una cita o descanso bloqueado del calendario y base de datos del tatuador.',
          parameters: {
            type: 'object',
            properties: {
              appointment_id: { type: 'string', description: 'ID o fragmento del ID de la cita o descanso a borrar' },
              date: { type: 'string', description: 'Fecha de la cita o descanso (ej: mañana, hoy, este viernes, YYYY-MM-DD)' },
              start_time: { type: 'string', description: 'Hora aproximada del evento a borrar (ej: 16:00, 11:00)' },
              reason_or_type: { type: 'string', description: 'Tipo o motivo: descanso, comida, o cita de tatuaje' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'cancel_or_reschedule_appointment',
          description: 'Cancela, reprograma o borra una cita o descanso de la agenda del tatuador.',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['cancel', 'reschedule', 'delete'], description: 'Acción a realizar: cancel (marcar como cancelada), reschedule (reprogramar a otra hora/día), o delete (borrar permanentemente de la base de datos)' },
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
- Fecha y hora actual: ${now.toLocaleString('es-ES')} (${todayIso})

CALENDARIO DE REFERENCIA ESTA SEMANA:
${calendarWeekReference}

CITAS REALES REGISTRADAS EN TU AGENDA (A PARTIR DE HOY):
${agendaText}

REGLAS CRÍTICAS:
1. Sé conciso, profesional, dinámico y muy útil para el tatuador.
2. CREACIÓN DE CITAS: Cuando el tatuador te pida crear o agendar una cita (ej: "crea una cita para mañana", "agenda a las 11:00 con Pedro", "pon una cita mañana"), USA INMEDIATAMENTE la herramienta 'create_artist_appointment'.
3. DESCANSO: Usa 'block_break_time' para descansos o comidas.
4. GESTIÓN Y BORRADO: Puedes consultar citas ('get_artist_agenda'), cancelar/mover ('cancel_or_reschedule_appointment'), borrar definitivamente citas o descansos bloqueados ('delete_appointment_or_break') y verificar quién ha firmado el consentimiento ('check_client_consents').
   - Si el tatuador te pide "borra el descanso...", "elimina la cita...", "quita el bloqueo..." o similar, USA INMEDIATAMENTE 'delete_appointment_or_break'.
5. Puedes resolver CUALQUIER duda sobre cómo usar la app (tarifas, consentimientos legales en PDF de 1 página con firma nítida, suscripción de 50€/mes con Stripe, mapa, etc.).
6. REGLA DE COMPRENSIÓN: Si no entiendes lo que el tatuador solicita, díselo claramente ("Disculpa, no he entendido qué deseas hacer...") y dale sugerencias directas. NUNCA respondas con un saludo inicial ni mensaje genérico de bienvenida.`;

    let workingMessages: ChatMessage[] = [];
    if (Array.isArray(history) && history.length > 0) {
      workingMessages = history.slice(-8).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: typeof h.content === 'string' ? h.content : (h.text || '')
      }));
    }
    workingMessages.push({ role: 'user', content: content.trim() });

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

        if (fnName === 'create_artist_appointment') {
          const targetDate = parseRelativeDate(args.date || 'mañana', now);
          const timeDetails = parseExplicitTimeDetails(content || '');
          const startTime = timeDetails?.startTime || args.start_time || '11:00';
          const durationHours = timeDetails?.durationHours || Number(args.duration_hours) || 2.5;
          const startDt = createDateInTimezone(targetDate, startTime, 'Europe/Madrid');
          const endDt = new Date(startDt.getTime() + durationHours * 3600000);
          const startIso = startDt.toISOString();
          const endIso = endDt.toISOString();
          const clientName = args.client_name || 'Cliente';
          const titleText = args.description ? `Tatuaje: ${args.description} (${clientName})` : `Cita con ${clientName}`;

          // Check collisions with existing appointments
          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id, start_time, end_time, title')
            .eq('artist_id', artist.id)
            .neq('status', 'cancelled')
            .lt('start_time', endIso)
            .gt('end_time', startIso);

          if (conflicts && conflicts.length > 0) {
            const confStart = formatMadridTime(conflicts[0].start_time);
            const confEnd = formatMadridTime(conflicts[0].end_time);
            executionOutput = {
              success: false,
              conflict: true,
              error: `El tatuador ya tiene una cita reservada en ese horario (${confStart} - ${confEnd}). No se pueden solapar citas en el mismo horario.`
            };
          } else {
            const { data: newApp, error: appErr } = await supabase
              .from('appointments')
              .insert({
                artist_id: artist.id,
                studio_id: artist.studio_id,
                title: titleText,
                walk_in_name: clientName,
                walk_in_phone: args.client_phone || null,
                appointment_type: args.appointment_type || 'tattoo_session',
                start_time: startIso,
                end_time: endIso,
                status: 'confirmed',
                description: args.description || null
              })
              .select(`
                id,
                title,
                start_time,
                end_time,
                status,
                appointment_type,
                walk_in_name
              `)
              .single();

            if (appErr) {
              executionOutput = { success: false, error: appErr.message };
            } else {
              const formattedDate = formatMadridDate(startDt);
              const formattedStartTime = formatMadridTime(startDt);
              const formattedEndTime = formatMadridTime(endDt);

              executionOutput = {
                success: true,
                appointment_id: newApp.id,
                date: targetDate,
                time: startTime,
                client_name: clientName,
                duration_hours: durationHours,
                details: `Cita confirmada en la agenda oficial para el ${formattedDate} de ${formattedStartTime} a ${formattedEndTime} (${durationHours}h)`
              };
              toolResultData = { newAppointment: newApp };
            }
          }
        } else if (fnName === 'get_artist_agenda') {
          executionOutput = {
            agenda: agendaText,
            total_upcoming: appsList.length,
            requested_date: args.date || 'hoy'
          };
        } else if (fnName === 'block_break_time') {
          const targetDate = parseRelativeDate(args.date || 'hoy', now);
          const timeDetails = parseExplicitTimeDetails(content || '');
          const startTime = timeDetails?.startTime || args.start_time || '14:00';
          const durationHours = timeDetails?.durationHours || args.duration_hours || 1;
          const startDt = createDateInTimezone(targetDate, startTime, 'Europe/Madrid');
          const endDt = new Date(startDt.getTime() + durationHours * 3600000);
          const startIso = startDt.toISOString();
          const endIso = endDt.toISOString();

          // Check if there are conflicts with non-cancelled appointments in this slot
          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id, start_time, end_time, title')
            .eq('artist_id', artist.id)
            .neq('status', 'cancelled')
            .lt('start_time', endIso)
            .gt('end_time', startIso);

          if (conflicts && conflicts.length > 0) {
            const confStart = formatMadridTime(conflicts[0].start_time);
            const confEnd = formatMadridTime(conflicts[0].end_time);
            executionOutput = {
              success: false,
              conflict: true,
              error: `Ya existe una cita o bloqueo en ese horario (${confStart} - ${confEnd}: ${conflicts[0].title || 'Ocupado'}). No se puede solapar el descanso.`
            };
          } else {
            const { data: newBlock, error: blockErr } = await supabase
              .from('appointments')
              .insert({
                artist_id: artist.id,
                studio_id: artist.studio_id,
                title: `🔒 ${args.reason || 'Descanso / No disponible'}`,
                appointment_type: 'break_blocked',
                start_time: startIso,
                end_time: endIso,
                status: 'confirmed'
              })
              .select()
              .maybeSingle();

            if (blockErr) {
              executionOutput = { success: false, error: blockErr.message };
            } else {
              const formattedDate = formatMadridDate(startDt);
              const formattedStartTime = formatMadridTime(startDt);
              const formattedEndTime = formatMadridTime(endDt);

              executionOutput = {
                success: true,
                date: targetDate,
                start_time: startTime,
                duration_hours: durationHours,
                reason: args.reason || 'Descanso',
                block_id: newBlock?.id,
                details: `Descanso bloqueado el ${formattedDate} de ${formattedStartTime} a ${formattedEndTime}`
              };
              toolResultData = { newBlock };
            }
          }
        } else if (fnName === 'delete_appointment_or_break' || (fnName === 'cancel_or_reschedule_appointment' && args.action === 'delete')) {
          const queryId = (args.appointment_id || '').toLowerCase().trim();
          let targetApp: any = null;

          if (queryId) {
            targetApp = appsList.find(a => a.id.toLowerCase().includes(queryId) || (a.id.slice(0, 8) === queryId));
            if (!targetApp) {
              const { data: foundById } = await supabase
                .from('appointments')
                .select('id, title, appointment_type, start_time, end_time')
                .eq('artist_id', artist.id)
                .ilike('id', `%${queryId}%`)
                .limit(1)
                .maybeSingle();
              targetApp = foundById;
            }
          }

          if (!targetApp) {
            const targetDate = args.date ? parseRelativeDate(args.date, now) : (content ? parseRelativeDate(content, now) : null);
            const timeDetails = parseExplicitTimeDetails(content || '');
            const startTime = timeDetails?.startTime || args.start_time || null;

            let query = supabase
              .from('appointments')
              .select('id, title, appointment_type, start_time, end_time')
              .eq('artist_id', artist.id);

            if (targetDate) {
              query = query.gte('start_time', `${targetDate}T00:00:00Z`).lte('start_time', `${targetDate}T23:59:59Z`);
            }

            const { data: candidates } = await query;
            if (candidates && candidates.length > 0) {
              const isLookingForBreak = (args.reason_or_type && args.reason_or_type.toLowerCase().includes('descanso')) || (content && (content.toLowerCase().includes('descanso') || content.toLowerCase().includes('comida') || content.toLowerCase().includes('bloqueo')));

              let filtered = candidates;
              if (isLookingForBreak) {
                const breaks = candidates.filter(c => c.appointment_type === 'break_blocked' || c.appointment_type === 'break' || (c.title && c.title.toLowerCase().includes('descanso')));
                if (breaks.length > 0) filtered = breaks;
              }

              if (startTime) {
                targetApp = filtered.find(c => {
                  const mTime = formatMadridTime(c.start_time);
                  return mTime === startTime || mTime.startsWith(startTime.slice(0, 2));
                }) || filtered[0];
              } else {
                targetApp = filtered[0];
              }
            }
          }

          if (!targetApp) {
            executionOutput = {
              success: false,
              error: 'No se encontró la cita o descanso para eliminar en la agenda. Por favor, especifica el día, la hora o el ID.'
            };
          } else {
            const { error: delErr } = await supabase
              .from('appointments')
              .delete()
              .eq('id', targetApp.id);

            if (delErr) {
              executionOutput = { success: false, error: delErr.message };
            } else {
              const fStart = formatMadridDate(targetApp.start_time);
              const fTime = formatMadridTime(targetApp.start_time);
              executionOutput = {
                success: true,
                deleted: true,
                appointment_id: targetApp.id,
                title: targetApp.title,
                details: `Cita o descanso "${targetApp.title}" (${fStart} a las ${fTime}) ha sido eliminado permanentemente de la agenda y base de datos.`
              };
              toolResultData = { deletedAppointmentId: targetApp.id };
            }
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
            const time = new Date(a.start_time).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
            toolResultData = { updatedAppointment: { ...targetApp, status: 'cancelled' } };
          } else {
            const newDate = parseRelativeDate(args.new_date || 'mañana', now);
            const timeDetails = parseExplicitTimeDetails(content || '');
            const newTime = timeDetails?.startTime || args.new_time || '11:00';
            const startDt = createDateInTimezone(newDate, newTime, 'Europe/Madrid');
            const endDt = new Date(startDt.getTime() + 2 * 3600000);
            const startIso = startDt.toISOString();
            const endIso = endDt.toISOString();
            await supabase.from('appointments').update({ start_time: startIso, end_time: endIso, status: 'confirmed' }).eq('id', targetApp.id);
            executionOutput = {
              success: true,
              action: 'rescheduled',
              appointment_id: targetApp.id,
              new_date: newDate,
              new_time: newTime,
              details: `Reprogramada al ${formatMadridDate(startDt)} de ${formatMadridTime(startDt)} a ${formatMadridTime(endDt)}`
            };
            toolResultData = { updatedAppointment: { ...targetApp, start_time: startIso, end_time: endIso, status: 'confirmed' } };
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
      const lower = content.toLowerCase();
      if ((lower.includes('crea') || lower.includes('agenda') || lower.includes('reserva') || lower.includes('pon')) && (lower.includes('cita') || lower.includes('sesion') || lower.includes('sesión') || lower.includes('mañana') || lower.includes('hoy'))) {
        const targetDate = parseRelativeDate(content, now);
        const timeDetails = parseExplicitTimeDetails(content);
        const startTime = timeDetails?.startTime || '11:00';
        const durationHours = timeDetails?.durationHours || 2.5;
        const startDt = createDateInTimezone(targetDate, startTime, 'Europe/Madrid');
        const endDt = new Date(startDt.getTime() + durationHours * 3600000);
        const startIso = startDt.toISOString();
        const endIso = endDt.toISOString();

        const { data: newApp } = await supabase
          .from('appointments')
          .insert({
            artist_id: artist.id,
            studio_id: artist.studio_id,
            title: 'Cita con Cliente',
            walk_in_name: 'Cliente',
            appointment_type: 'tattoo_session',
            start_time: startIso,
            end_time: endIso,
            status: 'confirmed'
          })
          .select(`id, title, start_time, end_time, status, appointment_type, walk_in_name`)
          .single();

        if (newApp) {
          toolResultData = { newAppointment: newApp };
          const fDate = formatMadridDate(startDt);
          const fStart = formatMadridTime(startDt);
          const fEnd = formatMadridTime(endDt);
          replyText = `✅ ¡Cita creada y confirmada con éxito para el **${fDate} de ${fStart} a ${fEnd}** (${durationHours}h)! Ya está guardada y visible en tu agenda.`;
        } else {
          replyText = `⚠️ No se pudo registrar la cita automáticamente. Por favor, indícame la fecha y hora.`;
        }
      } else if ((lower.includes('descanso') || lower.includes('comida') || lower.includes('bloquea')) && (lower.includes('pon') || lower.includes('añade') || lower.includes('bloquea') || lower.includes('crea') || lower.includes('ponme'))) {
        const targetDate = parseRelativeDate(content, now);
        const timeDetails = parseExplicitTimeDetails(content);
        const startTime = timeDetails?.startTime || '16:00';
        const durationHours = timeDetails?.durationHours || 1;
        const startDt = createDateInTimezone(targetDate, startTime, 'Europe/Madrid');
        const endDt = new Date(startDt.getTime() + durationHours * 3600000);
        const startIso = startDt.toISOString();
        const endIso = endDt.toISOString();

        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id, start_time, end_time, title')
          .eq('artist_id', artist.id)
          .neq('status', 'cancelled')
          .lt('start_time', endIso)
          .gt('end_time', startIso);

        if (conflicts && conflicts.length > 0) {
          const cStart = formatMadridTime(conflicts[0].start_time);
          const cEnd = formatMadridTime(conflicts[0].end_time);
          replyText = `⚠️ No se puede bloquear el descanso en ese horario porque ya tienes una cita o bloqueo reservado (${cStart} - ${cEnd}: ${conflicts[0].title || 'Ocupado'}).`;
        } else {
          const { data: newBlock, error: blockErr } = await supabase
            .from('appointments')
            .insert({
              artist_id: artist.id,
              studio_id: artist.studio_id,
              title: '🔒 Descanso',
              appointment_type: 'break_blocked',
              start_time: startIso,
              end_time: endIso,
              status: 'confirmed'
            })
            .select()
            .maybeSingle();

          if (newBlock) {
            toolResultData = { newBlock };
            const fDate = formatMadridDate(startDt);
            const fStart = formatMadridTime(startDt);
            const fEnd = formatMadridTime(endDt);
            replyText = `🔒 ¡Descanso bloqueado con éxito para el **${fDate} de ${fStart} a ${fEnd}** (${durationHours}h)! Ya está registrado en tu agenda.`;
          } else {
            replyText = `⚠️ No se pudo bloquear el descanso: ${blockErr?.message || 'Error al guardar'}`;
          }
        }
      } else if ((lower.includes('borra') || lower.includes('elimina') || lower.includes('quita')) && (lower.includes('cita') || lower.includes('descanso') || lower.includes('bloqueo'))) {
        const targetDate = parseRelativeDate(content, now);
        const timeDetails = parseExplicitTimeDetails(content);
        const startTime = timeDetails?.startTime || null;

        let query = supabase
          .from('appointments')
          .select('id, title, appointment_type, start_time, end_time')
          .eq('artist_id', artist.id);

        if (targetDate) {
          query = query.gte('start_time', `${targetDate}T00:00:00Z`).lte('start_time', `${targetDate}T23:59:59Z`);
        }

        const { data: candidates } = await query;
        let targetApp: any = null;

        if (candidates && candidates.length > 0) {
          const isLookingForBreak = lower.includes('descanso') || lower.includes('comida') || lower.includes('bloqueo');
          let filtered = candidates;
          if (isLookingForBreak) {
            const breaks = candidates.filter(c => c.appointment_type === 'break_blocked' || c.appointment_type === 'break' || (c.title && c.title.toLowerCase().includes('descanso')));
            if (breaks.length > 0) filtered = breaks;
          }
          if (startTime) {
            targetApp = filtered.find(c => {
              const mTime = formatMadridTime(c.start_time);
              return mTime === startTime || mTime.startsWith(startTime.slice(0, 2));
            }) || filtered[0];
          } else {
            targetApp = filtered[0];
          }
        }

        if (targetApp) {
          const { error: delErr } = await supabase.from('appointments').delete().eq('id', targetApp.id);
          if (!delErr) {
            toolResultData = { deletedAppointmentId: targetApp.id };
            const fStart = formatMadridDate(targetApp.start_time);
            const fTime = formatMadridTime(targetApp.start_time);
            replyText = `🗑️ Se ha eliminado permanentemente de tu agenda el evento "${targetApp.title}" (${fStart} a las ${fTime}).`;
          } else {
            replyText = `⚠️ Hubo un error al eliminar el evento de la agenda: ${delErr.message}`;
          }
        } else {
          replyText = `No he encontrado ninguna cita o descanso en esa fecha/hora para eliminar. Por favor, indícame el día o la hora exacta.`;
        }
      } else {
        replyText = `Disculpa, no he terminado de entender tu solicitud. Como tu asistente de tatuador puedo ayudarte a:\n\n` +
          `• 📅 **Crear y agendar citas** (ej: "crea una cita para mañana a las 11:00")\n` +
          `• 🗓️ **Consultar tus citas de hoy o de la semana**\n` +
          `• 🔒 **Bloquear horas para descansos o comidas** (ej: "bloquea mañana de 16 a 17h")\n` +
          `• 🗑️ **Borrar citas o descansos** (ej: "borra el descanso de mañana a las 16")\n` +
          `• 📋 **Verificar qué clientes han firmado el consentimiento**\n` +
          `• ❓ **Resolver dudas sobre la app** (tarifas, PDF de consentimiento, suscripción de 50€/mes con Stripe, etc.)\n\n` +
          `¿Podrías especificar qué necesitas?`;
      }
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
