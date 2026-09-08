'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Image, Sparkles, Tag, ArrowRight } from 'lucide-react';

export default function SharesPage() {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchShares() {
      try {
        const { data } = await supabase
          .from('shares')
          .select(`
            *,
            artists (display_name),
            studios (name)
          `)
          .order('created_at', { ascending: false });

        setShares(data || []);
      } catch (err) {
        console.error('Error fetching shares:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchShares();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 w-full">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-purple-400 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Flashes Disponibles & Diseños Recientes</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Galería Share</h1>
        <p className="text-sm text-ink-400 mt-2">
          Explora los últimos trabajos y flashes exclusivos de nuestros artistas. Todos los meses enviamos las novedades en la newsletter.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shares.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5 max-w-lg mx-auto">
          <Image className="w-12 h-12 text-ink-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Aún no hay publicaciones</h3>
          <p className="text-xs text-ink-400 mb-6">Los artistas publicarán pronto sus nuevos flashes y diseños disponibles.</p>
          <Link
            href="/register?role=artist"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold"
          >
            <span>Publicar como Tatuador</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shares.map((s) => (
            <div key={s.id} className="glass-panel rounded-2xl overflow-hidden border border-white/10 group flex flex-col justify-between">
              <div className="h-64 w-full bg-ink-900 overflow-hidden relative">
                <img
                  src={s.image_url}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {s.is_flash && (
                  <span className="absolute top-3 left-3 bg-crimson-600/90 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md">
                    Flash Disponible
                  </span>
                )}
                {s.price_hint && (
                  <span className="absolute bottom-3 right-3 bg-black/85 text-amber-400 font-bold text-xs px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    {s.price_hint} €
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg text-white mb-1">{s.title}</h3>
                  {s.description && <p className="text-xs text-ink-400 mb-3">{s.description}</p>}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-ink-300">
                    Por <strong className="text-white">{s.artists?.display_name || 'Tatuador'}</strong>
                  </span>
                  <Link
                    href={`/dashboard?role=client&action=book&artist_id=${s.artist_id}`}
                    className="text-xs font-semibold text-crimson-400 hover:text-crimson-300 flex items-center gap-1"
                  >
                    <span>Pedir este flash</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
