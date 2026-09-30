import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      artistId,
      studioId,
      displayName,
      specialties,
      hourlyRate,
      minimumFee,
      instagramHandle
    } = body;

    if (!artistId) {
      return NextResponse.json({ error: 'artistId es obligatorio' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch existing artist
    const { data: existingArtist, error: fetchErr } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .maybeSingle();

    if (fetchErr || !existingArtist) {
      return NextResponse.json({ error: 'Tatuador no encontrado' }, { status: 404 });
    }

    const parsedMinFee = Number(minimumFee) || existingArtist.minimum_fee || 60;
    const parsedHourlyRate = Number(hourlyRate) || existingArtist.hourly_rate || 80;

    // Merge updated rates into pricing_rules JSONB
    const currentRules = existingArtist.pricing_rules || {};
    const updatedPricingRules = {
      ...currentRules,
      minimum_fee: parsedMinFee,
      hourly_rate: parsedHourlyRate,
      size_rates: {
        small: { max_cm: 5, base_price: parsedMinFee },
        medium: { max_cm: 15, base_price: currentRules?.size_rates?.medium?.base_price || 140 },
        large: { max_cm: 25, base_price: currentRules?.size_rates?.large?.base_price || 260 },
        xlarge: { max_cm: 999, base_price: currentRules?.size_rates?.xlarge?.base_price || 450 }
      },
      color_multiplier: currentRules?.color_multiplier || 1.25,
      complex_placement_multiplier: currentRules?.complex_placement_multiplier || 1.15
    };

    const updatePayload: any = {
      display_name: displayName?.trim() || existingArtist.display_name,
      hourly_rate: parsedHourlyRate,
      minimum_fee: parsedMinFee,
      pricing_rules: updatedPricingRules
    };

    if (Array.isArray(specialties)) {
      updatePayload.specialties = specialties;
    } else if (typeof specialties === 'string') {
      updatePayload.specialties = specialties.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (instagramHandle !== undefined) {
      updatePayload.instagram_handle = instagramHandle ? instagramHandle.trim().replace(/^@/, '') : null;
    }

    const { data: updatedArtist, error: updateErr } = await supabase
      .from('artists')
      .update(updatePayload)
      .eq('id', artistId)
      .select('*')
      .single();

    if (updateErr) {
      throw updateErr;
    }

    return NextResponse.json({
      success: true,
      artist: updatedArtist
    });
  } catch (err: any) {
    console.error('[API artists/update] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar tatuador' }, { status: 500 });
  }
}
