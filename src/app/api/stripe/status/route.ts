import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get('studioId');
    const userId = searchParams.get('userId');

    const supabase = createAdminClient();
    let query = supabase.from('studios').select(`
      id,
      name,
      subscription_status,
      subscription_plan,
      subscription_price_monthly,
      stripe_customer_id,
      stripe_subscription_id,
      current_period_end,
      cancel_at_period_end,
      subscription_started_at
    `);

    if (studioId) {
      query = query.eq('id', studioId);
    } else if (userId) {
      query = query.eq('owner_id', userId);
    } else {
      query = query.limit(1);
    }

    const { data: studio, error } = await query.maybeSingle();

    if (error || !studio) {
      return NextResponse.json({
        hasActiveSubscription: true, // Default open for development/mocking
        status: 'trialing',
        plan: 'studio_monthly_50',
        priceMonthly: 50.00
      });
    }

    const isActive = ['active', 'trialing'].includes(studio.subscription_status || 'trialing');

    return NextResponse.json({
      hasActiveSubscription: isActive,
      status: studio.subscription_status || 'trialing',
      plan: studio.subscription_plan || 'studio_monthly_50',
      priceMonthly: studio.subscription_price_monthly || 50.00,
      currentPeriodEnd: studio.current_period_end,
      cancelAtPeriodEnd: studio.cancel_at_period_end,
      stripeCustomerId: studio.stripe_customer_id
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
