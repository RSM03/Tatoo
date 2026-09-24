import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studioId, address, city } = body;

    if (!studioId || !address || !city) {
      return NextResponse.json(
        { error: 'El ID del estudio, la dirección y la ciudad son obligatorios.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: updatedStudio, error } = await supabase
      .from('studios')
      .update({
        address: address.trim(),
        city: city.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', studioId)
      .select()
      .single();

    if (error) {
      console.error('[API update-location error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      studio: updatedStudio
    });
  } catch (err: any) {
    console.error('[API update-location fatal]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
