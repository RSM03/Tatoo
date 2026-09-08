'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Star, MessageSquare, Plus, CheckCircle2, User } from 'lucide-react';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New review modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadReviewsData();
  }, []);

  const loadReviewsData = async () => {
    setLoading(true);
    try {
      const { data: revs } = await supabase
        .from('reviews')
        .select(`
          *,
          artists (id, display_name, studio_id, studios(name)),
          clients (profiles (full_name))
        `)
        .order('created_at', { ascending: false });

      setReviews(revs || []);

      const { data: arts } = await supabase
        .from('artists')
        .select('id, display_name, studio_id');

      setArtists(arts || []);
      if (arts && arts.length > 0) setSelectedArtistId(arts[0].id);
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
        alert('Debes iniciar sesión como cliente para publicar una reseña.');
        return;
      }

      const { data: clientRec } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', session.user.id)
        .maybeSingle();

      const artistSelected = artists.find(a => a.id === selectedArtistId);

      const { data: newRev, error } = await supabase
        .from('reviews')
        .insert({
          studio_id: artistSelected?.studio_id || (await supabase.from('studios').select('id').limit(1).single()).data?.id,
          artist_id: selectedArtistId,
          client_id: clientRec?.id,
          rating: Number(rating),
          comment: comment.trim(),
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          artists (id, display_name, studios(name)),
          clients (profiles (full_name))
        `)
        .single();

      if (error) throw error;

      setReviews(prev => [newRev, ...prev]);
      setIsModalOpen(false);
      setComment('');
      alert('¡Gracias por tu reseña!');
    } catch (err: any) {
      alert(`Error al publicar reseña: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-amber-400 mb-3">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Opiniones Verificadas de Clientes</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Reseñas y Experiencias</h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-crimson-600/30 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Escribir Reseña</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5 max-w-lg mx-auto">
          <Star className="w-12 h-12 text-ink-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Aún no hay reseñas</h3>
          <p className="text-xs text-ink-400 mb-6">Sé el primero en compartir tu experiencia tras tatuarte con nosotros.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold"
          >
            <span>Dejar mi opinión</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div key={r.id} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-ink-300">
                      {r.clients?.profiles?.full_name?.charAt(0) || 'C'}
                    </div>
                    <span className="font-bold text-white text-sm">{r.clients?.profiles?.full_name || 'Cliente'}</span>
                  </div>
                  <div className="flex text-amber-400 text-xs">
                    {'★'.repeat(r.rating)}
                  </div>
                </div>

                <p className="text-sm text-ink-300 leading-relaxed mb-4 italic">
                  "{r.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 text-xs text-ink-500 flex items-center justify-between">
                <span>Tatuador: <strong className="text-ink-300">{r.artists?.display_name || 'Artista'}</strong></span>
                <span className="text-emerald-400 font-semibold text-[10px]">✓ Verificada</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 relative">
            <h2 className="font-display text-xl font-bold text-white mb-1">Dejar una Reseña</h2>
            <p className="text-xs text-ink-400 mb-6">Valora la atención, profesionalidad y el resultado de tu tatuaje</p>

            <form onSubmit={handleAddReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Tatuador</label>
                <select
                  value={selectedArtistId}
                  onChange={(e) => setSelectedArtistId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                >
                  {artists.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Puntuación</label>
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

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Comentario</label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explica cómo fue tu sesión, el trato del tatuador y la higiene del estudio..."
                  className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
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
                  className="px-5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold"
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
