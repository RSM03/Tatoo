import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId es requerido.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if appointment exists
    const { data: existingApp, error: fetchErr } = await supabase
      .from('appointments')
      .select('id, title, appointment_type, start_time, end_time')
      .eq('id', appointmentId)
      .maybeSingle();

    if (fetchErr) {
      throw fetchErr;
    }

    if (!existingApp) {
      return NextResponse.json({ error: 'Cita o descanso no encontrado.' }, { status: 404 });
    }

    // Permanently delete appointment / break
    const { error: deleteErr } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (deleteErr) {
      throw deleteErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Cita o descanso eliminado correctamente de la base de datos.',
      deletedId: appointmentId,
      appointment: existingApp
    });
  } catch (err: any) {
    console.error('[Delete Appointment Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar cita o descanso.' }, { status: 500 });
  }
}
