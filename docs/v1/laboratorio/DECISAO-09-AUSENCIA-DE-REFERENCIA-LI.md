# DECISÃO 09 — AUSÊNCIA DE REFERÊNCIA

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 9 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor, faixa, fator ou equivalência proposto; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta

**O QUE ACONTECE QUANDO NÃO EXISTE REFERÊNCIA APLICÁVEL (nem do laudo, nem metodológica aprovada) para um resultado?**

## Estado atual

Motor: `not_classifiable / missing_reference`; a LI exclui o resultado (`sem_referencia_utilizavel`) e segue com os demais; `excluded_items` no trace. **Ausência nunca é "dentro"** (Etapa 5, decisão 77). DECISÃO 04 regra 11: o resultado permanece na coleta, podendo ficar não classificável.

## Opções (sem decidir)

| Opção | Efeito no resultado | Efeito no domínio |
|---|---|---|
| (a) resultado não classificável, excluído da contagem (como hoje) | fica na coleta, aparece no trace como excluído | suficiência conta só classificáveis |
| (b) participa apenas como dado bruto (visível ao lado da leitura, sem contar) | idem + exibição | nenhum efeito na suficiência |
| (c) bloqueia o domínio | — | domínio = `sem_dados_suficientes` se qualquer vinculado estiver sem referência |
| (d) o domínio segue se houver suficiência sem ele | igual a (a) | depende do bloco 16 |
| (e) aviso à profissional antes do cálculo para completar a referência | — | mais digitação, mais classificáveis |

## Incompatíveis

Assumir "dentro"; usar `legacy_ideal_*` como fallback; inventar referência.

## O que fica bloqueado enquanto aberto

Nada tecnicamente (comportamento atual = (a)/(d)); a decisão confirma ou muda.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
