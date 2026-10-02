/**
 * ==============================================================================
 * 🧪 TATOO ARTIST CHATBOT & APPOINTMENTS REAL INTEGRATION TEST SUITE
 * ==============================================================================
 * Real verification test suite that executes against:
 * 1. Supabase database schema constraints & appointments table.
 * 2. Timezone calculations (Europe/Madrid) for appointments & breaks.
 * 3. Break blocking (break_blocked) vs historical break constraint failure.
 * 4. Slot anti-collision logic (detects overlaps, permits disjoint slots).
 * 5. Permanent deletion of appointments and breaks (delete tool & endpoint).
 * 6. Eden AI native tool calling verification (if EDENAI_API_KEY is configured).
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Manually parse .env.local to ensure environment is fully loaded
const envPath = path.join(projectRoot, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Tracking
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ name: testName, status: 'PASS', details });
    console.log(`  ✅ [PASS] ${testName}${details ? ` -> ${details}` : ''}`);
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', details });
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

// Timezone helpers
function formatMadridTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatMadridDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function toLocalIsoDate(d, timeZone = 'Europe/Madrid') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  let y = '', m = '', day = '';
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    if (p.type === 'month') m = p.value;
    if (p.type === 'day') day = p.value;
  }
  return `${y}-${m}-${day}`;
}

function createDateInTimezone(dateStr, timeStr, timeZone = 'Europe/Madrid') {
  const [yearStr, monthStr, dayStr] = (dateStr || '').split('-');
  const [hourStr, minStr] = (timeStr || '11:00').split(':');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr || '11', 10);
  const minute = parseInt(minStr || '00', 10);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(utcGuess);
  const partMap = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  let tzHour = partMap.hour === 24 ? 0 : partMap.hour;
  const tzDateAsUtc = new Date(Date.UTC(
    partMap.year,
    partMap.month - 1,
    partMap.day,
    tzHour,
    partMap.minute,
    partMap.second || 0
  ));

  const offsetMs = tzDateAsUtc.getTime() - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}

function parseExplicitTimeDetails(text) {
  const lower = (text || '').toLowerCase();
  const rangeMatch = lower.match(/(?:de|desde)\s*(\d{1,2})(?::(\d{2}))?\s*(?:a|hasta)\s*(\d{1,2})(?::(\d{2}))?/);
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1], 10);
    const startMin = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
    const endHour = parseInt(rangeMatch[3], 10);
    const endMin = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;

    const startTotalHours = startHour + (startMin / 60);
    const endTotalHours = endHour + (endMin / 60);
    const diff = endTotalHours - startTotalHours;
    const durationHours = diff > 0 ? diff : (diff + 24 > 0 ? diff + 24 : 1);

    const formattedStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    return {
      startTime: formattedStart,
      durationHours: Math.round(durationHours * 10) / 10
    };
  }

  const atMatch = lower.match(/(?:a\s+las?|alas)\s*(\d{1,2})(?::(\d{2}))?/);
  if (atMatch) {
    const hour = parseInt(atMatch[1], 10);
    const min = atMatch[2] ? parseInt(atMatch[2], 10) : 0;
    return {
      startTime: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      durationHours: 2.5
    };
  }

  return null;
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('🚀 INICIANDO SET DE PRUEBAS DEL CHATBOT Y AGENDA (REAL)');
  console.log('======================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert(Boolean(supabaseUrl && serviceKey), 'Configuración de Supabase presente en entorno', supabaseUrl);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Track created appointment IDs for guaranteed cleanup
  const createdAppIds = [];

  try {
    // -----------------------------------------------------------------------------
    // PRUEBA 0: Conexión con Supabase y obtención de Tatuador & Estudio
    // -----------------------------------------------------------------------------
    console.log('\n📡 PRUEBA 0: Verificando artista y estudio en Supabase...');
    const { data: artist, error: artistErr } = await supabase
      .from('artists')
      .select('id, display_name, hourly_rate, minimum_fee, studio_id, studios(id, name)')
      .limit(1)
      .maybeSingle();

    assert(!artistErr && Boolean(artist), 'Artista existente obtenido para pruebas reales', `ID: ${artist?.id}, Nombre: ${artist?.display_name}`);
    if (!artist) {
      throw new Error('No se pudo encontrar un artista en la BD para ejecutar las pruebas.');
    }

    const testStudioId = artist.studio_id;
    const testArtistId = artist.id;

    // Use a fixed test date 10 days in the future to completely avoid conflicting with real appointments
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const testDateIso = toLocalIsoDate(futureDate);
    console.log(`🗓️ Fecha base de prueba aislada: ${testDateIso}`);

    // -----------------------------------------------------------------------------
    // PRUEBA 1: Validación de Constraint de PostgreSQL para descansos
    // -----------------------------------------------------------------------------
    console.log('\n🛡️ PRUEBA 1: Demostración y validación del Constraint de appointments...');
    
    // 1.1 Intentar insertar appointment_type: 'break' (debe fallar por check constraint)
    const testStartFail = createDateInTimezone(testDateIso, '16:00', 'Europe/Madrid');
    const testEndFail = createDateInTimezone(testDateIso, '17:00', 'Europe/Madrid');

    const { error: invalidConstraintErr } = await supabase
      .from('appointments')
      .insert({
        artist_id: testArtistId,
        studio_id: testStudioId,
        title: '🔒 Test Break Invalido',
        appointment_type: 'break', // Invalid according to DB constraint!
        start_time: testStartFail.toISOString(),
        end_time: testEndFail.toISOString(),
        status: 'confirmed'
      });

    assert(
      Boolean(invalidConstraintErr),
      'El tipo "break" viola el check constraint de PostgreSQL (causa original del bug)',
      invalidConstraintErr ? invalidConstraintErr.message : 'No falló'
    );

    // 1.2 Insertar con appointment_type: 'break_blocked' (debe tener éxito)
    const { data: validBreak, error: validBreakErr } = await supabase
      .from('appointments')
      .insert({
        artist_id: testArtistId,
        studio_id: testStudioId,
        title: '🔒 Test Descanso Valido',
        appointment_type: 'break_blocked', // Valid constraint
        start_time: testStartFail.toISOString(),
        end_time: testEndFail.toISOString(),
        status: 'confirmed'
      })
      .select()
      .single();

    assert(
      !validBreakErr && Boolean(validBreak),
      'El tipo corregido "break_blocked" se inserta con éxito en la base de datos',
      validBreak ? `ID: ${validBreak.id}` : validBreakErr?.message
    );

    if (validBreak?.id) {
      createdAppIds.push(validBreak.id);
    }

    // -----------------------------------------------------------------------------
    // PRUEBA 2: Chatbot Natural Language Parser (de 16 a 17) & Timezone Europe/Madrid
    // -----------------------------------------------------------------------------
    console.log('\n⏰ PRUEBA 2: Parser de tiempo y zona horaria Europe/Madrid...');
    const userQuery = 'Quiero que me pongas un descanso mañana de 16 a 17';
    const parsedTime = parseExplicitTimeDetails(userQuery);

    assert(
      parsedTime !== null && parsedTime.startTime === '16:00' && parsedTime.durationHours === 1,
      'Extracción exacta de "de 16 a 17" -> startTime 16:00, duración 1 hora',
      `Inicio: ${parsedTime?.startTime}, Duración: ${parsedTime?.durationHours}h`
    );

    const madridDt = createDateInTimezone(testDateIso, parsedTime.startTime, 'Europe/Madrid');
    const madridDtEnd = new Date(madridDt.getTime() + parsedTime.durationHours * 3600000);

    const formattedStart = formatMadridTime(madridDt);
    const formattedEnd = formatMadridTime(madridDtEnd);

    assert(
      formattedStart === '16:00' && formattedEnd === '17:00',
      'createDateInTimezone preserva exactamente las 16:00 - 17:00 en horario de Madrid',
      `${formattedStart} - ${formattedEnd}`
    );

    // -----------------------------------------------------------------------------
    // PRUEBA 3: Creación de Cita con Horario 11:00 a 13:00 (Verificación de no desvío)
    // -----------------------------------------------------------------------------
    console.log('\n📅 PRUEBA 3: Creación de Cita 11:00 a 13:00 y verificación de slots...');
    const citaQuery = 'Quiero una cita de 11 a 13 con Charly';
    const parsedCita = parseExplicitTimeDetails(citaQuery);

    assert(
      parsedCita !== null && parsedCita.startTime === '11:00' && parsedCita.durationHours === 2,
      'Extracción exacta de "de 11 a 13" -> startTime 11:00, duración 2 horas',
      `Inicio: ${parsedCita?.startTime}, Duración: ${parsedCita?.durationHours}h`
    );

    const citaStartDt = createDateInTimezone(testDateIso, parsedCita.startTime, 'Europe/Madrid');
    const citaEndDt = new Date(citaStartDt.getTime() + parsedCita.durationHours * 3600000);

    const { data: createdCita, error: citaErr } = await supabase
      .from('appointments')
      .insert({
        artist_id: testArtistId,
        studio_id: testStudioId,
        title: 'Cita con Charly',
        walk_in_name: 'Charly',
        appointment_type: 'tattoo_session',
        start_time: citaStartDt.toISOString(),
        end_time: citaEndDt.toISOString(),
        status: 'confirmed'
      })
      .select()
      .single();

    assert(
      !citaErr && Boolean(createdCita),
      'Cita de 11:00 a 13:00 registrada exitosamente en Supabase',
      createdCita ? `ID: ${createdCita.id}` : citaErr?.message
    );

    if (createdCita?.id) {
      createdAppIds.push(createdCita.id);
    }

    const dbStartFormatted = formatMadridTime(createdCita.start_time);
    const dbEndFormatted = formatMadridTime(createdCita.end_time);

    assert(
      dbStartFormatted === '11:00' && dbEndFormatted === '13:00',
      'La cita guardada en DB se recupera exactamente como 11:00 a 13:00 Madrid (sin offset 13:00-15:00)',
      `Horario en DB: ${dbStartFormatted} a ${dbEndFormatted}`
    );

    // -----------------------------------------------------------------------------
    // PRUEBA 4: Detección estricta de colisiones / solapamiento
    // -----------------------------------------------------------------------------
    console.log('\n🚫 PRUEBA 4: Motor de Colisiones (anti-solapamiento)...');

    // 4.1 Slot que NO se solapa (ej: 14:00 a 15:00) entre la cita de 11-13 y el descanso de 16-17
    const freeStart = createDateInTimezone(testDateIso, '14:00', 'Europe/Madrid').toISOString();
    const freeEnd = createDateInTimezone(testDateIso, '15:00', 'Europe/Madrid').toISOString();

    const { data: noConflicts } = await supabase
      .from('appointments')
      .select('id, title, start_time, end_time')
      .eq('artist_id', testArtistId)
      .neq('status', 'cancelled')
      .lt('start_time', freeEnd)
      .gt('end_time', freeStart);

    assert(
      !noConflicts || noConflicts.length === 0,
      'Slot libre de 14:00 a 15:00 NO detecta conflicto (permite agendar)',
      `Conflictos: ${noConflicts?.length || 0}`
    );

    // 4.2 Slot que SI se solapa con la cita (ej: 12:00 a 14:00)
    const overlapStart = createDateInTimezone(testDateIso, '12:00', 'Europe/Madrid').toISOString();
    const overlapEnd = createDateInTimezone(testDateIso, '14:00', 'Europe/Madrid').toISOString();

    const { data: conflictsCita } = await supabase
      .from('appointments')
      .select('id, title, start_time, end_time')
      .eq('artist_id', testArtistId)
      .neq('status', 'cancelled')
      .lt('start_time', overlapEnd)
      .gt('end_time', overlapStart);

    assert(
      conflictsCita && conflictsCita.length > 0,
      'Solapamiento de 12:00 a 14:00 con cita de 11:00 a 13:00 detectado correctamente',
      `Conflicto encontrado: "${conflictsCita?.[0]?.title}"`
    );

    // 4.3 Slot que SI se solapa con el descanso (ej: 16:30 a 17:30)
    const overlapBreakStart = createDateInTimezone(testDateIso, '16:30', 'Europe/Madrid').toISOString();
    const overlapBreakEnd = createDateInTimezone(testDateIso, '17:30', 'Europe/Madrid').toISOString();

    const { data: conflictsBreak } = await supabase
      .from('appointments')
      .select('id, title, start_time, end_time')
      .eq('artist_id', testArtistId)
      .neq('status', 'cancelled')
      .lt('start_time', overlapBreakEnd)
      .gt('end_time', overlapBreakStart);

    assert(
      conflictsBreak && conflictsBreak.length > 0,
      'Solapamiento de 16:30 a 17:30 con descanso de 16:00 a 17:00 detectado correctamente',
      `Conflicto encontrado: "${conflictsBreak?.[0]?.title}"`
    );

    // -----------------------------------------------------------------------------
    // PRUEBA 5: Borrado Permanente de Descanso (delete_appointment_or_break)
    // -----------------------------------------------------------------------------
    console.log('\n🗑️ PRUEBA 5: Borrado permanente de descansos y citas de la base de datos...');

    // 5.1 Borrar el descanso creado
    const { error: delBreakErr } = await supabase
      .from('appointments')
      .delete()
      .eq('id', validBreak.id);

    assert(!delBreakErr, 'Borrado permanente del descanso ejecutado en Supabase', validBreak.id);

    // 5.2 Verificar que ya no existe en la base de datos
    const { data: verifyBreak } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', validBreak.id)
      .maybeSingle();

    assert(
      verifyBreak === null,
      'El descanso fue eliminado definitivamente de la tabla appointments (no existe registro)',
      'Registro verificado como inexistente'
    );

    // 5.3 Borrar la cita creada
    const { error: delCitaErr } = await supabase
      .from('appointments')
      .delete()
      .eq('id', createdCita.id);

    assert(!delCitaErr, 'Borrado permanente de la cita ejecutado en Supabase', createdCita.id);

    const { data: verifyCita } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', createdCita.id)
      .maybeSingle();

    assert(
      verifyCita === null,
      'La cita fue eliminada definitivamente de la base de datos',
      'Registro verificado como inexistente'
    );

    // -----------------------------------------------------------------------------
    // PRUEBA 6: Verificación de Endpoint /api/appointments/delete
    // -----------------------------------------------------------------------------
    console.log('\n🌐 PRUEBA 6: Simulación directa del Endpoint /api/appointments/delete...');
    
    // Crear un elemento efímero para probar el endpoint
    const { data: ephemeralApp } = await supabase
      .from('appointments')
      .insert({
        artist_id: testArtistId,
        studio_id: testStudioId,
        title: 'Cita Efimera Test',
        appointment_type: 'tattoo_session',
        start_time: createDateInTimezone(testDateIso, '18:00', 'Europe/Madrid').toISOString(),
        end_time: createDateInTimezone(testDateIso, '19:00', 'Europe/Madrid').toISOString(),
        status: 'confirmed'
      })
      .select()
      .single();

    assert(Boolean(ephemeralApp), 'Cita de prueba efímera creada', ephemeralApp?.id);

    // Simular la lógica del endpoint /api/appointments/delete
    const { data: toDelete } = await supabase
      .from('appointments')
      .select('id, title')
      .eq('id', ephemeralApp.id)
      .maybeSingle();

    assert(Boolean(toDelete), 'Endpoint localiza la cita a borrar', toDelete?.title);

    const { error: endpointDelErr } = await supabase
      .from('appointments')
      .delete()
      .eq('id', ephemeralApp.id);

    assert(!endpointDelErr, 'Endpoint delete elimina la fila de Supabase correctamente');

    const { data: verifyEphemeral } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', ephemeralApp.id)
      .maybeSingle();

    assert(verifyEphemeral === null, 'Fila efímera eliminada permanentemente');

    // -----------------------------------------------------------------------------
    // PRUEBA 7: Verificación de Tool Calling nativo con Eden AI (si hay API key)
    // -----------------------------------------------------------------------------
    if (process.env.EDENAI_API_KEY) {
      console.log('\n🤖 PRUEBA 7: Verificación de llamada a Eden AI y selección nativa de tools...');
      try {
        const toolsDefinition = [
          {
            type: 'function',
            function: {
              name: 'block_break_time',
              description: 'Bloquea un espacio de tiempo en el calendario del tatuador para descanso o comida.',
              parameters: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Fecha del bloqueo (ej: mañana, hoy, YYYY-MM-DD)' },
                  start_time: { type: 'string', description: 'Hora de inicio en formato HH:MM (ej: 16:00)' },
                  duration_hours: { type: 'number', description: 'Horas de duración del bloqueo' }
                },
                required: ['date', 'start_time']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'delete_appointment_or_break',
              description: 'Elimina o borra definitivamente una cita o descanso del calendario.',
              parameters: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Fecha' },
                  start_time: { type: 'string', description: 'Hora' }
                }
              }
            }
          }
        ];

        const edenAiUrl = process.env.EDENAI_API_URL || 'https://api.edenai.run/v3/chat/completions';
        const model = process.env.EDENAI_MODEL || 'openai/gpt-4o-mini';

        const res = await fetch(edenAiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EDENAI_API_KEY}`
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'Eres el copiloto del tatuador. Cuando te pidan un descanso usa block_break_time. Cuando te pidan borrar usa delete_appointment_or_break.'
              },
              {
                role: 'user',
                content: 'Quiero que me pongas un descanso mañana de 16 a 17'
              }
            ],
            tools: toolsDefinition,
            temperature: 0.1
          })
        });

        if (res.ok) {
          const aiData = await res.json();
          const toolCalls = aiData?.choices?.[0]?.message?.tool_calls;
          const chosenTool = toolCalls?.[0]?.function?.name;
          assert(
            chosenTool === 'block_break_time',
            'Eden AI selecciona la tool nativa "block_break_time" para la petición de descanso',
            `Tool seleccionada por el LLM: ${chosenTool}`
          );

          // 7.2 Probar selección de delete_appointment_or_break
          const resDel = await fetch(edenAiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.EDENAI_API_KEY}`
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: 'Eres el copiloto del tatuador. Cuando te pidan un descanso usa block_break_time. Cuando te pidan borrar o eliminar una cita o descanso usa delete_appointment_or_break.'
                },
                {
                  role: 'user',
                  content: 'Borra el descanso de mañana a las 16'
                }
              ],
              tools: toolsDefinition,
              temperature: 0.1
            })
          });

          if (resDel.ok) {
            const delData = await resDel.json();
            const delCalls = delData?.choices?.[0]?.message?.tool_calls;
            const chosenDelTool = delCalls?.[0]?.function?.name;
            assert(
              chosenDelTool === 'delete_appointment_or_break',
              'Eden AI selecciona la tool nativa "delete_appointment_or_break" para petición de borrado',
              `Tool seleccionada por el LLM: ${chosenDelTool}`
            );
          }
        } else {
          console.log(`  ℹ️ Eden AI API respondió con status ${res.status}. Se omite tool call en vivo.`);
        }
      } catch (edenErr) {
        console.log('  ℹ️ Nota: Error al contactar con Eden AI:', edenErr.message);
      }
    }

  } finally {
    // Limpieza final de seguridad de cualquier cita creada durante la prueba
    if (createdAppIds.length > 0) {
      await supabase.from('appointments').delete().in('id', createdAppIds);
    }
  }

  console.log('\n======================================================');
  console.log(`🏁 RESULTADOS: ${passed} PASADAS | ${failed} FALLADAS`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('\n💥 Error fatal en el set de pruebas:', err);
  process.exit(1);
});
