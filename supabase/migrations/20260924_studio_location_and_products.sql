-- ==============================================================================
-- 🎨 TATOO AI PLATFORM - ACTUALIZACIONES SUPABASE SQL (MIGRACIÓN MANUAL)
-- ==============================================================================
-- Este script es seguro e idempotente (IF NOT EXISTS).
-- Puedes copiarlo y pegarlo directamente en el 'SQL Editor' de tu consola de Supabase.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COORDENADAS GPS EXACTAS PARA ESTUDIOS EN EL MAPA REAL
-- ------------------------------------------------------------------------------
-- Añade columnas de latitud y longitud para almacenar la posición exacta del pin
ALTER TABLE public.studios 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ------------------------------------------------------------------------------
-- 2. TABLA DE PRODUCTOS Y AFTERCARE DEL ESTUDIO (SHOP)
-- ------------------------------------------------------------------------------
-- Permite a los estudios vender cremas (Balm Tattoo), jabones neutros,
-- parches de protección second skin y merchandising oficial.
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'aftercare' CHECK (category IN ('aftercare', 'soaps', 'protection', 'merch', 'piercing')),
    price NUMERIC(10,2) NOT NULL,
    stock INTEGER DEFAULT 10,
    image_url TEXT,
    usage_instructions TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de búsqueda para la tienda
CREATE INDEX IF NOT EXISTS idx_products_studio ON public.products(studio_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Política 1: Todos los usuarios y clientes pueden ver los productos en venta
DROP POLICY IF EXISTS "Lectura pública de productos" ON public.products;
CREATE POLICY "Lectura pública de productos" 
ON public.products 
FOR SELECT 
USING (true);

-- Política 2: Solo el dueño del estudio puede crear, editar o eliminar productos de su catálogo
DROP POLICY IF EXISTS "Estudio puede gestionar sus propios productos" ON public.products;
CREATE POLICY "Estudio puede gestionar sus propios productos" 
ON public.products 
FOR ALL 
USING (
  studio_id IN (
    SELECT id FROM public.studios WHERE owner_id = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- 3. VERIFICACIÓN DE RESEÑAS A NIVEL DE ESTUDIO
-- ------------------------------------------------------------------------------
-- Asegura que la tabla reviews tenga studio_id referenciado
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reviews' 
        AND column_name = 'studio_id'
    ) THEN
        ALTER TABLE public.reviews ADD COLUMN studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_reviews_studio ON public.reviews(studio_id);
    END IF;
END $$;

-- ==============================================================================
-- ¡MIGRACIÓN COMPLETADA!
-- ==============================================================================
