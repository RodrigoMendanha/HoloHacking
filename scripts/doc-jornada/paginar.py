#!/usr/bin/env python3
"""Numera as páginas do PDF (a capa fica sem número) com rodapé discreto na identidade do HoloHacking."""
import pathlib, pymupdf
RAIZ = pathlib.Path(__file__).resolve().parents[2]
PDF = RAIZ / 'docs/jornada/JORNADA-DA-NUTRICIONISTA-HOLOHACKING.pdf'
doc = pymupdf.open(PDF)
fonte = pymupdf.Font(fontfile=str(pathlib.Path.home() / '.local/share/fonts/jost-latin-400-normal.ttf'))
for i, pg in enumerate(doc):
    if i == 0: continue
    pg.wrap_contents()
    w, h = pg.rect.width, pg.rect.height
    tw = pymupdf.TextWriter(pg.rect)
    txt = 'HOLOHACKING  ·  Jornada da Nutricionista com a Paciente'
    tw.append((54, h - 30), txt, font=fonte, fontsize=7)
    n = str(i + 1)
    tw.append((w - 54 - fonte.text_length(n, 8), h - 30), n, font=fonte, fontsize=8)
    tw.write_text(pg, color=(0.54, 0.44, 0.2))
    pg.draw_line((54, h - 40), (w - 54, h - 40), color=(0.79, 0.64, 0.35), width=0.4)
tmp = PDF.with_suffix('.tmp.pdf'); doc.save(tmp, garbage=3, deflate=True); doc.close(); tmp.replace(PDF)
print('páginas', len(pymupdf.open(PDF)))
