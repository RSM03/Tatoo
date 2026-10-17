// Dibujos de línea que la máquina "tatúa" en la escena (viewBox 0 0 200 200, un solo trazo por dibujo).

export type InkArt = 'calendar' | 'scales' | 'rose' | 'scroll' | 'camera';

export const INK_ART: Record<InkArt, string> = {
  // Calendario con anillas y casillas
  calendar:
    'M52 60H148Q160 60 160 72V148Q160 160 148 160H52Q40 160 40 148V72Q40 60 52 60Z M40 86H160 M70 46V72 M130 46V72 ' +
    'M58 104H76 M92 104H110 M126 104H144 M58 124H76 M92 124H110 M126 124H144 M58 144H76 M92 144H110',
  // Balanza
  scales:
    'M100 46V160 M72 162H128 M50 72H150 M94 40A6 6 0 1 0 106 40A6 6 0 1 0 94 40 ' +
    'M50 72L30 116 M50 72L70 116 M26 116Q50 142 74 116Z M150 72L130 116 M150 72L170 116 M126 116Q150 142 174 116Z',
  // Rosa con tallo y hojas
  rose:
    'M100 95c8-6 16 2 10 10c-6 9-22 6-24-6c-2-14 14-24 28-18c16 7 18 28 6 40c-14 14-40 10-48-8c-8-18 4-40 26-44 ' +
    'M100 135C98 150 96 162 92 178 M95 152c-14-8-26-4-32 6c10 6 22 6 32-6 M97 162c12-10 24-10 32-2c-10 8-22 8-32 2',
  // Cámara de fotos (el cliente manda fotos de la curación)
  camera:
    'M44 70H156Q168 70 168 82V146Q168 158 156 158H44Q32 158 32 146V82Q32 70 44 70Z M76 70L86 52H114L124 70 ' +
    'M128 114A28 28 0 1 0 72 114A28 28 0 1 0 128 114 M114 114A14 14 0 1 0 86 114A14 14 0 1 0 114 114 M142 86H154 M46 86H58',
  // Pergamino con texto y firma
  scroll:
    'M56 42H144V150H56Z M48 36H152 M48 156H152 M70 64H130 M70 80H130 M70 96H116 ' +
    'M66 128c8-14 14-14 16-2c2 10 8 10 12-2c4-10 10-10 12 0c2 8 8 8 14-4 M120 172L170 112',
};

// Separa un dibujo en sus trazos (cada "M" empieza uno): se tatúan de uno en uno, en orden.
export function strokesOf(art: InkArt): string[] {
  return INK_ART[art].split(/(?=M)/).map(d => d.trim()).filter(Boolean);
}
