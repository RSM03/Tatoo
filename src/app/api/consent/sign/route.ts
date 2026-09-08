import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      appointmentId,
      clientId,
      artistId,
      fullName,
      dniNie,
      signatureDataUrl,
      medicalDisclaimers
    } = body;

    if (!appointmentId || !fullName || !dniNie || !signatureDataUrl) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios para el consentimiento legal (nombre, DNI y firma).' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    const supabase = createAdminClient();

    // 1. Insert legally recorded consent form
    const { data: consentRecord, error: consentErr } = await supabase
      .from('consent_forms')
      .insert({
        appointment_id: appointmentId,
        client_id: clientId,
        artist_id: artistId,
        full_name: fullName.trim(),
        dni_nie: dniNie.trim().toUpperCase(),
        signature_data_url: signatureDataUrl,
        signer_ip: ip,
        signer_user_agent: userAgent,
        medical_disclaimers: medicalDisclaimers || {},
        signed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (consentErr) {
      console.error('Consent insertion error:', consentErr);
      return NextResponse.json({ error: 'Error al registrar el consentimiento legal.' }, { status: 500 });
    }

    // 2. Update appointment to reflect that consent is officially signed
    await supabase
      .from('appointments')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    return NextResponse.json({
      success: true,
      message: 'Consentimiento informado firmado y registrado con éxito.',
      consent: consentRecord
    });
  } catch (err: any) {
    console.error('Consent API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
