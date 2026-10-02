# DECISÃO 08 — REFERÊNCIA METODOLÓGICA

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 8 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor, faixa, fator ou equivalência proposto; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta

**A V1 terá referências metodológicas próprias do pacote LI? Com qual contrato, para quais exames, e com que prioridade frente à referência do laudo?**

**Não inventar "faixa ideal".** O "ideal" legado (`exames.csv`, "literatura funcional — revisar") está fora da saída oficial e **não** é candidato.

## Estado atual

`lab_method_references`: `exam_code`, `variant`, `material`, `method`, `population`, `sex`, `age_min/max`, `context`, `lower/upper_bound`, `operator`, `unit`, `source`, `source_version`, `justification`, `effective_from/to`, `status` (CHECK: `aprovado` exige responsável, provenance, hash, vigência), `version`. **0 linhas.** Só gestão técnica escreve. Entra no hash do pacote LI quando referenciada por vínculo (`reference_id`) ou dependência (Etapa 5.2). Motor usa só `status = aprovado`.

## Contrato (o que cada referência metodológica precisaria ter — levantamento)

| Campo | Significado | Existe |
|---|---|---|
| fonte (`source`, `source_version`) | documento/base de onde o intervalo vem | sim |
| justificativa | por que este intervalo para este uso | sim |
| população (`population`, `sex`, `age_min/max`) | a quem se aplica | sim |
| condições (`context`: jejum, fase, gestação etc.) | condição de coleta/estado | sim (texto) |
| unidade | obrigatória, igual à do valor ou com conversão aprovada (bloco 10) | sim |
| variante / material / método | identidade a que se aplica | sim |
| versão + vigência | `version`, `effective_from/to` | sim |
| aprovação | `status`, `responsible`, `approval_provenance`, `content_hash`; e inclusão no hash do pacote LI | sim |

## Opções (sem decidir)

(a) nenhuma referência metodológica na V1 (só laudo); (b) referências metodológicas aprovadas por migration, por exame, com prioridade sobre o laudo quando vinculadas; (c) idem, prioridade do laudo; (d) ambas visíveis, classificação pela escolhida no vínculo. Qualquer opção com conteúdo exige decisão **por exame**, com fonte — nenhum número aqui.

## O que fica bloqueado enquanto aberto

Qualquer classificação que não seja pela referência do laudo.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
