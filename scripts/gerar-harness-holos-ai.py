# Gera supabase/tests/holos-ai-ponte-harness.sql com o JSON canonico ficticio (docs/v1/holos-ai-gpt/exemplo-resultado.json)
# embutido. Rodar de novo se o exemplo mudar: python3 scripts/gerar-harness-holos-ai.py
import json, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
ex = (raiz / 'docs/v1/holos-ai-gpt/exemplo-resultado.json').read_text(encoding='utf-8')
assert '$J$' not in ex
json.loads(ex)
modelo = (raiz / 'scripts/holos-ai-ponte-harness.modelo.sql').read_text(encoding='utf-8')
(raiz / 'supabase/tests/holos-ai-ponte-harness.sql').write_text(modelo.replace('__EXEMPLO_JSON__', ex), encoding='utf-8')
print('ok')
