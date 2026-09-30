import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Singleton Stripe instance with safe fallback
export const stripe = new Stripe(stripeSecretKey || 'sk_test_mock_tatoo_secret_key', {
  apiVersion: '2024-06-20' as any,
  appInfo: {
    name: 'Tatoo AI Platform',
    version: '1.0.0'
  }
});

export const STUDIO_MONTHLY_PRICE_EUR = 50.00;
export const STUDIO_MONTHLY_PRICE_CENTS = 5000;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'));
}

export interface CreateCheckoutParams {
  studioId: string;
  studioName: string;
  userEmail: string;
  userId: string;
  origin: string;
}

/**
 * Creates a Stripe Checkout Session for 50€/month studio subscription
 */
export async function createStudioCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string; id: string }> {
  const { studioId, studioName, userEmail, userId, origin } = params;

  if (!isStripeConfigured()) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set. Using test checkout redirect simulation.');
    // Simulated instant success for local testing when keys are not yet input
    return {
      id: 'cs_test_simulated_' + Date.now(),
      url: `${origin}/dashboard?role=studio&subscribed=true&mock_session=1`
    };
  }

  const supabase = createAdminClient();

  // 1. Check if studio already has a stripe_customer_id
  const { data: studio } = await supabase
    .from('studios')
    .select('stripe_customer_id')
    .eq('id', studioId)
    .maybeSingle();

  let customerId = studio?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      name: studioName,
      metadata: {
        studio_id: studioId,
        user_id: userId
      }
    });
    customerId = customer.id;

    // Save customerId to studio
    await supabase
      .from('studios')
      .update({ stripe_customer_id: customerId })
      .eq('id', studioId);
  }

  // 2. Create subscription checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    billing_address_collection: 'required',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: STUDIO_MONTHLY_PRICE_CENTS,
          recurring: {
            interval: 'month'
          },
          product_data: {
            name: 'Suscripción Estudio Tatoo AI',
            description: 'Acceso profesional ilimitado para el estudio, tatuadores residentes, asistente virtual y agenda online (50,00 € / mes).'
          }
        },
        quantity: 1
      }
    ],
    metadata: {
      studio_id: studioId,
      user_id: userId
    },
    subscription_data: {
      metadata: {
        studio_id: studioId,
        user_id: userId
      }
    },
    success_url: `${origin}/dashboard?role=studio&subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?role=studio&subscription_canceled=true`
  });

  return {
    id: session.id,
    url: session.url || `${origin}/dashboard?role=studio`
  };
}

/**
 * Creates a Stripe Customer Portal session so studio owners can manage their payment method or view invoices
 */
export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
  if (!isStripeConfigured() || !customerId) {
    return `${returnUrl}?portal_mock=1`;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });

  return session.url;
}

/**
 * Syncs Stripe subscription changes directly into Supabase 'studios' and 'subscriptions' tables
 */
export async function syncStripeSubscriptionToDatabase(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const studioId = subscription.metadata?.studio_id;

  let query = supabase.from('studios').select('id');
  if (studioId) {
    query = query.eq('id', studioId);
  } else if (customerId) {
    query = query.eq('stripe_customer_id', customerId);
  }

  const { data: studio } = await query.maybeSingle();

  if (!studio) {
    console.warn('[Stripe Webhook] No matching studio found for subscription:', subscription.id);
    return;
  }

  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'canceled'
  };

  const normalizedStatus = statusMap[subscription.status] || 'active';
  const rawPeriodEnd = (subscription as any).current_period_end;
  const rawPeriodStart = (subscription as any).current_period_start;
  const currentPeriodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();
  const currentPeriodStart = rawPeriodStart ? new Date(rawPeriodStart * 1000).toISOString() : new Date().toISOString();

  // 1. Update studios table
  await supabase
    .from('studios')
    .update({
      subscription_status: normalizedStatus,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      updated_at: new Date().toISOString()
    })
    .eq('id', studio.id);

  // 2. Audit log in subscriptions table
  await supabase
    .from('subscriptions')
    .upsert({
      studio_id: studio.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: normalizedStatus,
      amount: STUDIO_MONTHLY_PRICE_EUR,
      currency: 'eur',
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      updated_at: new Date().toISOString()
    }, { onConflict: 'stripe_subscription_id' });
}
