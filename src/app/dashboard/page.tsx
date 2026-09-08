'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ClientPortal from '@/components/dashboard/ClientPortal';
import ArtistPortal from '@/components/dashboard/ArtistPortal';
import StudioPortal from '@/components/dashboard/StudioPortal';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-ink-400 font-mono">Cargando panel de control...</span>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Fallback for demonstration / development if not logged in
        const roleOverride = searchParams.get('role') || 'client';
        const mockUser = { id: 'mock-user-id', email: 'demo@tatoo.app' };
        const mockProfile = {
          id: 'mock-user-id',
          email: 'demo@tatoo.app',
          role: roleOverride,
          full_name: roleOverride === 'studio' ? 'Estudio Demo' : roleOverride === 'artist' ? 'Tatuador Demo' : 'Cliente Demo',
          language: 'es'
        };
        setUser(mockUser);
        setProfile(mockProfile);
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Fetch user profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setProfile(prof || {
        id: session.user.id,
        email: session.user.email,
        role: searchParams.get('role') || 'client',
        full_name: session.user.email?.split('@')[0],
        language: 'es'
      });

      setLoading(false);
    }

    init();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-ink-400 font-mono">Cargando panel de control...</span>
        </div>
      </div>
    );
  }

  const role = profile?.role || searchParams.get('role') || 'client';

  if (role === 'studio' || role === 'artist') {
    return <StudioPortal user={user} profile={profile} />;
  }

  return <ClientPortal user={user} profile={profile} />;
}
