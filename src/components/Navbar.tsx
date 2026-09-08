'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { translations, type Language } from '@/lib/i18n';
import { Sparkles, Calendar, MessageSquare, Image, LogIn, User, LogOut, Globe } from 'lucide-react';

export default function Navbar() {
  const [lang, setLang] = useState<Language>('es');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const t = translations[lang];

  useEffect(() => {
    // Check saved language
    const savedLang = localStorage.getItem('tatoo_lang') as Language;
    if (savedLang) setLang(savedLang);

    // Check user session
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setProfile(prof);
      }
    }
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'es' ? 'en' : 'es';
    setLang(nextLang);
    localStorage.setItem('tatoo_lang', nextLang);
    window.dispatchEvent(new Event('languageChange'));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'studio':
      case 'artist':
        return <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded border border-amber-500/30">Estudio / Tatuadores</span>;
      default:
        return <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-500/30">Cliente</span>;
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-crimson-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-crimson-600/30 group-hover:scale-105 transition-transform">
            T
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Tatoo <span className="text-crimson-500 text-xs font-mono uppercase bg-crimson-500/10 px-1.5 py-0.5 rounded border border-crimson-500/20">AI</span>
            </span>
            <span className="text-[10px] text-ink-400 tracking-wider uppercase font-medium">Smart Tattoo Studio</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-ink-900/80 p-1 rounded-full border border-white/5">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              pathname === '/' ? 'bg-white/10 text-white shadow-sm' : 'text-ink-400 hover:text-white'
            }`}
          >
            {t.nav.home}
          </Link>
          <Link
            href="/shares"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname === '/shares' ? 'bg-white/10 text-white shadow-sm' : 'text-ink-400 hover:text-white'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            {t.nav.shares}
          </Link>
          <Link
            href="/reviews"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              pathname === '/reviews' ? 'bg-white/10 text-white shadow-sm' : 'text-ink-400 hover:text-white'
            }`}
          >
            {t.nav.reviews}
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-ink-300 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
            title="Cambiar idioma / Change language"
          >
            <Globe className="w-3.5 h-3.5 text-crimson-500" />
            <span className="uppercase">{lang}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-xl text-sm font-medium text-white transition-all hover:border-crimson-500/40"
              >
                <div className="w-6 h-6 rounded-full bg-crimson-600/30 text-crimson-500 flex items-center justify-center text-xs font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <span>{profile?.full_name || t.nav.dashboard}</span>
                {profile?.role && getRoleBadge(profile.role)}
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-ink-400 hover:text-crimson-500 hover:bg-crimson-500/10 rounded-lg transition-colors"
                title={t.nav.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-ink-300 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <LogIn className="w-4 h-4 text-crimson-500" />
                <span>{t.nav.login}</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 bg-crimson-600 hover:bg-crimson-500 text-white text-sm font-semibold px-4 py-1.5 rounded-xl shadow-lg shadow-crimson-600/25 transition-all hover:scale-105"
              >
                <span>{t.nav.register}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
