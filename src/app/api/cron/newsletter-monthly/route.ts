import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMonthlyNewsletter } from '@/lib/emailjs';

export const dynamic = 'force-dynamic';

/**
 * Monthly Newsletter Dispatcher
 * Triggered on the 1st of every month
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Get all active artists
    const { data: artists } = await supabase
      .from('artists')
      .select('id, display_name, studio_id, studios(name)')
      .eq('active', true);

    let sentTotal = 0;

    for (const artist of (artists || [])) {
      // 2. Fetch recent shares from the last 30 days for this artist
      const { data: recentShares } = await supabase
        .from('shares')
        .select('id, title, is_flash, price_hint')
        .eq('artist_id', artist.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(6);

      if (!recentShares || recentShares.length === 0) continue;

      // 3. Find unique clients who have had appointments with this artist
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          client_id,
          clients (
            profile_id,
            profiles (full_name, email)
          )
        `)
        .eq('artist_id', artist.id)
        .eq('status', 'completed');

      const clientMap = new Map<string, { email: string; name: string }>();
      (appointments || []).forEach((app: any) => {
        const email = app.clients?.profiles?.email;
        const name = app.clients?.profiles?.full_name || 'Amante del tatuaje';
        if (email && !clientMap.has(email)) {
          clientMap.set(email, { email, name });
        }
      });

      const worksSummary = recentShares
        .map(s => `• ${s.title} ${s.is_flash ? '(Flash disponible)' : ''}`)
        .join('\n');

      for (const [email, clientInfo] of Array.from(clientMap.entries())) {
        await sendMonthlyNewsletter({
          toEmail: email,
          clientName: clientInfo.name,
          artistName: artist.display_name,
          studioName: (artist as any).studios?.name || 'Estudio de Tatuajes',
          recentWorksCount: recentShares.length,
          recentWorksSummary: worksSummary,
          galleryLink: `https://tatoo.app/shares?artist=${artist.id}`
        });
        sentTotal++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Newsletter mensual enviada a ${sentTotal} clientes.`,
      sentCount: sentTotal
    });
  } catch (err: any) {
    console.error('[Cron Monthly Newsletter Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
