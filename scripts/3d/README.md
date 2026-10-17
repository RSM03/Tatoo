# Generadores de la intro

Scripts para regenerar recursos de la web. Necesitan Python 3.12 con `fonttools[woff]` (`brotli`).

## Letras de la intro ("Tattoo AI")

```
python scripts/3d/gen_intro_glyphs.py <fuente Literata .woff2> src/components/introGlyphs.ts
```

- Saca los contornos de cada letra en Literata 700 para que la chispa dorada los recorra.
- La fuente está en `.next/static/media` después de `npm run dev`. Es la variable latina, la que contiene la "T".
