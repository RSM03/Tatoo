'use client';

import React, { useState } from 'react';
import { X, Clock, CheckCircle2, AlertTriangle, Calendar, Scissors, Tag } from 'lucide-react';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onAppointmentUpdated: (updatedApp: any) => void;
}

export default function EditAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onAppointmentUpdated
}: EditAppointmentModalProps) {
  if (!isOpen || !appointment) return null;

  // Calculate current duration in hours
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  const [status, setStatus] = useState(appointment.status || 'pending');
  const [appointmentType, setAppointmentType] = useState(appointment.appointment_type || 'tattoo_session');
  const [durationHours, setDurationHours] = useState<number>(diffHours > 0 ? diffHours : 2.5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (overrideStatus?: string) => {
    setLoading(true);
    setErrorMsg('');

    const targetStatus = overrideStatus || status;

    try {
      const res = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          status: targetStatus,
          durationHours: Number(durationHours),
          appointmentType
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al actualizar cita.');
      }

      onAppointmentUpdated(data.appointment);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clientName = appointment.clients?.profiles?.full_name || appointment.walk_in_name || 'Cliente';
  const calculatedEndTime = new Date(start.getTime() + Number(durationHours) * 60 * 60 * 1000);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-white/20 bg-ink-950 relative shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-crimson-400 text-xs font-mono font-bold uppercase">
          <Clock className="w-4 h-4" />
          <span>Gestión de Cita & Duración</span>
        </div>

        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            {clientName}
          </h2>
          <p className="text-xs text-ink-400 mt-0.5">
            {start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Quick Confirmation Banner if Pending */}
          {appointment.status === 'pending' && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-amber-300 block text-xs">Cita en espera de confirmación</span>
                <span className="text-[11px] text-ink-400">¿Deseas confirmar la sesión en la agenda oficial?</span>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave('confirmed')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
              >
                ✓ Confirmar Cita
              </button>
            </div>
          )}

          {/* Session Type */}
          <div>
            <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
              Tipo de Cita
            </label>
            <select
              value={appointmentType}
              onChange={(e) => {
                const newType = e.target.value;
                setAppointmentType(newType);
                if (newType === 'design_consultation') setDurationHours(0.75);
                else if (newType === 'touch_up') setDurationHours(1.0);
                else if (newType === 'tattoo_session' && durationHours < 1.5) setDurationHours(2.5);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
            >
              <option value="tattoo_session">🩸 Sesión de Tatuaje en Piel</option>
              <option value="design_consultation">📜 Consulta de Diseño (Asesoramiento / Boceto)</option>
              <option value="touch_up">✨ Repaso / Touch-up</option>
              <option value="break_blocked">☕ Bloqueo de Descanso / Vacaciones</option>
            </select>
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-ink-300 uppercase tracking-wider">
                Duración de la Sesión
              </label>
              <span className="font-mono text-amber-400 font-bold">
                {start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} → {calculatedEndTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({durationHours >= 1 ? `${durationHours}h` : `${Math.round(durationHours * 60)} min`})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '45 min (Consulta)', value: 0.75 },
                { label: '1 hora (Repaso)', value: 1.0 },
                { label: '1.5 h (Mini tattoo)', value: 1.5 },
                { label: '2 horas', value: 2.0 },
                { label: '2.5 h (Mediano)', value: 2.5 },
                { label: '3 horas (Estándar)', value: 3.0 },
                { label: '4 horas (Grande)', value: 4.0 },
                { label: '5 horas (Manga)', value: 5.0 }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDurationHours(opt.value)}
                  className={`py-2 px-2.5 rounded-xl font-mono text-[11px] font-semibold border transition-all text-center ${
                    Math.abs(durationHours - opt.value) < 0.05
                      ? 'bg-crimson-600/30 border-crimson-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-ink-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Selector */}
          <div>
            <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
              Estado de la Reserva
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pending', label: '⏳ Pendiente', activeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                { id: 'confirmed', label: '✅ Confirmada', activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                { id: 'completed', label: '🏁 Completada', activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatus(st.id)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    status === st.id
                      ? st.activeColor
                      : 'bg-ink-900 border-white/5 text-ink-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white font-semibold text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSave()}
            className="px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-xs shadow-lg shadow-crimson-600/30 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
