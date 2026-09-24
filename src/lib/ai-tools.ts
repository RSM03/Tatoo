import toolsConfig from './ai-tools.json';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateQuote, analyzeTattooHealingVision, PricingRules, HealingTemplates } from '@/lib/edenai';

export const AI_TOOLS = toolsConfig.tools;

export const OPENAI_TOOLS = AI_TOOLS.map(t => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }
}));

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
  userMessage?: string;
}

export interface ToolCallDecision {
  tool: string;
  arguments: any;
}

export interface ToolExecutionResult {
  success: boolean;
  tool: string;
  result: any;
  displayText?: string;
  createdAppointment?: any;
  rescheduledAppointment?: any;
  cancelledAppointmentId?: string;
  availableSlots?: Array<{
    datetime: string;
    date: string;
    time: string;
    label: string;
    appointment_type: string;
  }>;
  clientAppointments?: any[];
  quoteData?: any;
  healingData?: any;
  productsData?: any[];
}

/**
 * Format date in local YYYY-MM-DD avoiding UTC off-by-one shifts
 */
export function toLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Intelligent relative date parser for natural conversational queries
 */
export function parseRelativeDate(dateInput: string, baseDate = new Date()): string {
  const lower = (dateInput || '').toLowerCase().trim();
  const currentYear = baseDate.getFullYear();
  const todayIso = toLocalIsoDate(baseDate);

  // 1. First check explicit ISO YYYY-MM-DD
  const isoMatch = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    if (year < currentYear) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 1);
      return toLocalIsoDate(d);
    }
    return isoMatch[0];
  }

  // 2. Check weekdays FIRST (e.g. "este viernes", "el próximo lunes", "viernes por la mañana")
  // Weekday names MUST take precedence over "mañana" (morning vs tomorrow)
  const daysOfWeek = [
    { names: ['domingo', 'sunday', 'dom'], dayIdx: 0 },
    { names: ['lunes', 'monday', 'lun'], dayIdx: 1 },
    { names: ['martes', 'tuesday', 'mar'], dayIdx: 2 },
    { names: ['miercoles', 'miércoles', 'wednesday', 'mie', 'mié'], dayIdx: 3 },
    { names: ['jueves', 'thursday', 'jue'], dayIdx: 4 },
    { names: ['viernes', 'friday', 'vie'], dayIdx: 5 },
    { names: ['sabado', 'sábado', 'saturday', 'sab', 'sáb'], dayIdx: 6 }
  ];

  for (const item of daysOfWeek) {
    const matched = item.names.some(n => new RegExp(`\\b${n}\\b`, 'i').test(lower) || lower.includes(n));
    if (matched) {
      const currentDay = baseDate.getDay();
      let diff = item.dayIdx - currentDay;
      const isNextWeek = lower.includes('próximo') || lower.includes('proximo') || lower.includes('que viene');
      if (diff === 0) {
        if (isNextWeek) diff = 7;
      } else if (diff < 0) {
        diff += 7;
      } else {
        if (isNextWeek && diff <= 2) diff += 7;
      }
      const target = new Date(baseDate);
      target.setDate(target.getDate() + diff);
      return toLocalIsoDate(target);
    }
  }

  // 3. Spanish full date with month name (e.g. "9 de septiembre", "el 16 de octubre", "11 sept")
  const monthNames: Record<string, number> = {
    enero: 0, ene: 0, febrero: 1, feb: 1, marzo: 2, mar: 2, abril: 3, abr: 3,
    mayo: 4, may: 4, junio: 5, jun: 5, julio: 6, jul: 6, agosto: 7, ago: 7,
    septiembre: 8, setiembre: 8, sept: 8, sep: 8, octubre: 9, oct: 9,
    noviembre: 10, nov: 10, diciembre: 11, dic: 11
  };
  const spanishMonthMatch = lower.match(/(?:el\s+)?(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)/i);
  if (spanishMonthMatch && monthNames[spanishMonthMatch[2].toLowerCase()] !== undefined) {
    const day = parseInt(spanishMonthMatch[1], 10);
    const month = monthNames[spanishMonthMatch[2].toLowerCase()];
    const target = new Date(currentYear, month, day);
    if (toLocalIsoDate(target) < todayIso) {
      target.setFullYear(currentYear + 1);
    }
    return toLocalIsoDate(target);
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY (e.g. 09-09, 09/09, 09/09/2026)
  const euMatch = lower.match(/\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{4}))?\b/);
  if (euMatch) {
    const day = parseInt(euMatch[1], 10);
    const month = parseInt(euMatch[2], 10) - 1;
    const year = euMatch[3] ? parseInt(euMatch[3], 10) : currentYear;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      if (toLocalIsoDate(d) < todayIso && !euMatch[3]) {
        d.setFullYear(currentYear + 1);
      }
      return toLocalIsoDate(d);
    }
  }

  // 5. Relative conversational keywords (pasado mañana, hoy, standalone mañana)
  if (lower.includes('pasado mañana') || lower.includes('pasado manana')) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 2);
    return toLocalIsoDate(d);
  }
  if (lower.includes('hoy') || lower.includes('today')) {
    return todayIso;
  }
  // Standalone mañana (NOT "por la mañana" or "en la mañana")
  if (/(?:^|\s)(?:mañana|manana|tomorrow)(?:\s|$)/i.test(lower) && !/(?:por\s+la|en\s+la|de\s+la)\s+mañana/i.test(lower)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return toLocalIsoDate(d);
  }

  // 6. Day number mentioned (e.g. "el 18", "el día 22")
  const dayNumMatch = lower.match(/(?:el|dia|día)\s*(\d{1,2})\b/i);
  if (dayNumMatch) {
    const dayNum = parseInt(dayNumMatch[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      const target = new Date(baseDate);
      if (dayNum < baseDate.getDate()) {
        target.setMonth(target.getMonth() + 1);
      }
      target.setDate(dayNum);
      return toLocalIsoDate(target);
    }
  }

  // Default fallback: tomorrow
  const fallback = new Date(baseDate);
  fallback.setDate(fallback.getDate() + 1);
  return toLocalIsoDate(fallback);
}

/**
 * Extracts requested date by inspecting both tool args and raw user message.
 * Gives deterministic priority to the day requested by the user, guarding against LLM day-shift hallucinations.
 */
export function extractRequestedDate(
  preferredDate?: string,
  userMessage?: string,
  baseDate = new Date()
): { targetDate: string; isSpecificDay: boolean; requestedDayName?: string } {
  const userText = (userMessage || '').toLowerCase();
  const prefText = (preferredDate || '').toLowerCase();
  const combined = `${userText} ${prefText}`;

  // 1. Check if user specified a day of the week in userMessage or preferredDate
  const daysOfWeek = [
    { name: 'domingo', aliases: ['domingo', 'sunday', 'dom'], dayIdx: 0 },
    { name: 'lunes', aliases: ['lunes', 'monday', 'lun'], dayIdx: 1 },
    { name: 'martes', aliases: ['martes', 'tuesday', 'mar'], dayIdx: 2 },
    { name: 'miércoles', aliases: ['miercoles', 'miércoles', 'wednesday', 'mie', 'mié'], dayIdx: 3 },
    { name: 'jueves', aliases: ['jueves', 'thursday', 'jue'], dayIdx: 4 },
    { name: 'viernes', aliases: ['viernes', 'friday', 'vie'], dayIdx: 5 },
    { name: 'sábado', aliases: ['sabado', 'sábado', 'saturday', 'sab', 'sáb'], dayIdx: 6 }
  ];

  for (const item of daysOfWeek) {
    const foundInUser = item.aliases.some(a => new RegExp(`\\b${a}\\b`, 'i').test(userText) || userText.includes(a));
    const foundInPref = item.aliases.some(a => new RegExp(`\\b${a}\\b`, 'i').test(prefText) || prefText.includes(a));

    if (foundInUser || foundInPref) {
      const currentDay = baseDate.getDay();
      let diff = item.dayIdx - currentDay;
      const isNextWeek = combined.includes('próximo') || combined.includes('proximo') || combined.includes('que viene');

      if (diff === 0) {
        if (isNextWeek) diff = 7;
      } else if (diff < 0) {
        diff += 7;
      } else {
        if (isNextWeek && diff <= 2) diff += 7;
      }

      const target = new Date(baseDate);
      target.setDate(target.getDate() + diff);
      return {
        targetDate: toLocalIsoDate(target),
        isSpecificDay: true,
        requestedDayName: item.name
      };
    }
  }

  // 2. Check if user specified "hoy", "mañana", "pasado mañana"
  if (userText.includes('hoy') || prefText.includes('hoy')) {
    return { targetDate: toLocalIsoDate(baseDate), isSpecificDay: true, requestedDayName: 'hoy' };
  }
  if (userText.includes('pasado mañana') || userText.includes('pasado manana') || prefText.includes('pasado mañana') || prefText.includes('pasado manana')) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 2);
    return { targetDate: toLocalIsoDate(d), isSpecificDay: true, requestedDayName: 'pasado mañana' };
  }
  if (
    (/(?:^|\s)(?:mañana|manana)(?:\s|$)/i.test(userText) && !/(?:por\s+la|en\s+la|de\s+la)\s+mañana/i.test(userText)) ||
    (/(?:^|\s)(?:mañana|manana)(?:\s|$)/i.test(prefText) && !/(?:por\s+la|en\s+la|de\s+la)\s+mañana/i.test(prefText))
  ) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return { targetDate: toLocalIsoDate(d), isSpecificDay: true, requestedDayName: 'mañana' };
  }

  // 3. Check ISO date YYYY-MM-DD
  const isoMatch = prefText.match(/\b(\d{4})-(\d{2})-(\d{2})\b/) || userText.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    if (year >= baseDate.getFullYear()) {
      return { targetDate: isoMatch[0], isSpecificDay: true };
    }
  }

  // 4. Check Spanish month or DD/MM from preferredDate
  if (preferredDate) {
    const dateFromPref = parseRelativeDate(preferredDate, baseDate);
    if (dateFromPref) {
      return { targetDate: dateFromPref, isSpecificDay: true };
    }
  }

  // 5. Default generic query
  const defaultTarget = new Date(baseDate);
  defaultTarget.setDate(defaultTarget.getDate() + 1);
  return { targetDate: toLocalIsoDate(defaultTarget), isSpecificDay: false };
}

/**
 * Parses an explicit time (e.g. "11:00", "16:30", "a las 5 de la tarde")
 * Returns null if no explicit time is specified in the text.
 */
export function parseExplicitTime(text: string): string | null {
  const lower = (text || '').toLowerCase();

  // Pattern 1: HH:MM or H:MM (e.g. 11:30, 9:00, 16:00)
  const colMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colMatch) {
    const h = parseInt(colMatch[1], 10);
    const m = colMatch[2];
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // Pattern 2: "a las 11", "a las 5 de la tarde", "17h", "16 horas"
  const hMatch = lower.match(/(?:a\s+las|a\s+la|alas)?\s*(\d{1,2})\s*(?:h|horas|pm|am|de\s+la\s+tarde|de\s+la\s+mañana)?/i);
  if (hMatch) {
    let hour = parseInt(hMatch[1], 10);
    if (hour >= 0 && hour <= 24) {
      if ((lower.includes('tarde') || lower.includes('pm')) && hour < 12) {
        hour += 12;
      }
      // If user typed something like "15 cm", ignore it
      if (lower.includes(hour + ' cm') || lower.includes(hour + 'cm')) {
        return null;
      }
      if (lower.includes('a las ' + hour) || lower.includes('alas ' + hour) || lower.includes(hour + 'h') || lower.includes(hour + ' horas') || lower.includes(hour + ':00')) {
        return `${String(hour).padStart(2, '0')}:00`;
      }
    }
  }

  return null;
}

/**
 * Deterministic intent detector to quickly pick the appropriate tool if LLM is unavailable or for instant routing
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

  // 2. Reschedule intent (e.g. "cambiar mi cita", "modificar cita", "pasar mi cita para el lunes")
  const isReschedule = /(?:cambiar|modificar|reprogramar|posponer|mover|pasar)\s+(?:la\s+|mi\s+)?(?:cita|sesion|sesión)/i.test(text)
    || /(?:cambia|modifica|reprograma|pospón|pasa)\s+(?:mi\s+|la\s+)?cita/i.test(text)
    || /no\s+puedo\s+ir\s+(?:el|este|mañana)/i.test(text);

  if (isReschedule) {
    const hasSpecificTarget = /mañana|hoy|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|día|\d{1,2}|a\s+las/i.test(text);
    if (hasSpecificTarget) {
      const explicitTime = parseExplicitTime(text) || '11:00';
      return {
        tool: 'reschedule_appointment',
        arguments: {
          new_date: parseRelativeDate(text),
          new_time: explicitTime,
          reason: content
        }
      };
    } else {
      return {
        tool: 'get_client_appointments',
        arguments: { filter: 'upcoming', promptReason: 'reschedule' }
      };
    }
  }

  // 3. Cancel intent (e.g. "cancelar mi cita", "anular mi cita", "no voy a poder ir, cancélala")
  const isCancel = /(?:cancelar|anular|borrar|eliminar)\s+(?:mi\s+|la\s+)?(?:cita|sesion|sesión)/i.test(text)
    || /(?:cancela|anula|borra)\s+(?:mi\s+|la\s+)?cita/i.test(text)
    || /(?:anúlame|cancélame)\s+la\s+cita/i.test(text);

  if (isCancel) {
    return {
      tool: 'cancel_appointment',
      arguments: { reason: content }
    };
  }

  // 4. Client Appointments Query intent (e.g. "¿cuándo es mi cita?", "¿cuándo tengo mi próxima cita?", "¿qué citas tengo agendadas?")
  const isCheckMyApps = /(?:cuándo|cuando)\s+(?:es|tengo)\s+(?:mi\s+|alguna\s+)?(?:próxima\s+|proxima\s+)?(?:cita|sesion|sesión)/i.test(text)
    || /(?:qué|que)\s+citas\s+tengo/i.test(text)
    || /mis\s+citas/i.test(text)
    || /tengo\s+(?:alguna\s+)?cita/i.test(text);

  if (isCheckMyApps) {
    return {
      tool: 'get_client_appointments',
      arguments: { filter: 'upcoming' }
    };
  }

  // 5. Studio Opening Schedule intent (e.g. "¿qué horario tenéis en el estudio los sábados?", "horario de apertura")
  const isScheduleQuery = /(?:horario\s+(?:del\s+estudio|de\s+apertura|habitual)|a\s+qu[eé]\s+hora\s+abr[ií]s|qu[eé]\s+horario\s+ten[eé]is|cu[aá]ndo\s+abr[ií]s|horario\s+de\s+atenci[oó]n|est[aá]is\s+abiertos?)/i.test(text);
  if (isScheduleQuery) {
    return {
      tool: 'get_artist_schedule',
      arguments: {}
    };
  }

  // 6. Booking vs Availability Check intent:
  // Catches queries with typos like "que huecs tiene para este viernes", "que horarios tienes", etc.
  const hasAvailabilityQuery = /(?:huec[a-z]*|horari[a-z]*|disponib[a-z]*|libr[a-z]*|turn[a-z]*|sitio[a-z]*|fechas?|dias?|días?|citas?)/i.test(text)
    && /(?:tienes?|teneis|hay|tenga|tengas|cuándo|cuando|qué|que|cuál|cual|ver|para|este|esta|próximo|proximo|mañana|manana|miercoles|miércoles|lunes|martes|jueves|viernes|sabado|sábado|domingo)/i.test(text);

  const hasAppointmentIntent = hasAvailabilityQuery
    || /(?:quiero|puedo|deseo|pedir|solicitar|agendar|reservar|reservame|resérvame|poner|dame|darme|sacar)\s+(?:una\s+)?(?:cita|sesion|sesión|consulta|hueco|turno)/i.test(text)
    || /(?:quiero|deseo|me\s+gustaría|me\s+gustaria)?\s*(?:reservar|agendar|resérvame|reservame|agéndame|agendame)\s+(?:para|el|este|un|una)/i.test(text)
    || /(?:cita|sesion|sesión)\s+(?:para\s+el|el\s+próximo|el\s+proximo|este|mañana|hoy)/i.test(text)
    || /(?:tienes\s+hueco|tienes\s+huecos|hay\s+hueco|hay\s+huecos|disponibilidad)/i.test(text)
    || /(?:que|qué)\s+(?:huec[a-z]*|horari[a-z]*|dias|días)\s+(?:tienes|hay)/i.test(text);

  if (hasAppointmentIntent) {
    const explicitTime = parseExplicitTime(text);
    const isConsultation = /consulta|diseño|diseno|boceto|asesor/i.test(text);
    const appointmentType = isConsultation ? 'design_consultation' : 'tattoo_session';
    const { targetDate } = extractRequestedDate(undefined, text);

    // Dynamic duration based on tattoo size or description
    let customDuration: number | undefined;
    if (isConsultation) {
      customDuration = 0.75;
    } else if (/manga completa|espalda completa|brazo entero/i.test(text)) {
      customDuration = 5;
    } else if (/media manga|pieza grande|espalda|pecho completo/i.test(text)) {
      customDuration = 4;
    } else if (/pequeño|pequeno|mini|lettering|flash/i.test(text)) {
      customDuration = 1.5;
    } else if (/(\d+(?:\.\d+)?)\s*horas?/i.test(text)) {
      const match = text.match(/(\d+(?:\.\d+)?)\s*horas?/i);
      if (match) customDuration = parseFloat(match[1]);
    }

    // If explicit time is given AND user explicitly says "resérvame" or "confirma"
    if (explicitTime && /(?:resérvame|reservame|agéndame|agendame|confírmame|confirmame|ponme|quiero reservar)/i.test(text)) {
      return {
        tool: 'book_appointment',
        arguments: {
          appointment_type: appointmentType,
          duration_hours: customDuration,
          date: targetDate,
          time: explicitTime,
          description: content
        }
      };
    }

    // Otherwise, check availability and offer choices!
    return {
      tool: 'check_availability',
      arguments: {
        preferred_date: targetDate,
        appointment_type: appointmentType,
        duration_hours: customDuration,
        preferred_time_of_day: /(?:por\s+la\s+|en\s+la\s+)?tarde|pm/i.test(text) ? 'afternoon' : (/(?:por\s+la\s+|en\s+la\s+)?mañana|am/i.test(text) ? 'morning' : 'any')
      }
    };
  }

  // 6. Quote intent (e.g. "15 cm", "presupuesto", "precio para tatuaje de...")
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

  // 7. Schedule/Hours intent
  if (/horario|abierto|cuando abre|días abre|dias abre/i.test(text)) {
    return {
      tool: 'get_artist_schedule',
      arguments: {}
    };
  }

  // 8. Studio Products & Aftercare intent (Creams, second-skin, antibacterial soap, merch)
  const isProductsIntent = /(?:crema|aftercare|pomada|balsamo|bálsamo|hustle butter|balm tattoo|jabon|jabón|segunda piel|second skin|dermalize|merch|tienda|productos?|cuidados?|comprar|curar el tatuaje|jabones)/i.test(text);
  if (isProductsIntent) {
    let cat = 'all';
    if (/crema|pomada|balsamo|bálsamo|aftercare|hustle/i.test(text)) cat = 'aftercare';
    else if (/jabon|jabón|limpiar/i.test(text)) cat = 'soaps';
    else if (/segunda piel|second skin|parche|lámina|dermalize/i.test(text)) cat = 'protection';
    else if (/camiseta|merch|ropa/i.test(text)) cat = 'merch';

    return {
      tool: 'get_studio_products',
      arguments: { category: cat }
    };
  }

  return null;
}

/**
 * Helper to resolve clientId from context
 */
async function resolveClientId(supabase: any, context: ToolExecutionContext): Promise<string | null> {
  if (context.clientId) return context.clientId;
  if (!context.clientProfileId) return null;

  const { data: clientRec } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', context.clientProfileId)
    .maybeSingle();

  if (clientRec) return clientRec.id;

  const { data: newClient } = await supabase
    .from('clients')
    .insert({ profile_id: context.clientProfileId })
    .select('id')
    .maybeSingle();

  return newClient?.id || null;
}

/**
 * Execute a chosen tool and return its structured output
 */
export async function executeAiTool(
  toolName: string,
  toolArgs: any,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const supabase = createAdminClient();

  switch (toolName) {
    case 'check_availability': {
      try {
        const appointmentType = toolArgs.appointment_type || 'tattoo_session';
        const { targetDate, isSpecificDay, requestedDayName } = extractRequestedDate(
          toolArgs.preferred_date,
          context.userMessage
        );
        const parsedDateStr = targetDate;
        const durationHours = toolArgs.duration_hours ? Number(toolArgs.duration_hours) : (appointmentType === 'design_consultation' ? 0.75 : 2.5);

        // Fetch existing appointments for this artist starting from target date
        const startDateObj = new Date(`${parsedDateStr}T00:00:00`);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + (isSpecificDay ? 1 : 4));

        const { data: existingApps } = await supabase
          .from('appointments')
          .select('id, start_time, end_time, status')
          .eq('artist_id', context.artistId)
          .neq('status', 'cancelled')
          .gte('start_time', startDateObj.toISOString())
          .lte('start_time', endDateObj.toISOString());

        const busyList = (existingApps || []).map((a: any) => ({
          start: new Date(a.start_time).getTime(),
          end: new Date(a.end_time).getTime()
        }));

        // Candidate slot hours
        let slotCandidates = appointmentType === 'design_consultation'
          ? ['10:30', '11:30', '12:30', '16:30', '17:30', '18:30']
          : ['10:00', '11:00', '16:00', '17:00'];

        const preferredTime = toolArgs.preferred_time_of_day || 'any';
        if (preferredTime === 'morning') {
          slotCandidates = slotCandidates.filter(t => parseInt(t.split(':')[0], 10) < 14);
        } else if (preferredTime === 'afternoon') {
          slotCandidates = slotCandidates.filter(t => parseInt(t.split(':')[0], 10) >= 15);
        }

        const availableSlots: Array<{
          datetime: string;
          date: string;
          time: string;
          label: string;
          appointment_type: string;
        }> = [];

        const nowMs = Date.now();

        // If user asked for a specific day (e.g. "este viernes"), only check that single day!
        const maxDaysToCheck = isSpecificDay ? 1 : 3;

        for (let dayOffset = 0; dayOffset < maxDaysToCheck && availableSlots.length < 4; dayOffset++) {
          const curDay = new Date(startDateObj);
          curDay.setDate(curDay.getDate() + dayOffset);

          // Skip Sundays (day 0)
          if (curDay.getDay() === 0) continue;

          const dateIso = toLocalIsoDate(curDay);

          for (const timeStr of slotCandidates) {
            if (availableSlots.length >= 4) break;

            const slotStart = new Date(`${dateIso}T${timeStr}:00`).getTime();
            const slotEnd = slotStart + durationHours * 60 * 60 * 1000;

            // Don't offer past slots
            if (slotStart <= nowMs + 30 * 60 * 1000) continue;

            // Check collision with busy list
            const hasOverlap = busyList.some((b: any) => slotStart < b.end && slotEnd > b.start);
            if (!hasOverlap) {
              const dayShort = new Date(slotStart).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
              });

              availableSlots.push({
                datetime: new Date(slotStart).toISOString(),
                date: dateIso,
                time: timeStr,
                label: `${dayShort} ${timeStr}h`,
                appointment_type: appointmentType
              });
            }
          }
        }

        const typeLabel = appointmentType === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje';
        const targetDayFormatted = startDateObj.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });

        let displayText = '';
        if (availableSlots.length > 0) {
          displayText = `🗓️ He consultado la agenda de **${context.artistName || 'el tatuador'}** para **${typeLabel}** para el **${targetDayFormatted}** y tengo estos huecos libres disponibles:\n\n` +
            availableSlots.map(s => `- **${s.label}**`).join('\n') +
            '\n\n¿Cuál de estas opciones prefieres? Haz clic en uno de los botones para confirmarlo al instante o indícame si buscas otra hora.';
        } else if (isSpecificDay) {
          displayText = `Actualmente no quedan huecos libres para **${typeLabel}** el **${targetDayFormatted}**. ¿Te gustaría consultar para el día siguiente o la próxima semana?`;
        } else {
          displayText = `Actualmente no encuentro huecos libres inmediatos en las fechas solicitadas para ${typeLabel}. ¿Te gustaría que busquemos la semana que viene o prefieres consultar otro día?`;
        }

        return {
          success: true,
          tool: 'check_availability',
          result: { available_slots: availableSlots, date: parsedDateStr },
          availableSlots,
          displayText
        };
      } catch (err: any) {
        console.error('[AI Tool check_availability Error]:', err);
        return {
          success: false,
          tool: 'check_availability',
          result: { error: err.message },
          displayText: 'Hubo un inconveniente al consultar la disponibilidad de la agenda.'
        };
      }
    }

    case 'book_appointment': {
      try {
        const appointmentType = toolArgs.appointment_type || 'tattoo_session';
        const { targetDate } = extractRequestedDate(toolArgs.date, context.userMessage);
        const parsedDateStr = targetDate;
        const timeStr = parseExplicitTime(context.userMessage || '') || toolArgs.time || '11:00';
        const description = toolArgs.description || 'Cita confirmada a través del Asistente IA';

        const startDateTime = new Date(`${parsedDateStr}T${timeStr}:00`);
        if (isNaN(startDateTime.getTime())) {
          return {
            success: false,
            tool: 'book_appointment',
            result: { error: 'Fecha u hora no válida' },
            displayText: 'La fecha u hora indicada no es válida. Por favor, indícame un día y hora concretos.'
          };
        }

        const durationHours = toolArgs.duration_hours ? Number(toolArgs.duration_hours) : (appointmentType === 'design_consultation' ? 0.75 : 2.5);
        const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

        // Collision check
        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id, start_time, end_time')
          .eq('artist_id', context.artistId)
          .neq('status', 'cancelled')
          .lt('start_time', endDateTime.toISOString())
          .gt('end_time', startDateTime.toISOString());

        if (conflicts && conflicts.length > 0) {
          return {
            success: false,
            tool: 'book_appointment',
            result: { error: 'Horario ocupado', conflict: true },
            displayText: `⚠️ Lo siento, el horario solicitado (${timeStr}h del ${parsedDateStr}) ya se encuentra reservado en la agenda de ${context.artistName || 'el artista'}. ¿Te gustaría que revisemos otros huecos libres?`
          };
        }

        // Resolve client_id
        const resolvedClientId = await resolveClientId(supabase, context);

        const newRecord: any = {
          studio_id: context.studioId,
          artist_id: context.artistId,
          client_id: resolvedClientId,
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
            tool: 'book_appointment',
            result: { error: appErr.message },
            displayText: 'Hubo un error al registrar la cita en la base de datos.'
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
          tool: 'book_appointment',
          result: createdApp,
          createdAppointment: createdApp,
          displayText: `📅 ¡Cita confirmada con éxito! He agendado tu **${appointmentType === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje'}** para el **${formattedDate} a las ${formattedTime}h** con **${context.artistName || 'el tatuador'}**. Ya está reflejada en tu panel de citas.`
        };
      } catch (err: any) {
        console.error('[AI Tool book_appointment Fatal]:', err);
        return {
          success: false,
          tool: 'book_appointment',
          result: { error: err.message },
          displayText: 'No se pudo procesar la reserva de cita automáticamente.'
        };
      }
    }

    case 'get_client_appointments': {
      try {
        const resolvedClientId = await resolveClientId(supabase, context);
        if (!resolvedClientId) {
          return {
            success: false,
            tool: 'get_client_appointments',
            result: { appointments: [] },
            displayText: 'No encontré tu ficha de cliente registrada para consultar citas.'
          };
        }

        const query = supabase
          .from('appointments')
          .select(`
            *,
            studios (id, name, address),
            artists (id, display_name)
          `)
          .eq('client_id', resolvedClientId)
          .neq('status', 'cancelled')
          .order('start_time', { ascending: true });

        if (toolArgs.filter !== 'all') {
          query.gte('end_time', new Date().toISOString());
        }

        const { data: apps, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        if (!apps || apps.length === 0) {
          return {
            success: true,
            tool: 'get_client_appointments',
            result: { appointments: [] },
            clientAppointments: [],
            displayText: 'Actualmente no tienes ninguna cita futura agendada. Si quieres, dime qué día te gustaría venir y te muestro huecos libres.'
          };
        }

        const listText = apps.map((a: any) => {
          const s = new Date(a.start_time);
          const dStr = s.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
          const tStr = s.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          const typeStr = a.appointment_type === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje';
          return `- **${typeStr}**: ${dStr} a las ${tStr}h con ${a.artists?.display_name || 'el artista'} (${a.status === 'confirmed' ? 'Confirmada' : 'Pendiente'})`;
        }).join('\n');

        const isForReschedule = toolArgs.promptReason === 'reschedule';
        const promptQuestion = isForReschedule
          ? '¿Para qué día y hora te vendría bien reprogramarla? O si prefieres, dime qué día tienes pensado y te muestro los huecos libres disponibles.'
          : '¿Deseas modificar, reprogramar o cancelar alguna de ellas?';

        return {
          success: true,
          tool: 'get_client_appointments',
          result: { appointments: apps },
          clientAppointments: apps,
          displayText: `📅 Tienes agendadas las siguientes citas:\n\n${listText}\n\n${promptQuestion}`
        };
      } catch (err: any) {
        console.error('[AI Tool get_client_appointments Error]:', err);
        return {
          success: false,
          tool: 'get_client_appointments',
          result: { error: err.message },
          displayText: 'No se pudieron consultar tus citas en este momento.'
        };
      }
    }

    case 'reschedule_appointment': {
      try {
        const resolvedClientId = await resolveClientId(supabase, context);
        const { targetDate } = extractRequestedDate(toolArgs.new_date, context.userMessage);
        const parsedDateStr = targetDate;
        const timeStr = parseExplicitTime(context.userMessage || '') || toolArgs.new_time || '11:00';

        // 1. Locate appointment to reschedule
        let targetApp: any = null;

        if (toolArgs.appointment_id) {
          const { data: found } = await supabase
            .from('appointments')
            .select('*, artists(display_name)')
            .eq('id', toolArgs.appointment_id)
            .maybeSingle();
          targetApp = found;
        } else if (resolvedClientId) {
          // Fetch upcoming active appointment for this client
          const { data: upcoming } = await supabase
            .from('appointments')
            .select('*, artists(display_name)')
            .eq('client_id', resolvedClientId)
            .neq('status', 'cancelled')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });

          if (!upcoming || upcoming.length === 0) {
            return {
              success: false,
              tool: 'reschedule_appointment',
              result: { error: 'No active upcoming appointment found' },
              displayText: 'No he encontrado ninguna cita próxima activa en tu cuenta para poder reprogramar.'
            };
          }

          if (upcoming.length === 1) {
            targetApp = upcoming[0];
          } else {
            // If multiple, pick the one matching artist or the earliest
            const forThisArtist = upcoming.find((u: any) => u.artist_id === context.artistId);
            targetApp = forThisArtist || upcoming[0];
          }
        }

        if (!targetApp) {
          return {
            success: false,
            tool: 'reschedule_appointment',
            result: { error: 'Cita no encontrada' },
            displayText: 'No pude identificar la cita que deseas modificar. ¿Podrías indicarme qué cita o fecha tienes agendada?'
          };
        }

        // 2. Compute new start & end time
        const newStart = new Date(`${parsedDateStr}T${timeStr}:00`);
        if (isNaN(newStart.getTime())) {
          return {
            success: false,
            tool: 'reschedule_appointment',
            result: { error: 'Nueva fecha/hora inválida' },
            displayText: 'La nueva fecha u hora indicada no es válida.'
          };
        }

        const origDurationMs = new Date(targetApp.end_time).getTime() - new Date(targetApp.start_time).getTime();
        const durationMs = origDurationMs > 0 ? origDurationMs : (targetApp.appointment_type === 'design_consultation' ? 45 * 60 * 1000 : 180 * 60 * 1000);
        const newEnd = new Date(newStart.getTime() + durationMs);

        // 3. Collision check (excluding current appointment)
        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id')
          .eq('artist_id', targetApp.artist_id)
          .neq('id', targetApp.id)
          .neq('status', 'cancelled')
          .lt('start_time', newEnd.toISOString())
          .gt('end_time', newStart.toISOString());

        if (conflicts && conflicts.length > 0) {
          return {
            success: false,
            tool: 'reschedule_appointment',
            result: { error: 'Horario ocupado', conflict: true },
            displayText: `⚠️ Lo siento, el horario solicitado (${timeStr}h del ${parsedDateStr}) coincide con otra cita del artista. Por favor, indícame otra hora o fecha para reprogramarla.`
          };
        }

        // 4. Update appointment
        const reasonText = toolArgs.reason ? ` (Reprogramada: ${toolArgs.reason})` : ' (Reprogramada por cliente vía IA)';
        const { data: updatedApp, error: updateErr } = await supabase
          .from('appointments')
          .update({
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            status: 'confirmed',
            description: (targetApp.description || '') + reasonText,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetApp.id)
          .select(`
            *,
            studios (id, name, address),
            artists (id, display_name)
          `)
          .single();

        if (updateErr) throw updateErr;

        const formattedDate = newStart.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
        const formattedTime = newStart.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          success: true,
          tool: 'reschedule_appointment',
          result: updatedApp,
          rescheduledAppointment: updatedApp,
          displayText: `🔄 ¡Cita reprogramada con éxito! Tu cita con **${targetApp.artists?.display_name || context.artistName}** ha sido cambiada al **${formattedDate} a las ${formattedTime}h**. El calendario del artista ya está actualizado.`
        };
      } catch (err: any) {
        console.error('[AI Tool reschedule_appointment Error]:', err);
        return {
          success: false,
          tool: 'reschedule_appointment',
          result: { error: err.message },
          displayText: 'Hubo un inconveniente al reprogramar tu cita.'
        };
      }
    }

    case 'cancel_appointment': {
      try {
        const resolvedClientId = await resolveClientId(supabase, context);
        let targetAppId = toolArgs.appointment_id;

        if (!targetAppId && resolvedClientId) {
          const { data: upcoming } = await supabase
            .from('appointments')
            .select('id, start_time, artists(display_name)')
            .eq('client_id', resolvedClientId)
            .neq('status', 'cancelled')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (upcoming) targetAppId = upcoming.id;
        }

        if (!targetAppId) {
          return {
            success: false,
            tool: 'cancel_appointment',
            result: { error: 'No upcoming appointment found' },
            displayText: 'No encontré ninguna cita activa próxima para cancelar.'
          };
        }

        const { data: cancelledApp, error: cancelErr } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            description: (toolArgs.reason ? `Cancelada por cliente: ${toolArgs.reason}` : 'Cancelada por cliente a través del chat'),
            updated_at: new Date().toISOString()
          })
          .eq('id', targetAppId)
          .select('id, start_time, artists(display_name)')
          .single();

        if (cancelErr) throw cancelErr;

        return {
          success: true,
          tool: 'cancel_appointment',
          result: { cancelled_id: targetAppId },
          cancelledAppointmentId: targetAppId,
          displayText: '❌ Tu cita ha sido cancelada correctamente en el sistema y el hueco ha quedado liberado en la agenda del tatuador. Cuando quieras volver a agendar, no dudes en escribirme.'
        };
      } catch (err: any) {
        console.error('[AI Tool cancel_appointment Error]:', err);
        return {
          success: false,
          tool: 'cancel_appointment',
          result: { error: err.message },
          displayText: 'Hubo un error al cancelar la cita.'
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
          tool: 'estimate_quote',
          result: quoteResult,
          quoteData: quoteResult,
          displayText: `💰 Presupuesto estimado para una pieza de ${sizeCm} cm${isColor ? ' a color' : ' en negro/grises'}${placement ? ` en ${placement}` : ''}: **${quoteResult.estimated_min}€ a ${quoteResult.estimated_max}€**.\n\n*${quoteResult.disclaimer}*`
        };
      } catch (err: any) {
        return {
          success: false,
          tool: 'estimate_quote',
          result: { error: err.message },
          displayText: 'No se pudo calcular el presupuesto.'
        };
      }
    }

    case 'analyze_healing': {
      try {
        const imageUrl = toolArgs.image_url;
        if (!imageUrl) return { success: false, tool: 'analyze_healing', result: { error: 'No image provided' } };

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
          tool: 'analyze_healing',
          result: healing,
          healingData: healing,
          displayText: `🔍 Diagnóstico visual de curación: **${healing.analysis_text}**\n\n${healing.suggested_action}`
        };
      } catch (err: any) {
        return {
          success: false,
          tool: 'analyze_healing',
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
        tool: 'request_human_takeover',
        result: { takeover: true },
        displayText: `⚡ He avisado directamente a **${context.artistName || 'tu tatuador'}** para que revise este chat y te responda personalmente en cuanto quede libre de cabina. He puesto la IA en pausa temporal.`
      };
    }

    case 'get_artist_schedule': {
      return {
        success: true,
        tool: 'get_artist_schedule',
        result: { available: true },
        displayText: `🗓️ El estudio y ${context.artistName || 'el artista'} atienden de Lunes a Viernes de 10:00 a 20:00 y Sábados de 11:00 a 19:00. ¿Qué día te gustaría venir para consultar disponibilidad?`
      };
    }

    case 'get_studio_products': {
      try {
        const category = toolArgs.category || 'all';
        let query = supabase.from('products').select('*');
        if (context.studioId) {
          query = query.eq('studio_id', context.studioId);
        }
        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const { data: products } = await query;
        let productList = products || [];

        // Curated fallback seed if DB table has not been initialized
        if (productList.length === 0) {
          const SEED_CATALOG = [
            { name: 'Balm Tattoo Original (30g)', price: 12.0, category: 'aftercare', description: 'Pomada cicatrizante con pantenol y dexpantenol para regeneración dérmica rápida.', in_stock: true },
            { name: 'Hustle Butter Deluxe (150ml)', price: 24.5, category: 'aftercare', description: 'Manteca 100% vegana con karité y mango. Calma el picor y realza los colores.', in_stock: true },
            { name: 'Jabón Espuma Antibacteriano Blue Soap (250ml)', price: 14.0, category: 'soaps', description: 'Jabón antiséptico suave con pH neutro especial para curar tatuajes recientes.', in_stock: true },
            { name: 'Láminas Second-Skin Dermalize Pro (Pack 5)', price: 15.0, category: 'protection', description: 'Película protectora impermeable y transpirable de grado médico.', in_stock: true },
            { name: 'Camiseta Oficial Atelier Blackwork (Edición Limitada)', price: 28.0, category: 'merch', description: '100% algodón orgánico pesado con serigrafía exclusiva del estudio.', in_stock: true }
          ];
          productList = category === 'all' ? SEED_CATALOG : SEED_CATALOG.filter(p => p.category === category);
        }

        const itemsText = productList.map(p => `• **${p.name}** (${p.price}€): ${p.description}`).join('\n');
        const displayText = `🛍️ **Productos de Cuidado & Tienda del Estudio:**\n\n${itemsText}\n\nLos tenemos disponibles en el estudio para que te los lleves el día de tu cita. Si quieres, ¡puedo pedirle a ${context.artistName || 'el artista'} que te reserve uno en recepción!`;

        return {
          success: true,
          tool: 'get_studio_products',
          result: { products: productList },
          productsData: productList,
          displayText
        };
      } catch (err: any) {
        return {
          success: false,
          tool: 'get_studio_products',
          result: { error: err.message },
          displayText: 'No se pudieron consultar los productos en este momento.'
        };
      }
    }

    default:
      return {
        success: false,
        tool: toolName,
        result: { error: 'Unknown tool' }
      };
  }
}
