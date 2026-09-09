'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Lock,
  UserCheck
} from 'lucide-react';

interface PublicArtistAgendaProps {
  artist: any;
  studio?: any;
  currentClientId?: string | null;
  onBookSlot: (date: string, time: string) => void;
  onOpenChat: (artist?: any) => void;
  onBack?: () => void;
  onClose?: () => void;
}

export default function PublicArtistAgenda({
  artist,
  studio,
  currentClientId,
  onBookSlot,
  onOpenChat,
  onBack,
  onClose
}: PublicArtistAgendaProps) {
  const handleBack = onClose || onBack || (() => {});
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchArtistAgenda();
  }, [artist.id]);

  const fetchArtistAgenda = async () => {
    setLoading(true);
    try {
      // Fetch ONLY appointment times, status, type and client_id (NO names, phones, emails for GDPR privacy)
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, appointment_type, status, client_id, title')
        .eq('artist_id', artist.id)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error loading public artist agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDate = () => {
    const d = new Date(calendarDate);
    if (calendarView === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCalendarDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(calendarDate);
    if (calendarView === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCalendarDate(d);
  };

  const handleTodayDate = () => {
    setCalendarDate(new Date());
  };

  const getWeekDays = (baseDate: Date) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      return dayDate;
    });
  };

  const getMonthData = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const totalDays = lastDay.getDate();
    return { startingDayOfWeek, totalDays, year, month };
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const weekDays = getWeekDays(calendarDate);
  const monthData = getMonthData(calendarDate);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-ink-900/90 border border-crimson-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white border border-white/10 transition-colors"
            title="Volver a la selección de tatuadores"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-crimson-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-crimson-600/30">
            {artist.display_name?.charAt(0) || 'A'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">
                Agenda de {artist.display_name}
              </h2>
              {studio?.name && (
                <span className="text-xs text-ink-400 font-medium">
                  · {studio.name} ({studio.city || 'Estudio'})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Vista pública protegida (GDPR)
              </span>
              <span>· Especialidades: {artist.specialties?.join(', ') || 'Todo estilo'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenChat}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chatear con {artist.display_name}</span>
          </button>

          <button
            onClick={() => {
              const todayIso = new Date().toISOString().split('T')[0];
              onBookSlot(todayIso, '11:00');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold transition-all shadow-md shadow-crimson-600/30 hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Pedir Cita</span>
          </button>
        </div>
      </div>

      {/* Calendar Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-ink-900/90 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center bg-ink-950 rounded-2xl border border-white/10 p-1 shadow-inner">
            <button
              onClick={handlePrevDate}
              className="p-2 rounded-xl hover:bg-white/10 text-ink-300 hover:text-white transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleTodayDate}
              className="px-3.5 py-1.5 rounded-xl hover:bg-white/10 text-xs font-bold text-ink-200 hover:text-white transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNextDate}
              className="p-2 rounded-xl hover:bg-white/10 text-ink-300 hover:text-white transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Range Title */}
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {calendarView === 'week' ? (
              <span>
                Semana del {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            ) : (
              <span className="capitalize">
                {calendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
            )}
          </h3>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-ink-950 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setCalendarView('week')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                calendarView === 'week'
                  ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30'
                  : 'text-ink-400 hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                calendarView === 'month'
                  ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30'
                  : 'text-ink-400 hover:text-white'
              }`}
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs flex items-center justify-between gap-3 text-ink-300">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Las citas de otros clientes aparecen marcadas como <strong>"Horario Ocupado"</strong> para preservar la privacidad de datos. Tus propias citas aparecen resaltadas en <strong>verde</strong>.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold">
          <span className="flex items-center gap-1 text-emerald-400">● Tu cita</span>
          <span className="flex items-center gap-1 text-ink-400">● Ocupado</span>
          <span className="flex items-center gap-1 text-amber-400">● Descanso</span>
        </div>
      </div>

      {/* WEEK VIEW (7 COLUMNS) */}
      {calendarView === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((dayDate, idx) => {
            const isToday = isSameDay(dayDate, new Date());
            const dayIso = dayDate.toISOString().split('T')[0];
            const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));
            const dayAppointments = appointments.filter(a => isSameDay(new Date(a.start_time), dayDate));

            return (
              <div
                key={idx}
                className={`rounded-3xl border p-3.5 flex flex-col justify-between min-h-[420px] transition-all ${
                  isToday
                    ? 'bg-crimson-950/20 border-crimson-500/40 shadow-xl shadow-crimson-950/20'
                    : isPast
                    ? 'bg-ink-950/40 border-white/5 opacity-60'
                    : 'bg-ink-950/70 border-white/5 hover:border-white/10'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-300">
                      {dayDate.toLocaleDateString('es-ES', { weekday: 'short' })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${isToday ? 'text-crimson-400 font-extrabold' : 'text-white'}`}>
                        {dayDate.getDate()}
                      </span>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-crimson-500 animate-ping" />}
                    </div>
                  </div>

                  {/* Appointments / Occupied Blocks */}
                  <div className="space-y-2">
                    {dayAppointments.length === 0 ? (
                      <div className="text-center py-10 text-[11px] text-emerald-400/80 font-mono flex flex-col items-center gap-1">
                        <span>✨ Agenda disponible</span>
                        <span className="text-[10px] text-ink-500">Huecos libres para reservar</span>
                      </div>
                    ) : (
                      dayAppointments.map(app => {
                        const start = new Date(app.start_time);
                        const end = new Date(app.end_time);
                        const isMyAppointment = currentClientId && app.client_id === currentClientId;
                        const isBreak = app.appointment_type === 'break_blocked' || app.appointment_type === 'vacation';

                        if (isMyAppointment) {
                          return (
                            <div
                              key={app.id}
                              className="p-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs leading-snug shadow-md"
                            >
                              <div className="flex items-center justify-between font-mono text-[10px] font-bold mb-1">
                                <span>
                                  {start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span>⭐ TU CITA</span>
                              </div>
                              <div className="font-bold text-white text-xs">
                                {app.title || (app.appointment_type === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje')}
                              </div>
                            </div>
                          );
                        }

                        if (isBreak) {
                          return (
                            <div
                              key={app.id}
                              className="p-2.5 rounded-2xl border border-amber-500/20 bg-amber-950/20 text-amber-300/80 text-xs leading-snug"
                            >
                              <div className="flex items-center justify-between font-mono text-[10px] opacity-75 mb-0.5">
                                <span>
                                  {start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span>☕</span>
                              </div>
                              <div className="font-semibold text-amber-200/90 text-xs">Descanso / Pausa</div>
                            </div>
                          );
                        }

                        // Anonymized occupied slot
                        return (
                          <div
                            key={app.id}
                            className="p-2.5 rounded-2xl border border-white/10 bg-white/5 text-ink-300 text-xs leading-snug"
                          >
                            <div className="flex items-center justify-between font-mono text-[10px] text-ink-400 mb-0.5">
                              <span>
                                {start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <Lock className="w-3 h-3 text-ink-500" />
                            </div>
                            <div className="font-semibold text-ink-200 text-xs">
                              {app.appointment_type === 'design_consultation' ? '📜 Consulta Reservada' : '🩸 Sesión Reservada'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quick Slot Booking Button */}
                {!isPast && (
                  <button
                    type="button"
                    onClick={() => onBookSlot(dayIso, '11:00')}
                    className="mt-3 w-full py-2 rounded-xl bg-crimson-600/20 hover:bg-crimson-600 text-crimson-300 hover:text-white border border-crimson-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Reservar este día</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MONTH VIEW (FULL BOARD) */}
      {calendarView === 'month' && (
        <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-2xl bg-ink-950/70">
          <div className="grid grid-cols-7 gap-2 pb-3 mb-3 border-b border-white/10 text-center font-mono text-xs font-bold text-ink-400">
            <div>LUN</div>
            <div>MAR</div>
            <div>MIÉ</div>
            <div>JUE</div>
            <div>VIE</div>
            <div>SÁB</div>
            <div>DOM</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: monthData.startingDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] rounded-2xl bg-transparent opacity-10" />
            ))}

            {Array.from({ length: monthData.totalDays }, (_, i) => {
              const dayNum = i + 1;
              const thisDate = new Date(monthData.year, monthData.month, dayNum);
              const isToday = isSameDay(thisDate, new Date());
              const isPast = thisDate < new Date(new Date().setHours(0, 0, 0, 0));
              const dayAppointments = appointments.filter(a => isSameDay(new Date(a.start_time), thisDate));
              const hasMyAppointment = currentClientId && dayAppointments.some(a => a.client_id === currentClientId);

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    if (!isPast) {
                      const iso = thisDate.toISOString().split('T')[0];
                      onBookSlot(iso, '11:00');
                    }
                  }}
                  className={`min-h-[90px] p-2.5 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                    isPast
                      ? 'bg-ink-950/40 border-white/5 opacity-50 cursor-not-allowed'
                      : 'bg-ink-900/60 border-white/5 hover:border-crimson-500/40 cursor-pointer hover:bg-white/5'
                  } ${isToday ? 'border-crimson-500/40 bg-crimson-950/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-bold ${isToday ? 'text-crimson-400' : 'text-white'}`}>
                      {dayNum}
                    </span>
                    {hasMyAppointment && (
                      <span className="text-[10px] text-emerald-400 font-bold">⭐ TU CITA</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((app, aIdx) => {
                      const isMy = currentClientId && app.client_id === currentClientId;
                      return (
                        <div
                          key={aIdx}
                          className={`text-[9px] px-1.5 py-0.5 rounded truncate font-mono ${
                            isMy
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                              : 'bg-white/5 text-ink-400'
                          }`}
                        >
                          {isMy ? '⭐ Tu Cita' : '🔒 Ocupado'}
                        </div>
                      );
                    })}
                    {dayAppointments.length > 2 && (
                      <span className="text-[9px] text-ink-500 font-mono block">
                        +{dayAppointments.length - 2} más
                      </span>
                    )}
                  </div>

                  {!isPast && (
                    <span className="text-[9px] text-crimson-400/80 hover:text-crimson-300 font-semibold text-right block pt-1">
                      + Reservar
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
