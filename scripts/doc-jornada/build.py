#!/usr/bin/env python3
"""
Monta o documento "Jornada da Nutricionista com a Paciente" a partir do Markdown (fonte única):

  docs/jornada/JORNADA-DA-NUTRICIONISTA-HOLOHACKING.md   (fonte, editável)
    -> docs/jornada/JORNADA-DA-NUTRICIONISTA-HOLOHACKING.html  (A4, identidade HoloHacking)
    -> PDF (scripts/doc-jornada/pdf.mjs, Chromium)  e  DOCX (LibreOffice), feitos depois

Convenções no Markdown (python-markdown: tables, attr_list, md_in_html, toc):
  <div class="box pratica" markdown="1"> ... </div>   caixas (pratica, sistema, decide, percebe, atencao, resultado, proximo, futuro)
  <div class="quebra"></div>                            quebra de página
  imagens em imagens/ (relativas ao .md)

  python3 scripts/doc-jornada/build.py
"""
import re, sys, pathlib, html
import markdown

RAIZ = pathlib.Path(__file__).resolve().parents[2]
DIR = RAIZ / 'docs' / 'jornada'
MD = DIR / 'JORNADA-DA-NUTRICIONISTA-HOLOHACKING.md'
OUT = DIR / 'JORNADA-DA-NUTRICIONISTA-HOLOHACKING.html'
CSS = (pathlib.Path(__file__).parent / 'estilo.css').read_text(encoding='utf-8')

ROTULO = {
    'pratica': 'Na prática', 'sistema': 'O que o sistema faz', 'decide': 'O que a nutricionista decide',
    'percebe': 'O que a paciente percebe', 'atencao': 'Atenção metodológica', 'resultado': 'Resultado desta etapa',
    'proximo': 'Próximo passo', 'futuro': 'Visão futura / experiência desejada', 'chave': '',
}

texto = MD.read_text(encoding='utf-8')
# a capa e a apresentação vêm do bloco <!-- CAPA --> ... <!-- /CAPA --> (HTML puro no .md)
md = markdown.Markdown(extensions=['tables', 'attr_list', 'md_in_html', 'toc', 'sane_lists'],
                       extension_configs={'toc': {'toc_depth': '1-2', 'slugify': lambda v, s: re.sub(r'[^a-z0-9]+', '-', v.lower()).strip('-')}})
corpo = md.convert(texto)

# rótulo automático das caixas
def rotular(m):
    classes = m.group(1)
    tipo = next((c for c in classes.split() if c in ROTULO), None)
    rot = ROTULO.get(tipo, '')
    return m.group(0) + (f'<p class="box-rotulo">{rot}</p>' if rot else '')
corpo = re.sub(r'<div class="box ([^"]+)">', rotular, corpo)

# sumário: só os capítulos (h1 numerados) e as partes
toc = []
for tok in md.toc_tokens:
    if tok['level'] == 1 and not tok['name'].startswith(('Sumário', 'Jornada da Nutricionista')):
        toc.append(f'<li><a href="#{tok["id"]}">{tok["name"]}</a></li>')
corpo = corpo.replace('<p>[[SUMARIO]]</p>', '<ol class="sumario">' + ''.join(toc) + '</ol>')

doc = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>HoloHacking — Jornada da Nutricionista com a Paciente</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>{CSS}</style></head>
<body>{corpo}</body></html>"""
OUT.write_text(doc, encoding='utf-8')
print('html', OUT.relative_to(RAIZ), len(doc) // 1024, 'KB;', len(toc), 'capítulos no sumário')
