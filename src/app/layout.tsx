import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

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
      <body className="bg-ink-950 text-ink-100 min-h-screen flex flex-col antialiased selection:bg-crimson-600 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-ink-500 bg-ink-900/50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-crimson-600 flex items-center justify-center text-white text-xs font-bold">T</div>
              <span className="font-semibold text-ink-300">Tatoo AI Platform</span>
              <span>— El ecosistema inteligente para el arte corporal</span>
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
