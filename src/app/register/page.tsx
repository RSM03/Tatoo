'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, Sparkles, HeartHandshake, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

type RoleType = 'studio' | 'client';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as RoleType) || 'studio';

  const [selectedRole, setSelectedRole] = useState<RoleType>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studioName, setStudioName] = useState('');
  const [dniNie, setDniNie] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const roleParam = searchParams.get('role') as RoleType;
    if (roleParam && ['studio', 'client'].includes(roleParam)) {
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const userMetadata: Record<string, any> = {
        role: selectedRole,
        full_name: fullName.trim(),
        phone: phone.trim(),
      };

      if (selectedRole === 'studio') {
        userMetadata.studio_name = studioName.trim() || `Estudio de ${fullName}`;
      } else if (selectedRole === 'client') {
        userMetadata.dni_nie = dniNie.trim().toUpperCase();
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: userMetadata,
        },
      });

      if (error) throw error;

      setSuccessMsg('¡Cuenta creada correctamente! Redirigiendo a tu panel...');
      setTimeout(() => {
        router.push(`/dashboard?role=${selectedRole}`);
      }, 1200);

    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Error al completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-crimson-600 to-amber-500 mx-auto flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-crimson-600/30 mb-4">
            T
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Crear Cuenta</h1>
          <p className="text-sm text-ink-400 mt-1.5">Únete a la plataforma de gestión y asistencia inteligente</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-ink-900/90 p-1.5 rounded-2xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => setSelectedRole('studio')}
            className={`flex flex-col items-center gap-1 py-3 px-3 rounded-xl text-xs font-semibold transition-all ${
              selectedRole === 'studio'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-ink-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="font-bold">Estudio de Tatuaje</span>
            <span className="text-[10px] font-normal text-ink-400">Para Estudio y Tatuadores</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('client')}
            className={`flex flex-col items-center gap-1 py-3 px-3 rounded-xl text-xs font-semibold transition-all ${
              selectedRole === 'client'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-ink-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span className="font-bold">Cliente</span>
            <span className="text-[10px] font-normal text-ink-400">Para Reservar y Chatear</span>
          </button>
        </div>

        {/* Register Form */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-crimson-600/10 border border-crimson-500/30 text-crimson-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Conditional field for Studio */}
            {selectedRole === 'studio' && (
              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Nombre del Estudio de Tatuaje *
                </label>
                <input
                  type="text"
                  required
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Ej: Black Lotus Tattoo Studio"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white placeholder-ink-600 text-sm focus:outline-none focus:border-crimson-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                {selectedRole === 'studio' ? 'Nombre del Responsable / Propietario *' : 'Nombre y Apellidos *'}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Alex Rivera"
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white placeholder-ink-600 text-sm focus:outline-none focus:border-crimson-500 transition-colors"
              />
            </div>

            {/* Conditional field for Client: DNI / NIE */}
            {selectedRole === 'client' && (
              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  DNI / NIE / Pasaporte (Para consentimientos) *
                </label>
                <input
                  type="text"
                  required
                  value={dniNie}
                  onChange={(e) => setDniNie(e.target.value)}
                  placeholder="Ej: 12345678X"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white placeholder-ink-600 text-sm focus:outline-none focus:border-crimson-500 transition-colors uppercase"
                />
              </div>
            )}


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white placeholder-ink-600 text-sm focus:outline-none focus:border-crimson-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white placeholder-ink-600 text-sm focus:outline-none focus:border-crimson-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                Contraseña (Mínimo 6 caracteres) *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white placeholder-ink-600 text-sm focus:outline-none focus:border-crimson-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-crimson-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creando cuenta...' : 'Registrarse como ' + (selectedRole === 'studio' ? 'Estudio de Tatuaje' : 'Cliente')}</span>
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-ink-400">
              ¿Ya estás registrado?{' '}
              <Link href="/login" className="text-crimson-400 hover:text-crimson-300 font-semibold underline underline-offset-4">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
