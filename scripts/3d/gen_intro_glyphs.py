"""Genera los contornos de "Tatto AI" en Literata 700 para la intro (mismo formato que la intro original)."""
import json
import sys

from fontTools.misc.transform import Transform
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

font_path, out_path = sys.argv[1], sys.argv[2]
TEXT = 'Tattoo AI'
GOLD = {'A', 'I'}
VIEW_W, BASELINE, CAP_PX = 760, 150, 122

font = instancer.instantiateVariableFont(TTFont(font_path), {'wght': 700})
cmap = font.getBestCmap()
gs = font.getGlyphSet()
hmtx = font['hmtx']
cap_h = font['OS/2'].sCapHeight or 700
s = CAP_PX / cap_h

names = [cmap[ord(c)] for c in TEXT]
total = sum(hmtx[n][0] for n in names)
s = min(s, (VIEW_W - 24) / total)  # que quepa en el ancho
x0 = (VIEW_W - total * s) / 2


def fmt(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


glyphs = []
pen_x = 0
for ch, name in zip(TEXT, names):
    if ch != ' ':
        rec = RecordingPen()
        gs[name].draw(rec)
        # separa en contornos
        contours, cur = [], []
        for op, args in rec.value:
            cur.append((op, args))
            if op in ('closePath', 'endPath'):
                contours.append(cur)
                cur = []
        if cur:
            contours.append(cur)
        t = Transform(s, 0, 0, -s, x0 + pen_x * s, BASELINE)
        subs = []
        for c in contours:
            sp = SVGPathPen(None, ntos=fmt)
            tp = TransformPen(sp, t)
            for op, args in c:
                getattr(tp, op)(*args)
            subs.append(sp.getCommands())
        glyphs.append({'ch': ch, 'ai': ch in GOLD, 'subs': subs, 'full': ''.join(subs)})
    pen_x += hmtx[name][0]

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('// Contornos de "Tattoo AI" en Literata 700 (generados desde la fuente), para la intro de entrada.\n')
    f.write('// Cada letra: "subs" son sus trazos (los recorre la chispa) y "full" la letra entera (el relleno).\n')
    f.write('export const INTRO_GLYPHS: { ch: string; ai: boolean; subs: string[]; full: string }[] = ')
    f.write(json.dumps(glyphs, ensure_ascii=False))
    f.write(';\n')

print('glyphs', [(g['ch'], len(g['subs'])) for g in glyphs], 'scale', round(s, 4), 'width', round(total * s, 1), 'x0', round(x0, 1))
