'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Star, MessageSquare, Plus, CheckCircle2, User, Building2, Paintbrush, Filter, Sparkles, X } from 'lucide-react';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [studios, setStudios] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStudioFilter, setSelectedStudioFilter] = useState('all');

  // New review modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudioId, setModalStudioId] = useState('');
  const [reviewScope, setReviewScope] = useState<'studio' | 'artist'>('studio');
  const [modalArtistId, setModalArtistId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Studios
      const { data: stds } = await supabase
        .from('studios')
        .select('id, name, city, address');
      const studioList = stds || [];
      setStudios(studioList);
      if (studioList.length > 0) setModalStudioId(studioList[0].id);

      // 2. Fetch Artists
      const { data: arts } = await supabase
        .from('artists')
        .select('id, display_name, studio_id');
      const artistList = arts || [];
      setArtists(artistList);
      if (artistList.length > 0) setModalArtistId(artistList[0].id);

      // 3. Fetch Reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select(`
          *,
          studios (id, name, city),
          artists (id, display_name),
          clients (profiles (full_name))
        `)
        .order('created_at', { ascending: false });

      setReviews(revs || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Debes iniciar sesión con tu cuenta para publicar una reseña verificada.');
        return;
      }

      const { data: clientRec } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', session.user.id)
        .maybeSingle();

      const resolvedArtistId = reviewScope === 'artist' && modalArtistId ? modalArtistId : (artists.find(a => a.studio_id === modalStudioId)?.id || artists[0]?.id || null);

      const newRecord: any = {
        studio_id: modalStudioId,
        artist_id: resolvedArtistId,
        client_id: clientRec?.id || null,
        rating: Number(rating),
        comment: comment.trim(),
        created_at: new Date().toISOString()
      };

      const { data: newRev, error } = await supabase
        .from('reviews')
        .insert(newRecord)
        .select(`
          *,
          studios (id, name, city),
          artists (id, display_name),
          clients (profiles (full_name))
        `)
        .single();

      if (error) throw error;

      setReviews(prev => [newRev, ...prev]);
      setIsModalOpen(false);
      setComment('');
      alert('¡Gracias por valorar nuestro estudio y a nuestros artistas!');
    } catch (err: any) {
      alert(`Error al publicar reseña: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    if (selectedStudioFilter === 'all') return true;
    return r.studio_id === selectedStudioFilter || r.studios?.id === selectedStudioFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-ink-900/90 via-ink-950 to-ink-900/90 p-6 rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 mb-2 font-mono">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Reseñas de Estudios & Tatuadores Verificadas</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Experiencias y Opiniones</h1>
          <p className="text-xs text-ink-400 mt-1 max-w-xl">
            Descubre las valoraciones de nuestros clientes sobre la higiene, instalaciones del estudio, trato del equipo y calidad del arte en piel.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-500 hover:to-crimson-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-crimson-600/30 transition-all hover:scale-105 shrink-0 border border-crimson-500/30"
        >
          <Plus className="w-4 h-4" />
          <span>Escribir Reseña al Estudio</span>
        </button>
      </div>

      {/* Studio Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-8 p-3 rounded-2xl bg-ink-950/70 border border-white/5">
        <span className="text-xs font-mono font-bold text-ink-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-crimson-500" />
          <span>Filtrar por Estudio:</span>
        </span>

        <button
          onClick={() => setSelectedStudioFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedStudioFilter === 'all'
              ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/20'
              : 'text-ink-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Todos los Estudios ({reviews.length})
        </button>

        {studios.map(std => {
          const count = reviews.filter(r => r.studio_id === std.id || r.studios?.id === std.id).length;
          return (
            <button
              key={std.id}
              onClick={() => setSelectedStudioFilter(std.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStudioFilter === std.id
                  ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/20'
                  : 'text-ink-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-3 h-3 text-amber-400" />
              <span>{std.name} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5 max-w-lg mx-auto bg-ink-950/60">
          <Star className="w-12 h-12 text-ink-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Aún no hay reseñas en este estudio</h3>
          <p className="text-xs text-ink-400 mb-6">Sé el primero en compartir tu experiencia tras tatuarte con nosotros.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold shadow-lg"
          >
            <span>Dejar mi opinión</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((r) => {
            const studioName = r.studios?.name || studios.find(s => s.id === r.studio_id)?.name || 'Estudio de Tatuaje';
            const artistName = r.artists?.display_name || (r.artist_id ? 'Tatuador' : null);

            return (
              <div
                key={r.id}
                className="glass-panel p-6 rounded-3xl border border-white/10 bg-ink-900/60 hover:border-crimson-500/40 transition-all flex flex-col justify-between shadow-xl group"
              >
                <div>
                  {/* Studio & Artist Header Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Building2 className="w-3 h-3 text-amber-400" />
                      <span>{studioName}</span>
                    </span>

                    <div className="flex text-amber-400 text-xs">
                      {'★'.repeat(r.rating)}
                      <span className="text-white/20">{'★'.repeat(5 - r.rating)}</span>
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-ink-200 leading-relaxed mb-4 italic">
                    "{r.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-crimson-600/20 border border-crimson-500/30 flex items-center justify-center text-xs font-bold text-crimson-300">
                        {r.clients?.profiles?.full_name?.charAt(0) || 'C'}
                      </div>
                      <span className="font-bold text-white text-xs">{r.clients?.profiles?.full_name || 'Cliente Verificado'}</span>
                    </div>

                    <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verificada</span>
                    </span>
                  </div>

                  {artistName && (
                    <div className="text-[11px] text-ink-400 font-mono flex items-center gap-1.5">
                      <Paintbrush className="w-3 h-3 text-crimson-400" />
                      <span>Tatuador: <strong className="text-ink-200">{artistName}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Write Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/20 bg-ink-950 relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>Dejar Reseña del Estudio & Tatuador</span>
            </div>

            <h2 className="font-display text-xl font-bold text-white">Tu Experiencia</h2>
            <p className="text-xs text-ink-400">
              Valora las instalaciones, higiene, trato personal y el acabado de tu tatuaje.
            </p>

            <form onSubmit={handleAddReview} className="space-y-4 text-xs">
              {/* Studio Selection */}
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Estudio de Tatuajes
                </label>
                <select
                  value={modalStudioId}
                  onChange={(e) => setModalStudioId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                >
                  {studios.map(s => (
                    <option key={s.id} value={s.id}>
                      🏢 {s.name} ({s.city || 'Madrid'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Review Scope: Studio General vs Specific Artist */}
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  ¿A quién va dirigida la reseña?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewScope('studio')}
                    className={`py-2 px-2.5 rounded-xl font-semibold text-xs border transition-all ${
                      reviewScope === 'studio'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-ink-900 border-white/5 text-ink-400 hover:text-white'
                    }`}
                  >
                    🏢 Todo el Estudio
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewScope('artist')}
                    className={`py-2 px-2.5 rounded-xl font-semibold text-xs border transition-all ${
                      reviewScope === 'artist'
                        ? 'bg-crimson-500/20 text-crimson-300 border-crimson-500/40'
                        : 'bg-ink-900 border-white/5 text-ink-400 hover:text-white'
                    }`}
                  >
                    🧑‍🎨 Tatuador Concreto
                  </button>
                </div>
              </div>

              {/* Optional Artist Selection */}
              {reviewScope === 'artist' && (
                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                    Tatuador responsable
                  </label>
                  <select
                    value={modalArtistId}
                    onChange={(e) => setModalArtistId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                  >
                    {artists.map(a => (
                      <option key={a.id} value={a.id}>{a.display_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rating */}
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Puntuación
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`flex-1 py-2 rounded-xl font-bold text-sm border transition-all ${
                        rating >= num
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-ink-900 text-ink-600 border-white/5'
                      }`}
                    >
                      {num} ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Comentario & Opinión
                </label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Detalla tu experiencia: limpieza, higiene del material, asesoramiento del diseño, música y trato en cabina..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold shadow-lg"
                >
                  {submitting ? 'Publicando...' : 'Publicar Reseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
