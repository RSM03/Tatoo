import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStudioCheckoutSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studioId, userId, userEmail, studioName } = body;

    const supabase = createAdminClient();

    let resolvedStudio = null;
    if (studioId) {
      const { data } = await supabase.from('studios').select('*').eq('id', studioId).maybeSingle();
      resolvedStudio = data;
    } else if (userId) {
      const { data } = await supabase.from('studios').select('*').eq('owner_id', userId).maybeSingle();
      resolvedStudio = data;
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await createStudioCheckoutSession({
      studioId: resolvedStudio?.id || studioId || 'default-studio',
      studioName: resolvedStudio?.name || studioName || 'Estudio de Tatuaje',
      userEmail: userEmail || 'contacto@estudio.com',
      userId: userId || 'anonymous-user',
      origin
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
  } catch (err: any) {
    console.error('[Stripe Checkout API] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al crear la sesión de pago de Stripe' }, { status: 500 });
  }
}
