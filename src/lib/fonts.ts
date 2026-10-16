import { Literata } from 'next/font/google';

// Serif clásica de la portada (estilo "estudio de tatuaje"). Next la descarga al compilar y la sirve desde la propia web.
export const literata = Literata({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-landing',
});
