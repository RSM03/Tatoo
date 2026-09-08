import toolsConfig from './ai-tools.json';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateQuote, analyzeTattooHealingVision, PricingRules, HealingTemplates } from '@/lib/edenai';

export const AI_TOOLS = toolsConfig.tools;

export interface ToolExecutionContext {
  studioId: string;
  artistId: string;
  clientId?: string | null;
  clientProfileId?: string | null;
  chatId?: string | null;
  artistPricingRules?: PricingRules;
  artistHealingTemplates?: HealingTemplates;
  artistName?: string;
  lang?: 'es' | 'en';
}

export interface ToolCallDecision {
  tool: string;
  arguments: any;
}

/**
 * Intelligent relative date parser for natural conversational queries
 */
export function parseRelativeDate(dateInput: string): string {
  const lower = (dateInput || '').toLowerCase();
  const now = new Date();

  // If already in YYYY-MM-DD format
  const isoMatch = dateInput.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];

  if (lower.includes('hoy') || lower.includes('today')) {
    return now.toISOString().split('T')[0];
  }
  if (lower.includes('pasado mañana')) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }
  if (lower.includes('mañana') || lower.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Days of week in Spanish
  const daysOfWeek = [
    { name: 'domingo', dayIdx: 0 },
    { name: 'lunes', dayIdx: 1 },
    { name: 'martes', dayIdx: 2 },
    { name: 'miercoles', dayIdx: 3 },
    { name: 'miércoles', dayIdx: 3 },
    { name: 'jueves', dayIdx: 4 },
    { name: 'viernes', dayIdx: 5 },
    { name: 'sabado', dayIdx: 6 },
    { name: 'sábado', dayIdx: 6 }
  ];

  for (const item of daysOfWeek) {
    if (lower.includes(item.name)) {
      const currentDay = now.getDay();
      let diff = item.dayIdx - currentDay;
      if (diff <= 0) diff += 7; // next occurrence
      const target = new Date();
      target.setDate(target.getDate() + diff);
      return target.toISOString().split('T')[0];
    }
  }

  // Day number mentioned, e.g. "el 18", "el día 22"
  const dayNumMatch = lower.match(/(?:el|dia|día)\s*(\d{1,2})/i);
  if (dayNumMatch) {
    const dayNum = parseInt(dayNumMatch[1], 10);
    const target = new Date();
    if (dayNum < now.getDate()) {
      target.setMonth(target.getMonth() + 1);
    }
    target.setDate(dayNum);
    return target.toISOString().split('T')[0];
  }

  // Default to 2 days ahead
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 2);
  return fallback.toISOString().split('T')[0];
}

/**
 * Deterministic intent detector to quickly pick the appropriate tool
 */
export function detectToolIntent(content: string, imageUrl?: string): ToolCallDecision | null {
  if (imageUrl) {
    return { tool: 'analyze_healing', arguments: { image_url: imageUrl } };
  }

  const text = (content || '').toLowerCase();

  // 1. Takeover intent
  if (/hablar con el tatuador|persona real|humano|hablar con alguien|tatuador real|hablar con marco|hablar con el artista|quiero hablar con/i.test(text)) {
    return {
      tool: 'request_human_takeover',
      arguments: { reason: content }
    };
  }

  // 2. Booking intent (e.g. "quiero cita", "resérvame", "agendar para el viernes a las 11")
  const isBooking = /(?:quiero|puedo|deseo|pedir|solicitar|agendar|reservar|reservame|resérvame|poner)\s+(?:una\s+)?(?:cita|sesion|sesión|consulta|hueco|turno)/i.test(text)
    || /(?:cita|sesion|sesión)\s+(?:para\s+el|el\s+próximo|el\s+proximo|este)/i.test(text);

  if (isBooking) {
    let time = '11:00';
    // Match "11:00", "11:30", "17h", "16:00", "a las 5", etc.
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:h|horas|:\d{2}|am|pm|de la mañana|de la tarde)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] || '00';
      if (/tarde|pm/i.test(text) && hour < 12) hour += 12;
      time = `${String(hour).padStart(2, '0')}:${min}`;
    }

    const isConsultation = /consulta|diseño|diseno|boceto|asesor/i.test(text);
    const appointmentType = isConsultation ? 'design_consultation' : 'tattoo_session';

    return {
      tool: 'book_appointment',
      arguments: {
        appointment_type: appointmentType,
        date: parseRelativeDate(text),
        time,
        description: content
      }
    };
  }

  // 3. Quote intent (e.g. "15 cm", "presupuesto", "precio para tatuaje de...")
  const sizeMatch = text.match(/(\d{1,3})\s*(?:cm|centimetros|centímetros)/i);
  if (sizeMatch || /cuanto cuesta|cuánto cuesta|precio|presupuesto|tarifa/i.test(text)) {
    const parsedCm = sizeMatch ? parseInt(sizeMatch[1], 10) : 10;
    const isColor = /color|rojo|azul|verde|acuarela|amarillo/i.test(text);
    const placementMatch = text.match(/en (el|la|los|las)?\s*([a-záéíóúñ]+)/i);
    const placement = placementMatch ? placementMatch[2] : '';

    return {
      tool: 'estimate_quote',
      arguments: {
        size_cm: parsedCm,
        is_color: isColor,
        placement
      }
    };
  }

  // 4. Schedule/Hours intent
  if (/horario|abierto|cuando abre|días abre|dias abre/i.test(text)) {
    return {
      tool: 'get_artist_schedule',
      arguments: {}
    };
  }

  return null;
}

/**
 * Execute a chosen tool and return its structured output
 */
export async function executeAiTool(
  toolName: string,
  toolArgs: any,
  context: ToolExecutionContext
): Promise<{
  success: boolean;
  result: any;
  displayText?: string;
  createdAppointment?: any;
  quoteData?: any;
  healingData?: any;
}> {
  const supabase = createAdminClient();

  switch (toolName) {
    case 'book_appointment': {
      try {
        const appointmentType = toolArgs.appointment_type || 'tattoo_session';
        const rawDate = toolArgs.date || '';
        const parsedDateStr = parseRelativeDate(rawDate);
        const timeStr = toolArgs.time || '11:00';
        const description = toolArgs.description || 'Cita gestionada directamente por el Asistente IA';

        // Validate date
        let startDateTime = new Date(`${parsedDateStr}T${timeStr}:00`);
        if (isNaN(startDateTime.getTime())) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const isoDate = tomorrow.toISOString().split('T')[0];
          startDateTime = new Date(`${isoDate}T${timeStr}:00`);
        }

        const durationHours = appointmentType === 'design_consultation' ? 0.75 : 3;
        const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

        // Resolve client_id
        let resolvedClientId = context.clientId;
        if (!resolvedClientId && context.clientProfileId) {
          const { data: clientRec } = await supabase
            .from('clients')
            .select('id')
            .eq('profile_id', context.clientProfileId)
            .maybeSingle();

          if (clientRec) {
            resolvedClientId = clientRec.id;
          } else {
            const { data: newClient } = await supabase
              .from('clients')
              .insert({ profile_id: context.clientProfileId })
              .select('id')
              .maybeSingle();
            if (newClient) resolvedClientId = newClient.id;
          }
        }

        const newRecord: any = {
          studio_id: context.studioId,
          artist_id: context.artistId,
          client_id: resolvedClientId || null,
          appointment_type: appointmentType,
          title: appointmentType === 'design_consultation' ? 'Consulta de Diseño (Agendada por IA)' : 'Sesión de Tatuaje (Agendada por IA)',
          description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'confirmed'
        };

        const { data: createdApp, error: appErr } = await supabase
          .from('appointments')
          .insert(newRecord)
          .select(`
            *,
            studios (id, name, address),
            artists (id, display_name)
          `)
          .single();

        if (appErr) {
          console.error('[AI Tool book_appointment Error]:', appErr);
          return {
            success: false,
            result: { error: appErr.message },
            displayText: 'Hubo un inconveniente al registrar la cita en la base de datos.'
          };
        }

        const formattedDate = startDateTime.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
        const formattedTime = startDateTime.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          success: true,
          result: createdApp,
          createdAppointment: createdApp,
          displayText: `📅 ¡Hecho! He reservado tu cita de **${appointmentType === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje'}** para el **${formattedDate} a las ${formattedTime}h**. Ya está confirmada en el calendario del tatuador.`
        };
      } catch (err: any) {
        console.error('[AI Tool book_appointment Fatal]:', err);
        return {
          success: false,
          result: { error: err.message },
          displayText: 'No se pudo procesar la reserva de cita automáticamente.'
        };
      }
    }

    case 'estimate_quote': {
      try {
        const sizeCm = Number(toolArgs.size_cm) || 10;
        const isColor = Boolean(toolArgs.is_color);
        const placement = toolArgs.placement || '';
        const isComplex = /costilla|cuello|mano|dedo|pecho|clavicula|pie|tobillo|rodilla/i.test(placement);

        const pricingRules = context.artistPricingRules || {
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

        const quoteResult = calculateQuote(pricingRules, {
          size_cm: sizeCm,
          is_color: isColor,
          is_complex_placement: isComplex,
          lang: context.lang || 'es'
        });

        return {
          success: true,
          result: quoteResult,
          quoteData: quoteResult,
          displayText: `💰 Presupuesto estimado para una pieza de ${sizeCm} cm${isColor ? ' a color' : ' en negro/grises'}${placement ? ` en ${placement}` : ''}: **${quoteResult.estimated_min}€ a ${quoteResult.estimated_max}€**.\n\n*${quoteResult.disclaimer}*`
        };
      } catch (err: any) {
        return {
          success: false,
          result: { error: err.message },
          displayText: 'No se pudo calcular el presupuesto.'
        };
      }
    }

    case 'analyze_healing': {
      try {
        const imageUrl = toolArgs.image_url;
        if (!imageUrl) return { success: false, result: { error: 'No image provided' } };

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

        const healing = await analyzeTattooHealingVision({
          imageUrl,
          artistTemplates: context.artistHealingTemplates || defaultTemplates,
          lang: context.lang || 'es'
        });

        if (context.chatId) {
          const newBadge = healing.healing_status === 'alert_infection' ? 'takeover' : 'healing_check';
          await supabase
            .from('chats')
            .update({
              status_badge: newBadge,
              ai_summary: `[Curación] ${healing.healing_status}: ${healing.analysis_text.slice(0, 60)}...`,
              updated_at: new Date().toISOString()
            })
            .eq('id', context.chatId);
        }

        return {
          success: true,
          result: healing,
          healingData: healing,
          displayText: `🔍 Diagnóstico visual de curación: **${healing.analysis_text}**\n\n${healing.suggested_action}`
        };
      } catch (err: any) {
        return {
          success: false,
          result: { error: err.message },
          displayText: 'No se pudo procesar la imagen de cicatrización.'
        };
      }
    }

    case 'request_human_takeover': {
      if (context.chatId) {
        await supabase
          .from('chats')
          .update({
            ai_enabled: false,
            status_badge: 'takeover',
            updated_at: new Date().toISOString()
          })
          .eq('id', context.chatId);
      }

      return {
        success: true,
        result: { takeover: true },
        displayText: `⚡ He avisado directamente a **${context.artistName || 'tu tatuador'}** para que revise este chat y te responda personalmente en cuanto quede libre de cabina. He puesto la IA en pausa temporal.`
      };
    }

    case 'get_artist_schedule': {
      return {
        success: true,
        result: { available: true },
        displayText: `🗓️ El estudio y ${context.artistName || 'el artista'} atienden habitualmente de Lunes a Viernes de 10:00 a 20:00 y Sábados de 11:00 a 19:00. Indícame qué día y hora te vendría bien y te agendo una consulta o sesión en este mismo chat.`
      };
    }

    default:
      return {
        success: false,
        result: { error: 'Unknown tool' }
      };
  }
}
