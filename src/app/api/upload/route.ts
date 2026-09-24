import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // 1. Handle JSON base64 upload
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { dataUrl, filename = 'attachment.jpg' } = body;

      if (!dataUrl) {
        return NextResponse.json({ error: 'dataUrl es requerido.' }, { status: 400 });
      }

      // Try uploading to Supabase Storage if configured
      const supabase = createAdminClient();
      try {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = mimeType.split('/')[1] || 'jpg';
          const path = `chat/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

          const { data: uploadRes, error: uploadErr } = await supabase.storage
            .from('tattoos')
            .upload(path, buffer, {
              contentType: mimeType,
              upsert: true
            });

          if (!uploadErr && uploadRes) {
            const { data: publicUrlData } = supabase.storage
              .from('tattoos')
              .getPublicUrl(path);

            if (publicUrlData?.publicUrl) {
              return NextResponse.json({
                success: true,
                url: publicUrlData.publicUrl
              });
            }
          }
        }
      } catch (storageErr) {
        console.warn('[Upload] Storage bucket unavailable, returning optimized dataUrl:', storageErr);
      }

      // Fallback: Return the optimized dataUrl directly
      return NextResponse.json({
        success: true,
        url: dataUrl
      });
    }

    // 2. Handle multipart form data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No se ha proporcionado ningún archivo.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const supabase = createAdminClient();
      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from('tattoos')
        .upload(path, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true
        });

      if (!uploadErr && uploadRes) {
        const { data: publicUrlData } = supabase.storage
          .from('tattoos')
          .getPublicUrl(path);

        return NextResponse.json({
          success: true,
          url: publicUrlData.publicUrl
        });
      }

      // If bucket fails, return base64
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;
      return NextResponse.json({
        success: true,
        url: dataUrl
      });
    }

    return NextResponse.json({ error: 'Tipo de contenido no soportado.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Upload API Error]:', err);
    return NextResponse.json({ error: err.message || 'Error al procesar archivo.' }, { status: 500 });
  }
}
