import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createBillingPortalSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studioId, userId } = body;

    const supabase = createAdminClient();
    let query = supabase.from('studios').select('stripe_customer_id');

    if (studioId) {
      query = query.eq('id', studioId);
    } else if (userId) {
      query = query.eq('owner_id', userId);
    }

    const { data: studio } = await query.maybeSingle();
    const customerId = studio?.stripe_customer_id;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${origin}/dashboard?role=studio`;

    if (!customerId) {
      return NextResponse.json({
        error: 'No se encontró un ID de cliente de Stripe para este estudio. Primero debes activar la suscripción.'
      }, { status: 400 });
    }

    const portalUrl = await createBillingPortalSession(customerId, returnUrl);

    return NextResponse.json({
      success: true,
      url: portalUrl
    });
  } catch (err: any) {
    console.error('[Stripe Portal API] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al abrir el portal de facturación de Stripe' }, { status: 500 });
  }
}
