-- =============================================================================
-- DATOS DE PRUEBA DE TATTOO AI
-- Rellena estudios, tatuadores, citas, galería y reseñas para probar la web entera.
--
-- ANTES DE EJECUTARLO:
--   1. Registra en la web (botón "Registrarse") las cuentas de prueba:
--        - una cuenta de ESTUDIO   (por ejemplo  tuemail+estudio1@gmail.com)
--        - otra cuenta de ESTUDIO  (opcional,     tuemail+estudio2@gmail.com)
--        - una cuenta de CLIENTE   (opcional,     tuemail+cliente@gmail.com)
--      Con Gmail, lo que va tras el "+" llega igualmente a tu correo.
--   2. Escribe esos emails en las tres líneas marcadas con  <-- CAMBIA  (deja '' las que no uses).
--   3. Pega todo el archivo en Supabase > SQL Editor y pulsa "Run".
--
-- Se puede ejecutar varias veces: no duplica nada.
-- Para borrarlo todo después: supabase/seed_pruebas_borrar.sql
-- =============================================================================
DO $$
DECLARE
  email_estudio_1 TEXT := 'CAMBIA-ESTO+estudio1@gmail.com';   -- <-- CAMBIA
  email_estudio_2 TEXT := 'CAMBIA-ESTO+estudio2@gmail.com';   -- <-- CAMBIA (o '')
  email_cliente   TEXT := 'CAMBIA-ESTO+cliente@gmail.com';    -- <-- CAMBIA (o '')

  tz CONSTANT TEXT := 'Europe/Madrid';
  v_owner UUID;
  v_studio1 UUID;
  v_studio2 UUID;
  v_lucia UUID;
  v_dani UUID;
  v_sara UUID;
  v_marco UUID;
  v_elena UUID;
  v_client UUID;
BEGIN
  -- Las cuentas de prueba quedan confirmadas (no hace falta abrir el email de confirmación)
  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE email IN (email_estudio_1, email_estudio_2, email_cliente);

  -- ===========================================================================
  -- ESTUDIO 1: Aguja Negra (Madrid) con tres tatuadores
  -- ===========================================================================
  SELECT id INTO v_owner FROM auth.users WHERE email = email_estudio_1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'No encuentro la cuenta de estudio "%". Regístrala primero en la web y revisa el email.', email_estudio_1;
  END IF;
  SELECT id INTO v_studio1 FROM public.studios WHERE owner_id = v_owner ORDER BY created_at LIMIT 1;
  IF v_studio1 IS NULL THEN
    RAISE EXCEPTION 'La cuenta "%" no es de estudio. Regístrala eligiendo "Estudio de tatuaje".', email_estudio_1;
  END IF;

  UPDATE public.studios
     SET name = 'Aguja Negra', address = 'Calle del Pez 12', city = 'Madrid', phone = '+34 910 000 001',
         bio = 'Estudio de fine line, blackwork y japonés en pleno Malasaña.',
         latitude = 40.4237, longitude = -3.7062
   WHERE id = v_studio1;

  -- El tatuador principal es el que se creó con la cuenta; los demás se añaden (como desde el panel del estudio)
  SELECT id INTO v_lucia FROM public.artists WHERE studio_id = v_studio1 AND profile_id = v_owner ORDER BY created_at LIMIT 1;
  IF v_lucia IS NULL THEN
    INSERT INTO public.artists (profile_id, studio_id, display_name) VALUES (v_owner, v_studio1, 'Lucía Ortega') RETURNING id INTO v_lucia;
  END IF;
  UPDATE public.artists
     SET display_name = 'Lucía Ortega', specialties = ARRAY['Fine line', 'Botánico'], hourly_rate = 80, minimum_fee = 60,
         instagram_handle = 'lucia.ink', bio = 'Líneas finas y flores delicadas.'
   WHERE id = v_lucia;

  DELETE FROM public.artists WHERE studio_id = v_studio1 AND id <> v_lucia AND display_name IN ('Dani Vera', 'Sara Kim');
  INSERT INTO public.artists (profile_id, studio_id, display_name, specialties, hourly_rate, minimum_fee, instagram_handle, bio)
  VALUES (v_owner, v_studio1, 'Dani Vera', ARRAY['Blackwork', 'Geométrico'], 90, 70, 'dani.blackwork', 'Piezas grandes en negro sólido y geometría.')
  RETURNING id INTO v_dani;
  INSERT INTO public.artists (profile_id, studio_id, display_name, specialties, hourly_rate, minimum_fee, instagram_handle, bio)
  VALUES (v_owner, v_studio1, 'Sara Kim', ARRAY['Japonés', 'Color'], 100, 80, 'sara.irezumi', 'Japonés tradicional y color.')
  RETURNING id INTO v_sara;

  -- Citas ya ocupadas (para que la agenda tenga huecos reales) y unas vacaciones (día completo)
  DELETE FROM public.appointments WHERE studio_id = v_studio1 AND client_id IS NULL AND walk_in_name = 'Cliente de ejemplo';
  INSERT INTO public.appointments (studio_id, artist_id, walk_in_name, appointment_type, title, start_time, end_time, status)
  SELECT v_studio1, x.artist, 'Cliente de ejemplo', x.kind, x.title,
         ((current_date + x.day) + x.t0) AT TIME ZONE tz, ((current_date + x.day) + x.t1) AT TIME ZONE tz, 'confirmed'
  FROM (VALUES
    (v_lucia, 1, time '10:00', time '14:00', 'tattoo_session', 'Sesión de ejemplo'),
    (v_lucia, 2, time '16:00', time '19:00', 'tattoo_session', 'Sesión de ejemplo'),
    (v_dani,  1, time '11:00', time '15:00', 'tattoo_session', 'Sesión de ejemplo'),
    (v_dani,  3, time '10:00', time '13:00', 'tattoo_session', 'Sesión de ejemplo'),
    (v_sara,  4, time '10:00', time '20:00', 'vacation',       'Vacaciones')
  ) AS x(artist, day, t0, t1, kind, title);

  -- Galería de flashes
  DELETE FROM public.shares WHERE studio_id = v_studio1 AND title IN ('Flash dragón', 'Rosa fine line', 'Koi japonés');
  INSERT INTO public.shares (artist_id, studio_id, title, description, image_url, style_tags, is_flash, price_hint)
  VALUES
    (v_dani,  v_studio1, 'Flash dragón',   'Dragón en blackwork, disponible para antebrazo o muslo.', '/tattoo-flash-bg.jpg', ARRAY['Blackwork'], true, 180),
    (v_lucia, v_studio1, 'Rosa fine line', 'Rosa de línea fina, unos 10 cm.',                         '/tattoo-flash-bg.jpg', ARRAY['Fine line'], true, 120),
    (v_sara,  v_studio1, 'Koi japonés',    'Koi tradicional con agua, para brazo.',                   '/tattoo-flash-bg.jpg', ARRAY['Japonés'],   true, 250);

  -- ===========================================================================
  -- ESTUDIO 2 (opcional): Tinta Sur (Sevilla) con dos tatuadores
  -- ===========================================================================
  IF COALESCE(email_estudio_2, '') <> '' THEN
    SELECT id INTO v_owner FROM auth.users WHERE email = email_estudio_2;
    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'No encuentro la segunda cuenta de estudio "%". Regístrala o deja la línea en blanco ('''').', email_estudio_2;
    END IF;
    SELECT id INTO v_studio2 FROM public.studios WHERE owner_id = v_owner ORDER BY created_at LIMIT 1;
    IF v_studio2 IS NULL THEN
      RAISE EXCEPTION 'La cuenta "%" no es de estudio.', email_estudio_2;
    END IF;

    UPDATE public.studios
       SET name = 'Tinta Sur', address = 'Calle Feria 3', city = 'Sevilla', phone = '+34 954 000 002',
           bio = 'Tradicional y realismo en la Alameda.', latitude = 37.3982, longitude = -5.9935
     WHERE id = v_studio2;

    SELECT id INTO v_marco FROM public.artists WHERE studio_id = v_studio2 AND profile_id = v_owner ORDER BY created_at LIMIT 1;
    IF v_marco IS NULL THEN
      INSERT INTO public.artists (profile_id, studio_id, display_name) VALUES (v_owner, v_studio2, 'Marco Ruiz') RETURNING id INTO v_marco;
    END IF;
    UPDATE public.artists
       SET display_name = 'Marco Ruiz', specialties = ARRAY['Tradicional', 'Old school'], hourly_rate = 75, minimum_fee = 50,
           instagram_handle = 'marco.oldschool', bio = 'Tradicional americano de toda la vida.'
     WHERE id = v_marco;

    DELETE FROM public.artists WHERE studio_id = v_studio2 AND id <> v_marco AND display_name = 'Elena Paz';
    INSERT INTO public.artists (profile_id, studio_id, display_name, specialties, hourly_rate, minimum_fee, instagram_handle, bio)
    VALUES (v_owner, v_studio2, 'Elena Paz', ARRAY['Realismo', 'Retrato'], 110, 90, 'elena.realismo', 'Realismo en negro y gris.')
    RETURNING id INTO v_elena;

    DELETE FROM public.appointments WHERE studio_id = v_studio2 AND client_id IS NULL AND walk_in_name = 'Cliente de ejemplo';
    INSERT INTO public.appointments (studio_id, artist_id, walk_in_name, appointment_type, title, start_time, end_time, status)
    VALUES (v_studio2, v_marco, 'Cliente de ejemplo', 'tattoo_session', 'Sesión de ejemplo',
            ((current_date + 1) + time '12:00') AT TIME ZONE tz, ((current_date + 1) + time '16:00') AT TIME ZONE tz, 'confirmed');
  END IF;

  -- ===========================================================================
  -- CLIENTE (opcional): una cita futura, una pasada y reseñas
  -- ===========================================================================
  IF COALESCE(email_cliente, '') <> '' THEN
    SELECT c.id INTO v_client
      FROM public.clients c JOIN auth.users u ON u.id = c.profile_id
     WHERE u.email = email_cliente
     ORDER BY c.created_at LIMIT 1;
    IF v_client IS NULL THEN
      RAISE EXCEPTION 'No encuentro la cuenta de cliente "%". Regístrala eligiendo "Cliente" o deja la línea en blanco ('''').', email_cliente;
    END IF;

    DELETE FROM public.appointments WHERE client_id = v_client AND title IN ('Rosa en el antebrazo', 'Golondrina (hecha)');
    INSERT INTO public.appointments (studio_id, artist_id, client_id, appointment_type, title, description, start_time, end_time, status)
    VALUES
      (v_studio1, v_lucia, v_client, 'tattoo_session', 'Rosa en el antebrazo', 'Tamaño: Pequeño (5 – 10 cm) · Zona: Antebrazo',
       ((current_date + 6) + time '17:00') AT TIME ZONE tz, ((current_date + 6) + time '18:30') AT TIME ZONE tz, 'confirmed'),
      (v_studio1, v_dani, v_client, 'tattoo_session', 'Golondrina (hecha)', 'Tamaño: Mediano (10 – 15 cm) · Zona: Brazo',
       ((current_date - 20) + time '11:00') AT TIME ZONE tz, ((current_date - 20) + time '13:30') AT TIME ZONE tz, 'completed');

    DELETE FROM public.reviews WHERE client_id = v_client AND artist_id IN (v_lucia, v_dani, v_marco);
    INSERT INTO public.reviews (studio_id, artist_id, client_id, rating, comment)
    VALUES
      (v_studio1, v_lucia, v_client, 5, 'Trato de diez y una línea finísima. Repetiré seguro.'),
      (v_studio1, v_dani,  v_client, 5, 'Muy limpio y explica todo el cuidado de después.');
    IF v_marco IS NOT NULL THEN
      INSERT INTO public.reviews (studio_id, artist_id, client_id, rating, comment)
      VALUES (v_studio2, v_marco, v_client, 4, 'Tradicional de los buenos, el estudio es muy acogedor.');
    END IF;
  END IF;

  RAISE NOTICE 'Datos de prueba cargados: estudio 1 = %, estudio 2 = %, cliente = %', v_studio1, v_studio2, v_client;
END $$;
