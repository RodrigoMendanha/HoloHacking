# -*- coding: utf-8 -*-
"""
HOLOS AI - saida canonica (HOLOS-AI-SAIDA 1.2, fechamento 14/10/2026): validar o JSON, gerar o texto legivel e, opcionalmente, o PDF de conferencia.

A saida OFICIAL da HOLOS AI e:
  A. o bloco legivel HOLOS_AI_RESULT  -> gerar_texto(resultado)
  B. o JSON canonico (schema_version 1, arquivo 06-SCHEMA-HOLOS-AI-RESULT.json) -> o proprio dict `resultado`
O PDF e apenas apoio (conferencia, teste, contingencia). O PDF oficial da paciente e gerado pelo HoloHacking
depois que a nutricionista revisa e confirma a analise importada.

Uso dentro do GPT (Code Interpreter, opcional):
    exec(open('/mnt/data/holos_ai_pdf.py', encoding='utf-8').read())
    problemas = validar_resultado(resultado)          # [] = ok
    print(gerar_texto(resultado))
    gerar_pdf(resultado, '/mnt/data/HOLOS-AI_<identificador>_<AAAA-MM-DD>_conferencia.pdf', transcricao=None)

`transcricao` (opcional) = {titulo, secoes: [ {titulo, itens: [[rotulo, valor], ...]} | {titulo, texto} ]}:
o documento recebido, fiel e na ordem, so para conferencia (Parte A do PDF). Nao faz parte do JSON canonico.
Se reportlab nao existir, validar_resultado e gerar_texto continuam funcionando; gerar_pdf levanta erro e
a HOLOS AI segue sem PDF (nunca bloqueia a entrega do texto + JSON).
Nada aqui inventa conteudo: o script so confere e diagrama o que recebeu.
"""
import json, re

SCHEMA_VERSION = 1
# todas obrigatorias (meta, entrada, ferramentas_ja_aplicadas e plano_acompanhamento tambem: vazios quando nao houver material)
CHAVES_OBRIGATORIAS = ['schema_version', 'tipo', 'meta', 'entrada', 'sintese_integrada', 'o_que_apareceu', 'convergencias',
                       'padroes_observados', 'pontos_para_aprofundar', 'sistemas_prioritarios', 'ferramentas_ja_aplicadas',
                       'ferramentas_recomendadas', 'direcionamentos', 'estrategias', 'corpo', 'mente', 'espirito', 'o_que_observar',
                       'plano_acompanhamento', 'roteiro_proxima_consulta', 'proxima_etapa', 'rascunho_paciente',
                       'alertas_profissionais', 'fontes_utilizadas']
LISTAS = ['o_que_apareceu', 'convergencias', 'padroes_observados', 'pontos_para_aprofundar', 'sistemas_prioritarios',
          'ferramentas_ja_aplicadas', 'ferramentas_recomendadas', 'direcionamentos', 'estrategias', 'o_que_observar',
          'plano_acompanhamento', 'roteiro_proxima_consulta', 'alertas_profissionais', 'fontes_utilizadas']
SELO_SUGESTAO = 'SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL'
CATALOGO_TECNICO = 'not_catalogued'
NAO_APROFUNDADO = 'Ainda não aprofundado nesta etapa.'
MANTER_OBS = 'MANTER EM OBSERVAÇÃO — SUGERIDO'
DECISOES_RETORNO = ['MANTER', 'AJUSTAR', 'SUBSTITUIR', 'CONCLUIR', 'ENCERRAR']
CLASSIFICACOES = {'observacao': 'Observação', 'comportamental_metodologica': 'Comportamental/metodológica',
                  'requer_decisao_profissional_na_conduta': 'Requer decisão profissional na Conduta'}
TERRITORIOS = [('corpo', 'Corpo'), ('mente', 'Mente'), ('espirito', 'Espírito')]
RE_REGRA = re.compile(r'^REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]$')
# termos que nao podem aparecer afirmados no rascunho para a paciente
PROIBIDOS_PACIENTE = ['candid', 'disbiose', 'resistência à insulina', 'diabetes', 'tireoide', 'inflamação sistêmica',
                      'acidose', 'toxina', 'detox', 'hipótese', 'sistema metabólico', 'sistema fúngico',
                      'sistema ácido', 'sistema detox', 'sistema mental']


def validar_resultado(r):
    """Confere o JSON canonico. Devolve a lista de problemas ([] = valido para importar)."""
    p = []
    if not isinstance(r, dict):
        return ['o resultado não é um objeto JSON']
    try:
        json.dumps(r, ensure_ascii=False)
    except Exception as e:
        p.append('não serializa como JSON: %s' % e)
    for k in CHAVES_OBRIGATORIAS:
        if k not in r:
            p.append('falta a chave "%s"' % k)
    if r.get('schema_version') != SCHEMA_VERSION:
        p.append('schema_version deve ser 1')
    tipo = r.get('tipo')
    if tipo not in ('primeira_consulta', 'retorno'):
        p.append('tipo deve ser "primeira_consulta" ou "retorno"')
    for k in LISTAS:
        if k in r and not isinstance(r[k], list):
            p.append('"%s" deve ser lista' % k)
    for k in ('meta', 'entrada'):
        if k in r and not isinstance(r[k], dict):
            p.append('"%s" deve ser objeto (pode ser vazio)' % k)
    for k in ('sintese_integrada', 'proxima_etapa', 'rascunho_paciente'):
        if k in r and not isinstance(r[k], str):
            p.append('"%s" deve ser texto' % k)
    # ferramentas: ate 3, IDs do catalogo, sem duplicatas
    fr = r.get('ferramentas_recomendadas') or []
    if len(fr) > 3:
        p.append('ferramentas_recomendadas: no máximo 3 (veio %d)' % len(fr))
    vistos_id, vistos_nome = set(), set()
    for f in fr:
        rid, nome = f.get('regra_id', ''), (f.get('ferramenta') or '').strip().lower()
        if not RE_REGRA.match(rid or ''):
            p.append('ferramenta "%s": regra_id fora do catálogo PP-V1 (%s)' % (f.get('ferramenta'), rid))
        if rid in vistos_id or nome in vistos_nome:
            p.append('ferramenta duplicada: %s %s' % (rid, f.get('ferramenta')))
        vistos_id.add(rid); vistos_nome.add(nome)
        if f.get('papel') not in ('principal', 'complementar'):
            p.append('ferramenta %s: papel deve ser principal ou complementar' % rid)
    if fr and sum(1 for f in fr if f.get('papel') == 'principal') != 1:
        p.append('ferramentas_recomendadas: deve haver exatamente 1 principal')
    concluidas = set((a.get('ferramenta') or '').strip().lower() for a in (r.get('ferramentas_ja_aplicadas') or [])
                     if a.get('situacao') == 'concluida')
    for f in fr:
        if (f.get('ferramenta') or '').strip().lower() in concluidas:
            p.append('ferramenta "%s" já foi concluída neste atendimento' % f.get('ferramenta'))
    # direcionamentos
    ids_d = set()
    for d in r.get('direcionamentos') or []:
        ids_d.add(d.get('id'))
        if not d.get('baseado_em'):
            p.append('direcionamento %s sem "baseado_em"' % d.get('id'))
        if d.get('status') != 'SUGERIDO':
            p.append('direcionamento %s: status deve ser SUGERIDO' % d.get('id'))
    # estrategias
    ids_e = set()
    for e in r.get('estrategias') or []:
        eid = e.get('id'); ids_e.add(eid)
        if e.get('classificacao') not in CLASSIFICACOES:
            p.append('estratégia %s: classificacao inválida (%s)' % (eid, e.get('classificacao')))
        if e.get('territorio') not in ('Corpo', 'Mente', 'Espírito'):
            p.append('estratégia %s: territorio inválido' % eid)
        if not e.get('baseado_em'):
            p.append('estratégia %s sem "baseado_em"' % eid)
        if e.get('status') != 'SUGERIDO':
            p.append('estratégia %s: status deve ser SUGERIDO' % eid)
        if e.get('direcionamento_id') and e.get('direcionamento_id') not in ids_d:
            p.append('estratégia %s aponta para direcionamento inexistente %s' % (eid, e.get('direcionamento_id')))
        dec, origem = e.get('decisao_sugerida'), e.get('origem')
        if origem not in ('acordada', 'nova'):
            p.append('estratégia %s: origem deve ser acordada ou nova' % eid)
        if origem == 'nova' and dec is not None:
            p.append('estratégia %s é nova: decisao_sugerida deve ser null' % eid)
        if origem == 'acordada':
            if tipo == 'primeira_consulta' and dec != MANTER_OBS:
                p.append('estratégia %s: na primeira consulta a decisão é "%s"' % (eid, MANTER_OBS))
            if tipo == 'retorno' and dec not in DECISOES_RETORNO + [MANTER_OBS]:
                p.append('estratégia %s: decisão de retorno inválida (%s)' % (eid, dec))
    # Corpo / Mente / Espirito
    for k, nome in TERRITORIOS:
        t = r.get(k)
        if not isinstance(t, dict):
            p.append('"%s" deve ser objeto {situacao, resumo, estrategias}' % k); continue
        if t.get('situacao') not in ('com_material', 'nao_aprofundado'):
            p.append('%s: situacao deve ser com_material ou nao_aprofundado' % k)
        if t.get('situacao') == 'nao_aprofundado' and not (t.get('resumo') or '').startswith(NAO_APROFUNDADO):
            p.append('%s: sem material, o resumo começa com "%s"' % (k, NAO_APROFUNDADO))
        for eid in t.get('estrategias') or []:
            if eid not in ids_e:
                p.append('%s cita estratégia inexistente %s' % (k, eid))
            else:
                est = next(e for e in r['estrategias'] if e.get('id') == eid)
                if est.get('territorio') != nome:
                    p.append('%s cita %s, que é do território %s' % (k, eid, est.get('territorio')))
    # hipoteses nunca para a paciente
    for x in r.get('pontos_para_aprofundar') or []:
        if x.get('tipo') == 'hipotese' and x.get('so_profissional') is not True:
            p.append('hipótese deve ter so_profissional = true')
    txt = (r.get('rascunho_paciente') or '').lower()
    for termo in PROIBIDOS_PACIENTE:
        if termo in txt:
            p.append('rascunho_paciente contém termo proibido: "%s"' % termo)
    if re.search(r'\d+,\d', r.get('rascunho_paciente') or ''):
        p.append('rascunho_paciente não deve ter números do HOLOSCAN')
    p += checar_regras_clinicas(r)
    return p


# ------------------------------------------------------------------ regras de linguagem e de raciocinio (v1.2 final)
# Mesmas regras do holos-ai-contrato.js (no HoloHacking, as heuristicas viram aviso; as estruturais, erro).
import unicodedata

def _sem_acento(t):
    return ''.join(c for c in unicodedata.normalize('NFD', str(t or '').lower()) if unicodedata.category(c) != 'Mn')

# palavras comuns demais para indicar que um texto repete outro (radical de 5 letras)
_PARADAS = set(['comer', 'volta', 'antes', 'depoi', 'tarde', 'noite', 'lanch', 'podem', 'fazer', 'parte', 'mesmo', 'quand', 'sobre',
                'entre', 'sempre', 'ainda', 'estar', 'pouco', 'tempo', 'outra', 'outro', 'desta', 'deste', 'nesta', 'neste', 'dessa',
                'desse', 'nossa', 'nosso', 'proxi', 'encon', 'conve', 'retor', 'confe', 'consu', 'parti', 'etapa', 'pacie',
                'profi', 'nutri', 'possi', 'poder', 'deixa', 'cerca', 'seman', 'horas',
                'combi', 'acord'])  # marcadores de acordo nao contam como conteudo

def _radicais(t):
    return set(w[:5] for w in re.findall(r'[a-z]+', _sem_acento(t)) if len(w) >= 5 and w[:5] not in _PARADAS)

def _frases(t):
    return [f for f in re.split(r'(?<=[.!?;])\s+|\n+', str(t or '')) if f.strip()]

def _textos(x):
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for v in x.values():
            yield from _textos(v)
    elif isinstance(x, list):
        for v in x:
            yield from _textos(v)

RE_NOTA_EQUILIBRIO = re.compile(r'(mais|menos|maior|menor|melhor|pior)\s+equilibrio|equilibrio\s+(maior|menor)|'
                                r'(nota|score|pontuacao|indice)[^.;]{0,40}(saudavel|saude|normalidade|normal\b|gravidade|grave\b|risco)')
RE_NEGACAO = re.compile(r'\b(nao|nunca|nem)\b')
RE_CONDUTA = re.compile(r'composicao|cardapio|suplement|\bdose\b|protocolo|prescri|quantidade|gramas|\bkcal\b|calori|'
                        r'definir na conduta|escolha (dos|de) alimentos|substituic|substituto')
RE_CORTE = re.compile(r'maior parte dos dias|maioria dos dias|metade dos dias|\d+ ?%|\d+ ?(vezes|dias|x) ?(por|na|em|ao)? ?semana|'
                      r'em \d+ de \d+|pelo menos \d+|no minimo \d+')
RE_COMBINADO = re.compile(r'combin|acordamos|acordad|vamos fazer|\buse\b|\bfaca\b|a estrategia e\b')


def checar_regras_clinicas(r):
    """Regras do fechamento da v1.2: nota do HOLOSCAN, nao aprofundado, rascunho, cortes, Conduta, hipotese -> estrategia."""
    p = []
    ests = [e for e in (r.get('estrategias') or []) if isinstance(e, dict)]
    novas = [e for e in ests if e.get('origem') == 'nova']
    acordadas = [e for e in ests if e.get('origem') == 'acordada']
    # 1. nota maior = menos marcadores; nunca equilibrio, saude, normalidade, gravidade ou risco
    for t in _textos(r):
        for f in _frases(t):
            fs = _sem_acento(f)
            if RE_NOTA_EQUILIBRIO.search(fs) and not RE_NEGACAO.search(fs):
                p.append('linguagem da nota do HOLOSCAN: "%s" (nota maior = menos marcadores; nunca saúde, equilíbrio, normalidade, gravidade ou risco)' % f.strip()[:120])
    for s in r.get('sistemas_prioritarios') or []:
        if isinstance(s, dict) and (s.get('ordem') or 0) > 1 and 'concentrou mais marcadores' in _sem_acento(' '.join(_textos(s))):
            p.append('%s não é a primeira área: não use "concentrou mais marcadores"' % s.get('sistema'))
    # 2. territorio nao aprofundado nao tem estrategia ativa
    nao_aprof = set(nome for k, nome in TERRITORIOS if isinstance(r.get(k), dict) and r[k].get('situacao') == 'nao_aprofundado')
    for k, nome in TERRITORIOS:
        t = r.get(k)
        if isinstance(t, dict) and t.get('situacao') == 'nao_aprofundado' and t.get('estrategias'):
            p.append('%s está "nao_aprofundado": não pode ter estratégia vinculada (%s)' % (k, ', '.join(t['estrategias'])))
    for e in ests:
        if e.get('territorio') in nao_aprof:
            p.append('estratégia %s está no território %s, que não foi aprofundado nesta etapa' % (e.get('id'), e.get('territorio')))
    # 3. tarefa da Conduta nao e estrategia da paciente
    for e in ests:
        if RE_CONDUTA.search(_sem_acento('%s %s' % (e.get('titulo'), e.get('o_que_fazer')))):
            p.append('estratégia %s parece tarefa da Conduta (composição, alimentos, quantidade, suplemento, protocolo, prescrição): '
                     'vai para alertas_profissionais (tipo "conduta"), não para estratégias' % e.get('id'))
    # 4. corte inventado
    alvos = [('estratégia %s' % e.get('id'), e.get(c)) for e in ests for c in ('o_que_fazer', 'o_que_observar', 'criterio_sucesso')]
    alvos += [('roteiro (critério %s)' % (x.get('estrategia_id') or ''), x.get('texto')) for x in (r.get('roteiro_proxima_consulta') or [])
              if isinstance(x, dict) and x.get('tipo') == 'criterio_decisao']
    for onde, t in alvos:
        m = RE_CORTE.search(_sem_acento(t))
        if m:
            p.append('%s: corte não definido pela Conduta ("%s"); use "aplicar com frequência suficiente para permitir avaliação no retorno"' % (onde, m.group(0)))
    # 5. hipotese nunca vira estrategia direto
    hip = [x for x in (r.get('pontos_para_aprofundar') or []) if isinstance(x, dict) and x.get('tipo') == 'hipotese']
    rad_hip = set()
    for x in hip:
        rad_hip |= _radicais(x.get('texto'))
    rad_acordado = set()
    for e in acordadas:
        rad_acordado |= _radicais(' '.join(_textos(e)))
    for e in ests:
        if any(('hipotese' in _sem_acento(b)) or ('pontos_para_aprofundar' in str(b)) for b in (e.get('baseado_em') or [])):
            p.append('estratégia %s se baseia numa hipótese: hipótese vira observação e confirmação, nunca estratégia direto' % e.get('id'))
    for e in novas:
        comum = (_radicais(e.get('titulo')) & rad_hip) - rad_acordado
        if comum:
            p.append('estratégia %s repete uma hipótese ainda não confirmada (%s): registre como ponto de observação' % (e.get('id'), ', '.join(sorted(comum))))
    # 6. rascunho para a paciente: so o que foi acordado
    rasc = r.get('rascunho_paciente') or ''
    for f in _frases(rasc):
        rf = _radicais(f)
        for e in novas:
            novos = (_radicais('%s %s' % (e.get('titulo'), e.get('o_que_fazer'))) & rf) - rad_acordado
            if len(novos) >= 2 or (novos and RE_COMBINADO.search(_sem_acento(f))):
                p.append('rascunho_paciente apresenta a sugestão nova %s como combinada: "%s"' % (e.get('id'), f.strip()[:120]))
        if not acordadas and RE_COMBINADO.search(_sem_acento(f)):
            p.append('rascunho_paciente fala em combinado sem estratégia acordada no documento: "%s"' % f.strip()[:120])
    return p


def _l(itens):
    return [('- ' + str(i)) for i in itens] if itens else ['- Sem dado']


def gerar_texto(r):
    """Bloco legivel HOLOS_AI_RESULT, com o mesmo conteudo do JSON."""
    L = ['=== HOLOS_AI_RESULT ===']
    m, en = r.get('meta') or {}, r.get('entrada') or {}
    L += ['TIPO: %s' % r.get('tipo'),
          'ENTRADA: %s (base principal: %s)%s' % (', '.join(en.get('documentos') or ['Sem dado']), en.get('base_principal') or 'Sem dado',
                                                   (' — ' + en['observacao']) if en.get('observacao') else ''),
          '', 'SINTESE_INTEGRADA:', r.get('sintese_integrada') or 'Sem dado', '', 'O_QUE_APARECEU:']
    L += _l(['%s (%s)' % (x.get('texto'), x.get('fonte')) for x in r.get('o_que_apareceu') or []])
    L += ['', 'CONVERGENCIAS:']
    L += _l([('CONFLITO: ' if x.get('tipo') == 'conflito' else '') + x.get('texto', '') for x in r.get('convergencias') or []])
    L += ['', 'PADROES_OBSERVADOS:'] + _l(r.get('padroes_observados'))
    L += ['', 'PONTOS_PARA_APROFUNDAR:']
    L += _l([('[HIPÓTESE · só profissional] ' if x.get('tipo') == 'hipotese' else '') + x.get('texto', '') for x in r.get('pontos_para_aprofundar') or []])
    L += ['', 'SISTEMAS_PRIORITARIOS:']
    for s in r.get('sistemas_prioritarios') or []:
        L += ['%d. %s (%s · %s)' % (s.get('ordem', 0), s.get('sistema'), s.get('nota'), s.get('posicao')),
              '   O que apareceu: %s' % (s.get('o_que_apareceu') or 'Sem dado'),
              '   O que vale observar: %s' % (s.get('o_que_observar') or 'Sem dado'),
              '   Como cuidar deste eixo: %s' % (s.get('como_cuidar') or 'Sem dado')]
    if not r.get('sistemas_prioritarios'):
        L.append('- Prioridade não informada no documento.')
    L += ['', 'FERRAMENTAS_JA_APLICADAS:']
    L += _l(['%s (%s): %s' % (a.get('ferramenta'), a.get('situacao'), a.get('o_que_esclareceu')) for a in r.get('ferramentas_ja_aplicadas') or []])
    L += ['', 'FERRAMENTAS_RECOMENDADAS (até 3, PP-V1):']
    for f in r.get('ferramentas_recomendadas') or []:
        L += ['%d. %s — %s (%s · %s · %s)' % (f.get('ordem', 0), (f.get('papel') or '').upper(), f.get('ferramenta'), f.get('regra_id'), f.get('territorio'), f.get('sistema')),
              '   Por que: %s' % f.get('por_que'), '   Como aplicar: %s' % (f.get('como_aplicar') or 'Sem dado'),
              '   O que procurar: %s' % (f.get('o_que_procurar') or 'Sem dado'), '   Status: SUGERIDO']
    if not r.get('ferramentas_recomendadas'):
        L.append('- Nenhuma ferramenta nova indicada pelo catálogo nesta etapa.')
    L += ['', 'DIRECIONAMENTOS (%s):' % SELO_SUGESTAO]
    for d in r.get('direcionamentos') or []:
        L += ['%s. %s (%s)' % (d.get('id'), d.get('titulo'), d.get('origem')),
              '   Território / sistema: %s / %s' % (d.get('territorio') or 'sem território', d.get('sistema') or 'sem vínculo'),
              '   Por que: %s' % d.get('por_que'), '   Objetivo desta etapa: %s' % d.get('objetivo'),
              '   Baseado em: %s' % '; '.join(d.get('baseado_em') or [])]
    if not r.get('direcionamentos'):
        L.append('- Informação insuficiente para sugerir direcionamento.')
    L += ['', 'ESTRATEGIAS (%s):' % SELO_SUGESTAO]
    for e in r.get('estrategias') or []:
        L += ['%s. [%s] %s (%s)' % (e.get('id'), (e.get('territorio') or '').upper(), e.get('titulo'), e.get('origem')),
              '   Direcionamento: %s' % (e.get('direcionamento_id') or 'sem vínculo'),
              '   Classificação: %s' % CLASSIFICACOES.get(e.get('classificacao'), e.get('classificacao'))]
        if e.get('decisao_sugerida'):
            L.append('   Decisão sugerida: %s%s' % (e['decisao_sugerida'], (' — ' + e['motivo_decisao']) if e.get('motivo_decisao') else ''))
        L += ['   O que fazer: %s' % e.get('o_que_fazer'), '   O que observar: %s' % (e.get('o_que_observar') or 'Sem dado'),
              '   Prazo: %s' % (e.get('prazo') or 'Sem dado'), '   Critério de sucesso: %s' % (e.get('criterio_sucesso') or 'Sem dado'),
              '   Baseado em: %s' % '; '.join(e.get('baseado_em') or [])]
    if not r.get('estrategias'):
        L.append('- Informação insuficiente para sugerir estratégia.')
    for k, nome in TERRITORIOS:
        t = r.get(k) or {}
        L += ['', '%s:' % k.upper(), (t.get('resumo') or NAO_APROFUNDADO) + (' (%s)' % ', '.join(t['estrategias']) if t.get('estrategias') else '')]
    L += ['', 'O_QUE_OBSERVAR:'] + _l(r.get('o_que_observar'))
    L += ['', 'PLANO_DE_ACOMPANHAMENTO:'] + _l(r.get('plano_acompanhamento'))
    L += ['', 'ROTEIRO_DA_PROXIMA_CONSULTA:']
    rot = {'ferramenta': 'Ferramenta', 'pergunta': 'Pergunta', 'criterio_decisao': 'Critério'}
    L += _l(['%s%s: %s' % (rot.get(x.get('tipo'), x.get('tipo')), (' ' + x['estrategia_id']) if x.get('estrategia_id') else '', x.get('texto'))
             for x in r.get('roteiro_proxima_consulta') or []])
    L += ['', 'PROXIMA_ETAPA:', r.get('proxima_etapa') or 'Sem dado',
          '', 'RASCUNHO_PACIENTE (rascunho para revisão):', r.get('rascunho_paciente') or 'Sem dado',
          '', 'ALERTAS_PROFISSIONAIS:']
    L += _l(['[%s] %s' % (a.get('tipo'), a.get('texto')) for a in r.get('alertas_profissionais') or []])
    L += ['', 'FONTES_UTILIZADAS:'] + _l(r.get('fontes_utilizadas'))
    L.append('=== FIM_HOLOS_AI_RESULT ===')
    return '\n'.join(L)


# ------------------------------------------------------------------ PDF de conferencia (opcional)
try:
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
    TEM_REPORTLAB = True
except Exception:
    TEM_REPORTLAB = False

if TEM_REPORTLAB:
    VERDE = colors.HexColor('#0b3325'); VERDE2 = colors.HexColor('#1f5a43'); DOURADO = colors.HexColor('#a8853f')
    CREME = colors.HexColor('#f7f3ea'); CINZA = colors.HexColor('#5d625e'); LINHA = colors.HexColor('#ddd5c4')
    ALERTA = colors.HexColor('#8a3b2a')
    FONTE, FONTE_B = 'Helvetica', 'Helvetica-Bold'
    for base in ['/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/dejavu', '/usr/share/fonts/TTF']:
        _r, _b = os.path.join(base, 'DejaVuSans.ttf'), os.path.join(base, 'DejaVuSans-Bold.ttf')
        if os.path.exists(_r) and os.path.exists(_b):
            try:
                pdfmetrics.registerFont(TTFont('HDeja', _r)); pdfmetrics.registerFont(TTFont('HDeja-B', _b))
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
        'p': _st('p'), 'pq': _st('pq', fontSize=8.5, leading=12, textColor=CINZA),
        'rot': _st('rot', fontName=FONTE_B, fontSize=8, leading=11, textColor=CINZA),
        'li': _st('li', leftIndent=10, bulletIndent=0),
        'card_t': _st('card_t', fontName=FONTE_B, fontSize=10.5, leading=14, textColor=VERDE),
        'selo': _st('selo', fontName=FONTE_B, fontSize=7.5, leading=10, textColor=DOURADO),
        'aviso': _st('aviso', fontName=FONTE_B, fontSize=9, leading=12.5, textColor=ALERTA, alignment=TA_CENTER),
    }

    def T(x):
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

    def _secao(titulo, cards, vazio):
        """titulo junto do primeiro card (nunca titulo orfao no pe da pagina)"""
        h = Paragraph(titulo, S['h2'])
        if not cards:
            return [h, Paragraph(vazio, S['pq'])]
        return [KeepTogether([h, cards[0]])] + cards[1:]

    def _rodape(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONTE, 7.5); canvas.setFillColor(CINZA)
        canvas.drawString(18 * mm, 10 * mm, 'HOLOS AI · PDF de conferência · não é o documento oficial da paciente')
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, 'Página %d' % doc.page)
        canvas.setStrokeColor(LINHA); canvas.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
        canvas.restoreState()


def gerar_pdf(r, caminho, transcricao=None):
    """PDF de conferencia a partir do JSON canonico. Opcional: se falhar, a entrega (texto + JSON) continua valida."""
    if not TEM_REPORTLAB:
        raise RuntimeError('reportlab indisponível: entregue só o texto e o JSON (o PDF é opcional).')
    m, en = r.get('meta') or {}, r.get('entrada') or {}
    doc = BaseDocTemplate(caminho, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
                          title='HOLOS AI - PDF de conferencia', author='HOLOS AI')
    doc.addPageTemplates([PageTemplate(id='p', frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')], onPage=_rodape)])
    E = [Spacer(1, 34 * mm), Paragraph('HOLOHACKING · NUTRIÇÃO HOLÍSTICA', S['capa_marca']), Spacer(1, 6),
         Paragraph('HOLOS AI', S['capa_tit']), Paragraph('PDF de conferência da análise', S['capa_sub']), Spacer(1, 16),
         _tabela_pares([['Tipo', r.get('tipo')], ['Identificador', m.get('identificador')], ['Data do atendimento', m.get('data_atendimento')],
                        ['Data da análise', m.get('data_analise')], ['Entrada', ', '.join(en.get('documentos') or []) or None],
                        ['Base principal', en.get('base_principal')], ['Versão do agente', m.get('agente')],
                        ['Base de conhecimento', m.get('kb_version')], ['Schema', 'HOLOS_AI_RESULT schema_version %s' % r.get('schema_version')]]),
         Spacer(1, 14),
         Paragraph('ESTE PDF NÃO É O DOCUMENTO OFICIAL. A SAÍDA OFICIAL É O TEXTO HOLOS_AI_RESULT + O JSON. '
                   'TUDO É SUGERIDO: A NUTRICIONISTA CONFIRMA, EDITA OU DESCARTA CADA ITEM NO HOLOHACKING, QUE GERA O PDF OFICIAL DA PACIENTE. '
                   'NÃO É DIAGNÓSTICO NEM PRESCRIÇÃO.', S['aviso']), PageBreak()]
    if transcricao:
        E += [Paragraph('PARTE A', S['parte']), Paragraph('Documento recebido (conferência)', S['h1']),
              Paragraph('Transcrição fiel e na ordem. Nada foi resumido, corrigido ou interpretado nesta parte.', S['pq'])]
        if transcricao.get('titulo'):
            E.append(Paragraph(T(transcricao['titulo']), S['p']))
        for sec in transcricao.get('secoes') or []:
            E += [CondPageBreak(40 * mm), Paragraph(T(sec.get('titulo')), S['h2']),
                  _tabela_pares(sec['itens']) if sec.get('itens') else Paragraph(T(sec.get('texto')), S['p'])]
        E.append(PageBreak())
    E += [Paragraph('PARTE B' if transcricao else 'ANÁLISE', S['parte']), Paragraph('Análise HOLOS AI (SUGERIDO)', S['h1']),
          Paragraph('Síntese integrada', S['h2']), Paragraph(T(r.get('sintese_integrada')), S['p']),
          Paragraph('O que apareceu', S['h2'])]
    E += _lista(['%s (%s)' % (x.get('texto'), x.get('fonte')) for x in r.get('o_que_apareceu') or []])
    E += [Paragraph('Convergências', S['h2'])] + _lista([('CONFLITO: ' if x.get('tipo') == 'conflito' else '') + x.get('texto', '') for x in r.get('convergencias') or []])
    E += [Paragraph('Padrões observados', S['h2'])] + _lista(r.get('padroes_observados'))
    E += [Paragraph('Pontos para aprofundar', S['h2'])] + _lista([('[HIPÓTESE · só profissional] ' if x.get('tipo') == 'hipotese' else '') + x.get('texto', '')
                                                                 for x in r.get('pontos_para_aprofundar') or []])
    C = []
    for s in r.get('sistemas_prioritarios') or []:
        C.append(_card('%s. %s' % (s.get('ordem'), s.get('sistema')), '%s · %s · eixo autoral de relatos, não é diagnóstico' % (s.get('nota'), s.get('posicao')),
                       [['O que apareceu', s.get('o_que_apareceu')], ['O que vale observar', s.get('o_que_observar')], ['Como cuidar deste eixo', s.get('como_cuidar')]]))
    E += _secao('Sistemas prioritários (como vieram no documento)', C, 'Prioridade não informada no documento.')
    if r.get('ferramentas_ja_aplicadas'):
        E += [CondPageBreak(40 * mm), Paragraph('Ferramentas já aplicadas', S['h2']),
              _tabela_pares([['%s (%s)' % (a.get('ferramenta'), a.get('situacao')), a.get('o_que_esclareceu')] for a in r['ferramentas_ja_aplicadas']])]
    C = []
    for f in r.get('ferramentas_recomendadas') or []:
        C.append(_card('%s. %s — %s' % (f.get('ordem'), (f.get('papel') or '').upper(), f.get('ferramenta')),
                       '%s · %s · %s · SUGERIDO' % (f.get('regra_id'), f.get('territorio'), f.get('sistema')),
                       [['Por que', f.get('por_que')], ['Como aplicar', f.get('como_aplicar')], ['O que procurar', f.get('o_que_procurar')]]))
    E += _secao('Ferramentas recomendadas (até 3 · PP-V1)', C, 'Nenhuma ferramenta nova indicada pelo catálogo nesta etapa.')
    C = []
    for d in r.get('direcionamentos') or []:
        C.append(_card('%s. %s' % (d.get('id'), d.get('titulo')), '%s · %s' % ((d.get('origem') or '').upper(), SELO_SUGESTAO),
                       [['Território / sistema', '%s / %s' % (d.get('territorio') or 'sem território', d.get('sistema') or 'sem vínculo')],
                        ['Por que', d.get('por_que')], ['Objetivo desta etapa', d.get('objetivo')]], d.get('baseado_em')))
    E += _secao('Direcionamentos', C, 'Informação insuficiente para sugerir direcionamento.')
    C = []
    for e in r.get('estrategias') or []:
        selo = '%s · %s · %s · %s' % ((e.get('territorio') or '').upper(), CLASSIFICACOES.get(e.get('classificacao'), e.get('classificacao')), (e.get('origem') or '').upper(), SELO_SUGESTAO)
        if e.get('decisao_sugerida'):
            selo += ' · DECISÃO: ' + e['decisao_sugerida']
        C.append(_card('%s. %s' % (e.get('id'), e.get('titulo')), selo,
                       [['Direcionamento', e.get('direcionamento_id')], ['Motivo da decisão', e.get('motivo_decisao')], ['O que fazer', e.get('o_que_fazer')],
                        ['O que observar', e.get('o_que_observar')], ['Prazo', e.get('prazo')], ['Critério de sucesso', e.get('criterio_sucesso')]],
                       e.get('baseado_em')))
    E += _secao('Estratégias', C, 'Informação insuficiente para sugerir estratégia.')
    E += [CondPageBreak(45 * mm), Paragraph('Corpo · Mente · Espírito', S['h2']),
          _tabela_pares([[nome, ((r.get(k) or {}).get('resumo') or NAO_APROFUNDADO) +
                          ((' (%s)' % ', '.join((r.get(k) or {}).get('estrategias'))) if (r.get(k) or {}).get('estrategias') else '')]
                         for k, nome in TERRITORIOS])]
    E += [Paragraph('O que observar', S['h2'])] + _lista(r.get('o_que_observar'))
    if r.get('plano_acompanhamento'):
        E += [Paragraph('Plano de acompanhamento', S['h2'])] + _lista(r.get('plano_acompanhamento'))
    E += [CondPageBreak(45 * mm), Paragraph('Roteiro da próxima consulta', S['h2'])]
    rot = {'ferramenta': 'Ferramenta', 'pergunta': 'Pergunta', 'criterio_decisao': 'Critério'}
    E += _lista(['%s%s: %s' % (rot.get(x.get('tipo'), x.get('tipo')), (' ' + x['estrategia_id']) if x.get('estrategia_id') else '', x.get('texto'))
                 for x in r.get('roteiro_proxima_consulta') or []])
    E += [Paragraph('Próxima etapa', S['h2']), Paragraph(T(r.get('proxima_etapa')), S['p'])]
    if r.get('rascunho_paciente'):
        E += [CondPageBreak(50 * mm), Paragraph('Rascunho para a paciente', S['h2']),
              _card('Rascunho para revisão da nutricionista', 'NÃO ENVIAR SEM CONFIRMAÇÃO · SUGERIDO', [['Texto', r.get('rascunho_paciente')]])]
    E += [PageBreak(), Paragraph('PARTE C' if transcricao else 'RASTREABILIDADE', S['parte']), Paragraph('Alertas e fontes', S['h1']),
          Paragraph('Alertas profissionais', S['h2'])]
    E += _lista(['[%s] %s' % (a.get('tipo'), a.get('texto')) for a in r.get('alertas_profissionais') or []], 'Nenhum alerta.')
    E += [Paragraph('Fontes utilizadas', S['h2'])] + _lista(r.get('fontes_utilizadas'))
    E += [Spacer(1, 10), Paragraph('A HOLOS AI não altera notas, faixas, Índice, Tríade, prioridades, sinais, cobertura nem o PP-V1. '
                                   'Exames não participam da análise. Só o que a nutricionista confirmar entra no Resultado HOLOS da paciente.', S['pq'])]
    doc.build(E)
    return caminho
