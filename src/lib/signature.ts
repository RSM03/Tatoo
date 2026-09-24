/**
 * Digital Signature Optimization & Processing
 * 
 * Ensures signatures drawn on dark canvas (white pen) or light canvas are transformed into
 * high-contrast, professional dark ink (#0f172a) suitable for printing, PDF generation,
 * and legal document storage.
 */

export function ensureDarkInkSignature(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof window === 'undefined' || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl || '');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 450;
        canvas.height = img.naturalHeight || img.height || 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Transparent or faint background noise (< 15 alpha)
          if (a <= 15) {
            data[i + 3] = 0;
            continue;
          }

          // Perceived luminance (ITU-R BT.601)
          const luminance = (r * 299 + g * 587 + b * 114) / 1000;

          // If the stroke was drawn in white or light ink, convert to rich dark ink (#0f172a)
          if (luminance > 100) {
            data[i] = 15;     // R (#0f)
            data[i + 1] = 23; // G (#17)
            data[i + 2] = 42; // B (#2a)
            // keep alpha untouched for clean anti-aliasing
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Signature dark-ink conversion error, falling back to original:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
