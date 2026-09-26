import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import TatooBackground from '@/components/TatooBackground';
import IntroSplash from '@/components/IntroSplash';

export const metadata: Metadata = {
  title: 'Tatoo AI — Asistente Inteligente para Estudios y Tatuadores',
  description: 'Plataforma integral con IA para gestión de citas, presupuestos automáticos con Eden AI, seguimiento de curación con visión, firma de consentimientos informados y marketing automatizado.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#141311] text-ink-100 min-h-screen flex flex-col antialiased selection:bg-crimson-600 selection:text-white relative">
        <TatooBackground />
        <IntroSplash />
        <Navbar />
        <main className="flex-1 flex flex-col relative z-0">
          {children}
        </main>
        <footer className="py-8 px-4 text-center text-xs text-ink-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="logo-t text-[22px] text-ink-100">T</span>
              <span className="font-semibold text-ink-300">Tatoo AI</span>
              <span>— Agenda y gestión para estudios de tatuaje</span>
            </div>
            <p className="text-ink-500">
              © {new Date().getFullYear()} Tatoo AI. Diseñado para estudios, tatuadores y clientes.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
