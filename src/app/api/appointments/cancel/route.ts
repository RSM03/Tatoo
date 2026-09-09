import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, reason } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId es requerido.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: cancelled, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        description: reason ? `Cancelada por cliente: ${reason}` : 'Cancelada por cliente',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select('id, status')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, appointmentId: cancelled.id });
  } catch (err: any) {
    console.error('[Cancel Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Error al cancelar cita.' }, { status: 500 });
  }
}
