'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { translations, type Language } from '@/lib/i18n';
import { LogOut, ChevronDown } from 'lucide-react';
import { FlagIcon } from '@/components/landing/LandingIcons';
import h from './Navbar.module.css';

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

  const roleLabel = (role: string) => (role === 'studio' || role === 'artist' ? 'Estudio' : 'Cliente');

  const links = [
    { href: '/', label: t.nav.home },
    { href: '/shares', label: t.nav.shares },
    { href: '/reviews', label: t.nav.reviews },
  ];

  return (
    <header className={h.header}>
      <div className={h.inner}>
        <Link href="/" className={h.brand}>
          <span className={h.logo}>Tatto AI</span>
          <span className={h.tagline}>Agenda para estudios de tatuaje</span>
        </Link>

        <div className={h.links} role="navigation" aria-label="Principal">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={`${h.link} ${pathname === l.href ? h.active : ''}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className={h.actions}>
          <button onClick={toggleLanguage} className={h.pill} title="Cambiar idioma / Change language">
            <FlagIcon lang={lang} />
            <span className={h.hideSm}>{lang.toUpperCase()}</span>
            <ChevronDown className={h.chev} />
          </button>

          {user ? (
            <>
              <Link href="/dashboard" className={`${h.pill} ${h.pillStrong}`}>
                <span className={h.avatar}>{profile?.full_name?.charAt(0) || 'U'}</span>
                <span className={h.hideSm}>{profile?.full_name || t.nav.dashboard}</span>
                {profile?.role && <span className={`${h.role} ${h.hideSm}`}>· {roleLabel(profile.role)}</span>}
              </Link>
              <button onClick={handleLogout} className={`${h.pill} ${h.iconBtn}`} title={t.nav.logout} aria-label={t.nav.logout}>
                <LogOut />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${h.pill} ${h.hideXs}`}>{t.nav.login}</Link>
              <Link href="/register" className={`${h.pill} ${h.pillStrong}`}>{t.nav.register}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
