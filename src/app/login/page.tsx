'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, Sparkles, HeartHandshake, LogIn, AlertCircle } from 'lucide-react';

type RoleType = 'studio' | 'client';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('studio');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Verify user's actual role in database
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      const userRole = profile?.role || selectedRole;

      // Redirect to dashboard
      router.push(`/dashboard?role=${userRole}`);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Credenciales no válidas. Revisa tu correo y contraseña.');
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
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Iniciar Sesión</h1>
          <p className="text-sm text-ink-400 mt-1.5">Accede a tu panel según tu perfil en la plataforma</p>
        </div>

        {/* Role Selector Tabs (Studio vs Client) */}
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
            <span className="text-[10px] font-normal text-ink-400">Dueños y Tatuadores</span>
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
            <span className="text-[10px] font-normal text-ink-400">Citas y Chat</span>
          </button>
        </div>

        {/* Login Form Container */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-crimson-600/10 border border-crimson-500/30 text-crimson-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === 'studio' ? 'estudio@tatuajes.com' : 'cliente@gmail.com'}
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white placeholder-ink-600 text-sm focus:outline-none focus:border-crimson-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                Contraseña
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
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Accediendo...' : 'Entrar como ' + (selectedRole === 'studio' ? 'Estudio / Tatuador' : 'Cliente')}</span>
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-ink-400">
              ¿Todavía no tienes cuenta?{' '}
              <Link href={`/register?role=${selectedRole}`} className="text-crimson-400 hover:text-crimson-300 font-semibold underline underline-offset-4">
                Crear cuenta nueva
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
