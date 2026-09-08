-- ==============================================================================
-- 🎨 TATOO AI PLATFORM - COMPREHENSIVE SUPABASE DATABASE SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Base user table linked to auth.users)
-- Roles: 'studio' (Studio owner/manager), 'artist' (Tattoo artist), 'client' (Customer)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('studio', 'artist', 'client')),
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    language TEXT DEFAULT 'es' CHECK (language IN ('es', 'en')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. STUDIOS (Tattoo studios with multiple artists or single studio)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    bio TEXT,
    opening_hours JSONB DEFAULT '{
      "monday": {"open": "10:00", "close": "20:00", "closed": false},
      "tuesday": {"open": "10:00", "close": "20:00", "closed": false},
      "wednesday": {"open": "10:00", "close": "20:00", "closed": false},
      "thursday": {"open": "10:00", "close": "20:00", "closed": false},
      "friday": {"open": "10:00", "close": "20:00", "closed": false},
      "saturday": {"open": "11:00", "close": "19:00", "closed": false},
      "sunday": {"open": "00:00", "close": "00:00", "closed": true}
    }'::jsonb,
    email_templates JSONB DEFAULT '{
      "reminder_subject": "Recordatorio de tu cita en {studio_name}",
      "reminder_body": "Hola {client_name}, te recordamos tu cita el {date} a las {time} con {artist_name}. Por favor acude descansado e hidratado.",
      "reengagement_subject": "¿Pensando en tu próximo tatuaje? Te echamos de menos",
      "reengagement_body": "¡Hola {client_name}! Hace 4 meses desde tu última sesión. Queremos invitarte con un 10% de descuento usando el código {discount_code}.",
      "discount_code": "TATOO4M",
      "discount_percent": 10
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. ARTISTS (Tattoo artists belonging to studio or independent)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id UUID REFERENCES public.studios(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    specialties TEXT[] DEFAULT '{}',
    instagram_handle TEXT,
    hourly_rate NUMERIC DEFAULT 80,
    minimum_fee NUMERIC DEFAULT 60,
    pricing_rules JSONB DEFAULT '{
      "minimum_fee": 60,
      "hourly_rate": 80,
      "size_rates": {
        "small": {"max_cm": 5, "base_price": 60},
        "medium": {"max_cm": 15, "base_price": 140},
        "large": {"max_cm": 25, "base_price": 260},
        "xlarge": {"max_cm": 999, "base_price": 450}
      },
      "color_multiplier": 1.25,
      "complex_placement_multiplier": 1.15,
      "disclaimer_es": "Este presupuesto es una estimación aproximada basada en la descripción y reglas del artista. El precio final puede variar según el diseño detallado y la colocación exacta.",
      "disclaimer_en": "This quote is an approximate estimation based on your description and the artist rules. The final price may vary depending on detailed artwork and exact placement."
    }'::jsonb,
    healing_templates JSONB DEFAULT '{
      "normal": {
        "es": "El tatuaje muestra una evolución normal de cicatrización. Recuerda lavarlo 2-3 veces al día con agua templada y jabón neutro, secando a toques con papel de cocina, y aplicar una capa fina de pomada específica.",
        "en": "The tattoo shows healthy normal healing. Keep washing it 2-3 times daily with lukewarm water and neutral soap, pat dry with paper towels, and apply a thin layer of aftercare ointment."
      },
      "redness_mild": {
        "es": "Se aprecia un enrojecimiento leve habitual durante los primeros días. Evita el roce con ropa ajustada, no tomes el sol y no sumerjas el tatuaje en agua estancada (piscinas, mar o bañeras).",
        "en": "Mild redness is typical during the first 48-72h. Avoid tight clothing friction, avoid direct sun, and do not submerge in standing water (pools, ocean, baths)."
      },
      "alert_infection": {
        "es": "⚠️ ¡Alerta de cicatrización! La imagen presenta posibles indicios de supuración o inflamación anormal. Te recomendamos lavar suavemente con jabón antibacteriano neutro, no aplicar cremas densas y ponerte en contacto inmediato con el estudio o un profesional médico.",
        "en": "⚠️ Healing Alert! The image shows possible symptoms of abnormal inflammation or discharge. We recommend gently washing with mild antibacterial soap, stopping occlusive ointments, and contacting the studio or a medical professional immediately."
      }
    }'::jsonb,
    consent_pdf_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. CLIENTS (Customer information, health notes & DNI)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dni_nie TEXT,
    birth_date DATE,
    medical_notes JSONB DEFAULT '{
      "allergies": "",
      "medications": "",
      "skin_conditions": ""
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. APPOINTMENTS (Booking engine without AI: Studio/Artist & Client control)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    walk_in_name TEXT,
    walk_in_phone TEXT,
    walk_in_email TEXT,
    appointment_type TEXT NOT NULL CHECK (appointment_type IN ('design_consultation', 'tattoo_session', 'touch_up', 'break_blocked', 'vacation')),
    title TEXT,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'rescheduled', 'cancelled')),
    estimated_price NUMERIC,
    deposit_paid NUMERIC DEFAULT 0,
    reminder_48h_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. CHATS & REALTIME CONVERSATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    ai_enabled BOOLEAN DEFAULT true,
    ai_summary TEXT DEFAULT 'Conversación iniciada',
    status_badge TEXT DEFAULT 'quoting' CHECK (status_badge IN ('quoting', 'booking', 'healing_check', 'takeover', 'closed')),
    context_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. CHAT MESSAGES (With Vision healing analysis and AI quotes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'artist', 'ai_assistant', 'system')),
    content TEXT NOT NULL,
    image_url TEXT,
    healing_status TEXT CHECK (healing_status IN ('normal', 'redness_mild', 'alert_infection', 'unclear')),
    healing_metadata JSONB,
    quote_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 8. CONSENT FORMS (Signed digital consent with legal validity)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    signed_pdf_url TEXT,
    signature_data_url TEXT,
    full_name TEXT NOT NULL,
    dni_nie TEXT NOT NULL,
    signer_ip TEXT,
    signer_user_agent TEXT,
    medical_disclaimers JSONB NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 9. SHARES (Artist Portfolio & Monthly Newsletter Source)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    style_tags TEXT[] DEFAULT '{}',
    is_flash BOOLEAN DEFAULT false,
    price_hint NUMERIC,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 10. REVIEWS (Ratings & Comments for Studio & Artist)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_artist_time ON public.appointments(artist_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_chats_artist ON public.chats(artist_id);
CREATE INDEX IF NOT EXISTS idx_chats_client ON public.chats(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shares_artist ON public.shares(artist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_artist ON public.reviews(artist_id);

-- ------------------------------------------------------------------------------
-- AUTOMATIC PROFILE SYNC TRIGGER (ON AUTH SIGNUP)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_phone TEXT;
    new_studio_id UUID;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- 1. Insert Base Profile
    INSERT INTO public.profiles (id, email, role, full_name, phone, language)
    VALUES (NEW.id, NEW.email, user_role, user_full_name, user_phone, COALESCE(NEW.raw_user_meta_data->>'language', 'es'));

    -- 2. Role Specific Records
    IF (user_role = 'studio') THEN
        INSERT INTO public.studios (owner_id, name, slug, email, phone)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'studio_name', 'Estudio de ' || user_full_name),
            LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'studio_name', 'estudio-' || SUBSTRING(NEW.id::text, 1, 8)), '[^a-zA-Z0-9]+', '-', 'g')),
            NEW.email,
            user_phone
        )
        RETURNING id INTO new_studio_id;

        -- Create default primary artist for the studio
        INSERT INTO public.artists (profile_id, studio_id, display_name)
        VALUES (NEW.id, new_studio_id, user_full_name);

    ELSIF (user_role = 'artist') THEN
        INSERT INTO public.artists (profile_id, display_name)
        VALUES (NEW.id, user_full_name);

    ELSIF (user_role = 'client') THEN
        INSERT INTO public.clients (profile_id, dni_nie)
        VALUES (NEW.id, NEW.raw_user_meta_data->>'dni_nie');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ------------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS POLICIES
-- ------------------------------------------------------------------------------
-- Profiles
CREATE POLICY "Public profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Studios
CREATE POLICY "Studios viewable by everyone" ON public.studios FOR SELECT USING (true);
CREATE POLICY "Studio owners can update studio" ON public.studios FOR UPDATE USING (auth.uid() = owner_id);

-- Artists
CREATE POLICY "Artists viewable by everyone" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Artists can update own record" ON public.artists FOR UPDATE USING (
    profile_id = auth.uid() OR 
    studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);
CREATE POLICY "Studio owners can insert artists" ON public.artists FOR INSERT WITH CHECK (
    studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid()) OR
    profile_id = auth.uid()
);
CREATE POLICY "Studio owners can delete artists" ON public.artists FOR DELETE USING (
    studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);

-- Clients
CREATE POLICY "Clients can view own record or studio/artist with appointment" ON public.clients FOR SELECT USING (
    profile_id = auth.uid() OR
    id IN (SELECT client_id FROM public.appointments WHERE artist_id IN (SELECT id FROM public.artists WHERE profile_id = auth.uid()))
);
CREATE POLICY "Clients can update own record" ON public.clients FOR UPDATE USING (profile_id = auth.uid());

-- Appointments
CREATE POLICY "Appointments viewable by involved parties" ON public.appointments FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()) OR
    artist_id IN (SELECT id FROM public.artists WHERE profile_id = auth.uid()) OR
    studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);
CREATE POLICY "Clients, artists, and studios can insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Involved parties can update appointments" ON public.appointments FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()) OR
    artist_id IN (SELECT id FROM public.artists WHERE profile_id = auth.uid()) OR
    studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);

-- Chats & Messages
CREATE POLICY "Chats viewable by participants" ON public.chats FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()) OR
    artist_id IN (SELECT id FROM public.artists WHERE profile_id = auth.uid()) OR
    studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);
CREATE POLICY "Chat messages viewable by chat participants" ON public.chat_messages FOR SELECT USING (
    chat_id IN (SELECT id FROM public.chats WHERE 
        client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()) OR
        artist_id IN (SELECT id FROM public.artists WHERE profile_id = auth.uid()) OR
        studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
    )
);
CREATE POLICY "Participants can insert chat messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Shares & Reviews (Publicly visible)
CREATE POLICY "Shares viewable by everyone" ON public.shares FOR SELECT USING (true);
CREATE POLICY "Artists can manage shares" ON public.shares FOR ALL USING (
    artist_id IN (SELECT id FROM public.artists WHERE profile_id = auth.uid())
);
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews" ON public.reviews FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid())
);

-- Consent Forms
CREATE POLICY "Consent forms viewable by client, artist, and studio" ON public.consent_forms FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()) OR
    artist_id IN (SELECT id FROM public.artists WHERE profile_id = auth.uid())
);
CREATE POLICY "Clients can insert consent forms" ON public.consent_forms FOR INSERT WITH CHECK (true);
