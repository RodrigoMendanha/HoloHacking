# -*- coding: utf-8 -*-
"""
HOLOS AI - modelo do PDF de saida (versao HOLOS-AI-PDF 1.0).

Uso dentro do GPT (Code Interpreter):
    exec(open('/mnt/data/holos_ai_pdf.py', encoding='utf-8').read())
    gerar_pdf(dados, '/mnt/data/HOLOS-AI_<identificador>_<AAAA-MM-DD>.pdf')

`dados` e um dict com:
  meta:      {titulo_atendimento, identificador, data_atendimento, tipo ('primeira consulta' | 'retorno'),
              data_analise, prompt_version, kb_version}
  pacote:    [ {titulo, itens: [[rotulo, valor], ...]} | {titulo, texto} ]   <- TODO o Pacote recebido, fiel, na ordem
  resultado: {
    sintese: str,
    convergencias: [str], padroes_observados: [str], hipoteses_para_investigar: [str], questoes_para_aprofundar: [str],
    direcionamentos: [ {titulo, sistema, por_que, objetivo, baseado_em: [str], catalogo: str, status: 'SUGERIDO'} ],
    estrategias: [ {titulo, direcionamento, tipo, o_que_fazer, o_que_observar, prazo, baseado_em: [str], catalogo: str, status} ],
    corpo: str, mente: str, espirito: str,
    observar: [str], proxima_etapa: str,
    retorno: [ {estrategia, decisao_sugerida, motivo, baseado_em: [str]} ]   (so em retorno; senao [])
    fontes_utilizadas: [str], alertas_metodologicos: [str], informacao_insuficiente: [str]
  }
Campos ausentes viram "Sem dado". Nada aqui inventa conteudo: o script so diagrama o que recebeu.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, KeepTogether, CondPageBreak)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xml.sax.saxutils import escape

VERDE = colors.HexColor('#0b3325')
VERDE2 = colors.HexColor('#1f5a43')
DOURADO = colors.HexColor('#a8853f')
CREME = colors.HexColor('#f7f3ea')
CINZA = colors.HexColor('#5d625e')
LINHA = colors.HexColor('#ddd5c4')
ALERTA = colors.HexColor('#8a3b2a')

FONTE, FONTE_B = 'Helvetica', 'Helvetica-Bold'
for base in ['/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/dejavu', '/usr/share/fonts/TTF']:
    r, b = os.path.join(base, 'DejaVuSans.ttf'), os.path.join(base, 'DejaVuSans-Bold.ttf')
    if os.path.exists(r) and os.path.exists(b):
        try:
            pdfmetrics.registerFont(TTFont('HDeja', r)); pdfmetrics.registerFont(TTFont('HDeja-B', b))
            FONTE, FONTE_B = 'HDeja', 'HDeja-B'
        except Exception:
            pass
        break

def _st(nome, **kw):
    base = dict(fontName=FONTE, fontSize=9.5, leading=13.5, textColor=colors.HexColor('#1d211f'), alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(nome, **base)

S = {
    'capa_marca': _st('capa_marca', fontName=FONTE_B, fontSize=9, textColor=DOURADO, leading=12, alignment=TA_CENTER),
    'capa_tit': _st('capa_tit', fontName=FONTE_B, fontSize=24, leading=29, textColor=VERDE, alignment=TA_CENTER),
    'capa_sub': _st('capa_sub', fontSize=11, leading=15, textColor=CINZA, alignment=TA_CENTER),
    'parte': _st('parte', fontName=FONTE_B, fontSize=8.5, leading=11, textColor=DOURADO, spaceBefore=4, spaceAfter=2),
    'h1': _st('h1', fontName=FONTE_B, fontSize=15, leading=19, textColor=VERDE, spaceAfter=6),
    'h2': _st('h2', fontName=FONTE_B, fontSize=11, leading=14, textColor=VERDE2, spaceBefore=10, spaceAfter=4),
    'p': _st('p'),
    'pq': _st('pq', fontSize=8.5, leading=12, textColor=CINZA),
    'rot': _st('rot', fontName=FONTE_B, fontSize=8, leading=11, textColor=CINZA),
    'li': _st('li', leftIndent=10, bulletIndent=0),
    'card_t': _st('card_t', fontName=FONTE_B, fontSize=10.5, leading=14, textColor=VERDE),
    'selo': _st('selo', fontName=FONTE_B, fontSize=7.5, leading=10, textColor=DOURADO),
    'aviso': _st('aviso', fontName=FONTE_B, fontSize=9, leading=12.5, textColor=ALERTA, alignment=TA_CENTER),
}

def T(x):
    """texto seguro: escapa e preserva quebras"""
    if x is None:
        return 'Sem dado'
    if isinstance(x, (list, tuple)):
        x = '; '.join(str(i) for i in x if str(i).strip())
    x = str(x).strip()
    return escape(x).replace('\n', '<br/>') if x else 'Sem dado'

def _lista(itens, vazio='Sem dado'):
    itens = [i for i in (itens or []) if str(i).strip()]
    if not itens:
        return [Paragraph(vazio, S['pq'])]
    return [Paragraph(T(i), S['li'], bulletText='•') for i in itens]

def _tabela_pares(pares):
    linhas = [[Paragraph(T(r), S['rot']), Paragraph(T(v), S['p'])] for r, v in pares]
    if not linhas:
        return Paragraph('Sem dado', S['pq'])
    t = Table(linhas, colWidths=[52 * mm, None], hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.4, LINHA),
                           ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                           ('LEFTPADDING', (0, 0), (-1, -1), 2)]))
    return t

def _card(titulo, selo, linhas, baseado=None):
    corpo = [Paragraph(T(titulo), S['card_t']), Paragraph(escape(selo), S['selo']), Spacer(1, 3)]
    for r, v in linhas:
        if v is None or (isinstance(v, str) and not v.strip()):
            continue
        corpo.append(Paragraph('<font name="%s" color="#5d625e">%s</font>  %s' % (FONTE_B, escape(r.upper()), T(v)), S['p']))
    if baseado:
        corpo.append(Spacer(1, 3))
        corpo.append(Paragraph('<font name="%s" color="#5d625e">BASEADO EM</font>' % FONTE_B, S['p']))
        corpo += _lista(baseado)
    t = Table([[corpo]], colWidths=[None])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), CREME), ('BOX', (0, 0), (-1, -1), 0.6, LINHA),
                           ('LINEBEFORE', (0, 0), (0, -1), 2.2, DOURADO), ('LEFTPADDING', (0, 0), (-1, -1), 9),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 9), ('TOPPADDING', (0, 0), (-1, -1), 7),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    return KeepTogether([t, Spacer(1, 6)])

def _rodape(meta):
    def desenhar(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONTE, 7.5); canvas.setFillColor(CINZA)
        canvas.drawString(18 * mm, 10 * mm, 'HOLOS AI \u00b7 sugest\u00f5es para revis\u00e3o profissional \u00b7 n\u00e3o entregar \u00e0 paciente sem confirma\u00e7\u00e3o')
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, 'P\u00e1gina %d' % doc.page)
        canvas.setStrokeColor(LINHA); canvas.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
        canvas.restoreState()
    return desenhar

def gerar_pdf(dados, caminho):
    meta = dados.get('meta') or {}
    pacote = dados.get('pacote') or []
    r = dados.get('resultado') or {}
    doc = BaseDocTemplate(caminho, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
                          title='HOLOS AI - Analise do Atendimento', author='HOLOS AI')
    fr = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
    doc.addPageTemplates([PageTemplate(id='p', frames=[fr], onPage=_rodape(meta))])
    E = []

    # ---------- capa ----------
    E += [Spacer(1, 38 * mm), Paragraph('HOLOHACKING · NUTRIÇÃO HOLÍSTICA', S['capa_marca']), Spacer(1, 6),
          Paragraph('HOLOS AI', S['capa_tit']), Paragraph('Análise do Atendimento', S['capa_sub']), Spacer(1, 16)]
    E.append(_tabela_pares([
        ['Atendimento', meta.get('titulo_atendimento')], ['Identificador', meta.get('identificador')],
        ['Data do atendimento', meta.get('data_atendimento')], ['Tipo', meta.get('tipo')],
        ['Data da análise', meta.get('data_analise')], ['Versão do agente', meta.get('prompt_version')],
        ['Base de conhecimento', meta.get('kb_version')]]))
    E += [Spacer(1, 14), Paragraph('TODO O CONTEÚDO DA PARTE B É SUGESTÃO (status SUGERIDO). A NUTRICIONISTA CONFIRMA, EDITA OU DESCARTA '
                                   'CADA ITEM ANTES DE QUALQUER USO COM A PACIENTE. NÃO É DIAGNÓSTICO NEM PRESCRIÇÃO.', S['aviso']),
          Spacer(1, 10), Paragraph('Parte A - Pacote recebido (transcrição fiel do PDF enviado pelo HoloHacking)<br/>'
                                   'Parte B - Análise HOLOS AI (HOLOS_AI_RESULT)<br/>Parte C - Fontes, alertas e rastreabilidade', S['capa_sub']),
          PageBreak()]

    # ---------- Parte A ----------
    E += [Paragraph('PARTE A', S['parte']), Paragraph('Pacote recebido', S['h1']),
          Paragraph('Transcrição fiel e organizada de tudo o que veio no Pacote HOLOS AI. Nada foi resumido, corrigido ou interpretado nesta parte.', S['pq'])]
    for sec in pacote:
        bloco = [Paragraph(T(sec.get('titulo')), S['h2'])]
        if sec.get('itens'):
            bloco.append(_tabela_pares(sec['itens']))
        else:
            bloco.append(Paragraph(T(sec.get('texto')), S['p']))
        E += [CondPageBreak(40 * mm)] + bloco
    E.append(PageBreak())

    # ---------- Parte B ----------
    E += [Paragraph('PARTE B', S['parte']), Paragraph('Análise HOLOS AI', S['h1'])]
    E += [Paragraph('Síntese', S['h2']), Paragraph(T(r.get('sintese')), S['p'])]
    for chave, titulo in [('convergencias', 'Convergências'), ('padroes_observados', 'Padrões observados'),
                          ('hipoteses_para_investigar', 'Hipóteses para investigar (não são conclusões)'),
                          ('questoes_para_aprofundar', 'Questões para aprofundar na próxima conversa')]:
        E += [Paragraph(titulo, S['h2'])] + _lista(r.get(chave))
    E += [CondPageBreak(50 * mm), Paragraph('Direcionamentos sugeridos', S['h2'])]
    if not r.get('direcionamentos'):
        E.append(Paragraph('Informação insuficiente para sugerir direcionamento.', S['pq']))
    for i, d in enumerate(r.get('direcionamentos') or [], 1):
        E.append(_card('%d. %s' % (i, d.get('titulo') or 'Sem título'), 'STATUS: %s  ·  %s' % (d.get('status') or 'SUGERIDO', d.get('catalogo') or 'CANDIDATO NÃO CATALOGADO'),
                       [['Sistema', d.get('sistema') or 'sem vínculo'], ['Por que', d.get('por_que')], ['Objetivo desta etapa', d.get('objetivo')]],
                       d.get('baseado_em')))
    E += [CondPageBreak(50 * mm), Paragraph('Estratégias sugeridas', S['h2'])]
    if not r.get('estrategias'):
        E.append(Paragraph('Informação insuficiente para sugerir estratégia.', S['pq']))
    for i, e in enumerate(r.get('estrategias') or [], 1):
        E.append(_card('%d. %s' % (i, e.get('titulo') or 'Sem título'), 'STATUS: %s  ·  %s  ·  %s' % (e.get('status') or 'SUGERIDO', e.get('tipo') or 'tipo não informado', e.get('catalogo') or 'CANDIDATA NÃO CATALOGADA'),
                       [['Direcionamento', e.get('direcionamento')], ['O que fazer', e.get('o_que_fazer')],
                        ['O que observar', e.get('o_que_observar')], ['Prazo', e.get('prazo')]], e.get('baseado_em')))
    E += [CondPageBreak(45 * mm), Paragraph('Corpo · Mente · Espírito', S['h2']),
          _tabela_pares([['Corpo', r.get('corpo')], ['Mente', r.get('mente')], ['Espírito', r.get('espirito')]])]
    E += [Paragraph('Até o próximo encontro, observar', S['h2'])] + _lista(r.get('observar'))
    E += [Paragraph('Próxima etapa', S['h2']), Paragraph(T(r.get('proxima_etapa')), S['p'])]
    if r.get('retorno'):
        E += [CondPageBreak(50 * mm), Paragraph('Retorno: estratégias anteriores', S['h2'])]
        for x in r['retorno']:
            E.append(_card(x.get('estrategia'), 'DECISÃO SUGERIDA: %s  ·  STATUS: SUGERIDO' % (x.get('decisao_sugerida') or 'sem dado'),
                           [['Motivo', x.get('motivo')]], x.get('baseado_em')))
    E.append(PageBreak())

    # ---------- Parte C ----------
    E += [Paragraph('PARTE C', S['parte']), Paragraph('Fontes, alertas e rastreabilidade', S['h1'])]
    E += [Paragraph('Fontes utilizadas', S['h2'])] + _lista(r.get('fontes_utilizadas'))
    E += [Paragraph('Alertas metodológicos', S['h2'])] + _lista(r.get('alertas_metodologicos'), 'Nenhum alerta.')
    E += [Paragraph('Informação insuficiente / sem dado', S['h2'])] + _lista(r.get('informacao_insuficiente'), 'Nada a registrar.')
    E += [Spacer(1, 10), Paragraph('Estados de revisão: SUGERIDO (gerado pela HOLOS AI) · CONFIRMADO · EDITADO · DESCARTADO · COMPARTILHADO. '
                                   'Somente itens confirmados e marcados para compartilhar entram no Resultado HOLOS da paciente. '
                                   'A HOLOS AI não altera notas, Índice, Tríade, prioridades, sinais dominantes, cobertura nem Próximos Passos do HOLOSCAN.', S['pq'])]
    doc.build(E)
    return caminho
