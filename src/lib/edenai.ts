/**
 * ==============================================================================
 * 🧠 EDEN AI MASTER CLIENT (openai/gpt-4o-mini)
 * Handles conversational chat, dynamic quote estimation, vision healing analysis,
 * and context compression.
 * ==============================================================================
 */

export interface ChatToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string | null | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface CallEdenAIResponse {
  content: string | null;
  tool_calls?: ChatToolCall[];
}

export interface PricingRules {
  minimum_fee: number;
  hourly_rate: number;
  size_rates: {
    small: { max_cm: number; base_price: number };
    medium: { max_cm: number; base_price: number };
    large: { max_cm: number; base_price: number };
    xlarge: { max_cm: number; base_price: number };
  };
  color_multiplier: number;
  complex_placement_multiplier: number;
  disclaimer_es?: string;
  disclaimer_en?: string;
}

export interface HealingTemplates {
  normal: { es: string; en: string };
  redness_mild: { es: string; en: string };
  alert_infection: { es: string; en: string };
}

export interface QuoteCalculationResult {
  estimated_min: number;
  estimated_max: number;
  size_cm: number;
  is_color: boolean;
  is_complex_placement: boolean;
  disclaimer: string;
}

/**
 * Calculates budget strictly following the artist's configured rules
 */
export function calculateQuote(
  rules: PricingRules,
  options: {
    size_cm: number;
    is_color?: boolean;
    is_complex_placement?: boolean;
    lang?: 'es' | 'en';
  }
): QuoteCalculationResult {
  const { size_cm, is_color = false, is_complex_placement = false, lang = 'es' } = options;

  let basePrice = rules.minimum_fee;

  if (size_cm <= rules.size_rates.small.max_cm) {
    basePrice = rules.size_rates.small.base_price;
  } else if (size_cm <= rules.size_rates.medium.max_cm) {
    basePrice = rules.size_rates.medium.base_price;
  } else if (size_cm <= rules.size_rates.large.max_cm) {
    basePrice = rules.size_rates.large.base_price;
  } else {
    basePrice = rules.size_rates.xlarge.base_price;
  }

  let finalPrice = basePrice;
  if (is_color) {
    finalPrice *= rules.color_multiplier || 1.25;
  }
  if (is_complex_placement) {
    finalPrice *= rules.complex_placement_multiplier || 1.15;
  }

  // Create an estimated realistic bracket (e.g. 150€ - 180€)
  const min = Math.round(finalPrice * 0.95);
  const max = Math.round(finalPrice * 1.15);

  const disclaimer = lang === 'en'
    ? (rules.disclaimer_en || "⚠️ This quote is an approximation. The final price will be confirmed in person based on final artwork complexity.")
    : (rules.disclaimer_es || "⚠️ Este presupuesto es una estimación aproximada. El precio final se confirmará en persona según el detalle definitivo.");

  return {
    estimated_min: min,
    estimated_max: max,
    size_cm,
    is_color,
    is_complex_placement,
    disclaimer
  };
}

/**
 * Dispatches a completion request to Eden AI with native OpenAI tools support
 */
export async function callEdenAIWithTools(params: {
  messages: ChatMessage[];
  instructions?: string;
  tools?: any[];
  temperature?: number;
  max_output_tokens?: number;
}): Promise<CallEdenAIResponse> {
  const apiKey = process.env.EDENAI_API_KEY;
  const apiUrl = process.env.EDENAI_API_URL || 'https://api.edenai.run/v3/chat/completions';
  const model = process.env.EDENAI_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    console.warn('[EdenAI] EDENAI_API_KEY is not configured in environment. Using smart simulation mode.');
    return { content: generateFallbackReply(params.messages) };
  }

  try {
    const payload: any = {
      model,
      messages: params.messages,
      stream: false,
      temperature: params.temperature ?? 0.7,
    };

    if (params.instructions) {
      payload.instructions = params.instructions;
    }
    if (params.tools && params.tools.length > 0) {
      payload.tools = params.tools;
    }
    if (params.max_output_tokens) {
      payload.max_output_tokens = params.max_output_tokens;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-edenai-metadata': 'enabled'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EdenAI] API error status:', response.status, errorText);
      return { content: generateFallbackReply(params.messages) };
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;

    // Check if tool_calls returned
    if (message?.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      return {
        content: message.content || null,
        tool_calls: message.tool_calls
      };
    }

    // Support both standard OpenAI format and EdenAI envelope
    const reply = message?.content 
      || data?.openai?.generated_text 
      || data?.generated_text
      || (typeof data === 'string' ? data : null);

    return { content: reply || generateFallbackReply(params.messages) };
  } catch (err: any) {
    console.error('[EdenAI] Network error:', err.message);
    return { content: generateFallbackReply(params.messages) };
  }
}

/**
 * Convenience helper that calls Eden AI and returns string content
 */
export async function callEdenAI(params: {
  messages: ChatMessage[];
  instructions?: string;
  temperature?: number;
  max_output_tokens?: number;
}): Promise<string> {
  const res = await callEdenAIWithTools(params);
  return res.content || '';
}

/**
 * Analyzes tattoo healing photo with Vision model
 */
export async function analyzeTattooHealingVision(params: {
  imageUrl: string;
  artistTemplates: HealingTemplates;
  lang?: 'es' | 'en';
}): Promise<{
  healing_status: 'normal' | 'redness_mild' | 'alert_infection';
  analysis_text: string;
  suggested_action: string;
}> {
  const { imageUrl, artistTemplates, lang = 'es' } = params;

  const prompt = `Analiza la imagen de este tatuaje en proceso de cicatrización con criterio profesional y preventivo.
Determina en cuál de las siguientes 3 categorías encaja:
1. "normal": Cicatrización sana, descamación natural leve o piel en regeneración sin inflamación severa.
2. "redness_mild": Enrojecimiento moderado típico de los primeros 2 a 4 días tras tatuar, sin secreciones extrañas.
3. "alert_infection": Presencia de pus (amarillo/verdoso), ampollas, hinchazón excesiva, brillo anómalo con supuración o calor evidente.

Devuelve OBLIGATORIAMENTE tu respuesta en formato JSON con la siguiente estructura exacta:
{
  "status": "normal" | "redness_mild" | "alert_infection",
  "reason": "Explicación breve de lo que se observa visualmente en el tatuaje"
}`;

  try {
    const visionMessages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ];

    const visionReply = await callEdenAI({
      messages: visionMessages,
      temperature: 0.2
    });

    let detectedStatus: 'normal' | 'redness_mild' | 'alert_infection' = 'normal';
    let reason = 'Evolución visual normal del proceso de cicatrización.';

    try {
      const jsonMatch = visionReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (['normal', 'redness_mild', 'alert_infection'].includes(parsed.status)) {
          detectedStatus = parsed.status;
          reason = parsed.reason || reason;
        }
      }
    } catch {
      if (visionReply.toLowerCase().includes('pus') || visionReply.toLowerCase().includes('infecci') || visionReply.toLowerCase().includes('infection')) {
        detectedStatus = 'alert_infection';
      } else if (visionReply.toLowerCase().includes('rojo') || visionReply.toLowerCase().includes('redness')) {
        detectedStatus = 'redness_mild';
      }
    }

    // Match with the artist's configured template message
    const artistTemplateMsg = artistTemplates[detectedStatus]?.[lang] 
      || artistTemplates[detectedStatus]?.['es']
      || "Continúa con las pautas de cuidado indicadas por tu tatuador.";

    return {
      healing_status: detectedStatus,
      analysis_text: reason,
      suggested_action: artistTemplateMsg
    };
  } catch (err: any) {
    console.error('[EdenAI Vision] Error analyzing healing photo:', err);
    return {
      healing_status: 'normal',
      analysis_text: 'No se pudo completar el análisis visual automático.',
      suggested_action: artistTemplates.normal[lang] || artistTemplates.normal.es
    };
  }
}

/**
 * Generates a crisp 1-line summary of the conversation for the tattoo artist's inbox
 */
export async function generateChatSummary(messages: ChatMessage[], lang: 'es' | 'en' = 'es'): Promise<string> {
  const conversationSnippet = messages
    .slice(-6)
    .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : '[Imagen/Adjunto]'}`)
    .join('\n');

  const prompt = lang === 'en'
    ? `Generate a very concise 1-sentence summary (max 14 words) of what the client is asking for (e.g. "Asking for a 12cm wolf design on arm, blackwork style") based on this chat:\n${conversationSnippet}`
    : `Genera un resumen ultra conciso de 1 frase (máximo 14 palabras) de lo que busca el cliente (ej: "Pide presupuesto para lobo de 12cm en antebrazo blackwork") basado en este chat:\n${conversationSnippet}`;

  try {
    const summary = await callEdenAI({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_output_tokens: 60
    });
    return summary.replace(/^["']|["']$/g, '').trim();
  } catch {
    return lang === 'en' ? 'Client consultation in progress' : 'Consulta de cliente en curso';
  }
}

/**
 * Helper to compress context when messages exceed token budget
 */
export function compressContext(messages: ChatMessage[], maxMessagesToKeep = 12): ChatMessage[] {
  if (messages.length <= maxMessagesToKeep) return messages;

  const firstMsg = messages[0];
  const recentMessages = messages.slice(-maxMessagesToKeep);

  return [firstMsg, ...recentMessages];
}

/**
 * Fallback natural replies when Eden AI API key is not yet set in .env
 */
function generateFallbackReply(messages: ChatMessage[]): string {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const text = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content.toLowerCase() : '';

  if (text.includes('precio') || text.includes('cuanto') || text.includes('costar') || text.includes('presupuesto') || text.includes('quote') || text.includes('price')) {
    return "¡Hola! Para darte una estimación precisa según las tarifas del tatuador, indícame por favor:\n1. Medidas aproximadas en cm (alto x ancho)\n2. Zona del cuerpo donde quieres tatuarte\n3. Si lo quieres en blanco y negro o a color\n\n*Nota: Cualquier presupuesto facilitado por aquí es orientativo y se confirmará en persona con el artista.*";
  }

  if (text.includes('curaci') || text.includes('cura') || text.includes('pomada') || text.includes('pus') || text.includes('infect') || text.includes('heal')) {
    return "Para revisar cómo está cicatrizando tu tatuaje, puedes subir una foto nítida y con buena luz directamente en este chat pulsando en el icono de la cámara 📷. Analizaremos el estado y te daremos las pautas personalizadas de tu tatuador.";
  }

  if (text.includes('cita') || text.includes('horario') || text.includes('reservar') || text.includes('book')) {
    return "Puedes consultar la disponibilidad y reservar cita directamente desde la pestaña 'Reservar Cita' de tu panel. Disponemos de citas para diseño y sesiones completas de tatuaje.";
  }

  return "¡Hola! Soy el asistente virtual del estudio. Puedo ayudarte a calcular presupuestos aproximados según el tamaño y diseño, revisar la curación de tu tatuaje si nos envías una foto, o ayudarte a gestionar tu cita. El tatuador también puede intervenir directamente en este chat en cualquier momento.";
}
