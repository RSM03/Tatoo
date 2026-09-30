-- ==============================================================================
-- 🎨 TATOO AI PLATFORM - SUSCRIPCIONES STRIPE Y ELIMINACIÓN DE TIENDA
-- ==============================================================================
-- 1. Elimina por completo la tabla de productos (tienda) de la BBDD.
-- 2. Añade gestión de suscripciones mensuales (50€/mes) en la tabla 'studios'.
-- 3. Crea tabla de auditoría 'subscriptions' para control de cobros y webhooks de Stripe.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ELIMINACIÓN COMPLETA DE LA TIENDA DE PRODUCTOS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.products CASCADE;

-- ------------------------------------------------------------------------------
-- 2. GESTIÓN DE SUSCRIPCIONES PARA ESTUDIOS (50€ / MES)
-- ------------------------------------------------------------------------------
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing' 
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid')),
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'studio_monthly_50',
ADD COLUMN IF NOT EXISTS subscription_price_monthly NUMERIC(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_studios_subscription_status ON public.studios(subscription_status);
CREATE INDEX IF NOT EXISTS idx_studios_stripe_customer ON public.studios(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_studios_stripe_subscription ON public.studios(stripe_subscription_id);

-- ------------------------------------------------------------------------------
-- 3. TABLA DE AUDITORÍA Y HISTORIAL DE SUSCRIPCIONES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    currency TEXT NOT NULL DEFAULT 'eur',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_studio ON public.subscriptions(studio_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: El dueño del estudio puede consultar el historial de su suscripción
DROP POLICY IF EXISTS "Dueño del estudio consulta sus suscripciones" ON public.subscriptions;
CREATE POLICY "Dueño del estudio consulta sus suscripciones"
ON public.subscriptions
FOR SELECT
USING (
  studio_id IN (
    SELECT id FROM public.studios WHERE owner_id = auth.uid()
  )
);

-- ==============================================================================
-- ¡MIGRACIÓN COMPLETADA!
-- ==============================================================================
